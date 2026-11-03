import { db } from "../db/prisma";
import { normalizeEmail } from "../../lib/email";
import { sendVerificationEmail } from "../notifications/email";
import { ValidationError } from "../../lib/errors";
import crypto from "crypto";

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

/**
 * Registers a new user or retrieves an existing unverified user,
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

    // If not verified yet, issue a fresh verification token and send notice
    let token: string | undefined = undefined;
    if (!existingUser.emailVerifiedAt) {
      token = await issueVerificationToken(emailNormalized);
      await sendVerificationEmail({
        toEmail: emailNormalized,
        userId: existingUser.id,
        token,
        locale,
      });
    }

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
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
        token,
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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({
    where: { identifier: normalized },
  });

  await db.verificationToken.create({
    data: {
      identifier: normalized,
      token,
      expires,
    },
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

  const record = await db.verificationToken.findFirst({
    where: {
      identifier: emailNormalized,
      token: input.token,
    },
  });

  if (!record) {
    throw new ValidationError("Invalid or expired verification token");
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: emailNormalized,
          token: input.token,
        },
      },
    });
    throw new ValidationError("Verification token has expired");
  }

  const updatedUser = await db.$transaction(async (tx) => {
    // Delete token so it cannot be reused
    await tx.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: emailNormalized,
          token: input.token,
        },
      },
    });

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
