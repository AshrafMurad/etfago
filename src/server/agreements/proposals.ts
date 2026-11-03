import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
  assertCanCreateChangeRequest,
  assertCanManageChangeRequest,
} from "../auth/permissions";
import {
  CreateChangeRequestInput,
  CreateChangeRequestSchema,
  ResolveChangeRequestInput,
  ResolveChangeRequestSchema,
  CancelChangeRequestInput,
  CancelChangeRequestSchema,
  ChangeRequestStatus,
  ChangeOperation,
} from "../../lib/schemas/proposals";
import {
  DraftContent,
  DraftContentSchema,
  StructuredTerm,
} from "../../lib/schemas/agreements";
import { Prisma } from "@prisma/client";

export interface ChangeRequestSummary {
  id: string;
  agreementId: string;
  baseVersionId: string | null;
  createdByUserId: string;
  creatorName: string;
  creatorEmail: string;
  termId: string;
  operation: ChangeOperation;
  oldTerm: StructuredTerm | null;
  newTerm: StructuredTerm | null;
  reason: string | null;
  status: ChangeRequestStatus;
  resolvedByUserId: string | null;
  resolverName: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

/**
 * Creates a new change request proposed by a joined participant or organizer.
 * Invariant: A proposal does NOT mutate the approved agreement or pending review.
 */
export async function createChangeRequest(
  actorUserId: string,
  input: CreateChangeRequestInput
): Promise<ChangeRequestSummary> {
  const validated = CreateChangeRequestSchema.parse(input);

  await assertCanCreateChangeRequest(actorUserId, validated.agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: validated.agreementId },
    select: {
      id: true,
      currentApprovedVersionId: true,
      lifecycleStatus: true,
    },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  if (agreement.lifecycleStatus === "ARCHIVED") {
    throw new ForbiddenError("Cannot propose changes on an archived agreement");
  }

  // If baseVersionId is specified, verify it belongs to this agreement
  if (validated.baseVersionId) {
    const version = await db.agreementVersion.findFirst({
      where: {
        id: validated.baseVersionId,
        agreementId: validated.agreementId,
      },
    });
    if (!version) {
      throw new NotFoundError("Referenced base version not found in this agreement");
    }
  }

  // Create ChangeRequest and log ActivityEvent atomically
  return await db.$transaction(async (tx) => {
    const cr = await tx.changeRequest.create({
      data: {
        agreementId: validated.agreementId,
        baseVersionId: validated.baseVersionId ?? agreement.currentApprovedVersionId,
        createdByUserId: actorUserId,
        termId: validated.termId,
        operation: validated.operation,
        oldTermJson: validated.oldTermJson ? (validated.oldTermJson as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        newTermJson: validated.newTermJson ? (validated.newTermJson as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        reason: validated.reason ?? null,
        status: "OPEN",
      },
      include: {
        agreement: {
          select: {
            title: true,
          },
        },
      },
    });

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, emailNormalized: true },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "CHANGE_REQUEST_CREATED",
        objectId: cr.id,
        versionId: validated.baseVersionId ?? agreement.currentApprovedVersionId,
        summaryJson: {
          changeRequestId: cr.id,
          termId: validated.termId,
          operation: validated.operation,
          creatorEmail: actor?.emailNormalized ?? null,
          creatorName: actor?.name ?? null,
          reason: validated.reason ?? null,
        },
      },
    });

    return {
      id: cr.id,
      agreementId: cr.agreementId,
      baseVersionId: cr.baseVersionId,
      createdByUserId: cr.createdByUserId,
      creatorName: actor?.name || actor?.emailNormalized || "User",
      creatorEmail: actor?.emailNormalized || "",
      termId: cr.termId,
      operation: cr.operation as ChangeOperation,
      oldTerm: cr.oldTermJson as unknown as StructuredTerm | null,
      newTerm: cr.newTermJson as unknown as StructuredTerm | null,
      reason: cr.reason,
      status: cr.status as ChangeRequestStatus,
      resolvedByUserId: null,
      resolverName: null,
      resolvedAt: null,
      createdAt: cr.createdAt,
    };
  });
}

