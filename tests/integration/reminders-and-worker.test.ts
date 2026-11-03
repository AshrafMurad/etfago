import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { createAgreement } from "../../src/server/agreements/service";
import { inviteParticipant, redeemInvitation } from "../../src/server/invitations/service";
import { submitDraftForReview } from "../../src/server/agreements/versions";
import { createCommitment } from "../../src/server/commitments/service";
import {
  generateCommitmentDueReminders,
  generatePendingReviewReminders,
  generateAllReminders,
} from "../../src/server/notifications/reminders";
import { processOutboxBatch } from "../../src/server/notifications/outbox-worker";
import { runNotificationCycle } from "../../src/server/notifications/cycle";
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from "../../src/server/notifications/preferences";
import { clearDevOutbox } from "../../src/server/notifications/email";
import { POST as cronPost } from "../../src/app/api/cron/reminders/route";

describe("Sprint 9 Integration: Due-Date Notifications & Background Reminders Worker (F-22)", () => {
  const emailOrganizer = "organizer.reminders@example.com";
  const emailReviewer = "reviewer.reminders@example.com";

  let organizerId: string;
  let reviewerId: string;
  let workspaceId: string;
  let agreementId: string;
  let reviewerParticipantId: string;
  let versionId: string;

  beforeAll(async () => {
    // Clean up test database
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailReviewer] },
      },
    });
    clearDevOutbox();

    // 1. Setup Organizer
    const orgReg = await registerOrGetUser({
      email: emailOrganizer,
      name: "منظم التذكيرات",
      locale: "ar",
    });
    organizerId = orgReg.user.id;
    workspaceId = orgReg.workspaceId;
    await db.user.update({
      where: { id: organizerId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Setup Reviewer
    const revReg = await registerOrGetUser({
      email: emailReviewer,
      name: "مراجع التذكيرات",
      locale: "ar",
    });
    reviewerId = revReg.user.id;
    await db.user.update({
      where: { id: reviewerId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Create Agreement
    const agreement = await createAgreement(organizerId, {
      workspaceId,
      title: "اتفاقية صيانة الأنظمة وتوريد الخوادم",
      initialTerms: [
        {
          id: "term_delivery",
          title: "تسليم الخادم الرئيسي",
          body: "تركيب وتشغيل الخادم في الموقع",
        },
      ],
    });
    agreementId = agreement.id;

    // 4. Invite Reviewer and Redeem
    const invite = await inviteParticipant(organizerId, {
      agreementId,
      email: emailReviewer,
      partyDisplayName: "شركة التقنية الشريكة",
      agreementRole: "REVIEWER",
      partyKind: "ORGANIZATION",
    });
    reviewerParticipantId = invite.participantId;
    await redeemInvitation(reviewerId, invite.rawToken);

    // 5. Submit Draft for Review -> Version 1 (IN_REVIEW)
    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });
    const version = await submitDraftForReview(organizerId, {
      agreementId,
      expectedDraftRevision: draft.revision,
    });
    versionId = version.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailReviewer] },
      },
    });
    clearDevOutbox();
  });

  it("1. generates idempotent commitment due-date reminders for upcoming and overdue tasks", async () => {
    const now = new Date("2026-11-03T12:00:00Z");

    // Commitment 1: Due in 24 hours (Upcoming)
    const commUpcoming = await createCommitment(organizerId, {
      agreementId,
      title: "إعداد تقرير التوريد النهائي",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: new Date("2026-11-04T12:00:00Z"),
    });

    // Commitment 2: Due 2 days ago (Overdue)
    const commOverdue = await createCommitment(organizerId, {
      agreementId,
      title: "فحص متطلبات الربط التقني",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: new Date("2026-11-01T12:00:00Z"),
    });

    // Commitment 3: Due in 30 days (Far future - should NOT generate reminder)
    await createCommitment(organizerId, {
      agreementId,
      title: "المراجعة الربع سنوية",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: new Date("2026-12-03T12:00:00Z"),
    });

    // Commitment 4: Completed task with due date tomorrow (Should NOT generate reminder)
    const commCompleted = await createCommitment(organizerId, {
      agreementId,
      title: "اعتماد التقرير المبدئي",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: new Date("2026-11-04T12:00:00Z"),
    });
    await db.commitment.update({
      where: { id: commCompleted.id },
      data: { status: "DONE" },
    });

    // Execute commitment reminder scan
    const scan1 = await generateCommitmentDueReminders({ agreementId, now });
    expect(scan1.created).toBe(2);

    // Verify outbox entries created
    const outboxUpcoming = await db.notificationOutbox.findUnique({
      where: {
        eventKey: `commitment-reminder-${commUpcoming.id}-upcoming-2026-11-04`,
      },
    });
    expect(outboxUpcoming).toBeDefined();
    expect(outboxUpcoming?.state).toBe("PENDING");
    expect(outboxUpcoming?.template).toBe("COMMITMENT_DUE_REMINDER");
    expect(outboxUpcoming?.recipientEmailNormalized).toBe(emailReviewer);

    const outboxOverdue = await db.notificationOutbox.findUnique({
      where: {
        eventKey: `commitment-reminder-${commOverdue.id}-overdue-2026-11-03`,
      },
    });
    expect(outboxOverdue).toBeDefined();
    expect(outboxOverdue?.state).toBe("PENDING");

    // Execute scan a second time on the same date: MUST BE IDEMPOTENT (0 new records)
    const scan2 = await generateCommitmentDueReminders({ agreementId, now });
    expect(scan2.created).toBe(0);
  });

  it("2. generates idempotent pending review reminders for reviewers awaiting decision", async () => {
    // Review was submitted at beforeAll. Set pendingThresholdHours = 0 to trigger reminder.
    // Both Organizer and Reviewer are required participants with pending decisions.
    const now = new Date("2026-11-03T16:00:00Z");

    const scan1 = await generatePendingReviewReminders({
      agreementId,
      now,
      pendingThresholdHours: 0,
    });
    expect(scan1.created).toBe(2);

    const expectedKey = `review-reminder-${versionId}-${reviewerParticipantId}-2026-11-03`;
    const outboxReview = await db.notificationOutbox.findUnique({
      where: { eventKey: expectedKey },
    });

    expect(outboxReview).toBeDefined();
    expect(outboxReview?.state).toBe("PENDING");
    expect(outboxReview?.template).toBe("REVIEW_PENDING_REMINDER");
    expect(outboxReview?.recipientEmailNormalized).toBe(emailReviewer);

    // Re-run scan on the same date: MUST BE IDEMPOTENT
    const scan2 = await generatePendingReviewReminders({
      agreementId,
      now,
      pendingThresholdHours: 0,
    });
    expect(scan2.created).toBe(0);
  });

  it("3. respects user notification preferences by suppressing reminder emails when disabled", async () => {
    const now = new Date("2026-11-04T12:00:00Z");

    // Check defaults
    const initialPrefs = await getUserNotificationPreferences(reviewerId);
    expect(initialPrefs.commitmentReminders).toBe(true);
    expect(initialPrefs.reviewReminders).toBe(true);

    // Disable commitment reminders for reviewer
    await updateUserNotificationPreferences(reviewerId, {
      commitmentReminders: false,
    });
    const updatedPrefs = await getUserNotificationPreferences(reviewerId);
    expect(updatedPrefs.commitmentReminders).toBe(false);

    // Create a new upcoming commitment
    const commNew = await createCommitment(organizerId, {
      agreementId,
      title: "التزام جديد لا يجب إرسال تذكير له",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: new Date("2026-11-05T12:00:00Z"),
    });

    // Run scanner
    const scanCommitments = await generateCommitmentDueReminders({ agreementId, now });
    expect(scanCommitments.created).toBe(0);
    expect(scanCommitments.skippedPreferences).toBeGreaterThan(0);

    const outboxRecord = await db.notificationOutbox.findUnique({
      where: {
        eventKey: `commitment-reminder-${commNew.id}-upcoming-2026-11-05`,
      },
    });
    expect(outboxRecord).toBeNull();

    // Re-enable commitment reminders for remaining tests
    await updateUserNotificationPreferences(reviewerId, {
      commitmentReminders: true,
    });
  });

  it("4. outbox worker dispatches pending items and updates status to SENT with sentAt timestamp", async () => {
    // Currently we have pending outbox rows from tests 1 and 2
    const pendingBefore = await db.notificationOutbox.count({
      where: { state: "PENDING" },
    });
    expect(pendingBefore).toBeGreaterThan(0);

    const report = await processOutboxBatch({
      batchSize: 50,
      now: new Date("2026-11-03T16:05:00Z"),
    });

    expect(report.totalProcessed).toBe(pendingBefore);
    expect(report.sentCount).toBe(pendingBefore);
    expect(report.failedCount).toBe(0);
    expect(report.retryableCount).toBe(0);

    // Verify all processed rows are now SENT
    const remainingPending = await db.notificationOutbox.count({
      where: { state: "PENDING" },
    });
    expect(remainingPending).toBe(0);
  });

  it("5. handles email transport errors with exponential retry backoff and eventual terminal failure", async () => {
    const now = new Date("2026-11-03T18:00:00Z");
    const testKey = `test-failing-outbox-${Date.now()}`;

    // Create a pending outbox row
    const failingItem = await db.notificationOutbox.create({
      data: {
        eventKey: testKey,
        recipientEmailNormalized: "fail.target@example.com",
        template: "COMMITMENT_DUE_REMINDER",
        payloadJson: {
          agreementTitle: "اختبار الفشل",
          commitmentTitle: "بند تجريبي",
          dueAt: now.toISOString(),
          locale: "ar",
        },
        state: "PENDING",
      },
    });

    // Mock failing transporter
    const failingTransporter = {
      async sendMail() {
        return { success: false, error: "SMTP Connection Timeout" };
      },
    };

    // Attempt 1: Should fail and schedule retry with backoff (attempts = 1)
    const report1 = await processOutboxBatch({
      now,
      maxAttempts: 3,
      baseBackoffMs: 10000,
      transporter: failingTransporter,
    });

    expect(report1.retryableCount).toBe(1);
    expect(report1.failedCount).toBe(0);

    const rowAfterAttempt1 = await db.notificationOutbox.findUniqueOrThrow({
      where: { id: failingItem.id },
    });
    expect(rowAfterAttempt1.state).toBe("FAILED");
    expect(rowAfterAttempt1.attempts).toBe(1);
    expect(rowAfterAttempt1.nextAttemptAt).toBeDefined();
    // delay = 2^1 * 10000 = 20000ms
    const expectedDelay1 = 20000;
    expect(rowAfterAttempt1.nextAttemptAt?.getTime()).toBe(now.getTime() + expectedDelay1);

    // If run before nextAttemptAt, it should be skipped
    const skippedReport = await processOutboxBatch({
      now: new Date(now.getTime() + 5000), // before nextAttemptAt
      transporter: failingTransporter,
    });
    expect(skippedReport.totalProcessed).toBe(0);

    // Attempt 2: After nextAttemptAt (now + 25s)
    const timeAttempt2 = new Date(now.getTime() + 25000);
    const report2 = await processOutboxBatch({
      now: timeAttempt2,
      maxAttempts: 3,
      baseBackoffMs: 10000,
      transporter: failingTransporter,
    });
    expect(report2.retryableCount).toBe(1);

    const rowAfterAttempt2 = await db.notificationOutbox.findUniqueOrThrow({
      where: { id: failingItem.id },
    });
    expect(rowAfterAttempt2.attempts).toBe(2);

    // Attempt 3: After second backoff (now + 100s) -> should reach maxAttempts (3) and become terminal FAILED
    const timeAttempt3 = new Date(now.getTime() + 100000);
    const report3 = await processOutboxBatch({
      now: timeAttempt3,
      maxAttempts: 3,
      baseBackoffMs: 10000,
      transporter: failingTransporter,
    });
    expect(report3.failedCount).toBe(1);
    expect(report3.retryableCount).toBe(0);

    const rowTerminal = await db.notificationOutbox.findUniqueOrThrow({
      where: { id: failingItem.id },
    });
    expect(rowTerminal.attempts).toBe(3);
    expect(rowTerminal.nextAttemptAt).toBeNull();
  });

  it("6. executes a complete notification cycle combining reminder generation and outbox dispatch", async () => {
    const cycleReport = await runNotificationCycle({
      agreementId,
      now: new Date("2026-11-05T10:00:00Z"),
      reviewPendingThresholdHours: 0,
    });

    expect(cycleReport.timestamp).toBeDefined();
    expect(cycleReport.reminders).toBeDefined();
    expect(cycleReport.reminders.commitmentsScanned).toBeGreaterThanOrEqual(0);
    expect(cycleReport.reminders.reviewsScanned).toBeGreaterThanOrEqual(0);
    expect(cycleReport.outbox).toBeDefined();
    expect(cycleReport.outbox.sentCount).toBeGreaterThanOrEqual(0);
  });

  it("7. guards /api/cron/reminders with CRON_SECRET authorization and executes cycle", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token";

    // Request with wrong authorization header -> 401
    const badReq = new NextRequest("http://localhost:3000/api/cron/reminders", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-token",
      },
    });
    const badRes = await cronPost(badReq);
    expect(badRes.status).toBe(401);

    // Request with correct authorization header -> 200
    const goodReq = new NextRequest("http://localhost:3000/api/cron/reminders", {
      method: "POST",
      headers: {
        authorization: "Bearer super-secret-cron-token",
      },
    });
    const goodRes = await cronPost(goodReq);
    expect(goodRes.status).toBe(200);
    const body = await goodRes.json();
    expect(body.success).toBe(true);
    expect(body.report).toBeDefined();

    delete process.env.CRON_SECRET;
  });
});
