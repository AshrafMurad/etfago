import { db } from "../db/prisma";
import crypto from "crypto";

export interface SendVerificationEmailParams {
  toEmail: string;
  userId?: string;
  token: string;
  locale?: string;
}

export interface SendInvitationEmailParams {
  toEmail: string;
  agreementTitle: string;
  inviterName: string;
  token: string;
  locale?: string;
}

export interface SentEmailRecord {
  toEmail: string;
  subject: string;
  token?: string;
  url?: string;
  sentAt: Date;
}

// In-memory record of sent emails for development and test harnesses
const devOutbox: SentEmailRecord[] = [];

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
 * Sends or enqueues an email verification message.
 * Emits to NotificationOutbox and logs in development/testing.
 */
export async function sendVerificationEmail({
  toEmail,
  userId,
  token,
  locale = "ar",
}: SendVerificationEmailParams): Promise<void> {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/${locale}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  const subject =
    locale === "ar"
      ? "تأكيد بريدك الإلكتروني في اتفقنا"
      : "Verify your email on Etfago";

  // Record into in-memory dev outbox for tests/local dev
  devOutbox.push({
    toEmail,
    subject,
    token,
    url: verifyUrl,
    sentAt: new Date(),
  });

  // Log in development
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email Mock] Verification sent to ${toEmail}`);
    console.log(`[Email Mock] Verification URL: ${verifyUrl}`);
  }

  // Persist into NotificationOutbox
  try {
    const eventKey = `verify-email-${crypto.randomUUID()}`;
    await db.notificationOutbox.create({
      data: {
        eventKey,
        recipientUserId: userId ?? null,
        recipientEmailNormalized: toEmail.trim().toLowerCase(),
        template: "VERIFY_EMAIL",
        payloadJson: {
          verifyUrl,
          locale,
          notice: "Email verification proves control of an address, not legal identity.",
        },
        state: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    // If DB outbox fails, don't crash email dispatch in dev/test
    console.error("[Email Outbox] Failed to write outbox record:", err);
  }
}

/**
 * Sends or enqueues an agreement invitation email.
 * Includes short-lived one-use redemption link.
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
