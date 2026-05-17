import { db } from "@/lib/db/db";
import { SharedGoalFormData, SharedGoalAchievementData } from "@/lib/validators/shared-goal";
import { CacheService } from "./cache-service";
import { Role } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@/lib/security/api";

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
    await CacheService.invalidateAnalytics("2026");
    return res;
  }

  /**
   * Assigns a shared goal to multiple users
   */
  static async assignSharedGoal(sharedGoalId: string, userIds: string[], actorId: string, actorRole: Role) {
    await this.assertCanManageSharedGoal(sharedGoalId, actorId, actorRole);
    await this.assertAssignableUsers(userIds, actorId, actorRole);

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
          userId: actorId,
          action: "SHARED_GOAL_ASSIGN",
          entityType: "SharedGoal",
          entityId: sharedGoalId,
          newValue: { assignedUsers: userIds },
        },
      });

      return assignments;
    });
    await CacheService.invalidateAnalytics("2026");
    return result;
  }

  /**
   * Fetches shared goals created by a user with pagination
   */
  static async getCreatedSharedGoals(creatorId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.sharedGoal.findMany({
        where: { creatorId },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.sharedGoal.count({ where: { creatorId } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    };
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
  static async updateSharedGoal(sharedGoalId: string, actorId: string, actorRole: Role, data: SharedGoalFormData) {
    await this.assertCanManageSharedGoal(sharedGoalId, actorId, actorRole);

    const updatedSharedGoal = await db.sharedGoal.update({
      where: { id: sharedGoalId },
      data,
    });

    await this.syncSharedGoalMetadata(sharedGoalId, actorId, actorRole);
    return updatedSharedGoal;
  }

  static async syncSharedGoalMetadata(sharedGoalId: string, actorId: string, actorRole: Role) {
    await this.assertCanManageSharedGoal(sharedGoalId, actorId, actorRole);

    const sharedGoal = await db.sharedGoal.findUnique({
      where: { id: sharedGoalId },
    });

    if (!sharedGoal) throw new NotFoundError("Shared goal not found");

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

    const firstLinkedGoal = await db.goal.findFirst({
      where: { sharedGoalId },
      select: {
        goalSheet: {
          select: { cycleId: true }
        }
      }
    });
    const cycleId = firstLinkedGoal?.goalSheet?.cycleId || "2026";
    await CacheService.invalidateAnalytics(cycleId);
    return res;
  }

  /**
   * Updates achievement for a shared goal and syncs it to all linked employee goals.
   * This implements Step 23.
   */
  static async updateAchievement(sharedGoalId: string, actorId: string, actorRole: Role, data: SharedGoalAchievementData) {
    await this.assertCanManageSharedGoal(sharedGoalId, actorId, actorRole);

    const result = await db.$transaction(async (tx) => {
      // 1. Verify shared goal existence
      const sharedGoal = await tx.sharedGoal.findUnique({
        where: { id: sharedGoalId },
        include: { linkedGoals: true }
      });

      if (!sharedGoal) throw new NotFoundError("Shared goal not found");

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
          userId: actorId,
          action: "SHARED_GOAL_ACHIEVEMENT_SYNC",
          entityType: "SharedGoal",
          entityId: sharedGoalId,
          newValue: JSON.parse(JSON.stringify({ ...data, affectedGoals: sharedGoal.linkedGoals.length })),
        },
      });

      return syncResults;
    });

    const firstLinkedGoal = await db.goal.findFirst({
      where: { sharedGoalId },
      select: {
        goalSheet: {
          select: { cycleId: true }
        }
      }
    });
    const cycleId = firstLinkedGoal?.goalSheet?.cycleId || "2026";
    await CacheService.invalidateAnalytics(cycleId, data.quarter);
    return result;
  }

  private static async assertCanManageSharedGoal(sharedGoalId: string, actorId: string, actorRole: Role) {
    const sharedGoal = await db.sharedGoal.findUnique({
      where: { id: sharedGoalId },
      select: { creatorId: true },
    });

    if (!sharedGoal) {
      throw new NotFoundError("Shared goal not found");
    }

    if (actorRole !== Role.ADMIN && sharedGoal.creatorId !== actorId) {
      throw new ForbiddenError("You are not authorized to manage this shared goal.");
    }
  }

  private static async assertAssignableUsers(userIds: string[], actorId: string, actorRole: Role) {
    if (actorRole === Role.ADMIN) return;

    const uniqueUserIds = [...new Set(userIds)];
    const subordinateCount = await db.user.count({
      where: {
        id: { in: uniqueUserIds },
        managerId: actorId,
      },
    });

    if (subordinateCount !== uniqueUserIds.length) {
      throw new ForbiddenError("Shared goals can only be assigned to your direct reports.");
    }
  }
}
