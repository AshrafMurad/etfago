import { db } from "../db/prisma";
import { normalizeEmail } from "../../lib/email";
import { sendVerificationEmail } from "../notifications/email";
import { ValidationError } from "../../lib/errors";
import crypto from "crypto";
import { hashPassword } from "./password";
import type { PasswordRegisterInput } from "../../lib/schemas/auth";

export interface RegisterResult {
  user: {
    id: string;
    emailNormalized: string;
    name: string | null;
    emailVerifiedAt: Date | null;
    locale: string;
  };
  workspaceId: string;
  verificationToken?: string;
  isNewUser: boolean;
}

export async function registerWithPassword(input: PasswordRegisterInput): Promise<RegisterResult> {
  const emailNormalized = normalizeEmail(input.email);
  const locale = input.locale === "en" ? "en" : "ar";
  const passwordHash = await hashPassword(input.password);

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { emailNormalized }, select: { id: true } });
    if (existing) throw new ValidationError("Unable to create account");

    const user = await tx.user.create({
      data: {
        name: input.name?.trim() || null,
        emailNormalized,
        passwordHash,
        // Temporary side-project mode: remove automatic verification when email delivery is enabled.
        emailVerifiedAt: new Date(),
        locale,
      },
    });
    const workspace = await tx.workspace.create({
      data: {
        kind: "PERSONAL",
        name: locale === "en" ? "Personal Workspace" : "مساحتي الشخصية",
        ownerUserId: user.id,
      },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });
    return { user, workspace };
  });

  return {
    user: {
      id: result.user.id,
      emailNormalized: result.user.emailNormalized,
      name: result.user.name,
      emailVerifiedAt: result.user.emailVerifiedAt,
      locale: result.user.locale,
    },
    workspaceId: result.workspace.id,
    isNewUser: true,
  };
}

/**
 * Registers a new user or retrieves an existing user,
 * guaranteeing the creation of their initial personal workspace in an atomic transaction.
 */
export async function registerOrGetUser(input: {
  email: string;
  name?: string;
  locale?: string;
}): Promise<RegisterResult> {
  const emailNormalized = normalizeEmail(input.email);
  const locale = input.locale === "en" ? "en" : "ar";

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { emailNormalized },
    include: {
      workspaces: {
        where: { removedAt: null },
        include: { workspace: true },
      },
    },
  });

  if (existingUser) {
    // If user already verified, we return user and their personal workspace
    const personalMembership = existingUser.workspaces.find(
      (m) => m.workspace.kind === "PERSONAL"
    );

    // Every sign-in requires fresh mailbox proof, including verified accounts.
    const token = await issueVerificationToken(emailNormalized);
    await sendVerificationEmail({ toEmail: emailNormalized, userId: existingUser.id, token, locale });

    return {
      user: {
        id: existingUser.id,
        emailNormalized: existingUser.emailNormalized,
        name: existingUser.name,
        emailVerifiedAt: existingUser.emailVerifiedAt,
        locale: existingUser.locale,
      },
      workspaceId: personalMembership?.workspaceId ?? existingUser.workspaces[0]?.workspaceId ?? "",
      verificationToken: token,
      isNewUser: false,
    };
  }

  // Create user and personal workspace atomically
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name?.trim() || null,
        emailNormalized,
        locale,
      },
    });

    const personalWorkspace = await tx.workspace.create({
      data: {
        kind: "PERSONAL",
        name: locale === "en" ? "Personal Workspace" : "مساحتي الشخصية",
        ownerUserId: user.id,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: personalWorkspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    // Store verification token
    await tx.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token: crypto.createHash("sha256").update(token).digest("hex"),
        expires: expiresAt,
      },
    });

    return { user, workspace: personalWorkspace };
  });

  // Dispatch email verification
  await sendVerificationEmail({
    toEmail: emailNormalized,
    userId: result.user.id,
    token,
    locale,
  });

  return {
    user: {
      id: result.user.id,
      emailNormalized: result.user.emailNormalized,
      name: result.user.name,
      emailVerifiedAt: result.user.emailVerifiedAt,
      locale: result.user.locale,
    },
    workspaceId: result.workspace.id,
    verificationToken: token,
    isNewUser: true,
  };
}

/**
 * Issues a new verification token for an identifier, removing old ones.
 */
export async function issueVerificationToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "emailNormalized" = ${normalized} FOR UPDATE`;
    await tx.verificationToken.deleteMany({ where: { identifier: normalized } });
    await tx.verificationToken.create({
      data: {
        identifier: normalized,
        token: crypto.createHash("sha256").update(token).digest("hex"),
        expires,
      },
    });
  });

  return token;
}

/**
 * Verifies email ownership via verification token.
 * Enforces:
 * - Address control proof, not legal identity or signature.
 * - One-time use token.
 * - Expiration check.
 */
export async function verifyEmailToken(input: {
  email: string;
  token: string;
}): Promise<{
  success: boolean;
  user: {
    id: string;
    emailNormalized: string;
    emailVerifiedAt: Date;
  };
}> {
  const emailNormalized = normalizeEmail(input.email);
  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

  const updatedUser = await db.$transaction(async (tx) => {
    // Atomic, expiry-checked consume prevents replay and concurrent use.
    const consumed = await tx.verificationToken.deleteMany({
      where: { identifier: emailNormalized, token: tokenHash, expires: { gt: new Date() } },
    });
    if (consumed.count !== 1) throw new ValidationError("Invalid or expired verification token");

    const user = await tx.user.update({
      where: { emailNormalized },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    return user;
  });

  return {
    success: true,
    user: {
      id: updatedUser.id,
      emailNormalized: updatedUser.emailNormalized,
      emailVerifiedAt: updatedUser.emailVerifiedAt!,
    },
  };
}

/**
 * Requests a new verification email for an unverified user.
 */
export async function requestVerificationEmail(
  email: string,
  locale = "ar"
): Promise<{ sent: boolean; alreadyVerified?: boolean }> {
  const emailNormalized = normalizeEmail(email);

  const user = await db.user.findUnique({
    where: { emailNormalized },
  });

  if (!user) {
    // Avoid email enumeration; report sent without doing anything
    return { sent: true };
  }

  if (user.emailVerifiedAt) {
    return { sent: false, alreadyVerified: true };
  }

  const token = await issueVerificationToken(emailNormalized);
  await sendVerificationEmail({
    toEmail: emailNormalized,
    userId: user.id,
    token,
    locale,
  });

  return { sent: true };
}