/**
 * Resolves an open change request (ACCEPT into draft or DECLINE).
 * Only the organizer or authorized editor can resolve change requests.
 *
 * Invariant: Accepting a change request mutates the MUTABLE DRAFT and increments
 * its revision. It DOES NOT mutate the approved snapshot or pending review.
 */
export async function resolveChangeRequest(
  actorUserId: string,
  input: ResolveChangeRequestInput
): Promise<ChangeRequestSummary> {
  const validated = ResolveChangeRequestSchema.parse(input);

  await assertCanManageChangeRequest(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    // 1. Lock Agreement row to prevent concurrent review or draft races
    const agreementRows = await tx.$queryRaw<
      Array<{
        id: string;
        currentApprovedVersionId: string | null;
        pendingReviewVersionId: string | null;
        lifecycleStatus: string;
      }>
    >`SELECT id, "currentApprovedVersionId", "pendingReviewVersionId", "lifecycleStatus"
      FROM "Agreement"
      WHERE id = ${validated.agreementId}
      FOR UPDATE`;

    if (!agreementRows || agreementRows.length === 0) {
      throw new NotFoundError("Agreement not found");
    }

    const agreement = agreementRows[0];
    if (agreement.lifecycleStatus === "ARCHIVED") {
      throw new ForbiddenError("Cannot modify an archived agreement");
    }

    // 2. Fetch the change request and verify status is OPEN
    const cr = await tx.changeRequest.findFirst({
      where: {
        id: validated.changeRequestId,
        agreementId: validated.agreementId,
      },
    });

    if (!cr) {
      throw new NotFoundError("Change request not found");
    }

    if (cr.status !== "OPEN") {
      throw new ConflictError("Change request is already resolved or cancelled");
    }

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, emailNormalized: true },
    });

    const creator = await tx.user.findUnique({
      where: { id: cr.createdByUserId },
      select: { name: true, emailNormalized: true },
    });

    if (validated.action === "DECLINE") {
      // Decline without draft modification
      const updatedCr = await tx.changeRequest.update({
        where: { id: cr.id },
        data: {
          status: "DECLINED",
          resolvedByUserId: actorUserId,
          resolvedAt: new Date(),
          reason: validated.declineReason ?? cr.reason,
        },
      });

      await tx.activityEvent.create({
        data: {
          agreementId: validated.agreementId,
          actorUserId,
          action: "CHANGE_REQUEST_DECLINED",
          objectId: cr.id,
          summaryJson: {
            changeRequestId: cr.id,
            termId: cr.termId,
            operation: cr.operation,
            declineReason: validated.declineReason,
            resolvedByEmail: actor?.emailNormalized,
          },
        },
      });

      return {
        id: updatedCr.id,
        agreementId: updatedCr.agreementId,
        baseVersionId: updatedCr.baseVersionId,
        createdByUserId: updatedCr.createdByUserId,
        creatorName: creator?.name || creator?.emailNormalized || "User",
        creatorEmail: creator?.emailNormalized || "",
        termId: updatedCr.termId,
        operation: updatedCr.operation as ChangeOperation,
        oldTerm: updatedCr.oldTermJson as unknown as StructuredTerm | null,
        newTerm: updatedCr.newTermJson as unknown as StructuredTerm | null,
        reason: updatedCr.reason,
        status: "DECLINED",
        resolvedByUserId: actorUserId,
        resolverName: actor?.name || actor?.emailNormalized || "Organizer",
        resolvedAt: updatedCr.resolvedAt,
        createdAt: updatedCr.createdAt,
      };
    }

    // 3. Action is ACCEPT -> Apply proposal into the mutable draft!
    // Fetch draft or initialize from current approved version if missing
    let draft = await tx.agreementDraft.findUnique({
      where: { agreementId: validated.agreementId },
    });

    if (!draft) {
      if (agreement.currentApprovedVersionId) {
        const approvedVersion = await tx.agreementVersion.findUnique({
          where: { id: agreement.currentApprovedVersionId },
        });
        if (!approvedVersion) {
          throw new NotFoundError("Current approved version not found");
        }
        draft = await tx.agreementDraft.create({
          data: {
            agreementId: validated.agreementId,
            basedOnVersionId: agreement.currentApprovedVersionId,
            contentJson: approvedVersion.snapshotJson as Prisma.InputJsonValue,
            revision: 1,
            updatedByUserId: actorUserId,
          },
        });
      } else {
        throw new NotFoundError("Draft not found for this agreement");
      }
    }

    const currentDraftContent = DraftContentSchema.parse(draft.contentJson);
    let updatedTerms: StructuredTerm[] = [...currentDraftContent.terms];

    if (cr.operation === "ADD") {
      if (!cr.newTermJson) {
        throw new ConflictError("New term data is missing from ADD proposal");
      }
      const newTerm = cr.newTermJson as unknown as StructuredTerm;
      // Prevent duplicates
      const exists = updatedTerms.some((t) => t.id === newTerm.id);
      if (exists) {
        // Assign fresh stable ID
        newTerm.id = `term_${crypto.randomUUID().slice(0, 8)}`;
      }
      updatedTerms.push(newTerm);
    } else if (cr.operation === "UPDATE") {
      if (!cr.newTermJson) {
        throw new ConflictError("Updated term data is missing from UPDATE proposal");
      }
      const newTerm = cr.newTermJson as unknown as StructuredTerm;
      const index = updatedTerms.findIndex((t) => t.id === cr.termId);
      if (index >= 0) {
        updatedTerms[index] = {
          ...newTerm,
          id: cr.termId, // Keep stable id
        };
      } else {
        // If term was not found in draft, append it
        updatedTerms.push(newTerm);
      }
    } else if (cr.operation === "REMOVE") {
      updatedTerms = updatedTerms.filter((t) => t.id !== cr.termId);
    }

    const newDraftContent: DraftContent = {
      ...currentDraftContent,
      terms: updatedTerms,
    };

    // Validate updated content
    DraftContentSchema.parse(newDraftContent);

    // Save updated draft with revision increment
    await tx.agreementDraft.update({
      where: { agreementId: validated.agreementId },
      data: {
        contentJson: newDraftContent as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
        updatedByUserId: actorUserId,
      },
    });

    // Mark ChangeRequest as ACCEPTED_IN_DRAFT
    const updatedCr = await tx.changeRequest.update({
      where: { id: cr.id },
      data: {
        status: "ACCEPTED_IN_DRAFT",
        resolvedByUserId: actorUserId,
        resolvedAt: new Date(),
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "CHANGE_REQUEST_ACCEPTED",
        objectId: cr.id,
        summaryJson: {
          changeRequestId: cr.id,
          termId: cr.termId,
          operation: cr.operation,
          resolvedByEmail: actor?.emailNormalized,
          draftRevision: draft.revision + 1,
        },
      },
    });

    return {
      id: updatedCr.id,
      agreementId: updatedCr.agreementId,
      baseVersionId: updatedCr.baseVersionId,
      createdByUserId: updatedCr.createdByUserId,
      creatorName: creator?.name || creator?.emailNormalized || "User",
      creatorEmail: creator?.emailNormalized || "",
      termId: updatedCr.termId,
      operation: updatedCr.operation as ChangeOperation,
      oldTerm: updatedCr.oldTermJson as unknown as StructuredTerm | null,
      newTerm: updatedCr.newTermJson as unknown as StructuredTerm | null,
      reason: updatedCr.reason,
      status: "ACCEPTED_IN_DRAFT",
      resolvedByUserId: actorUserId,
      resolverName: actor?.name || actor?.emailNormalized || "Organizer",
      resolvedAt: updatedCr.resolvedAt,
      createdAt: updatedCr.createdAt,
    };
  });
}

