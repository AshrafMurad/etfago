import { z } from "zod";
import { normalizeEmail } from "../email";

export const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters").max(100),
  kind: z.enum(["PERSONAL", "BUSINESS"]).default("BUSINESS"),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const AddWorkspaceMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .transform((val) => normalizeEmail(val)),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;

export const UpdateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type UpdateWorkspaceMemberRoleInput = z.infer<typeof UpdateWorkspaceMemberRoleSchema>;
