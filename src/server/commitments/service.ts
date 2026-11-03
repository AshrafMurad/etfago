import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
  assertCanManageCommitment,
  assertCanUpdateCommitmentStatus,
} from "../auth/permissions";
import {
  CreateCommitmentInput,
  CreateCommitmentSchema,
  UpdateCommitmentStatusInput,
  UpdateCommitmentStatusSchema,
  UpdateCommitmentInput,
  UpdateCommitmentSchema,
  DeleteCommitmentInput,
  DeleteCommitmentSchema,
  CommitmentStatus,
} from "../../lib/schemas/commitments";
import { diffTerms } from "../../lib/diff";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { Prisma } from "@prisma/client";

export interface CommitmentDetail {
  id: string;
  agreementId: string;
  sourceVersionId: string | null;
  sourceTermId: string | null;
  title: string;
  details: string | null;
  assigneeParticipantId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  dueAt: Date | null;
  status: CommitmentStatus;
  needsReview: boolean;
  createdByUserId: string;
  creatorName: string | null;
  rowRevision: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new commitment linked to an agreement, version, and optional term.
 */
export async function createCommitment(
  actorUserId: string,
  input: CreateCommitmentInput
): Promise<CommitmentDetail> {
  const validated = CreateCommitmentSchema.parse(input);

  await assertCanManageCommitment(actorUserId, validated.agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: validated.agreementId },
    select: { id: true, lifecycleStatus: true },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  if (agreement.lifecycleStatus === "ARCHIVED") {
    throw new ForbiddenError("Cannot create commitments on an archived agreement");
  }

  // Validate assignee if provided
  if (validated.assigneeParticipantId) {
    const participant = await db.agreementParticipant.findFirst({
      where: {
        id: validated.assigneeParticipantId,
        agreementId: validated.agreementId,
        removedAt: null,
      },
    });
    if (!participant) {
      throw new NotFoundError("Assignee participant not found or is inactive");
    }
  }

  // Validate sourceVersionId if provided
  if (validated.sourceVersionId) {
    const version = await db.agreementVersion.findFirst({
      where: {
        id: validated.sourceVersionId,
        agreementId: validated.agreementId,
      },
    });
    if (!version) {
      throw new NotFoundError("Referenced source version not found");
    }
  }

  return await db.$transaction(async (tx) => {
    const commitment = await tx.commitment.create({
      data: {
        agreementId: validated.agreementId,
        sourceVersionId: validated.sourceVersionId ?? null,
        sourceTermId: validated.sourceTermId ?? null,
        title: validated.title,
        details: validated.details ?? null,
        assigneeParticipantId: validated.assigneeParticipantId ?? null,
        dueAt: validated.dueAt ? new Date(validated.dueAt) : null,
        status: "TODO",
        needsReview: false,
        createdByUserId: actorUserId,
      },
    });

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, emailNormalized: true },
    });

    let assigneeInfo: { name: string; email: string } | null = null;
    if (commitment.assigneeParticipantId) {
      const p = await tx.agreementParticipant.findUnique({
        where: { id: commitment.assigneeParticipantId },
        select: { partyDisplayName: true, emailNormalized: true },
      });
      if (p) {
        assigneeInfo = { name: p.partyDisplayName, email: p.emailNormalized };
      }
    }

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "COMMITMENT_CREATED",
        objectId: commitment.id,
        versionId: commitment.sourceVersionId,
        summaryJson: {
          commitmentId: commitment.id,
          title: commitment.title,
          assigneeName: assigneeInfo?.name ?? null,
          dueAt: commitment.dueAt ? commitment.dueAt.toISOString() : null,
        },
      },
    });

    return {
      id: commitment.id,
      agreementId: commitment.agreementId,
      sourceVersionId: commitment.sourceVersionId,
      sourceTermId: commitment.sourceTermId,
      title: commitment.title,
      details: commitment.details,
      assigneeParticipantId: commitment.assigneeParticipantId,
      assigneeName: assigneeInfo?.name ?? null,
      assigneeEmail: assigneeInfo?.email ?? null,
      dueAt: commitment.dueAt,
      status: commitment.status as CommitmentStatus,
      needsReview: commitment.needsReview,
      createdByUserId: commitment.createdByUserId,
      creatorName: actor?.name || actor?.emailNormalized || "User",
      rowRevision: commitment.rowRevision,
      createdAt: commitment.createdAt,
      updatedAt: commitment.updatedAt,
    };
  });
}

/**
 * Updates commitment status with optimistic concurrency control.
 * Can be performed by assignee, organizer, or editor.
 */
