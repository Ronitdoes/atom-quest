import { db } from "@/lib/db/db";
import { GoalStatus } from "@prisma/client";
import { CacheService } from "./cache-service";

export class ManagerService {
  /**
   * Fetches summary statistics for a manager's team
   */
  static async getTeamStats(managerId: string, cycleId: string = "2024") {
    const subordinates = await db.user.findMany({
      where: { managerId },
      include: {
        goalSheets: {
          where: { cycleId },
          select: {
            status: true,
          }
        }
      }
    });

    const totalMembers = subordinates.length;
    
    // Pending approvals are sheets in SUBMITTED or UNDER_REVIEW status
    const pendingApprovals = subordinates.filter(s => {
      const status = s.goalSheets[0]?.status;
      return status === GoalStatus.SUBMITTED || status === GoalStatus.UNDER_REVIEW;
    }).length;
    
    // Submission rate: percentage of team who have moved beyond DRAFT status
    const submittedCount = subordinates.filter(s => {
      const status = s.goalSheets[0]?.status;
      return status && status !== GoalStatus.DRAFT;
    }).length;

    const submissionRate = totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0;

    return {
      totalMembers,
      pendingApprovals,
      submissionRate: Math.round(submissionRate),
    };
  }

  /**
   * Fetches all subordinates with their current goal sheet status
   */
  static async getTeamMembers(managerId: string, cycleId: string = "2024") {
    const members = await db.user.findMany({
      where: { managerId },
      include: {
        goalSheets: {
          where: { cycleId },
          select: {
            id: true,
            status: true,
            updatedAt: true,
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return members.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      status: member.goalSheets[0]?.status || 'NOT_STARTED',
      updatedAt: member.goalSheets[0]?.updatedAt || member.createdAt,
      goalSheetId: member.goalSheets[0]?.id || null,
    }));
  }

  /**
   * Fetches a specific goal sheet for approval review
   */
  static async getGoalSheetForApproval(userId: string, cycleId: string) {
    const sheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        goals: true,
      },
    });

    return sheet;
  }

  /**
   * Transitions a goal sheet to UNDER_REVIEW status
   */
  static async startReview(sheetId: string, managerId: string) {
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId }
    });

    if (!sheet) throw new Error("Goal sheet not found.");
    
    // Only transition if currently SUBMITTED
    if (sheet.status !== GoalStatus.SUBMITTED) {
      return sheet;
    }

    const result = await db.$transaction(async (tx) => {
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: {
          status: GoalStatus.UNDER_REVIEW,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "GOAL_SHEET_START_REVIEW",
          entityType: "GoalSheet",
          entityId: sheetId,
          newValue: { status: GoalStatus.UNDER_REVIEW },
        },
      });

      return updatedSheet;
    });
    await CacheService.clearAll();
    return result;
  }

  /**
   * Approves a goal sheet
   */
  static async approveGoalSheet(sheetId: string, managerId: string) {
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { user: true }
    });

    if (!sheet) throw new Error("Goal sheet not found.");

    if (sheet.status === GoalStatus.APPROVED) {
      return sheet; // Already approved
    }

    const result = await db.$transaction(async (tx) => {
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: {
          status: GoalStatus.APPROVED,
          managerComment: null, // Clear any previous rejection comments
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "GOAL_SHEET_APPROVE",
          entityType: "GoalSheet",
          entityId: sheetId,
          newValue: { status: GoalStatus.APPROVED },
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: sheet.userId,
          title: "Goal Sheet Approved",
          message: `Your goal sheet for cycle ${sheet.cycleId} has been approved.`,
          type: "GOAL_APPROVED",
          link: `/employee/goals`,
        },
      });

      return updatedSheet;
    });
    
    await CacheService.clearAll();
    return result;
  }

  /**
   * Rejects a goal sheet with comments
   */
  static async rejectGoalSheet(sheetId: string, managerId: string, comment: string) {
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { user: true }
    });

    if (!sheet) throw new Error("Goal sheet not found.");

    if (sheet.status === GoalStatus.APPROVED) {
      throw new Error("Cannot reject an already approved goal sheet. Contact admin to unlock.");
    }

    const result = await db.$transaction(async (tx) => {
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: {
          status: GoalStatus.REWORK_REQUIRED,
          managerComment: comment,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "GOAL_SHEET_REJECT",
          entityType: "GoalSheet",
          entityId: sheetId,
          newValue: { status: GoalStatus.REWORK_REQUIRED, comment },
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: sheet.userId,
          title: "Goal Sheet Rework Required",
          message: `Your manager has requested changes to your goal sheet. Comment: ${comment}`,
          type: "GOAL_REJECTED",
          link: `/employee/goals`,
        },
      });

      return updatedSheet;
    });

    await CacheService.clearAll();
    return result;
  }

  /**
   * Updates goal targets or weightage by manager
   */
  static async updateGoalsByManager(sheetId: string, managerId: string, goalsData: any[]) {
    const existingSheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      select: { status: true }
    });

    if (existingSheet?.status === GoalStatus.APPROVED) {
      throw new Error("Cannot modify an approved goal sheet.");
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Update each individual goal
      for (const goalData of goalsData) {
        await tx.goal.update({
          where: { id: goalData.id },
          data: {
            target: goalData.target,
            weightage: goalData.weightage,
          },
        });
      }

      // 2. Transition sheet to UNDER_REVIEW if it was SUBMITTED
      const sheet = await tx.goalSheet.findUnique({
        where: { id: sheetId },
        select: { status: true }
      });

      if (sheet?.status === GoalStatus.SUBMITTED) {
        await tx.goalSheet.update({
          where: { id: sheetId },
          data: { status: GoalStatus.UNDER_REVIEW }
        });
      }

      // 3. Log the bulk update
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "GOAL_SHEET_EDIT_BY_MANAGER",
          entityType: "GoalSheet",
          entityId: sheetId,
          newValue: JSON.parse(JSON.stringify(goalsData)),
        },
      });

      return true;
    });

    await CacheService.clearAll();
    return result;
  }

  /**
   * Fetches subordinate check-in statuses across all 4 quarters
   */
  static async getTeamCheckInStatus(managerId: string, cycleId: string = "2024") {
    const members = await db.user.findMany({
      where: { managerId },
      include: {
        goalSheets: {
          where: { cycleId, status: GoalStatus.APPROVED },
          select: { id: true }
        },
        checkIns: {
          select: {
            id: true,
            quarter: true,
            notes: true,
            managerComment: true,
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return members.map(member => {
      const hasApprovedSheet = member.goalSheets.length > 0;
      
      const checkInMap = new Map(member.checkIns.map(c => [c.quarter, c]));

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        hasApprovedSheet,
        quarters: [1, 2, 3, 4].map(q => {
          const checkIn = checkInMap.get(q);
          if (!hasApprovedSheet) return { status: "LOCKED" as const };
          if (!checkIn) return { status: "NOT_STARTED" as const };
          if (checkIn.managerComment) return { status: "REVIEWED" as const, checkInId: checkIn.id };
          return { status: "PENDING_REVIEW" as const, checkInId: checkIn.id };
        })
      };
    });
  }
}
