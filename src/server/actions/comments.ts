"use server";

import { requireAuth } from "../auth/session";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  DeleteCommentSchema,
} from "../../lib/schemas/comments";
import {
  createComment,
  updateComment,
  deleteComment,
} from "../agreements/comments";
import { revalidatePath } from "next/cache";

export type CommentActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  commentId?: string;
  message?: string;
};

/**
 * Server action to post a comment on an agreement, version, or term.
 */
export async function createCommentAction(
  _prevState: CommentActionState | null,
  formData: FormData
): Promise<CommentActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    versionId: (formData.get("versionId") as string) || null,
    termId: (formData.get("termId") as string) || null,
    body: (formData.get("body") as string) || "",
  };

  const parsed = CreateCommentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid comment",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createComment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commentId: result.id,
      message: "Comment posted",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to post comment";
    return { success: false, error: msg };
  }
}

/**
 * Server action to update an existing comment.
 */
export async function updateCommentAction(
  _prevState: CommentActionState | null,
  formData: FormData
): Promise<CommentActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    commentId: formData.get("commentId") as string,
    body: (formData.get("body") as string) || "",
  };

  const parsed = UpdateCommentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid comment update",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await updateComment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commentId: result.id,
      message: "Comment updated",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update comment";
    return { success: false, error: msg };
  }
}

/**
 * Server action to delete (soft-delete) a comment.
 */
export async function deleteCommentAction(
  _prevState: CommentActionState | null,
  formData: FormData
): Promise<CommentActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    commentId: formData.get("commentId") as string,
  };

  const parsed = DeleteCommentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    await deleteComment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commentId: parsed.data.commentId,
      message: "Comment deleted",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete comment";
    return { success: false, error: msg };
  }
}