/**
 * Cancels an open change request.
 * Can be called by the creator or the organizer.
 */
export async function cancelChangeRequest(
  actorUserId: string,
  input: CancelChangeRequestInput
): Promise<ChangeRequestSummary> {
  const validated = CancelChangeRequestSchema.parse(input);

  await assertCanViewAgreement(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const cr = await tx.changeRequest.findFirst({
      where: {
        id: validated.changeRequestId,
        agreementId: validated.agreementId,
      },
      include: {
        agreement: {
          select: { organizerUserId: true },
        },
      },
    });

    if (!cr) {
      throw new NotFoundError("Change request not found");
    }

    if (cr.status !== "OPEN") {
      throw new ConflictError("Only open change requests can be cancelled");
    }

    // Only creator or organizer can cancel
    const isCreator = cr.createdByUserId === actorUserId;
    const isOrganizer = cr.agreement.organizerUserId === actorUserId;
    if (!isCreator && !isOrganizer) {
      throw new ForbiddenError("You are not authorized to cancel this change request");
    }

    const updatedCr = await tx.changeRequest.update({
      where: { id: cr.id },
      data: {
        status: "CANCELLED",
        resolvedByUserId: actorUserId,
        resolvedAt: new Date(),
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "CHANGE_REQUEST_CANCELLED",
        objectId: cr.id,
        summaryJson: {
          changeRequestId: cr.id,
          termId: cr.termId,
          operation: cr.operation,
        },
      },
    });

    const creator = await tx.user.findUnique({
      where: { id: cr.createdByUserId },
      select: { name: true, emailNormalized: true },
    });

    const actor = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, emailNormalized: true },
    });

    return {
      id: updatedCr.id,
      agreementId: updatedCr.agreementId,
      baseVersionId: updatedCr.baseVersionId,
      createdByUserId: updatedCr.createdByUserId,
      creatorName: creator?.name || creator?.emailNormalized || "User",
      creatorEmail: creator?.emailNormalized || "",
      termId: updatedCr.termId,
      operation: updatedCr.operation as ChangeOperation,
      oldTerm: updatedCr.oldTermJson as unknown as StructuredTerm | null,
      newTerm: updatedCr.newTermJson as unknown as StructuredTerm | null,
      reason: updatedCr.reason,
      status: "CANCELLED",
      resolvedByUserId: actorUserId,
      resolverName: actor?.name || actor?.emailNormalized || "User",
      resolvedAt: updatedCr.resolvedAt,
      createdAt: updatedCr.createdAt,
    };
  });
}

