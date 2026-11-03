import {
  generateAllReminders,
  RemindersGenerationReport,
} from "./reminders";
import {
  processOutboxBatch,
  OutboxBatchReport,
  OutboxWorkerOptions,
} from "./outbox-worker";

export interface NotificationCycleOptions extends OutboxWorkerOptions {
  agreementId?: string;
  now?: Date;
  commitmentLookaheadHours?: number;
  commitmentOverdueLookbackDays?: number;
  reviewPendingThresholdHours?: number;
}

export interface NotificationCycleReport {
  timestamp: string;
  reminders: RemindersGenerationReport;
  outbox: OutboxBatchReport;
}

/**
 * Runs a single complete background notification cycle:
 * 1. Scans upcoming commitments and pending reviews to enqueue reminder events idempotently into NotificationOutbox.
 * 2. Processes and dispatches eligible pending/retryable outbox records.
 */
export async function runNotificationCycle(
  options: NotificationCycleOptions = {}
): Promise<NotificationCycleReport> {
  const now = options.now ?? new Date();

  const remindersReport = await generateAllReminders({
    agreementId: options.agreementId,
    now,
    commitmentLookaheadHours: options.commitmentLookaheadHours,
    commitmentOverdueLookbackDays: options.commitmentOverdueLookbackDays,
    reviewPendingThresholdHours: options.reviewPendingThresholdHours,
  });

  const outboxReport = await processOutboxBatch({
    now,
    batchSize: options.batchSize,
    maxAttempts: options.maxAttempts,
    baseBackoffMs: options.baseBackoffMs,
    transporter: options.transporter,
  });

  return {
    timestamp: now.toISOString(),
    reminders: remindersReport,
    outbox: outboxReport,
  };
}
