import { auth } from "./auth";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors";

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

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email,
    emailVerified:
      (session.user as unknown as { emailVerified?: Date | null }).emailVerified ?? null,
  };
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
