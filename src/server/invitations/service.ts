import { db } from "../db/prisma";
import crypto from "crypto";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import { assertCanInvite } from "../auth/permissions";
import {
  InviteParticipantInput,
  InviteParticipantSchema,
} from "../../lib/schemas/invitations";
import { sendInvitationEmail } from "../notifications/email";

export interface ParticipantDetail {
  id: string;
  agreementId: string;
  userId: string | null;
  emailNormalized: string;
  partyDisplayName: string;
  partyKind: "PERSON" | "ORGANIZATION";
  agreementRole: "ORGANIZER" | "EDITOR" | "REVIEWER" | "OBSERVER";
  requiredByDefault: boolean;
  joinedAt: Date | null;
  createdAt: Date;
  status: "JOINED" | "PENDING";
  invitation?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
    expiresAt: Date;
  } | null;
}

export interface InvitationPreview {
  id: string;
  agreementId: string;
  agreementTitle: string;
  agreementDescription: string | null;
  inviterName: string;
  invitedEmail: string;
  partyDisplayName: string;
  role: string;
  required: boolean;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  isExpired: boolean;
  expiresAt: Date;
}

/**
 * Invites a participant to an agreement.
 * Strictly verifies the actor can invite (organizer only),
 * ensures no duplicates, generates a cryptographically secure token,
 * stores ONLY its SHA-256 hash in the database, and dispatches an invitation notice.
 */
export async function inviteParticipant(
  actorUserId: string,
  input: InviteParticipantInput
): Promise<{ participantId: string; invitationId: string; rawToken: string }> {
  const validated = InviteParticipantSchema.parse(input);

  await assertCanInvite(actorUserId, validated.agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: validated.agreementId },
    select: {
      id: true,
      title: true,
      organizerUserId: true,
      lifecycleStatus: true,
      archivedAt: true,
    },
  });

  if (!agreement || agreement.archivedAt !== null) {
    throw new NotFoundError("Agreement not found or is archived");
  }

  if (agreement.lifecycleStatus === "CANCELLED") {
    throw new ConflictError("Cannot invite participants to a cancelled agreement");
  }

  // Check 1: Organizer cannot invite themselves
  const organizer = await db.user.findUnique({
    where: { id: agreement.organizerUserId },
    select: { emailNormalized: true, name: true },
  });

  if (organizer?.emailNormalized === validated.email) {
    throw new ConflictError("The agreement organizer is already a participant");
  }

  // Check 2: No duplicate active participant with the same email
  const existingParticipant = await db.agreementParticipant.findFirst({
    where: {
      agreementId: validated.agreementId,
      emailNormalized: validated.email,
      removedAt: null,
    },
  });

  if (existingParticipant) {
    throw new ConflictError("A participant with this email address is already added to this agreement");
  }

  // Generate secure raw token & SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day validity per DEC-004 / limits

  const result = await db.$transaction(async (tx) => {
    // Revoke any prior orphan invitations for this email & agreement
    await tx.agreementInvitation.updateMany({
      where: {
        agreementId: validated.agreementId,
        emailNormalized: validated.email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    // Create AgreementParticipant record
    const participant = await tx.agreementParticipant.create({
      data: {
        agreementId: validated.agreementId,
        emailNormalized: validated.email,
        partyDisplayName: validated.partyDisplayName,
        partyKind: validated.partyKind,
        agreementRole: validated.agreementRole,
        requiredByDefault: validated.requiredByDefault,
        stepOrder: validated.stepOrder ?? 1,
        userId: null,
        joinedAt: null,
      },
    });

    // Create AgreementInvitation record (ONLY storing tokenHash, never rawToken)
    const invitation = await tx.agreementInvitation.create({
      data: {
        agreementId: validated.agreementId,
        participantId: participant.id,
        emailNormalized: validated.email,
        tokenHash,
        status: "PENDING",
        expiresAt,
        invitedByUserId: actorUserId,
      },
    });

    // Append ActivityEvent
    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "PARTICIPANT_INVITED",
        summaryJson: {
          participantId: participant.id,
          partyDisplayName: participant.partyDisplayName,
          emailNormalized: participant.emailNormalized,
          agreementRole: participant.agreementRole,
          requiredByDefault: participant.requiredByDefault,
        },
      },
    });

    return { participant, invitation };
  });

  // Dispatch email notification
  await sendInvitationEmail({
    toEmail: validated.email,
    agreementTitle: agreement.title,
    inviterName: organizer?.name || "منظّم الاتفاق",
    token: rawToken,
    locale: "ar",
  });

  return {
    participantId: result.participant.id,
    invitationId: result.invitation.id,
    rawToken,
  };
}

/**
 * Resends an invitation to an unjoined participant.
 * Invalidate previous tokens and issues a fresh 7-day token.
 */
