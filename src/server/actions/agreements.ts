"use server";

import { requireAuth } from "../auth/session";
import {
  CreateAgreementSchema,
  UpdateDraftSchema,
  UpdateAgreementMetadataSchema,
  ArchiveAgreementSchema,
  DraftContent,
} from "../../lib/schemas/agreements";
import {
  createAgreement,
  updateDraft,
  updateAgreementMetadata,
  archiveAgreement,
} from "../agreements/service";
import { revalidatePath } from "next/cache";

export type AgreementActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  agreementId?: string;
  newRevision?: number;
  message?: string;
};

/**
 * Server action to create a new agreement with initial draft.
 */
export async function createAgreementAction(
  _prevState: AgreementActionState | null,
  formData: FormData
): Promise<AgreementActionState> {
  const actor = await requireAuth();

  let initialTerms = [];
  const termsJsonRaw = formData.get("termsJson") as string | null;
  if (termsJsonRaw) {
    try {
      initialTerms = JSON.parse(termsJsonRaw);
    } catch {
      return { success: false, error: "Invalid terms format" };
    }
  }

  const rawData = {
    workspaceId: formData.get("workspaceId") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    category: (formData.get("category") as string) || null,
    initialTerms,
  };

  const parsed = CreateAgreementSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid agreement input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const agreement = await createAgreement(actor.id, parsed.data);
    revalidatePath("/[locale]/agreements", "page");
    return {
      success: true,
      agreementId: agreement.id,
      message: "Agreement created successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create agreement",
    };
  }
}

/**
 * Server action to save/update agreement draft (explicit save / autosave).
 */
export async function updateDraftAction(params: {
  agreementId: string;
  expectedRevision: number;
  content: DraftContent;
}): Promise<AgreementActionState> {
  const actor = await requireAuth();

  const parsed = UpdateDraftSchema.safeParse(params);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid draft content",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await updateDraft(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${params.agreementId}`, "page");
    return {
      success: true,
      newRevision: result.newRevision,
      message: "Draft saved successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save draft",
    };
  }
}

/**
 * Server action to update agreement metadata (rename, category, description).
 */
export async function updateAgreementMetadataAction(
  _prevState: AgreementActionState | null,
  formData: FormData
): Promise<AgreementActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    category: (formData.get("category") as string) || null,
  };

  const parsed = UpdateAgreementMetadataSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid metadata input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateAgreementMetadata(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    revalidatePath("/[locale]/agreements", "page");
    return {
      success: true,
      message: "Agreement updated successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update agreement",
    };
  }
}

/**
 * Server action to archive or restore an agreement.
 */
export async function archiveAgreementAction(
  agreementId: string,
  archived: boolean
): Promise<AgreementActionState> {
  const actor = await requireAuth();

  const parsed = ArchiveAgreementSchema.safeParse({ agreementId, archived });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid archive parameters",
    };
  }

  try {
    await archiveAgreement(actor.id, parsed.data.agreementId, parsed.data.archived);
    revalidatePath(`/[locale]/agreements/${agreementId}`, "page");
    revalidatePath("/[locale]/agreements", "page");
    return {
      success: true,
      message: archived ? "Agreement archived" : "Agreement restored",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to change archive state",
    };
  }
}
