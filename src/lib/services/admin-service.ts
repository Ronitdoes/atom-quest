import { db } from "@/lib/db/db";
import { GoalStatus, Role } from "@prisma/client";
import { ProgressCalculator } from "./progress-calculator";
import { CacheService } from "./cache-service";

export class AdminService {
  /**
   * Unlocks an approved goal sheet by an administrator
   */
  static async unlockGoalSheet(sheetId: string, adminId: string, reason: string) {
    const sheet = await db.goalSheet.findUnique({
      where: { id: sheetId },
      include: { user: true }
    });

    if (!sheet) throw new Error("Goal sheet not found.");
    
    // In some cases, we might want to unlock even if not APPROVED (e.g. if stuck in SUBMITTED)
    // but the BRD specifically mentions locking after approval.
    // For MVP, let's allow unlocking anything that is NOT DRAFT.
    if (sheet.status === GoalStatus.DRAFT) {
      throw new Error("Goal sheet is already editable (DRAFT status).");
    }

    const result = await db.$transaction(async (tx) => {
      // Transition to REWORK_REQUIRED so it's clearly marked as "sent back"
      // or DRAFT if preferred. The guide says LOCKED -> EDITABLE.
      // Using REWORK_REQUIRED allows us to store the admin reason in managerComment.
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: {
          status: GoalStatus.REWORK_REQUIRED,
          managerComment: `ADMIN UNLOCK: ${reason}`,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "GOAL_SHEET_UNLOCK",
          entityType: "GoalSheet",
          entityId: sheetId,
          newValue: { status: GoalStatus.REWORK_REQUIRED, reason },
        },
      });

      // Notify employee
      await tx.notification.create({
        data: {
          userId: sheet.userId,
          title: "Goal Sheet Unlocked",
          message: `Your goal sheet for cycle ${sheet.cycleId} has been unlocked by an administrator. Reason: ${reason}`,
          type: "GOAL_UNLOCKED",
          link: `/employee/goals`,
        },
      });

      // Notify manager too
      if (sheet.user.managerId) {
        await tx.notification.create({
          data: {
            userId: sheet.user.managerId,
            title: "Goal Sheet Unlocked by Admin",
            message: `The goal sheet for ${sheet.user.name || "your employee"} has been unlocked by an administrator.`,
            type: "GOAL_UNLOCKED",
            link: `/manager/approvals?userId=${sheet.userId}&cycleId=${sheet.cycleId}`,
          },
        });
      }

      return updatedSheet;
    });
    await CacheService.clearAll();
    return result;
  }

  /**
   * Broadcasts system reminders via in-app notifications
   */
  static async sendSystemReminders(
    adminId: string,
    type: "GOAL_SHEET" | "GOAL_APPROVAL" | "CHECK_IN" | "CHECKIN_REVIEW",
    cycleId: string,
    quarter?: number,
    preview: boolean = false
  ): Promise<{ count: number; recipients: string[] }> {
    const qNum = quarter || 1;
    const recipients: string[] = [];

    if (type === "GOAL_SHEET") {
      const employees = await db.user.findMany({
        where: { role: Role.EMPLOYEE },
        include: {
          goalSheets: {
            where: { cycleId },
          },
        },
      });

      const targets = employees.filter((emp) => {
        const sheet = emp.goalSheets[0];
        return !sheet || sheet.status === GoalStatus.DRAFT || sheet.status === GoalStatus.REWORK_REQUIRED;
      });

      targets.forEach((t) => recipients.push(`${t.name || "Employee"} (${t.email})`));

      if (!preview && targets.length > 0) {
        await db.$transaction(async (tx) => {
          for (const target of targets) {
            await tx.notification.create({
              data: {
                userId: target.id,
                title: "Action Required: Submit Your Goal Sheet",
                message: `Please set and submit your performance goals for cycle ${cycleId} as soon as possible.`,
                type: "CHECKIN_DUE",
                link: "/employee/goals",
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: "REMINDER_BROADCAST",
              entityType: "System",
              entityId: `goalsheet-reminders-${cycleId}`,
              newValue: { type, cycleId, count: targets.length },
            },
          });
        });
      }

      return { count: targets.length, recipients };
    }

    if (type === "GOAL_APPROVAL") {
      const sheets = await db.goalSheet.findMany({
        where: {
          cycleId,
          status: {
            in: [GoalStatus.SUBMITTED, GoalStatus.UNDER_REVIEW],
          },
        },
        include: {
          user: {
            select: {
              name: true,
              managerId: true,
            },
          },
        },
      });

      const targets = sheets.filter((s) => s.user.managerId);

      targets.forEach((t) => recipients.push(`Manager for ${t.user.name || "Employee"} (Sheet ID: ${t.id})`));

      if (!preview && targets.length > 0) {
        await db.$transaction(async (tx) => {
          for (const sheet of targets) {
            if (sheet.user.managerId) {
              await tx.notification.create({
                data: {
                  userId: sheet.user.managerId,
                  title: "Action Required: Goal Sheet Pending Approval",
                  message: `Please review the submitted goal sheet for ${sheet.user.name || "your subordinate"} for cycle ${cycleId}.`,
                  type: "CHECKIN_DUE",
                  link: `/manager/approvals?userId=${sheet.userId}&cycleId=${cycleId}`,
                },
              });
            }
          }

          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: "REMINDER_BROADCAST",
              entityType: "System",
              entityId: `approval-reminders-${cycleId}`,
              newValue: { type, cycleId, count: targets.length },
            },
          });
        });
      }

      return { count: targets.length, recipients };
    }

    if (type === "CHECK_IN") {
      const approvedSheets = await db.goalSheet.findMany({
        where: {
          cycleId,
          status: GoalStatus.APPROVED,
        },
        include: {
          user: {
            include: {
              checkIns: {
                where: { quarter: qNum },
              },
            },
          },
        },
      });

      const targets = approvedSheets.filter((s) => s.user.checkIns.length === 0);

      targets.forEach((t) => recipients.push(`${t.user.name || "Employee"} (${t.user.email})`));

      if (!preview && targets.length > 0) {
        await db.$transaction(async (tx) => {
          for (const sheet of targets) {
            await tx.notification.create({
              data: {
                userId: sheet.userId,
                title: `Action Required: Q${qNum} Check-In Due`,
                message: `Please complete your Q${qNum} performance progress update for cycle ${cycleId}.`,
                type: "CHECKIN_DUE",
                link: `/employee/check-ins?quarter=${qNum}`,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: "REMINDER_BROADCAST",
              entityType: "System",
              entityId: `checkin-reminders-${cycleId}-q${qNum}`,
              newValue: { type, cycleId, quarter: qNum, count: targets.length },
            },
          });
        });
      }

      return { count: targets.length, recipients };
    }

    if (type === "CHECKIN_REVIEW") {
      const checkIns = await db.checkIn.findMany({
        where: {
          quarter: qNum,
          managerComment: null,
          user: {
            goalSheets: {
              some: {
                cycleId,
                status: GoalStatus.APPROVED,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              name: true,
              managerId: true,
            },
          },
        },
      });

      const targets = checkIns.filter((c) => c.user.managerId);

      targets.forEach((t) => recipients.push(`Manager for ${t.user.name || "Employee"} (Check-in ID: ${t.id})`));

      if (!preview && targets.length > 0) {
        await db.$transaction(async (tx) => {
          for (const checkIn of targets) {
            if (checkIn.user.managerId) {
              await tx.notification.create({
                data: {
                  userId: checkIn.user.managerId,
                  title: `Action Required: Q${qNum} Check-In Review Pending`,
                  message: `Please review and provide feedback on the Q${qNum} check-in submitted by ${checkIn.user.name || "your employee"}.`,
                  type: "CHECKIN_DUE",
                  link: `/manager/check-ins?userId=${checkIn.userId}&quarter=${qNum}`,
                },
              });
            }
          }

          await tx.auditLog.create({
            data: {
              userId: adminId,
              action: "REMINDER_BROADCAST",
              entityType: "System",
              entityId: `checkin-review-reminders-${cycleId}-q${qNum}`,
              newValue: { type, cycleId, quarter: qNum, count: targets.length },
            },
          });
        });
      }

      return { count: targets.length, recipients };
    }

    return { count: 0, recipients: [] };
  }

  /**
   * Fetches all goal sheets for admin overview
   */
  static async getAllGoalSheets(cycleId: string = "2024") {
    return await db.goalSheet.findMany({
      where: { cycleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  /**
   * Fetches all users for administrative user management
   */
  static async getAllUsers() {
    return await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        goalSheets: {
          select: {
            id: true,
            cycleId: true,
            status: true,
            updatedAt: true,
          }
        },
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      }
    });
  }

  /**
   * Fetches all potential managers (users who are managers or admins)
   */
  static async getAllManagers() {
    return await db.user.findMany({
      where: {
        role: {
          in: [Role.MANAGER, Role.ADMIN]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Updates a user's role and supervisor
   */
  static async updateUserRoleAndManager(
    adminId: string,
    userId: string,
    role: Role,
    managerId: string | null
  ) {
    if (userId === adminId && role !== Role.ADMIN) {
      throw new Error("You cannot downgrade your own administrator role.");
    }

    if (managerId && userId === managerId) {
      throw new Error("A user cannot report to themselves.");
    }

    // Get current user details for audit logs
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, managerId: true, name: true }
    });

    if (!currentUser) throw new Error("User not found.");

    const result = await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role,
          managerId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
        }
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_UPDATE",
          entityType: "User",
          entityId: userId,
          oldValue: { role: currentUser.role, managerId: currentUser.managerId },
          newValue: { role, managerId },
        }
      });

      // Create Notification for the user
      await tx.notification.create({
        data: {
          userId,
          title: "Profile Updated by Admin",
          message: `Your account role has been set to ${role} and reporting structure has been updated.`,
          type: "USER_UPDATED",
          link: "/",
        }
      });

      return updatedUser;
    });
    await CacheService.clearAll();
    return result;
  }

  /**
   * Fetches latest audit logs with pagination support
   */
  static async getAuditLogs(limit: number = 100, page: number = 1) {
    const skip = Math.max(0, (page - 1) * limit);
    return await db.auditLog.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  /**
   * Fetches system statistics for tracking completion
   */
  static async getSystemStats(cycleId: string = "2024") {
    const cacheKey = `admin:stats:${cycleId}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const totalUsers = await db.user.count();
    const employeesCount = await db.user.count({ where: { role: Role.EMPLOYEE } });
    const managersCount = await db.user.count({ where: { role: Role.MANAGER } });
    const adminsCount = await db.user.count({ where: { role: Role.ADMIN } });

    const goalSheets = await db.goalSheet.findMany({
      where: { cycleId }
    });

    const totalSheets = goalSheets.length;

    // Distribution
    const statusCounts = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REWORK_REQUIRED: 0,
    };

    goalSheets.forEach(sheet => {
      if (sheet.status in statusCounts) {
        statusCounts[sheet.status as keyof typeof statusCounts]++;
      }
    });

    // Submission Rate: count sheets beyond draft
    const submittedCount = goalSheets.filter(
      sheet => sheet.status !== GoalStatus.DRAFT
    ).length;

    const submissionRate = employeesCount > 0 ? (submittedCount / employeesCount) * 100 : 0;
    const approvalRate = employeesCount > 0 ? (statusCounts.APPROVED / employeesCount) * 100 : 0;

    // Quarterly check-ins overview
    // Find check-ins count per quarter
    const checkIns = await db.checkIn.findMany({
      include: {
        user: {
          select: { name: true, role: true }
        }
      }
    });

    const checkInStats = [1, 2, 3, 4].map(q => {
      const qCheckIns = checkIns.filter(c => c.quarter === q);
      const reviewed = qCheckIns.filter(c => c.managerComment !== null).length;
      const pending = qCheckIns.length - reviewed;

      return {
        quarter: q,
        total: qCheckIns.length,
        reviewed,
        pending,
      };
    });

    // Fetch detailed approval backlog
    const approvalBacklog = await db.goalSheet.findMany({
      where: {
        cycleId,
        status: {
          in: [GoalStatus.SUBMITTED, GoalStatus.UNDER_REVIEW]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fetch pending check-ins
    const pendingCheckInsList = await db.checkIn.findMany({
      where: {
        managerComment: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch completed check-ins
    const completedCheckInsList = await db.checkIn.findMany({
      where: {
        managerComment: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            manager: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Fetch all employees to calculate department completion rate
    const employees = await db.user.findMany({
      where: {
        role: Role.EMPLOYEE
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        goalSheets: {
          where: {
            cycleId
          },
          select: {
            status: true
          }
        }
      }
    });

    // Group employees by manager to compute department completion
    const departmentMap: Record<string, {
      managerId: string | null;
      managerName: string;
      managerEmail: string;
      totalEmployees: number;
      approvedSheets: number;
      pendingApproval: number;
      draftOrRework: number;
    }> = {};

    employees.forEach(emp => {
      const managerId = emp.managerId;
      const key = managerId || "independent";
      const managerName = emp.manager?.name || "Independent / Other";
      const managerEmail = emp.manager?.email || "";

      if (!departmentMap[key]) {
        departmentMap[key] = {
          managerId,
          managerName,
          managerEmail,
          totalEmployees: 0,
          approvedSheets: 0,
          pendingApproval: 0,
          draftOrRework: 0
        };
      }

      departmentMap[key].totalEmployees++;

      const sheet = emp.goalSheets[0] || null;
      if (sheet) {
        if (sheet.status === GoalStatus.APPROVED) {
          departmentMap[key].approvedSheets++;
        } else if (sheet.status === GoalStatus.SUBMITTED || sheet.status === GoalStatus.UNDER_REVIEW) {
          departmentMap[key].pendingApproval++;
        } else {
          departmentMap[key].draftOrRework++;
        }
      } else {
        departmentMap[key].draftOrRework++;
      }
    });

    const departmentCompletion = Object.values(departmentMap).map(dept => {
      const completionRate = dept.totalEmployees > 0
        ? Math.round((dept.approvedSheets / dept.totalEmployees) * 100)
        : 0;

      return {
        ...dept,
        completionRate
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    const result = {
      users: {
        total: totalUsers,
        employees: employeesCount,
        managers: managersCount,
        admins: adminsCount,
      },
      goalSheets: {
        total: totalSheets,
        submissionRate: Math.round(submissionRate),
        approvalRate: Math.round(approvalRate),
        distribution: statusCounts,
      },
      checkIns: checkInStats,
      pendingCheckIns: pendingCheckInsList,
      completedCheckIns: completedCheckInsList,
      approvalBacklog: approvalBacklog,
      departmentCompletion: departmentCompletion,
    };

    await CacheService.set(cacheKey, result);
    return result;
  }

  /**
   * Fetches goal-level achievements for the active cycle and selected quarter to generate a system-wide report
   */
  static async getAchievementReport(cycleId: string = "2024", quarter: number = 1) {
    const goals = await db.goal.findMany({
      where: {
        goalSheet: {
          cycleId: cycleId,
        },
      },
      include: {
        goalSheet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        achievements: {
          where: {
            quarter: quarter,
          },
        },
      },
    });

    return goals
      .map((goal) => {
        const achievement = goal.achievements[0] || null;
        const achievementValue = achievement ? achievement.value : 0;
        const achievementStatus = achievement ? achievement.status : "Not Started";
        const notes = achievement ? achievement.notes : "";

        const progress = ProgressCalculator.calculate(
          goal.uomType,
          goal.target,
          achievementValue
        );

        return {
          id: goal.id,
          employeeName: goal.goalSheet.user.name || "Unnamed Employee",
          employeeEmail: goal.goalSheet.user.email,
          thrustArea: goal.thrustArea,
          title: goal.title,
          description: goal.description,
          uomType: goal.uomType,
          target: goal.target,
          weightage: goal.weightage,
          achievementValue,
          achievementStatus,
          achievementNotes: notes,
          progressClamped: progress.clamped,
          progressRaw: progress.raw,
          goalSheetStatus: goal.goalSheet.status,
        };
      })
      .sort((a, b) => {
        const nameCompare = a.employeeName.localeCompare(b.employeeName);
        if (nameCompare !== 0) return nameCompare;

        const thrustCompare = a.thrustArea.localeCompare(b.thrustArea);
        if (thrustCompare !== 0) return thrustCompare;

        return a.title.localeCompare(b.title);
      });
  }
}

