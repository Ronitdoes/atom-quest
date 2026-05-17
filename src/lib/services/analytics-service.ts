import { db } from "@/lib/db/db";
import { GoalStatus, Role } from "@prisma/client";
import { ProgressCalculator } from "./progress-calculator";
import { CacheService } from "./cache-service";

export interface QoQTrendItem {
  quarter: number;
  averageProgress: number;
  statusDistribution: {
    notStarted: number;
    onTrack: number;
    completed: number;
  };
}

export interface CompletionRatesResult {
  goalSheets: {
    total: number;
    submissionRate: number;
    approvalRate: number;
    distribution: {
      DRAFT: number;
      SUBMITTED: number;
      UNDER_REVIEW: number;
      APPROVED: number;
      REWORK_REQUIRED: number;
    };
  };
  quarterlyCheckIns: Array<{
    quarter: number;
    submitted: number;
    reviewed: number;
    pending: number;
    submissionRate: number;
    reviewRate: number;
  }>;
}

export interface ManagerEffectivenessItem {
  managerId: string;
  managerName: string;
  managerEmail: string;
  subordinateCount: number;
  goalSheets: {
    approved: number;
    pendingApproval: number;
    draftOrRework: number;
    approvalRate: number;
  };
  checkIns: {
    submitted: number;
    reviewed: number;
    pending: number;
    reviewRate: number;
  };
  averageTeamProgress: number; // For active quarter
}

export interface DepartmentPerformanceItem {
  managerId: string;
  managerName: string;
  managerEmail: string;
  totalEmployees: number;
  approvedSheetsCount: number;
  averageProgress: number; // Weighted progress in selected/active quarter
  progressDistribution: {
    offTrack: number;       // < 50%
    needsAttention: number; // 50% - 75%
    onTrack: number;        // 75% - 99%
    completed: number;      // >= 100%
  };
  thrustAreaPerformance: Array<{
    thrustArea: string;
    goalCount: number;
    averageProgress: number;
  }>;
}

