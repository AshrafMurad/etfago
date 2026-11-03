"use server";

import { requireAuth } from "../auth/session";
import {
  CreateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateWorkspaceMemberRoleSchema,
} from "../../lib/schemas/workspaces";
import {
  createBusinessWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "../workspaces/service";
import { revalidatePath } from "next/cache";

export type WorkspaceActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

export async function createBusinessWorkspaceAction(
  _prevState: WorkspaceActionState | null,
  formData: FormData
): Promise<WorkspaceActionState> {
  const actor = await requireAuth();

  const rawData = {
    name: formData.get("name") as string,
    kind: "BUSINESS",
  };

  const parsed = CreateWorkspaceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid workspace data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createBusinessWorkspace(actor.id, { name: parsed.data.name });
    revalidatePath("/[locale]/workspaces", "page");
    return {
      success: true,
      message: "Business workspace created successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create workspace",
    };
  }
}

export async function addWorkspaceMemberAction(
  _prevState: WorkspaceActionState | null,
  formData: FormData
): Promise<WorkspaceActionState> {
  const actor = await requireAuth();

  const workspaceId = formData.get("workspaceId") as string;
  const rawData = {
    email: formData.get("email") as string,
    role: (formData.get("role") as "ADMIN" | "MEMBER") || "MEMBER",
  };

  const parsed = AddWorkspaceMemberSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid member data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await addWorkspaceMember(actor.id, workspaceId, {
      email: parsed.data.email,
      role: parsed.data.role,
    });
    revalidatePath(`/[locale]/workspaces/${workspaceId}`, "page");
    return {
      success: true,
      message: "Member added successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add member",
    };
  }
}

export async function updateWorkspaceMemberRoleAction(
  _prevState: WorkspaceActionState | null,
  formData: FormData
): Promise<WorkspaceActionState> {
  const actor = await requireAuth();

  const workspaceId = formData.get("workspaceId") as string;
  const targetUserId = formData.get("targetUserId") as string;
  const role = formData.get("role") as "ADMIN" | "MEMBER";

  const parsed = UpdateWorkspaceMemberRoleSchema.safeParse({ role });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid role specified",
    };
  }

  try {
    await updateWorkspaceMemberRole(actor.id, workspaceId, targetUserId, parsed.data.role);
    revalidatePath(`/[locale]/workspaces/${workspaceId}`, "page");
    return {
      success: true,
      message: "Member role updated successfully",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update member role",
    };
  }
}

export async function removeWorkspaceMemberAction(
  _prevState: WorkspaceActionState | null,
  formData: FormData
): Promise<WorkspaceActionState> {
  const actor = await requireAuth();

  const workspaceId = formData.get("workspaceId") as string;
  const targetUserId = formData.get("targetUserId") as string;

  try {
    await removeWorkspaceMember(actor.id, workspaceId, targetUserId);
    revalidatePath(`/[locale]/workspaces/${workspaceId}`, "page");
    return {
      success: true,
      message: "Member removed from workspace",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove member",
    };
  }
}
