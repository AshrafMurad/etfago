import { db } from "../db/prisma";
import { ForbiddenError, NotFoundError } from "../../lib/errors";

/**
 * Checks whether an actor can view an agreement.
 * Strictly enforces deny-by-default:
 * - Creator/organizer has access.
 * - Active linked participants (removedAt === null) have access.
 * - Unrelated workspace members, admins, and owners of the parent workspace DO NOT have blanket access unless explicitly included.
 */
export async function canViewAgreement(
  actorUserId: string,
  agreementId: string
): Promise<boolean> {
  if (!actorUserId || !agreementId) return false;

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: {
      id: true,
      organizerUserId: true,
      archivedAt: true,
      participants: {
        where: {
          userId: actorUserId,
          removedAt: null,
        },
        select: { id: true },
      },
    },
  });

  if (!agreement) return false;

  // Organizer has access
  if (agreement.organizerUserId === actorUserId) return true;

  // Active linked participant has access
  if (agreement.participants.length > 0) return true;

  // Default deny: Non-participant workspace members and outsiders have no access
  return false;
}

/**
 * Checks whether an actor can edit the mutable draft of an agreement.
 * Only the organizer or an explicitly granted EDITOR participant can edit.
 */
export async function canEditDraft(
  actorUserId: string,
  agreementId: string
): Promise<boolean> {
  if (!actorUserId || !agreementId) return false;

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: {
      id: true,
      organizerUserId: true,
      lifecycleStatus: true,
      participants: {
        where: {
          userId: actorUserId,
          removedAt: null,
        },
        select: {
          id: true,
          agreementRole: true,
        },
      },
    },
  });

  if (!agreement) return false;

  // Organizer can edit
  if (agreement.organizerUserId === actorUserId) return true;

  // Configured EDITOR participant can edit
  const editor = agreement.participants.find(
    (p) => p.agreementRole === "EDITOR" || p.agreementRole === "ORGANIZER"
  );
  if (editor) return true;

  return false;
}

/**
 * Checks whether an actor can invite or remove participants.
 * Initial release defaults to organizer-only management.
 */
export async function canInvite(
  actorUserId: string,
  agreementId: string
): Promise<boolean> {
  if (!actorUserId || !agreementId) return false;

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: {
      id: true,
      organizerUserId: true,
    },
  });

  if (!agreement) return false;

  return agreement.organizerUserId === actorUserId;
}

/**
 * Checks whether an actor can record a review decision on an agreement.
 * If versionId is specified, checks the immutable VersionReviewer roster for that version.
 * If versionId is omitted, checks whether actor is an active participant marked as required reviewer.
 */
export async function canReview(
  actorUserId: string,
  agreementId: string,
  versionId?: string
): Promise<boolean> {
  if (!actorUserId || !agreementId) return false;

  if (versionId) {
    const versionReviewer = await db.versionReviewer.findFirst({
      where: {
        versionId,
        userId: actorUserId,
        required: true,
      },
    });
    return !!versionReviewer;
  }

  // General check against active participant roster
  const participant = await db.agreementParticipant.findFirst({
    where: {
      agreementId,
      userId: actorUserId,
      removedAt: null,
      requiredByDefault: true,
      agreementRole: {
        in: ["REVIEWER", "ORGANIZER"],
      },
    },
  });

  return !!participant;
}

/**
 * Authorization assertions that throw NotFoundError / ForbiddenError.
 * Used at the top of domain service functions and server actions.
 */
export async function assertCanViewAgreement(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canViewAgreement(actorUserId, agreementId);
  if (!allowed) {
    // Avoid existence leakage: Return 404/NotFoundError for unauthorized users
    throw new NotFoundError("Agreement not found");
  }
}

export async function assertCanEditDraft(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canEditDraft(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to edit this agreement draft");
  }
}

export async function assertCanInvite(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canInvite(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("Only the agreement organizer can invite participants");
  }
}

export async function assertCanReview(
  actorUserId: string,
  agreementId: string,
  versionId?: string
): Promise<void> {
  const allowed = await canReview(actorUserId, agreementId, versionId);
  if (!allowed) {
    throw new ForbiddenError("You are not an authorized required reviewer for this version");
  }
}
