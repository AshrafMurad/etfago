import crypto from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerWithPassword } from "../../src/server/auth/service";
import { verifyPassword } from "../../src/server/auth/password";

describe("Password registration", () => {
  const email = `password-auth-${crypto.randomUUID()}@example.com`;

  afterAll(async () => {
    const user = await db.user.findUnique({ where: { emailNormalized: email } });
    if (!user) return;
    await db.workspace.deleteMany({ where: { ownerUserId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  });

  it("creates a usable password account and cannot overwrite an existing credential", async () => {
    const password = "a secure side project password";
    const result = await registerWithPassword({ email, password, name: "Test User", locale: "en" });
    const stored = await db.user.findUniqueOrThrow({
      where: { emailNormalized: email },
      include: { workspaces: { include: { workspace: true } } },
    });

    expect(result.user.emailVerifiedAt).not.toBeNull();
    expect(stored.passwordHash).not.toBe(password);
    await expect(verifyPassword(password, stored.passwordHash)).resolves.toBe(true);
    expect(stored.workspaces).toHaveLength(1);
    expect(stored.workspaces[0].workspace.kind).toBe("PERSONAL");

    await expect(registerWithPassword({
      email,
      password: "an attacker supplied password",
      locale: "en",
    })).rejects.toThrow("Unable to create account");
    const unchanged = await db.user.findUniqueOrThrow({ where: { emailNormalized: email } });
    expect(unchanged.passwordHash).toBe(stored.passwordHash);
  });
});
