import { z } from "zod";

/**
 * Structured Term in an Agreement Draft or Frozen Version
 * Conforms to canonical Schema V1 (docs/04-data-model.md).
 * All money, deadlines, and assignees are strictly optional.
 */
export const TermSchema = z.object({
  id: z.string().min(1).max(64),
  title: z
    .string()
    .trim()
    .min(1, "Term title is required")
    .max(120, "Term title cannot exceed 120 characters"),
  body: z
    .string()
    .trim()
    .max(4000, "Term body cannot exceed 4000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  amount: z
    .string()
    .trim()
    .max(32, "Amount cannot exceed 32 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  currency: z
    .string()
    .trim()
    .max(10, "Currency cannot exceed 10 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : null)),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  assignedParticipantId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type TermInput = z.input<typeof TermSchema>;
export type StructuredTerm = z.output<typeof TermSchema>;

/**
 * Draft Content Payload (JSON Schema V1)
 */
export const DraftContentSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  title: z
    .string()
    .trim()
    .min(1, "Agreement title is required")
    .max(160, "Agreement title cannot exceed 160 characters"),
  description: z
    .string()
    .trim()
    .max(4000, "Description cannot exceed 4000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  terms: z
    .array(TermSchema)
    .max(50, "An agreement cannot exceed 50 terms")
    .default([]),
});

export type DraftContentInput = z.input<typeof DraftContentSchema>;
export type DraftContent = z.output<typeof DraftContentSchema>;

/**
 * Create Agreement Input
 */
export const CreateAgreementSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(160, "Title cannot exceed 160 characters"),
  description: z
    .string()
    .trim()
    .max(4000, "Description cannot exceed 4000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  category: z
    .string()
    .trim()
    .max(64, "Category cannot exceed 64 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  initialTerms: z
    .array(TermSchema)
    .max(50, "An agreement cannot exceed 50 terms")
    .optional()
    .default([]),
});

export type CreateAgreementInput = z.input<typeof CreateAgreementSchema>;
export type CreateAgreementOutput = z.output<typeof CreateAgreementSchema>;

/**
 * Update Draft Input (with optimistic revision checking)
 */
export const UpdateDraftSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  expectedRevision: z.number().int().min(1, "Expected revision must be at least 1"),
  content: DraftContentSchema,
});

export type UpdateDraftInput = z.input<typeof UpdateDraftSchema>;
export type UpdateDraftOutput = z.output<typeof UpdateDraftSchema>;

/**
 * Rename/Update Agreement Metadata Input
 */
export const UpdateAgreementMetadataSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(160, "Title cannot exceed 160 characters"),
  description: z
    .string()
    .trim()
    .max(4000, "Description cannot exceed 4000 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  category: z
    .string()
    .trim()
    .max(64, "Category cannot exceed 64 characters")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type UpdateAgreementMetadataInput = z.input<typeof UpdateAgreementMetadataSchema>;
export type UpdateAgreementMetadataOutput = z.output<typeof UpdateAgreementMetadataSchema>;

/**
 * Archive Agreement Input
 */
export const ArchiveAgreementSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  archived: z.boolean(),
});

export type ArchiveAgreementInput = z.input<typeof ArchiveAgreementSchema>;
export type ArchiveAgreementOutput = z.output<typeof ArchiveAgreementSchema>;
