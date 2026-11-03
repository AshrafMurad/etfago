import { runNotificationCycle } from "../src/server/notifications/cycle";

/**
 * Sprint 9 Operational Background Worker: Reminders & Notification Outbox Dispatch
 * 
 * Scheduled worker for checking upcoming commitment deadlines, pending review reminders,
 * and dispatching queued outbox notifications with retry backoff.
 */
export async function main() {
  console.log("[Reminders Worker] Starting notification and reminder cycle...");
  const startTime = Date.now();

  try {
    const report = await runNotificationCycle();
    const elapsedMs = Date.now() - startTime;

    console.log("==========================================");
    console.log("   Etfago Background Notification Report  ");
    console.log("==========================================");
    console.log(`Executed At: ${report.timestamp}`);
    console.log(`Elapsed Time: ${elapsedMs}ms`);
    console.log("--- Reminders Scanned & Created ---");
    console.log(`  Commitments Scanned: ${report.reminders.commitmentsScanned}`);
    console.log(`  Commitment Reminders Enqueued: ${report.reminders.commitmentRemindersCreated}`);
    console.log(`  Pending Reviews Scanned: ${report.reminders.reviewsScanned}`);
    console.log(`  Review Reminders Enqueued: ${report.reminders.reviewRemindersCreated}`);
    console.log(`  Skipped by User Preferences: ${report.reminders.skippedDueToPreference}`);
    console.log("--- Outbox Dispatch Results ---");
    console.log(`  Outbox Rows Processed: ${report.outbox.totalProcessed}`);
    console.log(`  Emails Sent Successfully: ${report.outbox.sentCount}`);
    console.log(`  Transient Retries Scheduled: ${report.outbox.retryableCount}`);
    console.log(`  Permanent Failures: ${report.outbox.failedCount}`);

    if (report.outbox.errors.length > 0) {
      console.warn("Outbox Dispatch Warnings/Errors:");
      for (const err of report.outbox.errors) {
        console.warn(`  [${err.eventKey}]: ${err.error}`);
      }
    }
    console.log("==========================================");
  } catch (err) {
    console.error("[Reminders Worker] Fatal error running notification cycle:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
