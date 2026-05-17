import { db } from "@/lib/db/db";
import { SharedGoalFormData, SharedGoalAchievementData } from "@/lib/validators/shared-goal";
import { CacheService } from "./cache-service";

export class SharedGoalService {
  /**
   * Creates a new master shared goal
   */
  static async createSharedGoal(creatorId: string, data: SharedGoalFormData) {
    const res = await db.sharedGoal.create({
      data: {
        ...data,
        creatorId,
      },
    });
    await CacheService.clearAll();
    return res;
  }

  /**
   * Assigns a shared goal to multiple users
   */
  static async assignSharedGoal(sharedGoalId: string, userIds: string[], managerId: string) {
    const result = await db.$transaction(async (tx) => {
      const assignments = await Promise.all(
        userIds.map((userId) =>
          tx.sharedGoalAssignment.upsert({
            where: {
              sharedGoalId_userId: { sharedGoalId, userId },
            },
            create: {
              sharedGoalId,
              userId,
            },
            update: {}, // No updates needed if already assigned
          })
        )
      );

      // Log the assignment
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "SHARED_GOAL_ASSIGN",
          entityType: "SharedGoal",
          entityId: sharedGoalId,
          newValue: { assignedUsers: userIds },
        },
      });

      return assignments;
    });
    await CacheService.clearAll();
    return result;
  }

  /**
   * Fetches all shared goals created by a user
   */
  static async getCreatedSharedGoals(creatorId: string) {
    return await db.sharedGoal.findMany({
      where: { creatorId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  /**
   * Fetches all shared goals assigned to a specific user
   */
  static async getAssignedSharedGoals(userId: string) {
    return await db.sharedGoalAssignment.findMany({
      where: { userId },
      include: {
        sharedGoal: true,
      },
    });
  }

  /**
   * Syncs a shared goal's details to all linked goals in employee goal sheets.
   */
  static async syncSharedGoalMetadata(sharedGoalId: string) {
    const sharedGoal = await db.sharedGoal.findUnique({
      where: { id: sharedGoalId },
    });

    if (!sharedGoal) throw new Error("Shared goal not found");

    const res = await db.goal.updateMany({
      where: { sharedGoalId },
      data: {
        thrustArea: sharedGoal.thrustArea,
        title: sharedGoal.title,
        description: sharedGoal.description,
        uomType: sharedGoal.uomType,
        target: sharedGoal.target,
      },
    });
    await CacheService.clearAll();
    return res;
  }

  /**
   * Updates achievement for a shared goal and syncs it to all linked employee goals.
   * This implements Step 23.
   */
  static async updateAchievement(sharedGoalId: string, managerId: string, data: SharedGoalAchievementData) {
    const result = await db.$transaction(async (tx) => {
      // 1. Verify shared goal existence
      const sharedGoal = await tx.sharedGoal.findUnique({
        where: { id: sharedGoalId },
        include: { linkedGoals: true }
      });

      if (!sharedGoal) throw new Error("Shared goal not found");

      // 2. For each linked goal, upsert the achievement for the given quarter
      const syncResults = await Promise.all(
        sharedGoal.linkedGoals.map((goal) =>
          tx.goalAchievement.upsert({
            where: {
              goalId_quarter: {
                goalId: goal.id,
                quarter: data.quarter,
              },
            },
            create: {
              goalId: goal.id,
              quarter: data.quarter,
              value: data.value,
              status: data.status,
              notes: data.notes,
            },
            update: {
              value: data.value,
              status: data.status,
              notes: data.notes,
            },
          })
        )
      );

      // 3. Log the sync action
      await tx.auditLog.create({
        data: {
          userId: managerId,
          action: "SHARED_GOAL_ACHIEVEMENT_SYNC",
          entityType: "SharedGoal",
          entityId: sharedGoalId,
          newValue: JSON.parse(JSON.stringify({ ...data, affectedGoals: sharedGoal.linkedGoals.length })),
        },
      });

      return syncResults;
    });
    await CacheService.clearAll();
    return result;
  }
}
