import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
  assertCanEditDraft,
} from "../auth/permissions";
import {
  CreateAgreementInput,
  CreateAgreementSchema,
  DraftContent,
  DraftContentSchema,
  UpdateDraftInput,
  UpdateDraftSchema,
  UpdateAgreementMetadataInput,
  UpdateAgreementMetadataSchema,
} from "../../lib/schemas/agreements";
import { AgreementLifecycleStatus } from "@prisma/client";

export interface AgreementSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceKind: "PERSONAL" | "BUSINESS";
  title: string;
  description: string | null;
  category: string | null;
  lifecycleStatus: AgreementLifecycleStatus;
  currentApprovedVersionId: string | null;
  pendingReviewVersionId: string | null;
  rowRevision: number;
  draftRevision: number;
  termsCount: number;
  participantCount: number;
  isOrganizer: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface AgreementDetail {
  id: string;
  workspace: {
    id: string;
    name: string;
    kind: "PERSONAL" | "BUSINESS";
  };
  organizerUserId: string;
  title: string;
  description: string | null;
  category: string | null;
  lifecycleStatus: AgreementLifecycleStatus;
  currentApprovedVersionId: string | null;
  pendingReviewVersionId: string | null;
  rowRevision: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  draft: {
    id: string;
    revision: number;
    content: DraftContent;
    updatedAt: Date;
    updatedByUserId: string;
  } | null;
  participants: Array<{
    id: string;
    userId: string | null;
    emailNormalized: string;
    partyDisplayName: string;
    partyKind: "PERSON" | "ORGANIZATION";
    agreementRole: "ORGANIZER" | "EDITOR" | "REVIEWER" | "OBSERVER";
    requiredByDefault: boolean;
    joinedAt: Date | null;
  }>;
  recentActivity: Array<{
    id: string;
    actorUserId: string | null;
    action: string;
    summaryJson: unknown;
    createdAt: Date;
  }>;
  canEdit: boolean;
  isOrganizer: boolean;
}

/**
 * Creates an agreement along with its initial draft, organizer participant record,
 * and activity event inside an atomic transaction.
 */
export async function createAgreement(
  actorUserId: string,
  input: CreateAgreementInput
): Promise<AgreementSummary> {
  const validated = CreateAgreementSchema.parse(input);

  // 1. Verify actor has membership or ownership in the target workspace
  const membership = await db.workspaceMember.findFirst({
    where: {
      workspaceId: validated.workspaceId,
      userId: actorUserId,
      removedAt: null,
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    throw new ForbiddenError("You are not an active member of this workspace");
  }

  // 2. Fetch actor user details for participant record
  const actor = await db.user.findUnique({
    where: { id: actorUserId },
    select: {
      id: true,
      name: true,
      emailNormalized: true,
    },
  });

  if (!actor) {
    throw new NotFoundError("Actor user not found");
  }

  const initialDraftContent: DraftContent = {
    schemaVersion: 1,
    title: validated.title,
    description: validated.description ?? null,
    terms: validated.initialTerms ?? [],
  };

  // 3. Atomic creation
  const result = await db.$transaction(async (tx) => {
    // A. Agreement record
    const agreement = await tx.agreement.create({
      data: {
        workspaceId: validated.workspaceId,
        organizerUserId: actorUserId,
        title: validated.title,
        description: validated.description ?? null,
        category: validated.category ?? null,
        lifecycleStatus: "DRAFT",
        rowRevision: 1,
      },
    });

    // B. Organizer's AgreementParticipant record
    await tx.agreementParticipant.create({
      data: {
        agreementId: agreement.id,
        userId: actorUserId,
        emailNormalized: actor.emailNormalized,
        partyDisplayName: actor.name?.trim() || actor.emailNormalized.split("@")[0],
        partyKind: "PERSON",
        agreementRole: "ORGANIZER",
        requiredByDefault: true,
        joinedAt: new Date(),
      },
    });

    // C. Mutable AgreementDraft record
    const draft = await tx.agreementDraft.create({
      data: {
        agreementId: agreement.id,
        contentJson: initialDraftContent,
        revision: 1,
        updatedByUserId: actorUserId,
      },
    });

    // D. Append ActivityEvent
    await tx.activityEvent.create({
      data: {
        agreementId: agreement.id,
        actorUserId,
        action: "AGREEMENT_CREATED",
        summaryJson: {
          title: agreement.title,
          category: agreement.category,
          termsCount: initialDraftContent.terms.length,
          ...(validated.templateId ? { templateId: validated.templateId } : {}),
        },
      },
    });

    return { agreement, draft };
  });

  return {
    id: result.agreement.id,
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
    workspaceKind: membership.workspace.kind,
    title: result.agreement.title,
    description: result.agreement.description,
    category: result.agreement.category,
    lifecycleStatus: result.agreement.lifecycleStatus,
    currentApprovedVersionId: result.agreement.currentApprovedVersionId,
    pendingReviewVersionId: result.agreement.pendingReviewVersionId,
    rowRevision: result.agreement.rowRevision,
    draftRevision: result.draft.revision,
    termsCount: initialDraftContent.terms.length,
    participantCount: 1,
    isOrganizer: true,
    createdAt: result.agreement.createdAt,
    updatedAt: result.agreement.updatedAt,
    archivedAt: result.agreement.archivedAt,
  };
}

/**
 * Retrieves the full detail of an agreement for authorized viewers.
 * Throws NotFoundError if actor is unauthorized (default deny).
 */
export async function getAgreementDetail(
  actorUserId: string,
  agreementId: string
): Promise<AgreementDetail> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          kind: true,
        },
      },
      draft: true,
      participants: {
        where: { removedAt: null },
        select: {
          id: true,
          userId: true,
          emailNormalized: true,
          partyDisplayName: true,
          partyKind: true,
          agreementRole: true,
          requiredByDefault: true,
          joinedAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      activity: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actorUserId: true,
          action: true,
          summaryJson: true,
          createdAt: true,
        },
      },
    },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  const isOrganizer = agreement.organizerUserId === actorUserId;
  const participant = agreement.participants.find((p) => p.userId === actorUserId);
  const isEditor =
    isOrganizer ||
    (participant &&
      (participant.agreementRole === "EDITOR" || participant.agreementRole === "ORGANIZER"));

  let parsedDraftContent: DraftContent | null = null;
  if (agreement.draft) {
    const parseResult = DraftContentSchema.safeParse(agreement.draft.contentJson);
    parsedDraftContent = parseResult.success
      ? parseResult.data
      : {
          schemaVersion: 1,
          title: agreement.title,
          description: agreement.description,
          terms: [],
        };
  }

  return {
    id: agreement.id,
    workspace: {
      id: agreement.workspace.id,
      name: agreement.workspace.name,
      kind: agreement.workspace.kind,
    },
    organizerUserId: agreement.organizerUserId,
    title: agreement.title,
    description: agreement.description,
    category: agreement.category,
    lifecycleStatus: agreement.lifecycleStatus,
    currentApprovedVersionId: agreement.currentApprovedVersionId,
    pendingReviewVersionId: agreement.pendingReviewVersionId,
    rowRevision: agreement.rowRevision,
    createdAt: agreement.createdAt,
    updatedAt: agreement.updatedAt,
    archivedAt: agreement.archivedAt,
    draft: agreement.draft && parsedDraftContent
      ? {
          id: agreement.draft.id,
          revision: agreement.draft.revision,
          content: parsedDraftContent,
          updatedAt: agreement.draft.updatedAt,
          updatedByUserId: agreement.draft.updatedByUserId,
        }
      : null,
    participants: agreement.participants,
    recentActivity: agreement.activity,
    canEdit:
      !!isEditor &&
      agreement.lifecycleStatus !== "ARCHIVED" &&
      !agreement.pendingReviewVersionId,
    isOrganizer,
  };
}

