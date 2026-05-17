import { db } from "@/lib/db/db";
import { draftGoalSheetSchema, goalSheetSchema, GoalFormData } from "@/lib/validators/goal";
import { GoalStatus } from "@prisma/client";
import { NotificationService } from "./notification-service";
import { CacheService } from "./cache-service";
import { BadRequestError, ForbiddenError } from "@/lib/security/api";

export class GoalService {
  /**
   * Validates and creates/updates a goal sheet for a user
   */
  static async submitGoalSheet(userId: string, cycleId: string, goals: GoalFormData[]) {
    // 1. Validate with Zod
    const validated = goalSheetSchema.parse({ goals });

    // 2. Additional business logic (e.g., check if already approved/locked)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, managerId: true },
    });

    if (!user) throw new Error("User not found.");

    const existingSheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
    });

    if (existingSheet && existingSheet.status === GoalStatus.APPROVED) {
      throw new BadRequestError("Cannot modify an approved goal sheet.");
    }

    await this.assertAssignedSharedGoals(userId, validated.goals.map((goal) => goal.sharedGoalId));

    // 3. Database transaction
    const sheet = await db.$transaction(async (tx) => {
      // Create or update the goal sheet
      const sheet = await tx.goalSheet.upsert({
        where: {
          userId_cycleId: { userId, cycleId },
        },
        create: {
          userId,
          cycleId,
          status: GoalStatus.SUBMITTED,
        },
        update: {
          status: GoalStatus.SUBMITTED,
        },
      });

      // Delete old goals and create new ones (simple approach for MVP)
      await tx.goal.deleteMany({
        where: { goalSheetId: sheet.id },
      });

      await tx.goal.createMany({
        data: validated.goals.map((goal) => ({
          goalSheetId: sheet.id,
          thrustArea: goal.thrustArea,
          title: goal.title,
          description: goal.description,
          uomType: goal.uomType,
          target: goal.target,
          weightage: goal.weightage,
          sharedGoalId: goal.sharedGoalId,
        })),
      });

      // Log the action
      await tx.auditLog.create({
        data: {
          userId,
          action: "GOAL_SHEET_SUBMIT",
          entityType: "GoalSheet",
          entityId: sheet.id,
          newValue: JSON.parse(JSON.stringify(validated)),
        },
      });

      return sheet;
    });

    await CacheService.invalidateAnalytics(cycleId);

    // 4. Notify manager (outside transaction is fine for MVP)
    try {
      if (user.managerId) {
        await NotificationService.create({
          userId: user.managerId,
          title: "New Goal Sheet Submitted",
          message: `${user.name || "An employee"} has submitted their goal sheet for ${cycleId}.`,
          type: "GOAL_SUBMITTED",
          link: `/manager/approvals?userId=${userId}&cycleId=${cycleId}`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the whole request if notification fails in MVP
    }

    return sheet;
  }

  /**
   * Saves a goal sheet as a draft
   */
  static async saveGoalSheet(userId: string, cycleId: string, goals: GoalFormData[]) {
    const validated = draftGoalSheetSchema.parse({ goals });
    
    const existingSheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
    });

    if (existingSheet && existingSheet.status === GoalStatus.APPROVED) {
      throw new BadRequestError("Cannot modify an approved goal sheet.");
    }

    await this.assertAssignedSharedGoals(userId, validated.goals.map((goal) => goal.sharedGoalId));

    // 2. Database transaction
    const res = await db.$transaction(async (tx) => {
      const sheet = await tx.goalSheet.upsert({
        where: {
          userId_cycleId: { userId, cycleId },
        },
        create: {
          userId,
          cycleId,
          status: GoalStatus.DRAFT,
        },
        update: {
          status: GoalStatus.DRAFT,
        },
      });

      await tx.goal.deleteMany({
        where: { goalSheetId: sheet.id },
      });

      await tx.goal.createMany({
        data: validated.goals.map((goal) => ({
          goalSheetId: sheet.id,
          thrustArea: goal.thrustArea,
          title: goal.title,
          description: goal.description,
          uomType: goal.uomType,
          target: goal.target,
          weightage: goal.weightage,
          sharedGoalId: goal.sharedGoalId,
        })),
      });

      return sheet;
    });
    await CacheService.invalidateAnalytics(cycleId);
    return res;
  }

  /**
   * Validates goals without saving (for draft saving or real-time validation)
   */
  static validateGoals(goals: GoalFormData[]) {
    return goalSheetSchema.safeParse({ goals });
  }

  private static async assertAssignedSharedGoals(userId: string, sharedGoalIds: Array<string | undefined>) {
    const ids = [...new Set(sharedGoalIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return;

    const assignmentCount = await db.sharedGoalAssignment.count({
      where: {
        userId,
        sharedGoalId: { in: ids },
      },
    });

    if (assignmentCount !== ids.length) {
      throw new ForbiddenError("One or more shared goals are not assigned to this user.");
    }
  }

  /**
   * Fetches the goal sheet for a user and cycle
   */
  static async getGoalSheet(userId: string, cycleId: string) {
    const sheet = await db.goalSheet.findUnique({
      where: {
        userId_cycleId: { userId, cycleId },
      },
      include: {
        goals: true,
      },
    });

    // Fetch assigned shared goals
    const assignedSharedGoals = await db.sharedGoalAssignment.findMany({
      where: { userId },
      include: { sharedGoal: true },
    });

    if (!sheet) {
      // If no sheet exists, return a virtual sheet with shared goals as drafts
      return {
        id: "new",
        userId,
        cycleId,
        status: GoalStatus.DRAFT,
        managerComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goals: assignedSharedGoals.map(a => ({
          id: `shared-${a.sharedGoal.id}`,
          thrustArea: a.sharedGoal.thrustArea,
          title: a.sharedGoal.title,
          description: a.sharedGoal.description,
          uomType: a.sharedGoal.uomType,
          target: a.sharedGoal.target,
          weightage: 10,
          sharedGoalId: a.sharedGoal.id,
          goalSheetId: "new",
        })),
      };
    }

    // Merge assigned shared goals that aren't already in the sheet
    const existingSharedGoalIds = new Set(sheet.goals.map(g => g.sharedGoalId).filter(Boolean));
    const missingSharedGoals = assignedSharedGoals.filter(a => !existingSharedGoalIds.has(a.sharedGoalId));

    if (missingSharedGoals.length > 0) {
      // For MVP, we'll just return them as part of the goals array
      // In a real app, we might want to persist them immediately or handle them in the UI
      const virtualGoals = missingSharedGoals.map(a => ({
        id: `shared-${a.sharedGoal.id}`,
        thrustArea: a.sharedGoal.thrustArea,
        title: a.sharedGoal.title,
        description: a.sharedGoal.description,
        uomType: a.sharedGoal.uomType,
        target: a.sharedGoal.target,
        weightage: 10,
        sharedGoalId: a.sharedGoal.id,
        goalSheetId: sheet.id,
      }));
      
      return {
        ...sheet,
        goals: [...sheet.goals, ...virtualGoals],
      };
    }

    return sheet;
  }
}
