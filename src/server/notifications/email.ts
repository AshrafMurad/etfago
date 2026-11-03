import { db } from "../db/prisma";
import crypto from "crypto";

export interface SendVerificationEmailParams {
  toEmail: string;
  userId?: string;
  token: string;
  name?: string;
  locale?: string;
}

export interface SendInvitationEmailParams {
  toEmail: string;
  agreementTitle: string;
  inviterName: string;
  token: string;
  locale?: string;
}

export interface SendReviewNoticeParams {
  toEmail: string;
  agreementTitle: string;
  versionNumber: number;
  locale?: string;
}

export interface SendCommitmentNoticeParams {
  toEmail: string;
  agreementTitle: string;
  commitmentTitle: string;
  dueAt?: Date | null;
  locale?: string;
}

export interface SentEmailRecord {
  toEmail: string;
  subject: string;
  token?: string;
  url?: string;
  sentAt: Date;
}

// In-memory development & test outbox
export const devOutbox: SentEmailRecord[] = [];

export function getDevOutbox(): readonly SentEmailRecord[] {
  return devOutbox;
}

export function clearDevOutbox(): void {
  devOutbox.length = 0;
}

export function getLatestTokenForEmail(email: string): string | undefined {
  const norm = email.trim().toLowerCase();
  const found = [...devOutbox].reverse().find((m) => m.toEmail.toLowerCase() === norm);
  return found?.token;
}

/**
 * Sends or enqueues an account verification email.
 */
export async function sendVerificationEmail({
  toEmail,
  userId,
  token,
  locale = "ar",
}: SendVerificationEmailParams): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/${locale}/auth/verify?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(toEmail)}`;

  const subject =
    locale === "ar"
      ? "تأكيد بريدك الإلكتروني لمنصة اتفقنا"
      : "Verify your email for Etfago";

  devOutbox.push({
    toEmail,
    subject,
    token,
    url: verifyUrl,
    sentAt: new Date(),
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email Mock] Verification sent to ${toEmail}`);
    console.log(`[Email Mock] Verification URL: ${verifyUrl}`);
  }

  try {
    const eventKey = `verify-${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        eventKey,
        recipientUserId: userId ?? null,
        recipientEmailNormalized: toEmail.trim().toLowerCase(),
        template: "EMAIL_VERIFICATION",
        payloadJson: {
          verifyUrl,
          locale,
          notice: "Email verification proves mailbox control, not legal identity.",
        },
        state: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Email Outbox] Failed to write outbox record:", err);
  }
}

/**
 * Sends or enqueues an agreement invitation email.
 */
export async function sendInvitationEmail({
  toEmail,
  agreementTitle,
  inviterName,
  token,
  locale = "ar",
}: SendInvitationEmailParams): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redeemUrl = `${appUrl}/${locale}/invitations/redeem?token=${encodeURIComponent(token)}`;

  const subject =
    locale === "ar"
      ? `دعوة للمشاركة في اتفاق: ${agreementTitle}`
      : `Invitation to collaborate on: ${agreementTitle}`;

  devOutbox.push({
    toEmail,
    subject,
    token,
    url: redeemUrl,
    sentAt: new Date(),
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email Mock] Invitation sent to ${toEmail}`);
    console.log(`[Email Mock] Invitation URL: ${redeemUrl}`);
  }

  try {
    const eventKey = `invite-${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        eventKey,
        recipientEmailNormalized: toEmail.trim().toLowerCase(),
        template: "INVITE_PARTICIPANT",
        payloadJson: {
          agreementTitle,
          inviterName,
          redeemUrl,
          locale,
          notice: "Invitation is single-use and bound to the invited verified email.",
        },
        state: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Email Outbox] Failed to write invitation outbox record:", err);
  }
}

/**
 * Sends or enqueues a version review notice email.
 */
export async function sendReviewNoticeEmail({
  toEmail,
  agreementTitle,
  versionNumber,
  locale = "ar",
}: SendReviewNoticeParams): Promise<void> {
  const subject =
    locale === "ar"
      ? `نسخة جديدة للمراجعة (نسخة ${versionNumber}): ${agreementTitle}`
      : `New Version for Review (V${versionNumber}): ${agreementTitle}`;

  devOutbox.push({
    toEmail,
    subject,
    sentAt: new Date(),
  });

  try {
    const eventKey = `review-${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        eventKey,
        recipientEmailNormalized: toEmail.trim().toLowerCase(),
        template: "VERSION_IN_REVIEW",
        payloadJson: {
          agreementTitle,
          versionNumber,
          locale,
        },
        state: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Email Outbox] Failed to write review outbox record:", err);
  }
}

/**
 * Sends or enqueues a commitment assignment notice.
 */
export async function sendCommitmentNoticeEmail({
  toEmail,
  agreementTitle,
  commitmentTitle,
  dueAt,
  locale = "ar",
}: SendCommitmentNoticeParams): Promise<void> {
  const subject =
    locale === "ar"
      ? `تكليف بالتزام جديد: ${commitmentTitle} (${agreementTitle})`
      : `New Commitment Assigned: ${commitmentTitle} (${agreementTitle})`;

  devOutbox.push({
    toEmail,
    subject,
    sentAt: new Date(),
  });

  try {
    const eventKey = `commitment-${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        eventKey,
        recipientEmailNormalized: toEmail.trim().toLowerCase(),
        template: "COMMITMENT_ASSIGNED",
        payloadJson: {
          agreementTitle,
          commitmentTitle,
          dueAt: dueAt ? dueAt.toISOString() : null,
          locale,
        },
        state: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[Email Outbox] Failed to write commitment outbox record:", err);
  }
}