/**
 * Lists all change requests for an agreement.
 */
export async function listChangeRequests(
  actorUserId: string,
  agreementId: string,
  statusFilter?: ChangeRequestStatus
): Promise<ChangeRequestSummary[]> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const whereClause: Prisma.ChangeRequestWhereInput = {
    agreementId,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const requests = await db.changeRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  if (requests.length === 0) return [];

  // Fetch unique user IDs for creator/resolvers in bulk
  const userIds = new Set<string>();
  for (const r of requests) {
    userIds.add(r.createdByUserId);
    if (r.resolvedByUserId) userIds.add(r.resolvedByUserId);
  }

  const users = await db.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, emailNormalized: true },
  });

  const userMap = new Map<string, { name: string | null; emailNormalized: string }>();
  for (const u of users) {
    userMap.set(u.id, u);
  }

  return requests.map((r) => {
    const creator = userMap.get(r.createdByUserId);
    const resolver = r.resolvedByUserId ? userMap.get(r.resolvedByUserId) : null;

    return {
      id: r.id,
      agreementId: r.agreementId,
      baseVersionId: r.baseVersionId,
      createdByUserId: r.createdByUserId,
      creatorName: creator?.name || creator?.emailNormalized || "User",
      creatorEmail: creator?.emailNormalized || "",
      termId: r.termId,
      operation: r.operation as ChangeOperation,
      oldTerm: r.oldTermJson as unknown as StructuredTerm | null,
      newTerm: r.newTermJson as unknown as StructuredTerm | null,
      reason: r.reason,
      status: r.status as ChangeRequestStatus,
      resolvedByUserId: r.resolvedByUserId,
      resolverName: resolver ? resolver.name || resolver.emailNormalized : null,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
    };
  });
}