export async function updateCommitmentStatus(
  actorUserId: string,
  input: UpdateCommitmentStatusInput
): Promise<CommitmentDetail> {
  const validated = UpdateCommitmentStatusSchema.parse(input);

  await assertCanUpdateCommitmentStatus(
    actorUserId,
    validated.agreementId,
    validated.commitmentId
  );

  return await db.$transaction(async (tx) => {
    const existing = await tx.commitment.findFirst({
      where: {
        id: validated.commitmentId,
        agreementId: validated.agreementId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Commitment not found");
    }

    if (existing.rowRevision !== validated.expectedRevision) {
      throw new ConflictError(
        "Commitment was modified in another session. Please refresh."
      );
    }

    const updated = await tx.commitment.update({
      where: { id: existing.id },
      data: {
        status: validated.status,
        rowRevision: { increment: 1 },
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "COMMITMENT_STATUS_UPDATED",
        objectId: updated.id,
        summaryJson: {
          commitmentId: updated.id,
          oldStatus: existing.status,
          newStatus: updated.status,
        },
      },
    });

    let assigneeInfo: { name: string; email: string } | null = null;
    if (updated.assigneeParticipantId) {
      const p = await tx.agreementParticipant.findUnique({
        where: { id: updated.assigneeParticipantId },
        select: { partyDisplayName: true, emailNormalized: true },
      });
      if (p) {
        assigneeInfo = { name: p.partyDisplayName, email: p.emailNormalized };
      }
    }

    const creator = await tx.user.findUnique({
      where: { id: updated.createdByUserId },
      select: { name: true, emailNormalized: true },
    });

    return {
      id: updated.id,
      agreementId: updated.agreementId,
      sourceVersionId: updated.sourceVersionId,
      sourceTermId: updated.sourceTermId,
      title: updated.title,
      details: updated.details,
      assigneeParticipantId: updated.assigneeParticipantId,
      assigneeName: assigneeInfo?.name ?? null,
      assigneeEmail: assigneeInfo?.email ?? null,
      dueAt: updated.dueAt,
      status: updated.status as CommitmentStatus,
      needsReview: updated.needsReview,
      createdByUserId: updated.createdByUserId,
      creatorName: creator?.name || creator?.emailNormalized || "User",
      rowRevision: updated.rowRevision,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });
}

/**
 * Updates full commitment details (title, details, assignee, due date, needsReview).
 * Only organizer or editor can update.
 */
export async function updateCommitment(
  actorUserId: string,
  input: UpdateCommitmentInput
): Promise<CommitmentDetail> {
  const validated = UpdateCommitmentSchema.parse(input);

  await assertCanManageCommitment(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const existing = await tx.commitment.findFirst({
      where: {
        id: validated.commitmentId,
        agreementId: validated.agreementId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Commitment not found");
    }

    if (existing.rowRevision !== validated.expectedRevision) {
      throw new ConflictError(
        "Commitment was modified in another session. Please refresh."
      );
    }

    if (validated.assigneeParticipantId) {
      const p = await tx.agreementParticipant.findFirst({
        where: {
          id: validated.assigneeParticipantId,
          agreementId: validated.agreementId,
          removedAt: null,
        },
      });
      if (!p) {
        throw new NotFoundError("Assignee participant not found");
      }
    }

    const updated = await tx.commitment.update({
      where: { id: existing.id },
      data: {
        title: validated.title,
        details: validated.details ?? null,
        assigneeParticipantId: validated.assigneeParticipantId ?? null,
        dueAt: validated.dueAt ? new Date(validated.dueAt) : null,
        needsReview:
          validated.needsReview !== undefined
            ? validated.needsReview
            : existing.needsReview,
        rowRevision: { increment: 1 },
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "COMMITMENT_UPDATED",
        objectId: updated.id,
        summaryJson: {
          commitmentId: updated.id,
          title: updated.title,
        },
      },
    });

    let assigneeInfo: { name: string; email: string } | null = null;
    if (updated.assigneeParticipantId) {
      const p = await tx.agreementParticipant.findUnique({
        where: { id: updated.assigneeParticipantId },
        select: { partyDisplayName: true, emailNormalized: true },
      });
      if (p) {
        assigneeInfo = { name: p.partyDisplayName, email: p.emailNormalized };
      }
    }

    const creator = await tx.user.findUnique({
      where: { id: updated.createdByUserId },
      select: { name: true, emailNormalized: true },
    });

    return {
      id: updated.id,
      agreementId: updated.agreementId,
      sourceVersionId: updated.sourceVersionId,
      sourceTermId: updated.sourceTermId,
      title: updated.title,
      details: updated.details,
      assigneeParticipantId: updated.assigneeParticipantId,
      assigneeName: assigneeInfo?.name ?? null,
      assigneeEmail: assigneeInfo?.email ?? null,
      dueAt: updated.dueAt,
      status: updated.status as CommitmentStatus,
      needsReview: updated.needsReview,
      createdByUserId: updated.createdByUserId,
      creatorName: creator?.name || creator?.emailNormalized || "User",
      rowRevision: updated.rowRevision,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });
}

/**
 * Deletes a commitment.
 */
export async function deleteCommitment(
  actorUserId: string,
  input: DeleteCommitmentInput
): Promise<void> {
  const validated = DeleteCommitmentSchema.parse(input);

  await assertCanManageCommitment(actorUserId, validated.agreementId);

  await db.$transaction(async (tx) => {
    const existing = await tx.commitment.findFirst({
      where: {
        id: validated.commitmentId,
        agreementId: validated.agreementId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Commitment not found");
    }

    await tx.commitment.delete({
      where: { id: existing.id },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "COMMITMENT_DELETED",
        objectId: existing.id,
        summaryJson: {
          commitmentId: existing.id,
          title: existing.title,
        },
      },
    });
  });
}

/**
 * Lists all commitments for an agreement.
 */
export async function listCommitments(
  actorUserId: string,
  agreementId: string
): Promise<CommitmentDetail[]> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const commitments = await db.commitment.findMany({
    where: { agreementId },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });

  if (commitments.length === 0) return [];

  // Fetch participant display names & creators
  const participantIds = commitments
    .map((c) => c.assigneeParticipantId)
    .filter((id): id is string => id !== null);

  const participants = await db.agreementParticipant.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, partyDisplayName: true, emailNormalized: true },
  });

  const participantMap = new Map(
    participants.map((p) => [p.id, { name: p.partyDisplayName, email: p.emailNormalized }])
  );

  const userIds = Array.from(new Set(commitments.map((c) => c.createdByUserId)));
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, emailNormalized: true },
  });

  const userMap = new Map(
    users.map((u) => [u.id, u.name || u.emailNormalized])
  );

  return commitments.map((c) => {
    const assignee = c.assigneeParticipantId
      ? participantMap.get(c.assigneeParticipantId)
      : null;

    return {
      id: c.id,
      agreementId: c.agreementId,
      sourceVersionId: c.sourceVersionId,
      sourceTermId: c.sourceTermId,
      title: c.title,
      details: c.details,
      assigneeParticipantId: c.assigneeParticipantId,
      assigneeName: assignee?.name ?? null,
      assigneeEmail: assignee?.email ?? null,
      dueAt: c.dueAt,
      status: c.status as CommitmentStatus,
      needsReview: c.needsReview,
      createdByUserId: c.createdByUserId,
      creatorName: userMap.get(c.createdByUserId) ?? "User",
      rowRevision: c.rowRevision,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });
}