export class AnalyticsService {
  /**
   * Calculates Quarter-over-Quarter trends for weighted progress and achievement status distribution.
   */
  static async getQoQTrends(cycleId: string = "2026"): Promise<QoQTrendItem[]> {
    const cacheKey = `analytics:qoq:${cycleId}`;
    const cached = await CacheService.get<QoQTrendItem[]>(cacheKey);
    if (cached) return cached;

    // 1. Get all approved goal sheets for the cycle (optimized with select)
    const goalSheets = await db.goalSheet.findMany({
      where: {
        cycleId,
        status: GoalStatus.APPROVED,
      },
      select: {
        goals: {
          select: {
            uomType: true,
            target: true,
            weightage: true,
            achievements: {
              select: {
                quarter: true,
                value: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (goalSheets.length === 0) {
      return [1, 2, 3, 4].map((q) => ({
        quarter: q,
        averageProgress: 0,
        statusDistribution: { notStarted: 0, onTrack: 0, completed: 0 },
      }));
    }

    const result = [1, 2, 3, 4].map((q) => {
      let totalProgressSum = 0;
      let sheetsCount = 0;

      const statusCounts = {
        "Not Started": 0,
        "On Track": 0,
        "Completed": 0,
      };
      let totalAchievementsCount = 0;

      for (const sheet of goalSheets) {
        if (sheet.goals.length === 0) continue;

        sheetsCount++;
        const mappedGoals = sheet.goals.map((goal) => {
          const ach = goal.achievements.find((a) => a.quarter === q);
          const achievementValue = ach ? ach.value : 0;
          const status = (ach ? ach.status : "Not Started") as keyof typeof statusCounts;

          if (status in statusCounts) {
            statusCounts[status]++;
          } else {
            statusCounts["Not Started"]++;
          }
          totalAchievementsCount++;

          return {
            uomType: goal.uomType,
            target: goal.target,
            achievementValue,
            weightage: goal.weightage,
          };
        });

        const sheetProgress = ProgressCalculator.calculateWeightedProgress(mappedGoals);
        totalProgressSum += sheetProgress;
      }

      const averageProgress = sheetsCount > 0 ? totalProgressSum / sheetsCount : 0;

      // Status percentages
      const notStarted = totalAchievementsCount > 0 
        ? (statusCounts["Not Started"] / totalAchievementsCount) * 100 
        : 0;
      const onTrack = totalAchievementsCount > 0 
        ? (statusCounts["On Track"] / totalAchievementsCount) * 100 
        : 0;
      const completed = totalAchievementsCount > 0 
        ? (statusCounts["Completed"] / totalAchievementsCount) * 100 
        : 0;

      return {
        quarter: q,
        averageProgress: Math.round(averageProgress * 100) / 100,
        statusDistribution: {
          notStarted: Math.round(notStarted),
          onTrack: Math.round(onTrack),
          completed: Math.round(completed),
        },
      };
    });

    await CacheService.set(cacheKey, result);
    return result;
  }

  /**
   * Computes goal sheet and check-in completion rates.
   */
  static async getCompletionRates(cycleId: string = "2026"): Promise<CompletionRatesResult> {
    const cacheKey = `analytics:completion:${cycleId}`;
    const cached = await CacheService.get<CompletionRatesResult>(cacheKey);
    if (cached) return cached;

    const totalEmployees = await db.user.count({
      where: { role: Role.EMPLOYEE },
    });

    const goalSheets = await db.goalSheet.findMany({
      where: { cycleId },
      select: { status: true },
    });

    const distribution = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REWORK_REQUIRED: 0,
    };

    goalSheets.forEach((sheet) => {
      if (sheet.status in distribution) {
        distribution[sheet.status as keyof typeof distribution]++;
      }
    });

    const submittedCount = goalSheets.filter(
      (sheet) => sheet.status !== GoalStatus.DRAFT
    ).length;

    const submissionRate = totalEmployees > 0 ? (submittedCount / totalEmployees) * 100 : 0;
    const approvalRate = totalEmployees > 0 ? (distribution.APPROVED / totalEmployees) * 100 : 0;

    const approvedSheetsCount = distribution.APPROVED;

    // Check-in rates per quarter
    const quarterlyCheckIns = await Promise.all(
      [1, 2, 3, 4].map(async (q) => {
        const checkIns = await db.checkIn.findMany({
          where: {
            cycleId,
            quarter: q,
            user: {
              goalSheets: {
                some: {
                  cycleId,
                  status: GoalStatus.APPROVED,
                },
              },
            },
          },
          select: {
            managerComment: true,
          },
        });

        const submitted = checkIns.length;
        const reviewed = checkIns.filter((c) => c.managerComment !== null).length;
        const pending = submitted - reviewed;

        const checkInSubmissionRate = approvedSheetsCount > 0 
          ? (submitted / approvedSheetsCount) * 100 
          : 0;
        const checkInReviewRate = submitted > 0 
          ? (reviewed / submitted) * 100 
          : 100; // 100% review rate if nothing is submitted

        return {
          quarter: q,
          submitted,
          reviewed,
          pending,
          submissionRate: Math.round(checkInSubmissionRate * 100) / 100,
          reviewRate: Math.round(checkInReviewRate * 100) / 100,
        };
      })
    );

    const result = {
      goalSheets: {
        total: goalSheets.length,
        submissionRate: Math.round(submissionRate * 100) / 100,
        approvalRate: Math.round(approvalRate * 100) / 100,
        distribution,
      },
      quarterlyCheckIns,
    };

    await CacheService.set(cacheKey, result);
    return result;
  }

  /**
   * Aggregates manager effectiveness ratings, approval, and check-in review performance.
   */
  static async getManagerEffectiveness(
    cycleId: string = "2026",
    quarter: number = 1
  ): Promise<ManagerEffectivenessItem[]> {
    const cacheKey = `analytics:manager:${cycleId}:${quarter}`;
    const cached = await CacheService.get<ManagerEffectivenessItem[]>(cacheKey);
    if (cached) return cached;

    // Direct PostgreSQL query executing weighted sheet progress and manager metrics in a single database roundtrip
    const rawData = await db.$queryRaw<any[]>`
      WITH TeamGoals AS (
        SELECT 
          g."goalSheetId",
          COALESCE(
            SUM(
              LEAST(100.0, GREATEST(0.0, 
                CASE 
                  WHEN g."uomType" = 'NUMERIC_MAX' THEN
                    CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END ELSE (COALESCE(a."value", 0.0) / g."target") * 100.0 END
                  WHEN g."uomType" IN ('NUMERIC_MIN', 'TIMELINE') THEN
                    CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) <= g."target" THEN 100.0 ELSE 0.0 END ELSE 100.0 + ((g."target" - COALESCE(a."value", 0.0)) / g."target") * 100.0 END
                  WHEN g."uomType" = 'ZERO_BASED' THEN
                    CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END
                  ELSE 0.0
                END
              )) * (g."weightage" / 100.0)
            ) / NULLIF(SUM(g."weightage") / 100.0, 0.0),
            0.0
          ) AS "sheetProgress"
        FROM "Goal" g
        LEFT JOIN "GoalAchievement" a ON a."goalId" = g."id" AND a."quarter" = ${quarter}
        GROUP BY g."goalSheetId"
      ),
      SubordinateStats AS (
        SELECT 
          u."managerId",
          COUNT(u."id") AS "subordinateCount",
          COUNT(CASE WHEN gs."status" = 'APPROVED' THEN 1 END) AS "approvedSheetsCount",
          COUNT(CASE WHEN gs."status" IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 END) AS "pendingApprovalCount",
          COUNT(CASE WHEN gs."status" IS NULL OR gs."status" IN ('DRAFT', 'REWORK_REQUIRED') THEN 1 END) AS "draftOrReworkCount",
          COUNT(c."id") AS "submittedCheckInsCount",
          COUNT(CASE WHEN c."managerComment" IS NOT NULL THEN 1 END) AS "reviewedCheckInsCount",
          COALESCE(AVG(tg."sheetProgress") FILTER (WHERE gs."status" = 'APPROVED' AND EXISTS (SELECT 1 FROM "Goal" gl WHERE gl."goalSheetId" = gs."id")), 0.0) AS "avgTeamProgress"
        FROM "User" u
        LEFT JOIN "GoalSheet" gs ON gs."userId" = u."id" AND gs."cycleId" = ${cycleId}
        LEFT JOIN "CheckIn" c ON c."userId" = u."id" AND c."cycleId" = ${cycleId} AND c."quarter" = ${quarter}
        LEFT JOIN TeamGoals tg ON tg."goalSheetId" = gs."id"
        GROUP BY u."managerId"
      )
      SELECT 
        m."id" AS "managerId",
        COALESCE(m."name", 'Unnamed Manager') AS "managerName",
        m."email" AS "managerEmail",
        CAST(COALESCE(ss."subordinateCount", 0) AS INTEGER) AS "subordinateCount",
        CAST(COALESCE(ss."approvedSheetsCount", 0) AS INTEGER) AS "approvedSheets",
        CAST(COALESCE(ss."pendingApprovalCount", 0) AS INTEGER) AS "pendingApproval",
        CAST(COALESCE(ss."draftOrReworkCount", 0) AS INTEGER) AS "draftOrRework",
        CAST(COALESCE(ss."submittedCheckInsCount", 0) AS INTEGER) AS "submittedCheckIns",
        CAST(COALESCE(ss."reviewedCheckInsCount", 0) AS INTEGER) AS "reviewedCheckIns",
        CAST(COALESCE(ss."avgTeamProgress", 0.0) AS DOUBLE PRECISION) AS "averageTeamProgress"
      FROM "User" m
      LEFT JOIN SubordinateStats ss ON ss."managerId" = m."id"
      WHERE (m."role" IN ('MANAGER', 'ADMIN') OR EXISTS (SELECT 1 FROM "User" s WHERE s."managerId" = m."id"))
        AND COALESCE(ss."subordinateCount", 0) > 0
    `;

    const result: ManagerEffectivenessItem[] = rawData.map((row) => {
      const subordinateCount = Number(row.subordinateCount);
      const approvedSheets = Number(row.approvedSheets);
      const pendingApproval = Number(row.pendingApproval);
      const draftOrRework = Number(row.draftOrRework);
      const submittedCheckIns = Number(row.submittedCheckIns);
      const reviewedCheckIns = Number(row.reviewedCheckIns);
      const averageTeamProgress = Number(row.averageTeamProgress);

      const approvalRate = subordinateCount > 0 ? (approvedSheets / subordinateCount) * 100 : 0;
      const reviewRate = submittedCheckIns > 0 ? (reviewedCheckIns / submittedCheckIns) * 100 : 100;

      return {
        managerId: row.managerId,
        managerName: row.managerName,
        managerEmail: row.managerEmail,
        subordinateCount,
        goalSheets: {
          approved: approvedSheets,
          pendingApproval,
          draftOrRework,
          approvalRate: Math.round(approvalRate * 100) / 100,
        },
        checkIns: {
          submitted: submittedCheckIns,
          reviewed: reviewedCheckIns,
          pending: submittedCheckIns - reviewedCheckIns,
          reviewRate: Math.round(reviewRate * 100) / 100,
        },
        averageTeamProgress: Math.round(averageTeamProgress * 100) / 100,
      };
    });

    const sortedResult = result.sort((a, b) => b.averageTeamProgress - a.averageTeamProgress);
    await CacheService.set(cacheKey, sortedResult);
    return sortedResult;
  }

  /**
   * Compares department (manager team) completion levels, progress distribution, and Thrust Area performance.
   */
  static async getDepartmentPerformance(
    cycleId: string = "2026",
    quarter: number = 1
  ): Promise<DepartmentPerformanceItem[]> {
    const cacheKey = `analytics:dept:${cycleId}:${quarter}`;
    const cached = await CacheService.get<DepartmentPerformanceItem[]>(cacheKey);
    if (cached) return cached;

    // High performance departmental stats via PostgreSQL aggregates
    const rawDeptData = await db.$queryRaw<any[]>`
      WITH TeamGoals AS (
        SELECT 
          g."goalSheetId",
          COALESCE(
            SUM(
              LEAST(100.0, GREATEST(0.0, 
                CASE 
                  WHEN g."uomType" = 'NUMERIC_MAX' THEN
                    CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END ELSE (COALESCE(a."value", 0.0) / g."target") * 100.0 END
                  WHEN g."uomType" IN ('NUMERIC_MIN', 'TIMELINE') THEN
                    CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) <= g."target" THEN 100.0 ELSE 0.0 END ELSE 100.0 + ((g."target" - COALESCE(a."value", 0.0)) / g."target") * 100.0 END
                  WHEN g."uomType" = 'ZERO_BASED' THEN
                    CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END
                  ELSE 0.0
                END
              )) * (g."weightage" / 100.0)
            ) / NULLIF(SUM(g."weightage") / 100.0, 0.0),
            0.0
          ) AS "sheetProgress"
        FROM "Goal" g
        LEFT JOIN "GoalAchievement" a ON a."goalId" = g."id" AND a."quarter" = ${quarter}
        GROUP BY g."goalSheetId"
      ),
      DeptStats AS (
        SELECT 
          u."managerId",
          COUNT(u."id") AS "totalEmployees",
          COUNT(CASE WHEN gs."status" = 'APPROVED' THEN 1 END) AS "approvedSheetsCount",
          COALESCE(AVG(tg."sheetProgress") FILTER (WHERE gs."status" = 'APPROVED' AND EXISTS (SELECT 1 FROM "Goal" gl WHERE gl."goalSheetId" = gs."id")), 0.0) AS "avgProgress",
          COUNT(CASE WHEN gs."status" = 'APPROVED' AND tg."sheetProgress" < 50.0 THEN 1 
                     WHEN gs."status" IS NULL OR gs."status" != 'APPROVED' THEN 1 END) AS "offTrackCount",
          COUNT(CASE WHEN gs."status" = 'APPROVED' AND tg."sheetProgress" >= 50.0 AND tg."sheetProgress" < 75.0 THEN 1 END) AS "needsAttentionCount",
          COUNT(CASE WHEN gs."status" = 'APPROVED' AND tg."sheetProgress" >= 75.0 AND tg."sheetProgress" < 100.0 THEN 1 END) AS "onTrackCount",
          COUNT(CASE WHEN gs."status" = 'APPROVED' AND tg."sheetProgress" >= 100.0 THEN 1 END) AS "completedCount"
        FROM "User" u
        LEFT JOIN "GoalSheet" gs ON gs."userId" = u."id" AND gs."cycleId" = ${cycleId}
        LEFT JOIN TeamGoals tg ON tg."goalSheetId" = gs."id"
        GROUP BY u."managerId"
      )
      SELECT 
        m."id" AS "managerId",
        COALESCE(m."name", 'Unnamed Manager') AS "managerName",
        m."email" AS "managerEmail",
        CAST(COALESCE(ds."totalEmployees", 0) AS INTEGER) AS "totalEmployees",
        CAST(COALESCE(ds."approvedSheetsCount", 0) AS INTEGER) AS "approvedSheetsCount",
        CAST(COALESCE(ds."avgProgress", 0.0) AS DOUBLE PRECISION) AS "avgProgress",
        CAST(COALESCE(ds."offTrackCount", 0) AS INTEGER) AS "offTrack",
        CAST(COALESCE(ds."needsAttentionCount", 0) AS INTEGER) AS "needsAttention",
        CAST(COALESCE(ds."onTrackCount", 0) AS INTEGER) AS "onTrack",
        CAST(COALESCE(ds."completedCount", 0) AS INTEGER) AS "completed"
      FROM "User" m
      LEFT JOIN DeptStats ds ON ds."managerId" = m."id"
      WHERE (m."role" IN ('MANAGER', 'ADMIN') OR EXISTS (SELECT 1 FROM "User" s WHERE s."managerId" = m."id"))
        AND COALESCE(ds."totalEmployees", 0) > 0
    `;

    // Fetch thrust area performance direct in SQL
    const rawThrustData = await db.$queryRaw<any[]>`
      SELECT 
        u."managerId",
        g."thrustArea",
        COUNT(g."id") AS "goalCount",
        COALESCE(
          AVG(
            LEAST(100.0, GREATEST(0.0, 
              CASE 
                WHEN g."uomType" = 'NUMERIC_MAX' THEN
                  CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END ELSE (COALESCE(a."value", 0.0) / g."target") * 100.0 END
                WHEN g."uomType" IN ('NUMERIC_MIN', 'TIMELINE') THEN
                  CASE WHEN g."target" <= 0.0 THEN CASE WHEN COALESCE(a."value", 0.0) <= g."target" THEN 100.0 ELSE 0.0 END ELSE 100.0 + ((g."target" - COALESCE(a."value", 0.0)) / g."target") * 100.0 END
                WHEN g."uomType" = 'ZERO_BASED' THEN
                  CASE WHEN COALESCE(a."value", 0.0) >= g."target" THEN 100.0 ELSE 0.0 END
                ELSE 0.0
              END
            ))
          ),
          0.0
        ) AS "avgProgress"
      FROM "Goal" g
      JOIN "GoalSheet" gs ON gs."id" = g."goalSheetId" AND gs."status" = 'APPROVED' AND gs."cycleId" = ${cycleId}
      JOIN "User" u ON u."id" = gs."userId"
      LEFT JOIN "GoalAchievement" a ON a."goalId" = g."id" AND a."quarter" = ${quarter}
      GROUP BY u."managerId", g."thrustArea"
    `;

    // Group thrust performance by managerId
    const thrustAreaByManager: Record<
      string,
      Array<{ thrustArea: string; goalCount: number; averageProgress: number }>
    > = {};

    for (const row of rawThrustData) {
      const mId = row.managerId;
      if (!mId) continue;
      if (!thrustAreaByManager[mId]) {
        thrustAreaByManager[mId] = [];
      }
      thrustAreaByManager[mId].push({
        thrustArea: (row.thrustArea || "General").trim(),
        goalCount: Number(row.goalCount),
        averageProgress: Math.round(Number(row.avgProgress) * 100) / 100,
      });
    }

    // Sort thrust area performance inside each manager group
    for (const mId in thrustAreaByManager) {
      thrustAreaByManager[mId].sort((a, b) => b.averageProgress - a.averageProgress);
    }

    const result: DepartmentPerformanceItem[] = rawDeptData.map((row) => {
      const managerId = row.managerId;
      const totalEmployees = Number(row.totalEmployees);
      const approvedSheetsCount = Number(row.approvedSheetsCount);
      const avgProgress = Number(row.avgProgress);
      const offTrack = Number(row.offTrack);
      const needsAttention = Number(row.needsAttention);
      const onTrack = Number(row.onTrack);
      const completed = Number(row.completed);

      return {
        managerId,
        managerName: row.managerName,
        managerEmail: row.managerEmail,
        totalEmployees,
        approvedSheetsCount,
        averageProgress: Math.round(avgProgress * 100) / 100,
        progressDistribution: {
          offTrack,
          needsAttention,
          onTrack,
          completed,
        },
        thrustAreaPerformance: thrustAreaByManager[managerId] || [],
      };
    });

    const sortedResult = result.sort((a, b) => b.averageProgress - a.averageProgress);
    await CacheService.set(cacheKey, sortedResult);
    return sortedResult;
  }
}
