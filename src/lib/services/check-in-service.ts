import { db } from "@/lib/db/db";
import { checkInSchema } from "@/lib/validators/check-in";
import { GoalStatus } from "@prisma/client";
import { CacheService } from "./cache-service";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/security/api";

export class CheckInService {
  /**
   * Retrieves check-in info for a user, cycle, and quarter
   */
  static async getCheckInForQuarter(userId: string, cycleId: string, quarter: number) {
    // 1. Get the goal sheet for the user
    const sheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
      include: {
        goals: true,
      },
    });

    if (!sheet) {
      return {
        status: "LOCKED",
        reason: "No goal sheet exists for this cycle.",
        sheetStatus: "NOT_STARTED",
        goals: [],
        achievements: [],
        checkIn: null,
      };
    }

    if (sheet.status !== GoalStatus.APPROVED) {
      return {
        status: "LOCKED",
        reason: `Your goal sheet status is currently ${sheet.status.replace(/_/g, " ")}. Goal sheets must be APPROVED before check-ins can be performed.`,
        sheetStatus: sheet.status,
        goals: [],
        achievements: [],
        checkIn: null,
      };
    }

    // 2. Fetch CheckIn for the specified quarter (if any)
    const checkIn = await db.checkIn.findFirst({
      where: {
        userId,
        cycleId,
        quarter,
      },
    });

    // Fetch assigned shared goals
    const assignedSharedGoals = await db.sharedGoalAssignment.findMany({
      where: { userId },
      include: { sharedGoal: true },
    });

    // Merge assigned shared goals that aren't already in the sheet
    let allGoals = [...sheet.goals];
    const existingSharedGoalIds = new Set(sheet.goals.map(g => g.sharedGoalId).filter(Boolean));
    const missingSharedGoals = assignedSharedGoals.filter(a => !existingSharedGoalIds.has(a.sharedGoalId));

    if (missingSharedGoals.length > 0) {
      const virtualGoals: any[] = missingSharedGoals.map(a => ({
        id: `shared-${a.sharedGoal.id}`,
        thrustArea: a.sharedGoal.thrustArea,
        title: a.sharedGoal.title,
        description: a.sharedGoal.description,
        uomType: a.sharedGoal.uomType,
        target: a.sharedGoal.target,
        weightage: 0,
        sharedGoalId: a.sharedGoal.id,
        goalSheetId: sheet.id,
      }));
      allGoals = [...allGoals, ...virtualGoals];
    }

    // 3. Fetch achievements for this quarter and user's goals
    const achievements = await db.goalAchievement.findMany({
      where: {
        goalId: { in: allGoals.map((g) => g.id) },
        quarter,
      },
    });

    return {
      status: "APPROVED",
      goals: allGoals,
      achievements,
      checkIn,
    };
  }

  /**
   * Submits or saves a check-in and updates achievements in a transaction
   */
  static async submitCheckIn(
    userId: string,
    cycleId: string,
    quarter: number,
    notes: string | null,
    achievementsData: { goalId: string; value: number; status: string; notes?: string }[]
  ) {
    // 1. Validate payload
    const validated = checkInSchema.parse({
      cycleId,
      quarter,
      notes,
      achievements: achievementsData,
    });

    // 2. Retrieve user & manager details
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, managerId: true },
    });

    if (!user) throw new Error("User not found.");

    // 3. Check goal sheet is APPROVED
    const sheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
      include: {
        goals: {
          select: { id: true },
        },
      },
    });

    if (!sheet || sheet.status !== GoalStatus.APPROVED) {
      throw new BadRequestError("Goal sheet must be APPROVED to submit check-ins.");
    }

    const allowedGoalIds = new Set(sheet.goals.map((goal) => goal.id));
    if (validated.achievements.some((achievement) => !allowedGoalIds.has(achievement.goalId))) {
      throw new ForbiddenError("One or more achievements do not belong to this user's approved sheet.");
    }

    // 4. Perform database transaction
    const result = await db.$transaction(async (tx) => {
      // Find or create CheckIn
      const existingCheckIn = await tx.checkIn.findFirst({
        where: { userId, cycleId, quarter },
      });

      let checkIn;
      if (existingCheckIn) {
        checkIn = await tx.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            notes: validated.notes || null,
          },
        });
      } else {
        checkIn = await tx.checkIn.create({
          data: {
            userId,
            cycleId,
            quarter,
            notes: validated.notes || null,
          },
        });
      }

      // Upsert achievements
      for (const ach of validated.achievements) {
        const existingAch = await tx.goalAchievement.findFirst({
          where: {
            goalId: ach.goalId,
            quarter,
          },
        });

        if (existingAch) {
          await tx.goalAchievement.update({
            where: { id: existingAch.id },
            data: {
              value: ach.value,
              status: ach.status,
              notes: ach.notes || null,
              checkInId: checkIn.id,
            },
          });
        } else {
          await tx.goalAchievement.create({
            data: {
              goalId: ach.goalId,
              quarter,
              value: ach.value,
              status: ach.status,
              notes: ach.notes || null,
              checkInId: checkIn.id,
            },
          });
        }
      }

      // Log the check-in event in AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: "CHECK_IN_SUBMIT",
          entityType: "CheckIn",
          entityId: checkIn.id,
          newValue: JSON.parse(JSON.stringify(validated)),
        },
      });

      // Send in-app notification to the manager
      if (user.managerId) {
        await tx.notification.create({
          data: {
            userId: user.managerId,
            title: `Q${quarter} Check-In Submitted`,
            message: `${user.name || "An employee"} has submitted their quarterly check-in for Q${quarter} (${cycleId}).`,
            type: "GOAL_SUBMITTED",
            link: `/manager/check-ins?userId=${userId}&quarter=${quarter}`,
          },
        });
      }

      return checkIn;
    });

    await CacheService.invalidateAnalytics(cycleId, quarter);
    return result;
  }

  /**
   * Saves manager review comments for a check-in
   */
  static async saveManagerFeedback(
    checkInId: string,
    managerId: string,
    managerComment: string
  ) {
    if (!checkInId) throw new Error("Check-in ID is required.");

    // Retrieve check-in and its owner
    const checkIn = await db.checkIn.findUnique({
      where: { id: checkInId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            managerId: true,
          },
        },
      },
    });

    if (!checkIn) throw new NotFoundError("Check-in not found.");

    if (checkIn.managerComment !== null && checkIn.managerComment !== undefined) {
      throw new BadRequestError("This check-in review has already been finalized and locked.");
    }

    // Check manager authorization
    if (checkIn.user.managerId !== managerId) {
      // Also allow if manager is an admin
      const managerUser = await db.user.findUnique({
        where: { id: managerId },
        select: { role: true },
      });
      if (managerUser?.role !== "ADMIN") {
        throw new ForbiddenError("You are not authorized to review this check-in.");
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Update check-in comment
      const updatedCheckIn = await tx.checkIn.update({
        where: { id: checkInId },
        data: { managerComment },
      });

      // Log in AuditLog
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "CHECK_IN_REVIEW",
          entityType: "CheckIn",
          entityId: checkInId,
          newValue: { managerComment },
        },
      });

      // Send notification to the employee
      await tx.notification.create({
        data: {
          userId: checkIn.userId,
          title: `Q${checkIn.quarter} Check-In Reviewed`,
          message: `Your manager has reviewed and commented on your Q${checkIn.quarter} check-in.`,
          type: "GOAL_APPROVED",
          link: `/employee/check-ins?quarter=${checkIn.quarter}`,
        },
      });

      return updatedCheckIn;
    });

    await CacheService.invalidateAnalytics(checkIn.cycleId, checkIn.quarter);
    return result;
  }
}
