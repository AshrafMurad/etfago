"use server";

import { requireAuth } from "../auth/session";
import {
  SubmitForReviewSchema,
  RecordReviewDecisionSchema,
  WithdrawReviewSchema,
  ResetDraftFromVersionSchema,
} from "../../lib/schemas/versions";
import {
  submitDraftForReview,
  recordReviewDecision,
  withdrawPendingReview,
  prepareAmendmentDraft,
} from "../agreements/versions";
import { revalidatePath } from "next/cache";

export type VersionActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  versionId?: string;
  status?: string;
  message?: string;
};

/**
 * Server action to freeze and submit an agreement draft for review.
 */
export async function submitForReviewAction(
  _prevState: VersionActionState | null,
  formData: FormData
): Promise<VersionActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    expectedDraftRevision: parseInt(
      (formData.get("expectedDraftRevision") as string) || "1",
      10
    ),
  };

  const parsed = SubmitForReviewSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid submission input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const version = await submitDraftForReview(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      versionId: version.id,
      message: "Version submitted for review successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit version for review",
    };
  }
}

/**
 * Server action for a designated reviewer to record an APPROVE or REQUEST_CHANGES decision.
 */
export async function recordReviewDecisionAction(
  _prevState: VersionActionState | null,
  formData: FormData
): Promise<VersionActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    versionId: formData.get("versionId") as string,
    decision: formData.get("decision") as "APPROVE" | "REQUEST_CHANGES",
    expectedVersionHash: formData.get("expectedVersionHash") as string,
    reason: (formData.get("reason") as string) || null,
  };

  const parsed = RecordReviewDecisionSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid review decision input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await recordReviewDecision(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      status: result.status,
      message:
        result.status === "APPROVED"
          ? "Agreement version approved and activated"
          : result.status === "REJECTED"
          ? "Changes requested on version"
          : "Review decision recorded",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record review decision",
    };
  }
}

/**
 * Server action for the organizer to withdraw a pending review.
 */
export async function withdrawReviewAction(
  _prevState: VersionActionState | null,
  formData: FormData
): Promise<VersionActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    versionId: formData.get("versionId") as string,
    reason: (formData.get("reason") as string) || null,
  };

  const parsed = WithdrawReviewSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid withdraw input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await withdrawPendingReview(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      message: "Pending review withdrawn successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to withdraw review",
    };
  }
}

/**
 * Server action for the organizer to reset the working draft from an approved version.
 */
export async function prepareAmendmentDraftAction(
  _prevState: VersionActionState | null,
  formData: FormData
): Promise<VersionActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    versionId: formData.get("versionId") as string,
  };

  const parsed = ResetDraftFromVersionSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prepareAmendmentDraft(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      message: "Draft initialized from version snapshot",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to prepare amendment draft",
    };
  }
}
