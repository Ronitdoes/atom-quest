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

        // Notify all employees in bulk
        const employees = await tx.user.findMany({
          where: { role: Role.EMPLOYEE }
        });

        if (employees.length > 0) {
          await tx.notification.createMany({
            data: employees.map((emp) => ({
              userId: emp.id,
              title: `Q${window.quarter} Check-In Window Open`,
              message: `The performance check-in window for Q${window.quarter} (Cycle ${window.cycleId}) is now OPEN. Please submit your progress updates.`,
              type: "CHECKIN_DUE",
              link: `/employee/check-ins?quarter=${window.quarter}`,
            })),
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

        // Notify all employees in bulk
        const employees = await tx.user.findMany({
          where: { role: Role.EMPLOYEE }
        });

        if (employees.length > 0) {
          await tx.notification.createMany({
            data: employees.map((emp) => ({
              userId: emp.id,
              title: `Q${window.quarter} Check-In Window Closed`,
              message: `The performance check-in window for Q${window.quarter} (Cycle ${window.cycleId}) is now CLOSED. Submissions are locked.`,
              type: "CHECKIN_DUE",
              link: "/employee/check-ins",
            })),
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
              cycleId: window.cycleId,
              quarter: window.quarter
            }
          }
        }
      });

      const daysLeft = Math.ceil((window.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (employeesWithApprovedSheets.length > 0) {
        await db.notification.createMany({
          data: employeesWithApprovedSheets.map((emp) => ({
            userId: emp.id,
            title: `Urgent: Q${window.quarter} Check-In Closing Soon`,
            message: `Your Q${window.quarter} check-in window for cycle ${window.cycleId} closes in ${daysLeft} day(s). Please complete your updates immediately.`,
            type: "CHECKIN_DUE",
            link: `/employee/check-ins?quarter=${window.quarter}`
          }))
        });
        sentCount += employeesWithApprovedSheets.length;
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
              cycleId: window.cycleId,
              quarter: window.quarter
            }
          }
        },
        include: {
          manager: true
        }
      });

      // Batch query all existing escalation notifications for this quarter to do in-memory deduplication
      const existingEscalations = await db.notification.findMany({
        where: {
          type: "CHECKIN_ESCALATED",
          title: { contains: `Q${window.quarter} Check-In Overdue` }
        },
        select: {
          userId: true,
          message: true
        }
      });

      // Map to set of key identifiers for fast lookup
      const existingKeys = new Set(
        existingEscalations.map((notif) => `${notif.userId}:${notif.message}`)
      );

      const notificationsToCreate: any[] = [];
      const auditLogsToCreate: any[] = [];

      for (const emp of negligentEmployees) {
        if (!emp.manager) continue;

        const expectedMessage = `Employee ${emp.name || emp.email} did not submit Q${window.quarter} check-in for cycle ${window.cycleId} before the window closed.`;
        const lookupKey = `${emp.managerId}:${expectedMessage}`;

        if (!existingKeys.has(lookupKey)) {
          notificationsToCreate.push({
            userId: emp.managerId!,
            title: `Escalation: Q${window.quarter} Check-In Overdue`,
            message: expectedMessage,
            type: "CHECKIN_ESCALATED",
            link: `/manager`
          });

          auditLogsToCreate.push({
            userId: actorId,
            action: "DELAY_ESCALATION",
            entityType: "User",
            entityId: emp.id,
            newValue: { employeeId: emp.id, cycleId: window.cycleId, quarter: window.quarter }
          });

          escalatedCount++;
        }
      }

      if (notificationsToCreate.length > 0) {
        await db.$transaction([
          db.notification.createMany({ data: notificationsToCreate }),
          db.auditLog.createMany({ data: auditLogsToCreate })
        ]);
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
    const isRedisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    let lockType: "REDIS" | "POSTGRES" | null = null;

    try {
      if (isRedisConfigured) {
        const gotRedisLock = await CacheService.tryAcquireLock("scheduler", 120);
        if (!gotRedisLock) {
          console.warn("[Scheduler] Tick execution skipped: overlapping lock held on Redis.");
          throw new Error("Lock acquisition failed: Scheduler execution is already in progress.");
        }
        lockType = "REDIS";
      } else {
        const advisoryResult = await db.$queryRawUnsafe<any[]>(
          "SELECT pg_try_advisory_lock(889988) AS locked;"
        );
        const lockedVal = advisoryResult[0]?.locked;
        const gotPostgresLock = lockedVal === true || String(lockedVal) === "true" || Number(lockedVal) === 1;

        if (!gotPostgresLock) {
          console.warn("[Scheduler] Tick execution skipped: overlapping lock held on PostgreSQL.");
          throw new Error("Lock acquisition failed: Scheduler execution is already in progress.");
        }
        lockType = "POSTGRES";
      }

      console.log(`[Scheduler] Tick started at ${new Date().toISOString()} (Lock type: ${lockType})`);

      const transitions = await this.checkAndTransitionWindows();
      const { sentCount: remindersSent } = await this.sendAutomaticReminders();
      const { escalatedCount: escalationsCount } = await this.escalateDelays();

      // ── Data retention cleanup (non-blocking) ──
      const cleanup = await this.cleanupOldRecords();

      console.log(`[Scheduler] Tick finished: Opened: ${transitions.opened.length}, Closed: ${transitions.closed.length}, Reminders: ${remindersSent}, Escalations: ${escalationsCount}, Cleanup: ${cleanup.auditLogsDeleted} logs, ${cleanup.notificationsDeleted} notifications`);

      if (transitions.opened.length > 0 || transitions.closed.length > 0 || escalationsCount > 0) {
        await CacheService.invalidateAnalytics("2026");
      }

      return {
        timestamp: new Date().toISOString(),
        transitions,
        remindersSent,
        escalationsCount
      };
    } finally {
      if (lockType === "REDIS") {
        await CacheService.releaseLock("scheduler");
        console.log("[Scheduler] Released Redis scheduler lock.");
      } else if (lockType === "POSTGRES") {
        await db.$queryRawUnsafe("SELECT pg_advisory_unlock(889988);");
        console.log("[Scheduler] Released PostgreSQL advisory scheduler lock.");
      }
    }
  }

  /**
   * Cleans up old audit logs (>2 years) and read notifications (>90 days)
   * to prevent unbounded table growth.
   */
  private static async cleanupOldRecords(): Promise<{
    auditLogsDeleted: number;
    notificationsDeleted: number;
  }> {
    let auditLogsDeleted = 0;
    let notificationsDeleted = 0;

    try {
      const auditResult = await db.$executeRaw`
        DELETE FROM "AuditLog"
        WHERE "timestamp" < NOW() - INTERVAL '2 years'
      `;
      auditLogsDeleted = auditResult;

      const notifResult = await db.$executeRaw`
        DELETE FROM "Notification"
        WHERE "isRead" = true
        AND "createdAt" < NOW() - INTERVAL '90 days'
      `;
      notificationsDeleted = notifResult;

      if (auditLogsDeleted > 0 || notificationsDeleted > 0) {
        console.log(`[Scheduler] Cleanup: Removed ${auditLogsDeleted} old audit logs and ${notificationsDeleted} read notifications.`);
      }
    } catch (error) {
      // Non-blocking: log but don't fail the scheduler tick
      console.error("[Scheduler] Cleanup error (non-blocking):", error);
    }

    return { auditLogsDeleted, notificationsDeleted };
  }
}
