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

/**
 * Checks whether an actor can submit a change request.
 * Any active participant or the organizer can propose changes as long as agreement is not archived.
 */
export async function canCreateChangeRequest(
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
        select: { id: true },
      },
    },
  });

  if (!agreement || agreement.lifecycleStatus === "ARCHIVED") return false;

  return (
    agreement.organizerUserId === actorUserId ||
    agreement.participants.length > 0
  );
}

export async function assertCanCreateChangeRequest(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canCreateChangeRequest(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to propose changes on this agreement");
  }
}

/**
 * Checks whether an actor can accept or decline a change request.
 * Only the organizer (or editor) can accept/decline proposals.
 */
export async function canManageChangeRequest(
  actorUserId: string,
  agreementId: string
): Promise<boolean> {
  return await canEditDraft(actorUserId, agreementId);
}

export async function assertCanManageChangeRequest(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canManageChangeRequest(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("Only the organizer or editor can accept or decline change proposals");
  }
}

/**
 * Checks whether an actor can post comments on an agreement.
 * Any active participant or organizer can comment, provided the agreement is not archived.
 */
export async function canComment(
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
        select: { id: true },
      },
    },
  });

  if (!agreement || agreement.lifecycleStatus === "ARCHIVED") return false;

  return (
    agreement.organizerUserId === actorUserId ||
    agreement.participants.length > 0
  );
}

export async function assertCanComment(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canComment(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to post comments on this agreement");
  }
}

/**
 * Checks whether an actor can create or manage commitments.
 * Organizer and authorized editors can create and manage commitments.
 */
export async function canManageCommitment(
  actorUserId: string,
  agreementId: string
): Promise<boolean> {
  return await canEditDraft(actorUserId, agreementId);
}

export async function assertCanManageCommitment(
  actorUserId: string,
  agreementId: string
): Promise<void> {
  const allowed = await canManageCommitment(actorUserId, agreementId);
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to manage commitments on this agreement");
  }
}

/**
 * Checks whether an actor can update a commitment's status.
 * Can be performed by the assigned participant, or the organizer/editor.
 */
export async function canUpdateCommitmentStatus(
  actorUserId: string,
  agreementId: string,
  commitmentId: string
): Promise<boolean> {
  if (!actorUserId || !agreementId || !commitmentId) return false;

  const isManager = await canManageCommitment(actorUserId, agreementId);
  if (isManager) return true;

  // Check if actor is the assignee participant
  const commitment = await db.commitment.findFirst({
    where: {
      id: commitmentId,
      agreementId,
    },
    select: {
      assigneeParticipantId: true,
    },
  });

  if (!commitment || !commitment.assigneeParticipantId) return false;

  const participant = await db.agreementParticipant.findFirst({
    where: {
      id: commitment.assigneeParticipantId,
      userId: actorUserId,
      removedAt: null,
    },
  });

  return !!participant;
}

export async function assertCanUpdateCommitmentStatus(
  actorUserId: string,
  agreementId: string,
  commitmentId: string
): Promise<void> {
  const allowed = await canUpdateCommitmentStatus(
    actorUserId,
    agreementId,
    commitmentId
  );
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to update this commitment status");
  }
}

/**
 * Workspace Permissions
 */

/**
 * Checks whether an actor can view a workspace.
 * True if actor is an active member (removedAt === null).
 */
export async function canViewWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<boolean> {
  if (!actorUserId || !workspaceId) return false;

  const membership = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorUserId,
      removedAt: null,
    },
    select: { id: true },
  });

  return !!membership;
}

export async function assertCanViewWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<void> {
  const allowed = await canViewWorkspace(actorUserId, workspaceId);
  if (!allowed) {
    throw new NotFoundError("Workspace not found");
  }
}

/**
 * Checks whether an actor is an ADMIN or OWNER of a workspace.
 */
export async function canAdminWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<boolean> {
  if (!actorUserId || !workspaceId) return false;

  const membership = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorUserId,
      removedAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  return !!membership;
}

export async function assertCanAdminWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<void> {
  const allowed = await canAdminWorkspace(actorUserId, workspaceId);
  if (!allowed) {
    throw new ForbiddenError("You are not authorized to administer this workspace");
  }
}

/**
 * Checks whether an actor is the OWNER of a workspace.
 */
export async function canTransferOrArchiveWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<boolean> {
  if (!actorUserId || !workspaceId) return false;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerUserId: true },
  });

  return workspace?.ownerUserId === actorUserId;
}

export async function assertCanTransferOrArchiveWorkspace(
  actorUserId: string,
  workspaceId: string
): Promise<void> {
  const allowed = await canTransferOrArchiveWorkspace(actorUserId, workspaceId);
  if (!allowed) {
    throw new ForbiddenError("Only the workspace owner can perform this action");
  }
}



