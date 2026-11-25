import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/server/auth/password";

describe("password credentials", () => {
  it("stores an Argon2id hash and verifies only the original password", async () => {
    const password = "a secure passphrase";
    const passwordHash = await hashPassword(password);
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("a different password", passwordHash)).resolves.toBe(false);
    await expect(verifyPassword(password, null)).resolves.toBe(false);
  });
});