/**
 * Updates the mutable draft of an agreement.
 * Strictly verifies actor can edit, validates Zod content,
 * and enforces optimistic concurrency using expectedRevision.
 */
export async function updateDraft(
  actorUserId: string,
  input: UpdateDraftInput
): Promise<{ draftId: string; newRevision: number; content: DraftContent }> {
  const validated = UpdateDraftSchema.parse(input);

  await assertCanEditDraft(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findUnique({
      where: { id: validated.agreementId },
      select: { id: true, lifecycleStatus: true, pendingReviewVersionId: true },
    });

    if (!agreement) {
      throw new NotFoundError("Agreement not found");
    }

    if (agreement.lifecycleStatus === "ARCHIVED") {
      throw new ConflictError("Draft cannot be edited while agreement is archived");
    }

    if (agreement.pendingReviewVersionId) {
      throw new ConflictError(
        "Draft cannot be edited while a review is pending. Withdraw the pending review first."
      );
    }

    const currentDraft = await tx.agreementDraft.findUnique({
      where: { agreementId: validated.agreementId },
    });

    if (!currentDraft) {
      throw new NotFoundError("Draft not found");
    }

    // Optimistic concurrency check
    if (currentDraft.revision !== validated.expectedRevision) {
      throw new ConflictError(
        `Optimistic concurrency conflict: Expected revision ${validated.expectedRevision} but draft is at revision ${currentDraft.revision}. Please refresh.`
      );
    }

    const nextRevision = currentDraft.revision + 1;

    // Update draft content
    const updatedDraft = await tx.agreementDraft.update({
      where: { agreementId: validated.agreementId },
      data: {
        contentJson: validated.content,
        revision: nextRevision,
        updatedByUserId: actorUserId,
      },
    });

    // Synchronize agreement header fields with draft title and description
    await tx.agreement.update({
      where: { id: validated.agreementId },
      data: {
        title: validated.content.title,
        description: validated.content.description ?? null,
      },
    });

    // Record activity event in the same transaction
    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "DRAFT_UPDATED",
        summaryJson: {
          revision: nextRevision,
          termsCount: validated.content.terms.length,
        },
      },
    });

    return {
      draftId: updatedDraft.id,
      newRevision: nextRevision,
      content: validated.content,
    };
  });
}

