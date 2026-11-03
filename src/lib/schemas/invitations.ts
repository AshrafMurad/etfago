import { z } from "zod";
import { normalizeEmail } from "../email";

export const PartyKindSchema = z.enum(["PERSON", "ORGANIZATION"]);
export type PartyKind = z.infer<typeof PartyKindSchema>;

export const AgreementRoleSchema = z.enum(["ORGANIZER", "EDITOR", "REVIEWER", "OBSERVER"]);
export type AgreementRole = z.infer<typeof AgreementRoleSchema>;

/**
 * Invite / Add Participant Schema
 */
export const InviteParticipantSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((val) => normalizeEmail(val)),
  partyDisplayName: z
    .string()
    .trim()
    .min(1, "Party name is required")
    .max(120, "Party name cannot exceed 120 characters"),
  partyKind: PartyKindSchema.default("PERSON"),
  agreementRole: z.enum(["EDITOR", "REVIEWER", "OBSERVER"]).default("REVIEWER"),
  requiredByDefault: z.boolean().default(true),
  stepOrder: z.number().int().min(1).default(1),
});

export type InviteParticipantInput = z.input<typeof InviteParticipantSchema>;
export type InviteParticipantOutput = z.output<typeof InviteParticipantSchema>;

/**
 * Resend Invitation Schema
 */
export const ResendInvitationSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  participantId: z.string().uuid("Invalid participant ID"),
});

export type ResendInvitationInput = z.infer<typeof ResendInvitationSchema>;

/**
 * Remove Participant Schema
 */
export const RemoveParticipantSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  participantId: z.string().uuid("Invalid participant ID"),
});

export type RemoveParticipantInput = z.infer<typeof RemoveParticipantSchema>;

/**
 * Update Participant Role Schema
 */
export const UpdateParticipantRoleSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  participantId: z.string().uuid("Invalid participant ID"),
  agreementRole: z.enum(["EDITOR", "REVIEWER", "OBSERVER"]),
  requiredByDefault: z.boolean(),
  stepOrder: z.number().int().min(1).optional(),
});

export type UpdateParticipantRoleInput = z.infer<typeof UpdateParticipantRoleSchema>;

/**
 * Redeem Invitation Schema
 */
export const RedeemInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Invalid invitation token format")
    .max(128, "Invalid invitation token format"),
});

export type RedeemInvitationInput = z.infer<typeof RedeemInvitationSchema>;
