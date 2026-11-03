"use server";

import { requireAuth } from "../auth/session";
import { deleteAttachment } from "../storage/service";
import { revalidatePath } from "next/cache";

export async function deleteAttachmentAction(formData: FormData) {
  const actor = await requireAuth();

  const agreementId = formData.get("agreementId") as string;
  const attachmentId = formData.get("attachmentId") as string;

  if (!agreementId || !attachmentId) {
    return { success: false, error: "Missing required parameters" };
  }

  try {
    await deleteAttachment(actor.id, agreementId, attachmentId);
    revalidatePath(`/[locale]/agreements/${agreementId}`, "page");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete file";
    return { success: false, error: msg };
  }
}
