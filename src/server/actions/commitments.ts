"use server";

import { requireAuth } from "../auth/session";
import {
  CreateCommitmentSchema,
  UpdateCommitmentStatusSchema,
  UpdateCommitmentSchema,
  DeleteCommitmentSchema,
  CommitmentStatus,
} from "../../lib/schemas/commitments";
import {
  createCommitment,
  updateCommitmentStatus,
  updateCommitment,
  deleteCommitment,
} from "../commitments/service";
import { revalidatePath } from "next/cache";

export type CommitmentActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  commitmentId?: string;
  message?: string;
};

/**
 * Server action to create a commitment.
 */
export async function createCommitmentAction(
  _prevState: CommitmentActionState | null,
  formData: FormData
): Promise<CommitmentActionState> {
  const actor = await requireAuth();

  const dueAtRaw = formData.get("dueAt") as string | null;

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    sourceVersionId: (formData.get("sourceVersionId") as string) || null,
    sourceTermId: (formData.get("sourceTermId") as string) || null,
    title: formData.get("title") as string,
    details: (formData.get("details") as string) || null,
    assigneeParticipantId:
      (formData.get("assigneeParticipantId") as string) || null,
    dueAt: dueAtRaw && dueAtRaw.trim() ? new Date(dueAtRaw).toISOString() : null,
  };

  const parsed = CreateCommitmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid commitment input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createCommitment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commitmentId: result.id,
      message: "Commitment created successfully",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create commitment";
    return { success: false, error: msg };
  }
}

/**
 * Server action to update commitment status (TODO, IN_PROGRESS, DONE, CANCELLED).
 */
export async function updateCommitmentStatusAction(
  _prevState: CommitmentActionState | null,
  formData: FormData
): Promise<CommitmentActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    commitmentId: formData.get("commitmentId") as string,
    status: formData.get("status") as CommitmentStatus,
    expectedRevision: parseInt(formData.get("expectedRevision") as string, 10),
  };

  const parsed = UpdateCommitmentStatusSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid status update data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await updateCommitmentStatus(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commitmentId: result.id,
      message: "Status updated",
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update commitment status";
    return { success: false, error: msg };
  }
}

/**
 * Server action to update commitment details.
 */
export async function updateCommitmentAction(
  _prevState: CommitmentActionState | null,
  formData: FormData
): Promise<CommitmentActionState> {
  const actor = await requireAuth();

  const dueAtRaw = formData.get("dueAt") as string | null;
  const needsReviewRaw = formData.get("needsReview") as string | null;

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    commitmentId: formData.get("commitmentId") as string,
    title: formData.get("title") as string,
    details: (formData.get("details") as string) || null,
    assigneeParticipantId:
      (formData.get("assigneeParticipantId") as string) || null,
    dueAt: dueAtRaw && dueAtRaw.trim() ? new Date(dueAtRaw).toISOString() : null,
    needsReview: needsReviewRaw === "true" ? true : needsReviewRaw === "false" ? false : undefined,
    expectedRevision: parseInt(formData.get("expectedRevision") as string, 10),
  };

  const parsed = UpdateCommitmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid commitment update data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await updateCommitment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commitmentId: result.id,
      message: "Commitment updated",
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update commitment";
    return { success: false, error: msg };
  }
}

/**
 * Server action to delete a commitment.
 */
export async function deleteCommitmentAction(
  _prevState: CommitmentActionState | null,
  formData: FormData
): Promise<CommitmentActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    commitmentId: formData.get("commitmentId") as string,
  };

  const parsed = DeleteCommitmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    await deleteCommitment(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      commitmentId: parsed.data.commitmentId,
      message: "Commitment deleted",
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete commitment";
    return { success: false, error: msg };
  }
}
