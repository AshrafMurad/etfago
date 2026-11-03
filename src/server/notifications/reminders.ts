import { db } from "../db/prisma";
import { getUserNotificationPreferences } from "./preferences";

export interface CommitmentRemindersOptions {
  agreementId?: string;
  now?: Date;
  lookaheadHours?: number;
  overdueLookbackDays?: number;
}

export interface ReviewRemindersOptions {
  agreementId?: string;
  now?: Date;
  pendingThresholdHours?: number;
}

export interface RemindersGenerationReport {
  commitmentsScanned: number;
  commitmentRemindersCreated: number;
  reviewsScanned: number;
  reviewRemindersCreated: number;
  skippedDueToPreference: number;
}

/**
 * Scans active commitments with upcoming or overdue deadlines and creates
 * idempotent NotificationOutbox entries for eligible assignees.
 */
export async function generateCommitmentDueReminders(
  options: CommitmentRemindersOptions = {}
): Promise<{ scanned: number; created: number; skippedPreferences: number }> {
  const now = options.now ?? new Date();
  const lookaheadHours = options.lookaheadHours ?? 48;
  const overdueLookbackDays = options.overdueLookbackDays ?? 7;

  const upcomingBoundary = new Date(now.getTime() + lookaheadHours * 3600 * 1000);
  const overdueBoundary = new Date(now.getTime() - overdueLookbackDays * 86400 * 1000);

  // Find commitments with deadlines in non-archived agreements
  const commitments = await db.commitment.findMany({
    where: {
      agreementId: options.agreementId ? options.agreementId : undefined,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueAt: { not: null },
      assigneeParticipantId: { not: null },
      agreement: {
        archivedAt: null,
      },
    },
    include: {
      agreement: {
        select: {
          id: true,
          title: true,
          archivedAt: true,
        },
      },
    },
  });

  let scanned = 0;
  let created = 0;
  let skippedPreferences = 0;

  for (const commitment of commitments) {
    if (!commitment.dueAt || !commitment.assigneeParticipantId) continue;
    scanned++;

    const dueAt = commitment.dueAt;
    const isUpcoming = dueAt > now && dueAt <= upcomingBoundary;
    const isOverdue = dueAt < now && dueAt >= overdueBoundary;

    if (!isUpcoming && !isOverdue) {
      continue;
    }

    // Resolve assignee participant and linked user
    const participant = await db.agreementParticipant.findUnique({
      where: { id: commitment.assigneeParticipantId },
      include: { user: true },
    });

    if (!participant || participant.removedAt || !participant.user) {
      continue;
    }

    const user = participant.user;
    if (!user.emailVerifiedAt || !user.emailNormalized) {
      continue;
    }

    // Check user notification preferences
    const preferences = await getUserNotificationPreferences(user.id);
    if (!preferences.commitmentReminders) {
      skippedPreferences++;
      continue;
    }

    const dateBucket = isUpcoming
      ? dueAt.toISOString().slice(0, 10)
      : now.toISOString().slice(0, 10);

    const kind = isUpcoming ? "upcoming" : "overdue";
    const eventKey = `commitment-reminder-${commitment.id}-${kind}-${dateBucket}`;

    // Fast check to ensure idempotency and prevent DB collision log
    const existing = await db.notificationOutbox.findUnique({
      where: { eventKey },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const hoursRemaining = isUpcoming
      ? Math.max(0, Math.round((dueAt.getTime() - now.getTime()) / (3600 * 1000)))
      : 0;

    try {
      await db.notificationOutbox.create({
        data: {
          eventKey,
          recipientUserId: user.id,
          recipientEmailNormalized: user.emailNormalized,
          template: "COMMITMENT_DUE_REMINDER",
          payloadJson: {
            commitmentId: commitment.id,
            commitmentTitle: commitment.title,
            agreementId: commitment.agreementId,
            agreementTitle: commitment.agreement.title,
            dueAt: dueAt.toISOString(),
            isOverdue,
            hoursRemaining,
            locale: user.locale || "ar",
          },
          state: "PENDING",
        },
      });
      created++;
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      console.error("[Reminders] Error creating commitment reminder outbox row:", err);
    }
  }

  return { scanned, created, skippedPreferences };
}

/**
 * Scans active versions pending review for longer than pendingThresholdHours
 * and creates idempotent NotificationOutbox entries for pending required reviewers.
 */
export async function generatePendingReviewReminders(
  options: ReviewRemindersOptions = {}
): Promise<{ scanned: number; created: number; skippedPreferences: number }> {
  const now = options.now ?? new Date();
  const pendingThresholdHours = options.pendingThresholdHours ?? 24;
  const thresholdMs = pendingThresholdHours * 3600 * 1000;

  const pendingVersions = await db.agreementVersion.findMany({
    where: {
      agreementId: options.agreementId ? options.agreementId : undefined,
      state: "IN_REVIEW",
      agreement: {
        archivedAt: null,
      },
    },
    include: {
      agreement: {
        select: {
          id: true,
          title: true,
        },
      },
      reviewers: {
        where: {
          decision: null,
          required: true,
        },
      },
    },
  });

  let scanned = 0;
  let created = 0;
  let skippedPreferences = 0;

  for (const version of pendingVersions) {
    const pendingDurationMs = now.getTime() - version.submittedAt.getTime();
    if (pendingDurationMs < thresholdMs) {
      continue;
    }

    const daysPending = Math.max(1, Math.floor(pendingDurationMs / (86400 * 1000)));
    const todayBucket = now.toISOString().slice(0, 10);

    for (const reviewer of version.reviewers) {
      scanned++;

      // Verify user has verified email
      const user = await db.user.findUnique({
        where: { id: reviewer.userId },
        select: {
          id: true,
          emailNormalized: true,
          emailVerifiedAt: true,
          locale: true,
        },
      });

      if (!user || !user.emailVerifiedAt || !user.emailNormalized) {
        continue;
      }

      // Check user preferences
      const preferences = await getUserNotificationPreferences(user.id);
      if (!preferences.reviewReminders) {
        skippedPreferences++;
        continue;
      }

      const eventKey = `review-reminder-${version.id}-${reviewer.participantId}-${todayBucket}`;

      const existing = await db.notificationOutbox.findUnique({
        where: { eventKey },
        select: { id: true },
      });
      if (existing) {
        continue;
      }

      try {
        await db.notificationOutbox.create({
          data: {
            eventKey,
            recipientUserId: user.id,
            recipientEmailNormalized: user.emailNormalized,
            template: "REVIEW_PENDING_REMINDER",
            payloadJson: {
              versionId: version.id,
              versionNumber: version.versionNumber,
              agreementId: version.agreement.id,
              agreementTitle: version.agreement.title,
              daysPending,
              locale: user.locale || "ar",
            },
            state: "PENDING",
          },
        });
        created++;
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          continue;
        }
        console.error("[Reminders] Error creating review reminder outbox row:", err);
      }
    }
  }

  return { scanned, created, skippedPreferences };
}

/**
 * Combined scanner generating all reminder types.
 */
export async function generateAllReminders(
  options: {
    agreementId?: string;
    now?: Date;
    commitmentLookaheadHours?: number;
    commitmentOverdueLookbackDays?: number;
    reviewPendingThresholdHours?: number;
  } = {}
): Promise<RemindersGenerationReport> {
  const commitmentsResult = await generateCommitmentDueReminders({
    agreementId: options.agreementId,
    now: options.now,
    lookaheadHours: options.commitmentLookaheadHours,
    overdueLookbackDays: options.commitmentOverdueLookbackDays,
  });

  const reviewsResult = await generatePendingReviewReminders({
    agreementId: options.agreementId,
    now: options.now,
    pendingThresholdHours: options.reviewPendingThresholdHours,
  });

  return {
    commitmentsScanned: commitmentsResult.scanned,
    commitmentRemindersCreated: commitmentsResult.created,
    reviewsScanned: reviewsResult.scanned,
    reviewRemindersCreated: reviewsResult.created,
    skippedDueToPreference:
      commitmentsResult.skippedPreferences + reviewsResult.skippedPreferences,
  };
}
