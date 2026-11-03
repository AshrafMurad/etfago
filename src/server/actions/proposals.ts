"use server";

import { requireAuth } from "../auth/session";
import {
  CreateChangeRequestSchema,
  ResolveChangeRequestSchema,
  CancelChangeRequestSchema,
} from "../../lib/schemas/proposals";
import {
  createChangeRequest,
  resolveChangeRequest,
  cancelChangeRequest,
} from "../agreements/proposals";
import { revalidatePath } from "next/cache";

export type ProposalActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  changeRequestId?: string;
  message?: string;
};

/**
 * Server action to submit a change proposal on an agreement term.
 */
export async function createChangeRequestAction(
  _prevState: ProposalActionState | null,
  formData: FormData
): Promise<ProposalActionState> {
  const actor = await requireAuth();

  let oldTermJson = null;
  const oldTermRaw = formData.get("oldTermJson") as string | null;
  if (oldTermRaw) {
    try {
      oldTermJson = JSON.parse(oldTermRaw);
    } catch {
      return { success: false, error: "Invalid old term data" };
    }
  }

  let newTermJson = null;
  const newTermRaw = formData.get("newTermJson") as string | null;
  if (newTermRaw) {
    try {
      newTermJson = JSON.parse(newTermRaw);
    } catch {
      return { success: false, error: "Invalid new term data" };
    }
  }

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    baseVersionId: (formData.get("baseVersionId") as string) || null,
    termId: formData.get("termId") as string,
    operation: formData.get("operation") as string,
    oldTermJson,
    newTermJson,
    reason: (formData.get("reason") as string) || null,
  };

  const parsed = CreateChangeRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid change request data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createChangeRequest(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      changeRequestId: result.id,
      message: "Change proposal submitted successfully",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create change request";
    return { success: false, error: msg };
  }
}

/**
 * Server action for organizer/editor to accept (into draft) or decline a proposal.
 */
export async function resolveChangeRequestAction(
  _prevState: ProposalActionState | null,
  formData: FormData
): Promise<ProposalActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    changeRequestId: formData.get("changeRequestId") as string,
    action: formData.get("action") as "ACCEPT" | "DECLINE",
    declineReason: (formData.get("declineReason") as string) || null,
  };

  const parsed = ResolveChangeRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid resolution data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await resolveChangeRequest(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      changeRequestId: result.id,
      message:
        parsed.data.action === "ACCEPT"
          ? "Proposal accepted and applied to draft"
          : "Proposal declined",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to resolve change request";
    return { success: false, error: msg };
  }
}

/**
 * Server action to cancel an open change request.
 */
export async function cancelChangeRequestAction(
  _prevState: ProposalActionState | null,
  formData: FormData
): Promise<ProposalActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    changeRequestId: formData.get("changeRequestId") as string,
  };

  const parsed = CancelChangeRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const result = await cancelChangeRequest(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      changeRequestId: result.id,
      message: "Change request cancelled",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel change request";
    return { success: false, error: msg };
  }
}