/**
 * Updates agreement metadata (title, description, category).
 */
export async function updateAgreementMetadata(
  actorUserId: string,
  input: UpdateAgreementMetadataInput
): Promise<{ id: string; title: string; description: string | null; category: string | null }> {
  const validated = UpdateAgreementMetadataSchema.parse(input);

  await assertCanEditDraft(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findUnique({
      where: { id: validated.agreementId },
      include: { draft: true },
    });

    if (!agreement) {
      throw new NotFoundError("Agreement not found");
    }

    const updatedAgreement = await tx.agreement.update({
      where: { id: validated.agreementId },
      data: {
        title: validated.title,
        description: validated.description ?? null,
        category: validated.category ?? null,
      },
    });

    // If draft exists, keep title and description consistent
    if (agreement.draft) {
      const parsed = DraftContentSchema.safeParse(agreement.draft.contentJson);
      if (parsed.success) {
        const updatedContent: DraftContent = {
          ...parsed.data,
          title: validated.title,
          description: validated.description ?? null,
        };

        await tx.agreementDraft.update({
          where: { agreementId: validated.agreementId },
          data: {
            contentJson: updatedContent,
            updatedByUserId: actorUserId,
          },
        });
      }
    }

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "AGREEMENT_METADATA_UPDATED",
        summaryJson: {
          title: validated.title,
          category: validated.category,
        },
      },
    });

    return {
      id: updatedAgreement.id,
      title: updatedAgreement.title,
      description: updatedAgreement.description,
      category: updatedAgreement.category,
    };
  });
}

/**
 * Archives or restores an agreement. Organizer only.
 */
export async function archiveAgreement(
  actorUserId: string,
  agreementId: string,
  archive: boolean
): Promise<{ id: string; archivedAt: Date | null; lifecycleStatus: AgreementLifecycleStatus }> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: { id: true, organizerUserId: true, lifecycleStatus: true },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  if (agreement.organizerUserId !== actorUserId) {
    throw new ForbiddenError("Only the organizer can archive or restore an agreement");
  }

  const nextStatus = archive ? "ARCHIVED" : "DRAFT";
  const archivedAt = archive ? new Date() : null;

  return await db.$transaction(async (tx) => {
    const updated = await tx.agreement.update({
      where: { id: agreementId },
      data: {
        archivedAt,
        lifecycleStatus: nextStatus,
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId,
        actorUserId,
        action: archive ? "AGREEMENT_ARCHIVED" : "AGREEMENT_RESTORED",
        summaryJson: {
          archived: archive,
        },
      },
    });

    return {
      id: updated.id,
      archivedAt: updated.archivedAt,
      lifecycleStatus: updated.lifecycleStatus,
    };
  });
}

/**
 * Lists agreements accessible to the actor.
 * Default deny: actor must be organizer or active participant.
 */
export async function listAgreements(
  actorUserId: string,
  filters?: {
    workspaceId?: string;
    status?: AgreementLifecycleStatus;
    search?: string;
    archived?: boolean;
  }
): Promise<AgreementSummary[]> {
  const whereClause: Record<string, unknown> = {
    OR: [
      { organizerUserId: actorUserId },
      {
        participants: {
          some: {
            userId: actorUserId,
            removedAt: null,
          },
        },
      },
    ],
  };

  if (filters?.workspaceId) {
    whereClause.workspaceId = filters.workspaceId;
  }

  if (filters?.status) {
    whereClause.lifecycleStatus = filters.status;
  }

  if (filters?.archived) {
    whereClause.archivedAt = { not: null };
  } else {
    whereClause.archivedAt = null;
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const query = filters.search.trim();
    whereClause.AND = [
      {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
    ];
  }

  const agreements = await db.agreement.findMany({
    where: whereClause,
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          kind: true,
        },
      },
      draft: {
        select: {
          revision: true,
          contentJson: true,
        },
      },
      _count: {
        select: {
          participants: {
            where: { removedAt: null },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return agreements.map((ag) => {
    let termsCount = 0;
    if (ag.draft?.contentJson) {
      const parsed = DraftContentSchema.safeParse(ag.draft.contentJson);
      if (parsed.success) {
        termsCount = parsed.data.terms.length;
      }
    }

    return {
      id: ag.id,
      workspaceId: ag.workspace.id,
      workspaceName: ag.workspace.name,
      workspaceKind: ag.workspace.kind,
      title: ag.title,
      description: ag.description,
      category: ag.category,
      lifecycleStatus: ag.lifecycleStatus,
      currentApprovedVersionId: ag.currentApprovedVersionId,
      pendingReviewVersionId: ag.pendingReviewVersionId,
      rowRevision: ag.rowRevision,
      draftRevision: ag.draft?.revision ?? 1,
      termsCount,
      participantCount: ag._count.participants,
      isOrganizer: ag.organizerUserId === actorUserId,
      createdAt: ag.createdAt,
      updatedAt: ag.updatedAt,
      archivedAt: ag.archivedAt,
    };
  });
}
