import { z } from "zod";

/**
 * Submit Draft for Review Input Schema
 * Requires matching expected draft revision to prevent race conditions.
 */
export const SubmitForReviewSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  expectedDraftRevision: z
    .number()
    .int("Expected revision must be an integer")
    .min(1, "Expected revision must be at least 1"),
});

export type SubmitForReviewInput = z.input<typeof SubmitForReviewSchema>;
export type SubmitForReviewOutput = z.output<typeof SubmitForReviewSchema>;

/**
 * Record Review Decision Input Schema
 * Requires expectedVersionHash to guard against reviewing stale version content.
 */
export const RecordReviewDecisionSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  versionId: z.string().uuid("Invalid version ID"),
  decision: z.enum(["APPROVE", "REQUEST_CHANGES"], {
    errorMap: () => ({ message: "Decision must be either APPROVE or REQUEST_CHANGES" }),
  }),
  expectedVersionHash: z
    .string()
    .length(64, "Expected version hash must be a 64-character SHA-256 hex string")
    .regex(/^[0-9a-f]{64}$/, "Expected version hash must be lowercase hexadecimal"),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason cannot exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type RecordReviewDecisionInput = z.input<typeof RecordReviewDecisionSchema>;
export type RecordReviewDecisionOutput = z.output<typeof RecordReviewDecisionSchema>;

/**
 * Withdraw Pending Review Input Schema
 */
export const WithdrawReviewSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  versionId: z.string().uuid("Invalid version ID"),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason cannot exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type WithdrawReviewInput = z.input<typeof WithdrawReviewSchema>;
export type WithdrawReviewOutput = z.output<typeof WithdrawReviewSchema>;

/**
 * Reset Draft from Version Input Schema
 */
export const ResetDraftFromVersionSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  versionId: z.string().uuid("Invalid version ID"),
});

export type ResetDraftFromVersionInput = z.input<typeof ResetDraftFromVersionSchema>;
export type ResetDraftFromVersionOutput = z.output<typeof ResetDraftFromVersionSchema>;
