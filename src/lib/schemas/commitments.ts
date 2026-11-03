import { z } from "zod";

export const CommitmentStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);
export type CommitmentStatus = z.infer<typeof CommitmentStatusSchema>;

export const CreateCommitmentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  sourceVersionId: z.string().uuid("Invalid version ID").optional().nullable(),
  sourceTermId: z
    .string()
    .trim()
    .max(64, "Term ID too long")
    .optional()
    .nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(160, "Title must not exceed 160 characters"),
  details: z
    .string()
    .trim()
    .max(4000, "Details must not exceed 4000 characters")
    .optional()
    .nullable(),
  assigneeParticipantId: z
    .string()
    .uuid("Invalid participant ID")
    .optional()
    .nullable(),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .or(z.date().optional().nullable()),
});

export type CreateCommitmentInput = z.infer<typeof CreateCommitmentSchema>;

export const UpdateCommitmentStatusSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  commitmentId: z.string().uuid("Invalid commitment ID"),
  status: CommitmentStatusSchema,
  expectedRevision: z.number().int().positive("Invalid revision"),
});

export type UpdateCommitmentStatusInput = z.infer<
  typeof UpdateCommitmentStatusSchema
>;

export const UpdateCommitmentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  commitmentId: z.string().uuid("Invalid commitment ID"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(160, "Title must not exceed 160 characters"),
  details: z
    .string()
    .trim()
    .max(4000, "Details must not exceed 4000 characters")
    .optional()
    .nullable(),
  assigneeParticipantId: z
    .string()
    .uuid("Invalid participant ID")
    .optional()
    .nullable(),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable()
    .or(z.date().optional().nullable()),
  needsReview: z.boolean().optional(),
  expectedRevision: z.number().int().positive("Invalid revision"),
});

export type UpdateCommitmentInput = z.infer<typeof UpdateCommitmentSchema>;

export const DeleteCommitmentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  commitmentId: z.string().uuid("Invalid commitment ID"),
});

export type DeleteCommitmentInput = z.infer<typeof DeleteCommitmentSchema>;
