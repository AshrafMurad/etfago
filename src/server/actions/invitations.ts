"use server";

import { requireAuth, requireVerifiedUser } from "../auth/session";
import {
  InviteParticipantSchema,
  ResendInvitationSchema,
  RemoveParticipantSchema,
  UpdateParticipantRoleSchema,
  RedeemInvitationSchema,
} from "../../lib/schemas/invitations";
import {
  inviteParticipant,
  resendInvitation,
  removeParticipant,
  updateParticipantRole,
  redeemInvitation,
} from "../invitations/service";
import { revalidatePath } from "next/cache";

export type InvitationActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  participantId?: string;
  agreementId?: string;
  message?: string;
};

/**
 * Server action to invite a participant to an agreement.
 */
export async function inviteParticipantAction(
  _prevState: InvitationActionState | null,
  formData: FormData
): Promise<InvitationActionState> {
  const actor = await requireAuth();

  const rawData = {
    agreementId: formData.get("agreementId") as string,
    email: formData.get("email") as string,
    partyDisplayName: formData.get("partyDisplayName") as string,
    partyKind: (formData.get("partyKind") as "PERSON" | "ORGANIZATION") || "PERSON",
    agreementRole: (formData.get("agreementRole") as "EDITOR" | "REVIEWER" | "OBSERVER") || "REVIEWER",
    requiredByDefault: formData.get("requiredByDefault") !== "false",
  };

  const parsed = InviteParticipantSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invitation data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await inviteParticipant(actor.id, parsed.data);
    revalidatePath(`/[locale]/agreements/${parsed.data.agreementId}`, "page");
    return {
      success: true,
      participantId: result.participantId,
      message: "Invitation sent successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to invite participant",
    };
  }
}

/**
 * Server action to resend an invitation.
 */
export async function resendInvitationAction(
  agreementId: string,
  participantId: string
): Promise<InvitationActionState> {
  const actor = await requireAuth();

  const parsed = ResendInvitationSchema.safeParse({ agreementId, participantId });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid resend parameters",
    };
  }

  try {
    await resendInvitation(actor.id, parsed.data.agreementId, parsed.data.participantId);
    revalidatePath(`/[locale]/agreements/${agreementId}`, "page");
    return {
      success: true,
      message: "Invitation resent successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resend invitation",
    };
  }
}

/**
 * Server action to remove a participant.
 */
export async function removeParticipantAction(
  agreementId: string,
  participantId: string
): Promise<InvitationActionState> {
  const actor = await requireAuth();

  const parsed = RemoveParticipantSchema.safeParse({ agreementId, participantId });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid removal parameters",
    };
  }

  try {
    await removeParticipant(actor.id, parsed.data.agreementId, parsed.data.participantId);
    revalidatePath(`/[locale]/agreements/${agreementId}`, "page");
    return {
      success: true,
      message: "Participant removed successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove participant",
    };
  }
}

/**
 * Server action to update a participant's role or required status.
 */
export async function updateParticipantRoleAction(params: {
  agreementId: string;
  participantId: string;
  agreementRole: "EDITOR" | "REVIEWER" | "OBSERVER";
  requiredByDefault: boolean;
}): Promise<InvitationActionState> {
  const actor = await requireAuth();

  const parsed = UpdateParticipantRoleSchema.safeParse(params);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid update parameters",
    };
  }

  try {
    await updateParticipantRole(
      actor.id,
      parsed.data.agreementId,
      parsed.data.participantId,
      {
        agreementRole: parsed.data.agreementRole,
        requiredByDefault: parsed.data.requiredByDefault,
      }
    );
    revalidatePath(`/[locale]/agreements/${params.agreementId}`, "page");
    return {
      success: true,
      message: "Participant role updated successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update participant role",
    };
  }
}

/**
 * Server action to redeem an invitation token.
 */
export async function redeemInvitationAction(
  rawToken: string
): Promise<InvitationActionState> {
  const actor = await requireVerifiedUser();

  const parsed = RedeemInvitationSchema.safeParse({ token: rawToken });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid invitation token",
    };
  }

  try {
    const result = await redeemInvitation(actor.id, parsed.data.token);
    revalidatePath(`/[locale]/agreements/${result.agreementId}`, "page");
    return {
      success: true,
      agreementId: result.agreementId,
      participantId: result.participantId,
      message: "Invitation accepted successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to redeem invitation",
    };
  }
}