/**
 * Critical Domain Invariant:
 * When an agreement is amended and a new version is promoted to APPROVED/AGREED,
 * check all active commitments for the agreement. If a commitment was linked
 * to a term that was modified or removed in the new version, set needsReview = true!
 */
export async function checkCommitmentsAfterAmendment(
  tx: Prisma.TransactionClient,
  agreementId: string,
  oldTerms: StructuredTerm[],
  newTerms: StructuredTerm[]
): Promise<number> {
  const diff = diffTerms(oldTerms, newTerms);

  const changedTermIds = new Set<string>();
  for (const t of diff.terms) {
    if (t.status === "MODIFIED" || t.status === "REMOVED") {
      changedTermIds.add(t.termId);
    }
  }

  if (changedTermIds.size === 0) return 0;

  // Find commitments linked to changed terms (excluding explicitly cancelled tasks)
  const affectedCommitments = await tx.commitment.findMany({
    where: {
      agreementId,
      sourceTermId: { in: Array.from(changedTermIds) },
      status: { not: "CANCELLED" },
    },
  });

  if (affectedCommitments.length === 0) return 0;

  await tx.commitment.updateMany({
    where: {
      id: { in: affectedCommitments.map((c) => c.id) },
    },
    data: {
      needsReview: true,
      rowRevision: { increment: 1 },
    },
  });

  for (const c of affectedCommitments) {
    await tx.activityEvent.create({
      data: {
        agreementId,
        action: "COMMITMENT_FLAGGED_FOR_REVIEW",
        objectId: c.id,
        summaryJson: {
          commitmentId: c.id,
          sourceTermId: c.sourceTermId,
          title: c.title,
          notice: "Linked term was altered during agreement amendment.",
        },
      },
    });
  }

  return affectedCommitments.length;
}
