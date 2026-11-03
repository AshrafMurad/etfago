import { z } from "zod";
import { TermSchema } from "./agreements";

export const ChangeOperationSchema = z.enum(["ADD", "UPDATE", "REMOVE"]);
export type ChangeOperation = z.infer<typeof ChangeOperationSchema>;

export const ChangeRequestStatusSchema = z.enum([
  "OPEN",
  "ACCEPTED_IN_DRAFT",
  "DECLINED",
  "CANCELLED",
]);
export type ChangeRequestStatus = z.infer<typeof ChangeRequestStatusSchema>;

export const CreateChangeRequestBaseSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  baseVersionId: z.string().uuid("Invalid version ID").optional().nullable(),
  termId: z
    .string()
    .trim()
    .min(1, "Term ID is required")
    .max(64, "Term ID is too long"),
  operation: ChangeOperationSchema,
  oldTermJson: TermSchema.optional().nullable(),
  newTermJson: TermSchema.optional().nullable(),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason must not exceed 2000 characters")
    .optional()
    .nullable(),
});

export type CreateChangeRequestInput = z.input<typeof CreateChangeRequestBaseSchema>;

export const CreateChangeRequestSchema = CreateChangeRequestBaseSchema.superRefine(
  (data, ctx) => {
    if (data.operation === "ADD") {
      if (!data.newTermJson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "New term details are required for ADD operations",
          path: ["newTermJson"],
        });
      }
    } else if (data.operation === "UPDATE") {
      if (!data.newTermJson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Updated term details are required for UPDATE operations",
          path: ["newTermJson"],
        });
      }
    } else if (data.operation === "REMOVE") {
      if (!data.oldTermJson) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Existing term details are required for REMOVE operations",
          path: ["oldTermJson"],
        });
      }
    }
  }
);

export const ResolveChangeRequestSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  changeRequestId: z.string().uuid("Invalid change request ID"),
  action: z.enum(["ACCEPT", "DECLINE"]),
  declineReason: z
    .string()
    .trim()
    .max(2000, "Decline reason must not exceed 2000 characters")
    .optional()
    .nullable(),
});

export type ResolveChangeRequestInput = z.infer<typeof ResolveChangeRequestSchema>;

export const CancelChangeRequestSchema = z.object({
  agreementId: z.string().uuid("Invalid agreement ID"),
  changeRequestId: z.string().uuid("Invalid change request ID"),
});

export type CancelChangeRequestInput = z.infer<typeof CancelChangeRequestSchema>;
