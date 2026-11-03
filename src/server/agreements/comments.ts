import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
  assertCanComment,
} from "../auth/permissions";
import {
  CreateCommentInput,
  CreateCommentSchema,
  UpdateCommentInput,
  UpdateCommentSchema,
  DeleteCommentInput,
  DeleteCommentSchema,
} from "../../lib/schemas/comments";

export interface CommentSummary {
  id: string;
  agreementId: string;
  versionId: string | null;
  termId: string | null;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
}

/**
 * Creates a new discussion comment on an agreement, version, or specific term.
 */
export async function createComment(
  actorUserId: string,
  input: CreateCommentInput
): Promise<CommentSummary> {
  const validated = CreateCommentSchema.parse(input);

  await assertCanComment(actorUserId, validated.agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: validated.agreementId },
    select: {
      id: true,
      lifecycleStatus: true,
    },
  });

  if (!agreement) {
    throw new NotFoundError("Agreement not found");
  }

  if (agreement.lifecycleStatus === "ARCHIVED") {
    throw new ForbiddenError("Cannot comment on an archived agreement");
  }

  if (validated.versionId) {
    const version = await db.agreementVersion.findFirst({
      where: {
        id: validated.versionId,
        agreementId: validated.agreementId,
      },
    });
    if (!version) {
      throw new NotFoundError("Referenced version not found in this agreement");
    }
  }

  return await db.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        agreementId: validated.agreementId,
        versionId: validated.versionId ?? null,
        termId: validated.termId ?? null,
        authorUserId: actorUserId,
        body: validated.body,
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
        action: "COMMENT_ADDED",
        objectId: comment.id,
        versionId: validated.versionId ?? null,
        summaryJson: {
          commentId: comment.id,
          termId: validated.termId,
          authorEmail: actor?.emailNormalized,
          snippet: validated.body.slice(0, 100),
        },
      },
    });

    return {
      id: comment.id,
      agreementId: comment.agreementId,
      versionId: comment.versionId,
      termId: comment.termId,
      authorUserId: comment.authorUserId,
      authorName: actor?.name || actor?.emailNormalized || "User",
      authorEmail: actor?.emailNormalized || "",
      body: comment.body,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
    };
  });
}

/**
 * Updates an existing comment. Only the author can update their comment.
 */
export async function updateComment(
  actorUserId: string,
  input: UpdateCommentInput
): Promise<CommentSummary> {
  const validated = UpdateCommentSchema.parse(input);

  await assertCanViewAgreement(actorUserId, validated.agreementId);

  const comment = await db.comment.findFirst({
    where: {
      id: validated.commentId,
      agreementId: validated.agreementId,
      deletedAt: null,
    },
  });

  if (!comment) {
    throw new NotFoundError("Comment not found");
  }

  if (comment.authorUserId !== actorUserId) {
    throw new ForbiddenError("Only the author can edit this comment");
  }

  const updated = await db.comment.update({
    where: { id: comment.id },
    data: {
      body: validated.body,
      editedAt: new Date(),
    },
  });

  const actor = await db.user.findUnique({
    where: { id: actorUserId },
    select: { name: true, emailNormalized: true },
  });

  return {
    id: updated.id,
    agreementId: updated.agreementId,
    versionId: updated.versionId,
    termId: updated.termId,
    authorUserId: updated.authorUserId,
    authorName: actor?.name || actor?.emailNormalized || "User",
    authorEmail: actor?.emailNormalized || "",
    body: updated.body,
    createdAt: updated.createdAt,
    editedAt: updated.editedAt,
  };
}

/**
 * Soft-deletes a comment. Author or organizer can delete.
 */
export async function deleteComment(
  actorUserId: string,
  input: DeleteCommentInput
): Promise<void> {
  const validated = DeleteCommentSchema.parse(input);

  await assertCanViewAgreement(actorUserId, validated.agreementId);

  const comment = await db.comment.findFirst({
    where: {
      id: validated.commentId,
      agreementId: validated.agreementId,
      deletedAt: null,
    },
    include: {
      agreement: {
        select: { organizerUserId: true },
      },
    },
  });

  if (!comment) {
    throw new NotFoundError("Comment not found");
  }

  const isAuthor = comment.authorUserId === actorUserId;
  const isOrganizer = comment.agreement.organizerUserId === actorUserId;

  if (!isAuthor && !isOrganizer) {
    throw new ForbiddenError("You are not authorized to delete this comment");
  }

  await db.comment.update({
    where: { id: comment.id },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * Lists all active (non-deleted) comments for an agreement,
 * optionally filtered by versionId or termId.
 */
export async function listComments(
  actorUserId: string,
  agreementId: string,
  options?: {
    versionId?: string;
    termId?: string;
  }
): Promise<CommentSummary[]> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const whereClause: {
    agreementId: string;
    deletedAt: null;
    versionId?: string;
    termId?: string;
  } = {
    agreementId,
    deletedAt: null,
  };

  if (options?.versionId) {
    whereClause.versionId = options.versionId;
  }
  if (options?.termId) {
    whereClause.termId = options.termId;
  }

  const comments = await db.comment.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
  });

  if (comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.authorUserId)));
  const authors = await db.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, emailNormalized: true },
  });

  const authorMap = new Map<string, { name: string | null; emailNormalized: string }>();
  for (const a of authors) {
    authorMap.set(a.id, a);
  }

  return comments.map((c) => {
    const author = authorMap.get(c.authorUserId);
    return {
      id: c.id,
      agreementId: c.agreementId,
      versionId: c.versionId,
      termId: c.termId,
      authorUserId: c.authorUserId,
      authorName: author?.name || author?.emailNormalized || "User",
      authorEmail: author?.emailNormalized || "",
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
    };
  });
}
