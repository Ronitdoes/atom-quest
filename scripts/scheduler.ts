import "dotenv/config";
import cron from "node-cron";
import { SchedulerService } from "../src/lib/services/scheduler-service";

console.log("=============================================");
console.log("🚀 ATOMQUEST GOAL PORTAL SCHEDULER DAEMON INITIALIZED");
console.log(`⏰ Start time: ${new Date().toISOString()}`);
console.log("=============================================");

// Run once immediately on startup
async function runImmediateTick() {
  console.log("[Scheduler Daemon] Running initial immediate tick...");
  try {
    const result = await SchedulerService.tick();
    console.log("[Scheduler Daemon] Initial tick succeeded:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Scheduler Daemon] Initial tick failed:", err);
  }
}

runImmediateTick();

// Schedule a cron job to run every hour
// Pattern: minute hour day-of-month month day-of-week
cron.schedule("0 * * * *", async () => {
  console.log(`[Scheduler Daemon] Cron triggered at ${new Date().toISOString()}`);
  try {
    const result = await SchedulerService.tick();
    console.log("[Scheduler Daemon] Cron tick succeeded:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("[Scheduler Daemon] Cron tick failed:", err);
  }
});

console.log("[Scheduler Daemon] Cron scheduled to run: Every Hour (0 * * * *)");
