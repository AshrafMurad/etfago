import { auth } from "./auth";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors";
import { db } from "../db/prisma";

export interface CurrentUser {
  id: string;
  name?: string | null;
  email: string;
  emailVerified: Date | null;
}

/**
 * Returns the currently authenticated user from the Auth.js session, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.emailNormalized !== session.user.email) return null;
  return { id: user.id, name: user.name, email: user.emailNormalized, emailVerified: user.emailVerifiedAt };
}

/**
 * Asserts that the actor is signed in. Throws UnauthorizedError otherwise.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("You must be signed in to perform this action");
  }
  return user;
}

/**
 * Asserts that the actor is signed in AND their email address is verified.
 * Throws ForbiddenError if unverified.
 */
export async function requireVerifiedUser(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!user.emailVerified) {
    throw new ForbiddenError("Email verification is required to perform this action");
  }
  return user;
}
