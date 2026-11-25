import { afterEach, describe, expect, it, vi } from "vitest";
import { validateProductionEnvironment } from "../../src/server/config";
import { clearDevOutbox, getDevOutbox, getActiveEmailTransport, resetActiveEmailTransport } from "../../src/server/notifications/email";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetActiveEmailTransport(); clearDevOutbox(); });

describe("Production configuration and transport", () => {
  const env = {
    APP_URL: "https://etfago.test", AUTH_SECRET: "a".repeat(64), CRON_SECRET: "b".repeat(64),
    RESEND_API_KEY: "re_test", EMAIL_FROM: "Etfago <mail@etfago.test>",
    DATABASE_URL: "postgresql://user:password@db:5432/etfago", STORAGE_ROOT: "/data/private-files",
  };
  it("rejects development origins, secrets, senders, and storage paths", () => {
    expect(() => validateProductionEnvironment(env)).not.toThrow();
    for (const patch of [{ APP_URL: "http://localhost:3000" }, { AUTH_SECRET: "dev-secret" }, { CRON_SECRET: "" },
      { RESEND_API_KEY: "re_placeholder" }, { EMAIL_FROM: "no-reply@example.com" }, { STORAGE_ROOT: "./storage" }]) {
      expect(() => validateProductionEnvironment({ ...env, ...patch })).toThrow();
    }
  });
  it("sends real provider requests in production without retaining tokens in the development outbox", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "provider-id" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getActiveEmailTransport().sendMail({ to: "user@example.com", subject: "Sign in", text: "private link" });
    expect(result).toEqual({ success: true, messageId: "provider-id" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(getDevOutbox()).toHaveLength(0);
  });
  it("fails honestly on missing credentials and provider errors", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_placeholder");
    expect((await getActiveEmailTransport().sendMail({ to: "user@example.com", subject: "Test" })).success).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private provider error", { status: 429 })));
    const result = await getActiveEmailTransport().sendMail({ to: "user@example.com", subject: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).not.toContain("private provider error");
  });
});
