import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";

const state = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  verify: vi.fn(),
  verifyPassword: vi.fn(),
  limit: vi.fn(),
  findUser: vi.fn(),
}));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => { state.config = config; return {}; } }));
vi.mock("../../src/server/auth/service", () => ({ verifyEmailToken: state.verify }));
vi.mock("../../src/server/auth/rate-limit", () => ({ consumeAuthRateLimit: state.limit }));
vi.mock("../../src/server/auth/password", () => ({ verifyPassword: state.verifyPassword }));
vi.mock("../../src/server/db/prisma", () => ({ db: { user: { findUnique: state.findUser } } }));
await import("../../src/server/auth/auth");

describe("Auth.js trust boundary", () => {
  beforeEach(() => {
    state.verify.mockReset();
    state.verifyPassword.mockReset();
    state.findUser.mockReset();
    state.limit.mockResolvedValue(true);
  });
  const request = new Request("https://etfago.test/api/auth/callback/credentials");
  const provider = state.config!.providers[0] as unknown as { options: { authorize: (input: unknown, request: Request) => Promise<unknown> } };

  it("does not authenticate an email address without a token", async () => {
    expect(await provider.options.authorize({ email: "victim@example.com" }, request)).toBeNull();
    expect(state.verify).not.toHaveBeenCalled();
  });
  it("requires successful single-use token verification", async () => {
    state.verify.mockRejectedValueOnce(new Error("Expired"));
    expect(await provider.options.authorize({ email: "victim@example.com", token: "a".repeat(64) }, request)).toBeNull();
    state.verify.mockResolvedValueOnce({ user: { id: "real-user", emailNormalized: "victim@example.com", emailVerifiedAt: new Date() } });
    expect(await provider.options.authorize({ email: "victim@example.com", token: "a".repeat(64), id: "forged-user" }, request)).toMatchObject({ id: "real-user" });
  });
  it("authenticates only a valid stored password and ignores forged identity fields", async () => {
    state.findUser.mockResolvedValue({
      id: "real-user", emailNormalized: "user@example.com", name: "User",
      passwordHash: "stored-hash", emailVerifiedAt: new Date(),
    });
    state.verifyPassword.mockResolvedValueOnce(false);
    expect(await provider.options.authorize({ email: "user@example.com", password: "incorrect-password" }, request)).toBeNull();
    state.verifyPassword.mockResolvedValueOnce(true);
    expect(await provider.options.authorize({
      email: "user@example.com", password: "correct-password", id: "forged-user",
    }, request)).toMatchObject({ id: "real-user", email: "user@example.com" });
  });
  it("invalidates old insecure sessions and ignores forged session updates", async () => {
    const jwt = state.config!.callbacks!.jwt!;
    const invoke = jwt as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    expect(await invoke({ token: { id: "old-user" } })).toBeNull();
    const token = { id: "real-user", authVersion: 3, emailVerified: new Date() };
    const result = await invoke({ token, trigger: "update", session: { id: "forged-user", email: "victim@example.com" } });
    expect(result?.id).toBe("real-user");
    expect(result?.email).toBeUndefined();
  });
});
