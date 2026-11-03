import { db } from "../db/prisma";
import { EmailTransport, getActiveEmailTransport } from "./email";

export interface OutboxWorkerOptions {
  batchSize?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  now?: Date;
  transporter?: EmailTransport;
}

export interface OutboxBatchReport {
  totalProcessed: number;
  sentCount: number;
  failedCount: number;
  retryableCount: number;
  errors: Array<{ id: string; eventKey: string; error: string }>;
}

/**
 * Formats email subject and body for outbox templates.
 */
function renderOutboxMessage(template: string, payload: Record<string, unknown>): {
  subject: string;
  body: string;
} {
  const locale = (payload.locale as string) || "ar";

  switch (template) {
    case "COMMITMENT_DUE_REMINDER": {
      const commitmentTitle = (payload.commitmentTitle as string) || "";
      const agreementTitle = (payload.agreementTitle as string) || "";
      const isOverdue = Boolean(payload.isOverdue);
      const dueAt = payload.dueAt as string;

      const subject =
        locale === "ar"
          ? isOverdue
            ? `تنبيه: التزام متأخر عن موعده: ${commitmentTitle} (${agreementTitle})`
            : `تذكير بموعد استحقاق التزام: ${commitmentTitle} (${agreementTitle})`
          : isOverdue
          ? `Alert: Overdue Commitment - ${commitmentTitle} (${agreementTitle})`
          : `Reminder: Commitment Due Soon - ${commitmentTitle} (${agreementTitle})`;

      const body =
        locale === "ar"
          ? `الالتزام: ${commitmentTitle}\nالاتفاق: ${agreementTitle}\nتاريخ الاستحقاق: ${dueAt}`
          : `Commitment: ${commitmentTitle}\nAgreement: ${agreementTitle}\nDue Date: ${dueAt}`;

      return { subject, body };
    }

    case "REVIEW_PENDING_REMINDER": {
      const agreementTitle = (payload.agreementTitle as string) || "";
      const versionNumber = (payload.versionNumber as number) || 1;
      const daysPending = (payload.daysPending as number) || 1;

      const subject =
        locale === "ar"
          ? `تذكير: نسخة معلقة بانتظار مراجعتك (نسخة ${versionNumber}) - ${agreementTitle}`
          : `Reminder: Review Pending for V${versionNumber} - ${agreementTitle}`;

      const body =
        locale === "ar"
          ? `الاتفاق: ${agreementTitle}\nالنسخة رقم: ${versionNumber}\nقيد الانتظار منذ: ${daysPending} أيام`
          : `Agreement: ${agreementTitle}\nVersion: V${versionNumber}\nPending for: ${daysPending} days`;

      return { subject, body };
    }

    case "COMMITMENT_ASSIGNED": {
      const commitmentTitle = (payload.commitmentTitle as string) || "";
      const agreementTitle = (payload.agreementTitle as string) || "";
      const subject =
        locale === "ar"
          ? `تكليف بالتزام جديد: ${commitmentTitle} (${agreementTitle})`
          : `New Commitment Assigned: ${commitmentTitle} (${agreementTitle})`;
      return { subject, body: subject };
    }

    case "VERSION_IN_REVIEW": {
      const agreementTitle = (payload.agreementTitle as string) || "";
      const versionNumber = (payload.versionNumber as number) || 1;
      const subject =
        locale === "ar"
          ? `نسخة جديدة للمراجعة (نسخة ${versionNumber}): ${agreementTitle}`
          : `New Version for Review (V${versionNumber}): ${agreementTitle}`;
      return { subject, body: subject };
    }

    case "INVITE_PARTICIPANT": {
      const agreementTitle = (payload.agreementTitle as string) || "";
      const subject =
        locale === "ar"
          ? `دعوة للمشاركة في اتفاق: ${agreementTitle}`
          : `Invitation to collaborate on: ${agreementTitle}`;
      return { subject, body: subject };
    }

    case "EMAIL_VERIFICATION": {
      const subject =
        locale === "ar"
          ? "تأكيد بريدك الإلكتروني لمنصة اتفقنا"
          : "Verify your email for Etfago";
      return { subject, body: subject };
    }

    default: {
      return {
        subject: `Etfago Notification: ${template}`,
        body: JSON.stringify(payload),
      };
    }
  }
}

/**
 * Processes pending or retryable outbox entries and dispatches them via the active EmailTransport.
 * Implements exponential backoff on transient failure and terminal state when maxAttempts is reached.
 */
export async function processOutboxBatch(
  options: OutboxWorkerOptions = {}
): Promise<OutboxBatchReport> {
  const batchSize = options.batchSize ?? 50;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseBackoffMs = options.baseBackoffMs ?? 60000;
  const now = options.now ?? new Date();
  const transporter = options.transporter ?? getActiveEmailTransport();

  // Find pending or retryable items ready for processing
  const items = await db.notificationOutbox.findMany({
    where: {
      OR: [
        { state: "PENDING" },
        { state: "FAILED", attempts: { lt: maxAttempts } },
      ],
      AND: [
        {
          OR: [
            { nextAttemptAt: null },
            { nextAttemptAt: { lte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  const report: OutboxBatchReport = {
    totalProcessed: items.length,
    sentCount: 0,
    failedCount: 0,
    retryableCount: 0,
    errors: [],
  };

  for (const item of items) {
    const payload = (item.payloadJson as Record<string, unknown>) || {};
    const { subject, body } = renderOutboxMessage(item.template, payload);

    try {
      const sendResult = await transporter.sendMail({
        to: item.recipientEmailNormalized,
        subject,
        text: body,
      });

      if (sendResult.success) {
        await db.notificationOutbox.update({
          where: { id: item.id },
          data: {
            state: "SENT",
            sentAt: now,
            nextAttemptAt: null,
          },
        });
        report.sentCount++;
      } else {
        const errMessage = sendResult.error || "Unknown transport failure";
        await handleDispatchFailure(item, errMessage, maxAttempts, baseBackoffMs, now, report);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      await handleDispatchFailure(item, errMessage, maxAttempts, baseBackoffMs, now, report);
    }
  }

  return report;
}

async function handleDispatchFailure(
  item: { id: string; eventKey: string; attempts: number; payloadJson: unknown },
  errorMessage: string,
  maxAttempts: number,
  baseBackoffMs: number,
  now: Date,
  report: OutboxBatchReport
): Promise<void> {
  const nextAttempts = item.attempts + 1;
  const isTerminal = nextAttempts >= maxAttempts;

  const nextAttemptAt = isTerminal
    ? null
    : new Date(now.getTime() + Math.pow(2, nextAttempts) * baseBackoffMs);

  const currentPayload = (item.payloadJson as Record<string, unknown>) || {};
  const updatedPayload = {
    ...currentPayload,
    lastError: errorMessage.slice(0, 500),
  };

  await db.notificationOutbox.update({
    where: { id: item.id },
    data: {
      state: "FAILED",
      attempts: nextAttempts,
      nextAttemptAt,
      payloadJson: updatedPayload,
    },
  });

  if (isTerminal) {
    report.failedCount++;
  } else {
    report.retryableCount++;
  }

  report.errors.push({
    id: item.id,
    eventKey: item.eventKey,
    error: errorMessage,
  });
}