export async function resendInvitation(
  actorUserId: string,
  agreementId: string,
  participantId: string
): Promise<{ success: boolean; rawToken: string }> {
  await assertCanInvite(actorUserId, agreementId);

  const participant = await db.agreementParticipant.findFirst({
    where: {
      id: participantId,
      agreementId,
      removedAt: null,
    },
  });

  if (!participant) {
    throw new NotFoundError("Participant not found");
  }

  if (participant.userId !== null) {
    throw new ConflictError("This participant has already joined the agreement");
  }

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: { title: true, organizerUserId: true },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  const inviter = await db.user.findUnique({
    where: { id: actorUserId },
    select: { name: true },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    // Invalidate existing pending invitations
    await tx.agreementInvitation.updateMany({
      where: {
        participantId,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    // Create fresh invitation record
    await tx.agreementInvitation.create({
      data: {
        agreementId,
        participantId,
        emailNormalized: participant.emailNormalized,
        tokenHash,
        status: "PENDING",
        expiresAt,
        invitedByUserId: actorUserId,
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId,
        actorUserId,
        action: "INVITATION_RESENT",
        summaryJson: {
          participantId,
          emailNormalized: participant.emailNormalized,
        },
      },
    });
  });

  await sendInvitationEmail({
    toEmail: participant.emailNormalized,
    agreementTitle: agreement.title,
    inviterName: inviter?.name || "منظّم الاتفاق",
    token: rawToken,
    locale: "ar",
  });

  return { success: true, rawToken };
}

/**
 * Removes a participant from the agreement.
 * Revokes outstanding invitations and logs the removal.
 * Organizer cannot be removed.
 */
export async function removeParticipant(
  actorUserId: string,
  agreementId: string,
  participantId: string
): Promise<{ success: boolean }> {
  await assertCanInvite(actorUserId, agreementId);

  const participant = await db.agreementParticipant.findFirst({
    where: {
      id: participantId,
      agreementId,
      removedAt: null,
    },
  });

  if (!participant) {
    throw new NotFoundError("Participant not found");
  }

  if (participant.agreementRole === "ORGANIZER") {
    throw new ForbiddenError("The organizer cannot be removed from the agreement");
  }

  await db.$transaction(async (tx) => {
    await tx.agreementParticipant.update({
      where: { id: participantId },
      data: { removedAt: new Date() },
    });

    // Revoke any pending invitations
    await tx.agreementInvitation.updateMany({
      where: {
        participantId,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    // Domain invariant: If a review is currently pending, removeParticipant must withdraw the review transactionally
    const agreement = await tx.agreement.findUnique({
      where: { id: agreementId },
      select: { pendingReviewVersionId: true },
    });

    if (agreement?.pendingReviewVersionId) {
      await tx.agreementVersion.update({
        where: { id: agreement.pendingReviewVersionId },
        data: {
          state: "WITHDRAWN",
          resolvedAt: new Date(),
        },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: { pendingReviewVersionId: null },
      });

      await tx.activityEvent.create({
        data: {
          agreementId,
          actorUserId,
          versionId: agreement.pendingReviewVersionId,
          action: "VERSION_WITHDRAWN",
          summaryJson: {
            reason: "Participant removed during pending review",
            removedParticipantId: participantId,
          },
        },
      });
    }

    await tx.activityEvent.create({
      data: {
        agreementId,
        actorUserId,
        action: "PARTICIPANT_REMOVED",
        summaryJson: {
          participantId,
          emailNormalized: participant.emailNormalized,
          partyDisplayName: participant.partyDisplayName,
        },
      },
    });
  });

  return { success: true };
}

/**
 * Updates a participant's role or requiredByDefault flag.
 */
export async function updateParticipantRole(
  actorUserId: string,
  agreementId: string,
  participantId: string,
  input: { agreementRole: "EDITOR" | "REVIEWER" | "OBSERVER"; requiredByDefault: boolean; stepOrder?: number }
): Promise<ParticipantDetail> {
  await assertCanInvite(actorUserId, agreementId);

  const participant = await db.agreementParticipant.findFirst({
    where: {
      id: participantId,
      agreementId,
      removedAt: null,
    },
  });

  if (!participant) {
    throw new NotFoundError("Participant not found");
  }

  if (participant.agreementRole === "ORGANIZER") {
    throw new ForbiddenError("Organizer role cannot be changed");
  }

  const updated = await db.$transaction(async (tx) => {
    const p = await tx.agreementParticipant.update({
      where: { id: participantId },
      data: {
        agreementRole: input.agreementRole,
        requiredByDefault: input.requiredByDefault,
        stepOrder: input.stepOrder ?? participant.stepOrder,
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId,
        actorUserId,
        action: "PARTICIPANT_ROLE_UPDATED",
        summaryJson: {
          participantId,
          role: input.agreementRole,
          required: input.requiredByDefault,
        },
      },
    });

    return p;
  });

  return {
    id: updated.id,
    agreementId: updated.agreementId,
    userId: updated.userId,
    emailNormalized: updated.emailNormalized,
    partyDisplayName: updated.partyDisplayName,
    partyKind: updated.partyKind,
    agreementRole: updated.agreementRole,
    requiredByDefault: updated.requiredByDefault,
    joinedAt: updated.joinedAt,
    createdAt: updated.createdAt,
    status: updated.userId ? "JOINED" : "PENDING",
  };
}

/**
 * Fetches invitation preview by raw token.
 * Safe public query: matches SHA-256 hash. Does NOT disclose private terms.
 */
export async function getInvitationPreview(rawToken: string): Promise<InvitationPreview> {
  if (!rawToken || rawToken.length < 32) {
    throw new NotFoundError("Invalid invitation token");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.agreementInvitation.findUnique({
    where: { tokenHash },
    include: {
      agreement: {
        select: {
          id: true,
          title: true,
          description: true,
          organizerUserId: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found or link has expired");
  }

  const participant = await db.agreementParticipant.findUnique({
    where: { id: invitation.participantId },
  });

  if (!participant || participant.removedAt !== null) {
    throw new NotFoundError("Participant has been removed from this agreement");
  }

  const inviter = await db.user.findUnique({
    where: { id: invitation.invitedByUserId },
    select: { name: true },
  });

  const isExpired = invitation.expiresAt < new Date() || invitation.status === "EXPIRED";

  return {
    id: invitation.id,
    agreementId: invitation.agreementId,
    agreementTitle: invitation.agreement.title,
    agreementDescription: invitation.agreement.description,
    inviterName: inviter?.name || "منظّم الاتفاق",
    invitedEmail: invitation.emailNormalized,
    partyDisplayName: participant.partyDisplayName,
    role: participant.agreementRole,
    required: participant.requiredByDefault,
    status: invitation.status,
    isExpired,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Redeems an invitation.
 * Invariant: Must be invoked by a signed-in user whose VERIFIED email matches invitation.emailNormalized.
 */
export async function redeemInvitation(
  actorUserId: string,
  rawToken: string
): Promise<{ agreementId: string; participantId: string }> {
  if (!rawToken || rawToken.length < 32) {
    throw new NotFoundError("Invalid invitation token");
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const invitation = await db.agreementInvitation.findUnique({
    where: { tokenHash },
    include: {
      agreement: { select: { id: true, lifecycleStatus: true, archivedAt: true } },
    },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation link is invalid or expired");
  }

  if (invitation.status !== "PENDING") {
    throw new ConflictError(
      invitation.status === "ACCEPTED"
        ? "This invitation has already been accepted"
        : "This invitation is no longer active"
    );
  }

  if (invitation.expiresAt < new Date()) {
    await db.agreementInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new ConflictError("This invitation link has expired");
  }

  // Actor validation: email must match and must be verified
  const actor = await db.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, emailNormalized: true, emailVerifiedAt: true, name: true },
  });

  if (!actor) {
    throw new NotFoundError("User not found");
  }

  if (!actor.emailVerifiedAt) {
    throw new ForbiddenError(
      "Email verification is required before accepting agreement invitations"
    );
  }

  if (actor.emailNormalized !== invitation.emailNormalized) {
    throw new ForbiddenError(
      `This invitation was issued for ${invitation.emailNormalized}. You are signed in as ${actor.emailNormalized}. Please sign in with the invited email.`
    );
  }

  const participant = await db.agreementParticipant.findUnique({
    where: { id: invitation.participantId },
  });

  if (!participant || participant.removedAt !== null) {
    throw new NotFoundError("Participant record is not active");
  }

  // Atomic redemption and linkage
  await db.$transaction(async (tx) => {
    // 1. Consume invitation
    await tx.agreementInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        consumedAt: new Date(),
      },
    });

    // 2. Link participant to actor user
    await tx.agreementParticipant.update({
      where: { id: invitation.participantId },
      data: {
        userId: actorUserId,
        joinedAt: new Date(),
      },
    });

    // 3. Append ActivityEvent
    await tx.activityEvent.create({
      data: {
        agreementId: invitation.agreementId,
        actorUserId,
        action: "PARTICIPANT_JOINED",
        summaryJson: {
          participantId: invitation.participantId,
          emailNormalized: invitation.emailNormalized,
          partyDisplayName: participant.partyDisplayName,
        },
      },
    });
  });

  return {
    agreementId: invitation.agreementId,
    participantId: invitation.participantId,
  };
}

/**
 * Lists participants for an agreement with their invitation and joined status.
 */
export async function listAgreementParticipants(
  actorUserId: string,
  agreementId: string
): Promise<ParticipantDetail[]> {
  const participants = await db.agreementParticipant.findMany({
    where: {
      agreementId,
      removedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const pendingInvitations = await db.agreementInvitation.findMany({
    where: {
      agreementId,
      status: "PENDING",
    },
  });

  const invitationMap = new Map(pendingInvitations.map((i) => [i.participantId, i]));

  return participants.map((p) => {
    const inv = invitationMap.get(p.id);
    return {
      id: p.id,
      agreementId: p.agreementId,
      userId: p.userId,
      emailNormalized: p.emailNormalized,
      partyDisplayName: p.partyDisplayName,
      partyKind: p.partyKind,
      agreementRole: p.agreementRole,
      requiredByDefault: p.requiredByDefault,
      joinedAt: p.joinedAt,
      createdAt: p.createdAt,
      status: p.userId ? "JOINED" : "PENDING",
      invitation: inv
        ? {
            id: inv.id,
            status: inv.status,
            expiresAt: inv.expiresAt,
          }
        : null,
    };
  });
}
