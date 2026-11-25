import { afterAll, afterEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser, issueVerificationToken, verifyEmailToken } from "../../src/server/auth/service";
import { consumeAuthRateLimit } from "../../src/server/auth/rate-limit";
import { resetActiveEmailTransport, setActiveEmailTransport } from "../../src/server/notifications/email";

describe("Deployment authentication security", () => {
  const email = `release-auth-${crypto.randomUUID()}@example.com`;
  const limitIdentity = crypto.randomUUID();
  afterEach(() => resetActiveEmailTransport());

  afterAll(async () => {
    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.notificationOutbox.deleteMany({ where: { recipientEmailNormalized: email } });
    const user = await db.user.findUnique({ where: { emailNormalized: email } });
    if (user) {
      await db.workspace.deleteMany({ where: { ownerUserId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    const key = crypto.createHash("sha256").update(`test:${limitIdentity}`).digest("hex");
    await db.authRateLimit.deleteMany({ where: { key } });
  });

  it("stores only a digest and binds the link to the mailbox", async () => {
    const result = await registerOrGetUser({ email });
    const token = result.verificationToken!;
    const stored = await db.verificationToken.findFirstOrThrow({ where: { identifier: email } });
    expect(stored.token).not.toBe(token);
    expect(stored.token).toBe(crypto.createHash("sha256").update(token).digest("hex"));
    await expect(verifyEmailToken({ email: "outsider@example.com", token })).rejects.toThrow();
    expect((await verifyEmailToken({ email, token })).user.id).toBe(result.user.id);
  });

  it("requires a fresh usable link for an already verified account", async () => {
    const result = await registerOrGetUser({ email });
    expect(result.user.emailVerifiedAt).not.toBeNull();
    expect(result.verificationToken).toBeTruthy();
    await expect(verifyEmailToken({ email, token: result.verificationToken! })).resolves.toMatchObject({ success: true });
    await expect(verifyEmailToken({ email, token: result.verificationToken! })).rejects.toThrow();
  });

  it("allows exactly one concurrent consume and rejects expired links", async () => {
    const token = await issueVerificationToken(email);
    const results = await Promise.allSettled([verifyEmailToken({ email, token }), verifyEmailToken({ email, token })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const expired = await issueVerificationToken(email);
    await db.verificationToken.updateMany({ where: { identifier: email }, data: { expires: new Date(0) } });
    await expect(verifyEmailToken({ email, token: expired })).rejects.toThrow();
  });

  it("atomically enforces persistent rate limits under concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => consumeAuthRateLimit("test", limitIdentity, 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await consumeAuthRateLimit("test", limitIdentity, 5)).toBe(false);
    const key = crypto.createHash("sha256").update(`test:${limitIdentity}`).digest("hex");
    await db.authRateLimit.update({ where: { key }, data: { resetAt: new Date(0) } });
    expect(await consumeAuthRateLimit("test", limitIdentity, 5)).toBe(true);
  });

  it("reports email delivery failure and retains a retryable outbox entry", async () => {
    setActiveEmailTransport({ sendMail: async () => ({ success: false, error: "Provider unavailable" }) });
    await expect(registerOrGetUser({ email })).rejects.toThrow("Email delivery failed");
    const delivery = await db.notificationOutbox.findFirstOrThrow({
      where: { recipientEmailNormalized: email }, orderBy: { createdAt: "desc" },
    });
    expect(delivery.state).toBe("FAILED");
    expect(delivery.sentAt).toBeNull();
    expect(delivery.attempts).toBe(1);
    expect(delivery.nextAttemptAt).not.toBeNull();
  });
});
