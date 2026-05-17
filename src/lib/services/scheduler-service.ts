import { db } from "@/lib/db/db";
import { GoalStatus, Role } from "@/generated/prisma";
import { CacheService } from "./cache-service";

export class SchedulerService {
  /**
   * Helper to fetch a valid Admin user ID for system audit logs
   */
  private static async getSystemActorId(): Promise<string> {
    const admin = await db.user.findFirst({
      where: { role: Role.ADMIN },
      select: { id: true }
    });
    if (admin) return admin.id;

    const anyUser = await db.user.findFirst({
      select: { id: true }
    });
    if (anyUser) return anyUser.id;

    throw new Error("No users found in database to act as system actor.");
  }

  /**
   * Checks all cycle windows and transitions their status based on current time
   */
  static async checkAndTransitionWindows(): Promise<{ opened: string[]; closed: string[] }> {
    const now = new Date();
    const actorId = await this.getSystemActorId();
    const openedWindows: string[] = [];
    const closedWindows: string[] = [];

    // 1. Fetch all windows that need opening
    const upcomingToOpen = await db.cycleWindow.findMany({
      where: {
        status: "UPCOMING",
        startDate: { lte: now }
      }
    });

    for (const window of upcomingToOpen) {
      await db.$transaction(async (tx) => {
        await tx.cycleWindow.update({
          where: { id: window.id },
          data: { status: "OPEN" }
        });

        // Log audit trail
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: "CYCLE_WINDOW_OPEN",
            entityType: "CycleWindow",
            entityId: window.id,
            newValue: { cycleId: window.cycleId, quarter: window.quarter, status: "OPEN" }
          }
        });

        // Notify all employees
        const employees = await tx.user.findMany({
          where: { role: Role.EMPLOYEE }
        });

        for (const emp of employees) {
          await tx.notification.create({
            data: {
              userId: emp.id,
              title: `Q${window.quarter} Check-In Window Open`,
              message: `The performance check-in window for Q${window.quarter} (Cycle ${window.cycleId}) is now OPEN. Please submit your progress updates.`,
              type: "CHECKIN_DUE",
              link: `/employee/check-ins?quarter=${window.quarter}`
            }
          });
        }
      });
      openedWindows.push(`${window.cycleId}-Q${window.quarter}`);
    }

    // 2. Fetch all windows that need closing
    const openToClosed = await db.cycleWindow.findMany({
      where: {
        status: "OPEN",
        endDate: { lte: now }
      }
    });

    for (const window of openToClosed) {
      await db.$transaction(async (tx) => {
        await tx.cycleWindow.update({
          where: { id: window.id },
          data: { status: "CLOSED" }
        });

        // Log audit trail
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: "CYCLE_WINDOW_CLOSE",
            entityType: "CycleWindow",
            entityId: window.id,
            newValue: { cycleId: window.cycleId, quarter: window.quarter, status: "CLOSED" }
          }
        });

        // Notify all employees
        const employees = await tx.user.findMany({
          where: { role: Role.EMPLOYEE }
        });

        for (const emp of employees) {
          await tx.notification.create({
            data: {
              userId: emp.id,
              title: `Q${window.quarter} Check-In Window Closed`,
              message: `The performance check-in window for Q${window.quarter} (Cycle ${window.cycleId}) is now CLOSED. Submissions are locked.`,
              type: "CHECKIN_DUE",
              link: "/employee/check-ins"
            }
          });
        }
      });
      closedWindows.push(`${window.cycleId}-Q${window.quarter}`);
    }

    return { opened: openedWindows, closed: closedWindows };
  }

  /**
   * Automatically sends in-app reminder notifications to employees with pending check-ins
   * if the window is open and closing in less than 3 days.
   */
  static async sendAutomaticReminders(): Promise<{ sentCount: number }> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let sentCount = 0;

    // Find all open windows closing within 3 days
    const openWindows = await db.cycleWindow.findMany({
      where: {
        status: "OPEN",
        endDate: { gte: now, lte: threeDaysFromNow }
      }
    });

    for (const window of openWindows) {
      // Find employees with approved sheets who have NOT completed their check-in for this quarter
      const employeesWithApprovedSheets = await db.user.findMany({
        where: {
          role: Role.EMPLOYEE,
          goalSheets: {
            some: {
              cycleId: window.cycleId,
              status: GoalStatus.APPROVED
            }
          },
          checkIns: {
            none: {
              quarter: window.quarter
            }
          }
        }
      });

      const daysLeft = Math.ceil((window.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      for (const emp of employeesWithApprovedSheets) {
        await db.notification.create({
          data: {
            userId: emp.id,
            title: `Urgent: Q${window.quarter} Check-In Closing Soon`,
            message: `Your Q${window.quarter} check-in window for cycle ${window.cycleId} closes in ${daysLeft} day(s). Please complete your updates immediately.`,
            type: "CHECKIN_DUE",
            link: `/employee/check-ins?quarter=${window.quarter}`
          }
        });
        sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * Escalates delay to manager if employees failed to submit check-ins for a closed window
   */
  static async escalateDelays(): Promise<{ escalatedCount: number }> {
    const actorId = await this.getSystemActorId();
    let escalatedCount = 0;

    // Find all closed windows in the active cycle
    const closedWindows = await db.cycleWindow.findMany({
      where: { status: "CLOSED" }
    });

    for (const window of closedWindows) {
      // Find employees who missed their check-in for this closed window
      const negligentEmployees = await db.user.findMany({
        where: {
          role: Role.EMPLOYEE,
          managerId: { not: null },
          goalSheets: {
            some: {
              cycleId: window.cycleId,
              status: GoalStatus.APPROVED
            }
          },
          checkIns: {
            none: {
              quarter: window.quarter
            }
          }
        },
        include: {
          manager: true
        }
      });

      for (const emp of negligentEmployees) {
        if (!emp.manager) continue;

        // Check if we already escalated this to prevent double notifications in successive cron ticks
        const existingEscalation = await db.notification.findFirst({
          where: {
            userId: emp.managerId!,
            type: "CHECKIN_ESCALATED",
            message: {
              contains: `${emp.name || emp.email} did not submit Q${window.quarter} check-in`
            }
          }
        });

        if (!existingEscalation) {
          await db.$transaction(async (tx) => {
            // Notify manager
            await tx.notification.create({
              data: {
                userId: emp.managerId!,
                title: `Escalation: Q${window.quarter} Check-In Overdue`,
                message: `Employee ${emp.name || emp.email} did not submit Q${window.quarter} check-in for cycle ${window.cycleId} before the window closed.`,
                type: "CHECKIN_ESCALATED",
                link: `/manager/dashboard`
              }
            });

            // Log escalation event
            await tx.auditLog.create({
              data: {
                userId: actorId,
                action: "DELAY_ESCALATION",
                entityType: "User",
                entityId: emp.id,
                newValue: { employeeId: emp.id, cycleId: window.cycleId, quarter: window.quarter }
              }
            });
          });

          escalatedCount++;
        }
      }
    }

    return { escalatedCount };
  }

  /**
   * Master tick executor coordinating all background tasks
   */
  static async tick(): Promise<{
    timestamp: string;
    transitions: { opened: string[]; closed: string[] };
    remindersSent: number;
    escalationsCount: number;
  }> {
    console.log(`[Scheduler] Tick started at ${new Date().toISOString()}`);

    const transitions = await this.checkAndTransitionWindows();
    const { sentCount: remindersSent } = await this.sendAutomaticReminders();
    const { escalatedCount: escalationsCount } = await this.escalateDelays();

    console.log(`[Scheduler] Tick finished: Opened: ${transitions.opened.length}, Closed: ${transitions.closed.length}, Reminders: ${remindersSent}, Escalations: ${escalationsCount}`);

    if (transitions.opened.length > 0 || transitions.closed.length > 0 || escalationsCount > 0) {
      await CacheService.clearAll();
    }

    return {
      timestamp: new Date().toISOString(),
      transitions,
      remindersSent,
      escalationsCount
    };
  }
}
