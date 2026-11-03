import { z } from "zod";

export const CreateCommentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  versionId: z.string().uuid("Invalid version ID").optional().nullable(),
  termId: z
    .string()
    .trim()
    .max(64, "Term ID too long")
    .optional()
    .nullable(),
  body: z
    .string()
    .trim()
    .min(1, "Comment body is required")
    .max(2000, "Comment body must not exceed 2000 characters"),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  commentId: z.string().uuid("Invalid comment ID"),
  body: z
    .string()
    .trim()
    .min(1, "Comment body is required")
    .max(2000, "Comment body must not exceed 2000 characters"),
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

export const DeleteCommentSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  commentId: z.string().uuid("Invalid comment ID"),
});

export type DeleteCommentInput = z.infer<typeof DeleteCommentSchema>;
