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
  static async getQoQTrends(cycleId: string = "2024"): Promise<QoQTrendItem[]> {
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
  static async getCompletionRates(cycleId: string = "2024"): Promise<CompletionRatesResult> {
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
    cycleId: string = "2024",
    quarter: number = 1
  ): Promise<ManagerEffectivenessItem[]> {
    const cacheKey = `analytics:manager:${cycleId}:${quarter}`;
    const cached = await CacheService.get<ManagerEffectivenessItem[]>(cacheKey);
    if (cached) return cached;

    // Get all managers and their direct team details (optimized with select)
    const managers = await db.user.findMany({
      where: {
        OR: [
          { role: Role.MANAGER },
          { role: Role.ADMIN },
          { subordinates: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        subordinates: {
          select: {
            id: true,
            goalSheets: {
              where: { cycleId },
              select: {
                status: true,
                goals: {
                  select: {
                    uomType: true,
                    target: true,
                    weightage: true,
                    achievements: {
                      where: { quarter },
                      select: {
                        value: true,
                      },
                    },
                  },
                },
              },
            },
            checkIns: {
              where: { quarter },
              select: {
                managerComment: true,
              },
            },
          },
        },
      },
    });

    const result: ManagerEffectivenessItem[] = [];

    for (const manager of managers) {
      const subordinateCount = manager.subordinates.length;
      if (subordinateCount === 0) continue; // Skip managers with zero active direct reports

      let approvedSheets = 0;
      let pendingApproval = 0;
      let draftOrRework = 0;

      let submittedCheckIns = 0;
      let reviewedCheckIns = 0;

      let teamProgressSum = 0;
      let sheetsWithApprovedGoals = 0;

      for (const sub of manager.subordinates) {
        const sheet = sub.goalSheets[0] || null;

        if (sheet) {
          if (sheet.status === GoalStatus.APPROVED) {
            approvedSheets++;

            // Calculate progress for the active quarter
            if (sheet.goals.length > 0) {
              sheetsWithApprovedGoals++;
              const mappedGoals = sheet.goals.map((goal) => {
                const ach = goal.achievements[0] || null;
                const achievementValue = ach ? ach.value : 0;
                return {
                  uomType: goal.uomType,
                  target: goal.target,
                  achievementValue,
                  weightage: goal.weightage,
                };
              });
              const progress = ProgressCalculator.calculateWeightedProgress(mappedGoals);
              teamProgressSum += progress;
            }
          } else if (sheet.status === GoalStatus.SUBMITTED || sheet.status === GoalStatus.UNDER_REVIEW) {
            pendingApproval++;
          } else {
            draftOrRework++;
          }
        } else {
          draftOrRework++;
        }

        // Subordinate check-ins
        const checkIn = sub.checkIns[0] || null;
        if (checkIn) {
          submittedCheckIns++;
          if (checkIn.managerComment !== null) {
            reviewedCheckIns++;
          }
        }
      }

      const approvalRate = subordinateCount > 0 ? (approvedSheets / subordinateCount) * 100 : 0;
      const reviewRate = submittedCheckIns > 0 ? (reviewedCheckIns / submittedCheckIns) * 100 : 100;
      const averageTeamProgress = sheetsWithApprovedGoals > 0 ? teamProgressSum / sheetsWithApprovedGoals : 0;

      result.push({
        managerId: manager.id,
        managerName: manager.name || "Unnamed Manager",
        managerEmail: manager.email,
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
      });
    }

    const sortedResult = result.sort((a, b) => b.averageTeamProgress - a.averageTeamProgress);
    await CacheService.set(cacheKey, sortedResult);
    return sortedResult;
  }

  /**
   * Compares department (manager team) completion levels, progress distribution, and Thrust Area performance.
   */
  static async getDepartmentPerformance(
    cycleId: string = "2024",
    quarter: number = 1
  ): Promise<DepartmentPerformanceItem[]> {
    const cacheKey = `analytics:dept:${cycleId}:${quarter}`;
    const cached = await CacheService.get<DepartmentPerformanceItem[]>(cacheKey);
    if (cached) return cached;

    // Similar query as manager effectiveness to calculate distribution & thrust area details
    const managers = await db.user.findMany({
      where: {
        OR: [
          { role: Role.MANAGER },
          { role: Role.ADMIN },
          { subordinates: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        subordinates: {
          select: {
            goalSheets: {
              where: { cycleId },
              select: {
                status: true,
                goals: {
                  select: {
                    thrustArea: true,
                    uomType: true,
                    target: true,
                    weightage: true,
                    achievements: {
                      where: { quarter },
                      select: {
                        value: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const result: DepartmentPerformanceItem[] = [];

    for (const manager of managers) {
      const totalEmployees = manager.subordinates.length;
      if (totalEmployees === 0) continue;

      let approvedSheetsCount = 0;
      let teamProgressSum = 0;
      let sheetsWithApprovedGoals = 0;

      const progressDistribution = {
        offTrack: 0,
        needsAttention: 0,
        onTrack: 0,
        completed: 0,
      };

      // Thrust area aggregation: thrustArea -> { totalProgress, count }
      const thrustAreaMap: Record<string, { totalProgress: number; count: number }> = {};

      for (const sub of manager.subordinates) {
        const sheet = sub.goalSheets[0] || null;
        if (sheet && sheet.status === GoalStatus.APPROVED) {
          approvedSheetsCount++;

          if (sheet.goals.length > 0) {
            sheetsWithApprovedGoals++;
            const mappedGoals = sheet.goals.map((goal) => {
              const ach = goal.achievements[0] || null;
              const achievementValue = ach ? ach.value : 0;
              
              // Calculate single goal clamped progress for thrust area analysis
              const goalProgress = ProgressCalculator.calculate(
                goal.uomType,
                goal.target,
                achievementValue
              );

              // Standardize thrust area name
              const tArea = (goal.thrustArea || "General").trim();
              if (!thrustAreaMap[tArea]) {
                thrustAreaMap[tArea] = { totalProgress: 0, count: 0 };
              }
              thrustAreaMap[tArea].totalProgress += goalProgress.clamped;
              thrustAreaMap[tArea].count++;

              return {
                uomType: goal.uomType,
                target: goal.target,
                achievementValue,
                weightage: goal.weightage,
              };
            });

            const overallSheetProgress = ProgressCalculator.calculateWeightedProgress(mappedGoals);
            teamProgressSum += overallSheetProgress;

            // Distribute sheet progress
            if (overallSheetProgress < 50) {
              progressDistribution.offTrack++;
            } else if (overallSheetProgress < 75) {
              progressDistribution.needsAttention++;
            } else if (overallSheetProgress < 100) {
              progressDistribution.onTrack++;
            } else {
              progressDistribution.completed++;
            }
          } else {
            progressDistribution.offTrack++;
          }
        } else {
          progressDistribution.offTrack++;
        }
      }

      const averageProgress = sheetsWithApprovedGoals > 0 ? teamProgressSum / sheetsWithApprovedGoals : 0;

      // Map thrust area results
      const thrustAreaPerformance = Object.entries(thrustAreaMap).map(([thrustArea, data]) => ({
        thrustArea,
        goalCount: data.count,
        averageProgress: Math.round((data.totalProgress / data.count) * 100) / 100,
      })).sort((a, b) => b.averageProgress - a.averageProgress);

      result.push({
        managerId: manager.id,
        managerName: manager.name || "Unnamed Manager",
        managerEmail: manager.email,
        totalEmployees,
        approvedSheetsCount,
        averageProgress: Math.round(averageProgress * 100) / 100,
        progressDistribution,
        thrustAreaPerformance,
      });
    }

    const sortedResult = result.sort((a, b) => b.averageProgress - a.averageProgress);
    await CacheService.set(cacheKey, sortedResult);
    return sortedResult;
  }
}
