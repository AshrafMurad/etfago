import { db } from "../db/prisma";
import { normalizeEmail } from "../../lib/email";
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from "../../lib/errors";
import { registerOrGetUser } from "../auth/service";

export interface WorkspaceSummary {
  id: string;
  kind: "PERSONAL" | "BUSINESS";
  name: string;
  ownerUserId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  createdAt: Date;
}

/**
 * Creates a new Business workspace for the authenticated actor.
 * The actor becomes the OWNER.
 */
export async function createBusinessWorkspace(
  actorUserId: string,
  input: { name: string }
): Promise<WorkspaceSummary> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) {
    throw new ValidationError("Workspace name must be between 2 and 100 characters");
  }

  const workspace = await db.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        kind: "BUSINESS",
        name,
        ownerUserId: actorUserId,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: actorUserId,
        role: "OWNER",
      },
    });

    return ws;
  });

  return {
    id: workspace.id,
    kind: workspace.kind,
    name: workspace.name,
    ownerUserId: workspace.ownerUserId,
    role: "OWNER",
    memberCount: 1,
    createdAt: workspace.createdAt,
  };
}

/**
 * Lists all active workspaces for an actor.
 * Only active memberships (removedAt === null) are returned.
 */
export async function listUserWorkspaces(actorUserId: string): Promise<WorkspaceSummary[]> {
  const memberships = await db.workspaceMember.findMany({
    where: {
      userId: actorUserId,
      removedAt: null,
      workspace: {
        archivedAt: null,
      },
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: {
                where: { removedAt: null },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { workspace: { kind: "asc" } }, // PERSONAL first
      { joinedAt: "asc" },
    ],
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    kind: m.workspace.kind,
    name: m.workspace.name,
    ownerUserId: m.workspace.ownerUserId,
    role: m.role,
    memberCount: m.workspace._count.members,
    createdAt: m.workspace.createdAt,
  }));
}

/**
 * Retrieves workspace details with active members.
 * Enforces server-side deny-by-default: only active members can view the workspace.
 */
export async function getWorkspace(actorUserId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorUserId,
      removedAt: null,
    },
  });

  if (!membership) {
    throw new ForbiddenError("You do not have access to this workspace");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { removedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              emailNormalized: true,
              emailVerifiedAt: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!workspace || workspace.archivedAt) {
    throw new NotFoundError("Workspace not found");
  }

  return {
    ...workspace,
    currentActorRole: membership.role,
  };
}

/**
 * Adds a member to a workspace by email.
 * Actor must be OWNER or ADMIN of the workspace.
 */
export async function addWorkspaceMember(
  actorUserId: string,
  workspaceId: string,
  input: { email: string; role?: "ADMIN" | "MEMBER" }
) {
  const role = input.role ?? "MEMBER";

  // Check actor's permissions
  const actorMembership = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: actorUserId,
      removedAt: null,
    },
  });

  if (!actorMembership || (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN")) {
    throw new ForbiddenError("Only workspace owners or admins can add members");
  }

  // Find or register target user
  const emailNorm = normalizeEmail(input.email);
  const targetUserResult = await registerOrGetUser({ email: emailNorm });
  const targetUserId = targetUserResult.user.id;

  // Check existing membership
  const existingMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
  });

  if (existingMembership) {
    if (existingMembership.removedAt === null) {
      throw new ConflictError("User is already an active member of this workspace");
    }

    // Re-activate previously removed member
    const updated = await db.workspaceMember.update({
      where: { id: existingMembership.id },
      data: {
        removedAt: null,
        role,
        joinedAt: new Date(),
      },
    });

    return updated;
  }

  // Create new membership
  const newMember = await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: targetUserId,
      role,
    },
  });

  return newMember;
}

/**
 * Updates a workspace member's role.
 * Actor must be OWNER (or ADMIN modifying a MEMBER).
 * Workspace owner cannot be demoted or altered.
 */
export async function updateWorkspaceMemberRole(
  actorUserId: string,
  workspaceId: string,
  targetUserId: string,
  newRole: "ADMIN" | "MEMBER"
) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new NotFoundError("Workspace not found");

  if (targetUserId === workspace.ownerUserId) {
    throw new ForbiddenError("Cannot modify the role of the workspace owner");
  }

  const actorMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: actorUserId, removedAt: null },
  });

  if (!actorMembership || (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN")) {
    throw new ForbiddenError("Insufficient permissions to update workspace member role");
  }

  const targetMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: targetUserId, removedAt: null },
  });

  if (!targetMembership) {
    throw new NotFoundError("Target member not found in this workspace");
  }

  // Admins cannot change roles of other Admins or Owners
  if (actorMembership.role === "ADMIN" && targetMembership.role === "ADMIN") {
    throw new ForbiddenError("Workspace admins cannot modify other admins' roles");
  }

  return await db.workspaceMember.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });
}

/**
 * Removes a member from a workspace (soft remove via removedAt).
 * Actor must be OWNER or ADMIN.
 * Target cannot be the workspace OWNER.
 */
export async function removeWorkspaceMember(
  actorUserId: string,
  workspaceId: string,
  targetUserId: string
) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new NotFoundError("Workspace not found");

  if (targetUserId === workspace.ownerUserId) {
    throw new ForbiddenError("The workspace owner cannot be removed");
  }

  const actorMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: actorUserId, removedAt: null },
  });

  if (!actorMembership || (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN")) {
    throw new ForbiddenError("Insufficient permissions to remove workspace members");
  }

  const targetMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: targetUserId, removedAt: null },
  });

  if (!targetMembership) {
    throw new NotFoundError("Target member not found in this workspace");
  }

  if (actorMembership.role === "ADMIN" && targetMembership.role === "ADMIN") {
    throw new ForbiddenError("Workspace admins cannot remove other admins");
  }

  return await db.workspaceMember.update({
    where: { id: targetMembership.id },
    data: { removedAt: new Date() },
  });
}

/**
 * Updates workspace properties (e.g. name).
 * Actor must be OWNER or ADMIN of the workspace.
 */
export async function updateWorkspace(
  actorUserId: string,
  workspaceId: string,
  input: { name: string }
) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) {
    throw new ValidationError("Workspace name must be between 2 and 100 characters");
  }

  const actorMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: actorUserId, removedAt: null },
  });

  if (!actorMembership || (actorMembership.role !== "OWNER" && actorMembership.role !== "ADMIN")) {
    throw new ForbiddenError("Insufficient permissions to update workspace settings");
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.archivedAt) {
    throw new NotFoundError("Workspace not found");
  }

  return await db.workspace.update({
    where: { id: workspaceId },
    data: { name },
  });
}

/**
 * Archives or restores a workspace.
 * Only the OWNER can archive a workspace.
 * Personal workspaces cannot be archived.
 */
export async function archiveWorkspace(
  actorUserId: string,
  workspaceId: string,
  archive: boolean = true
) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new NotFoundError("Workspace not found");

  if (workspace.ownerUserId !== actorUserId) {
    throw new ForbiddenError("Only the workspace owner can archive or restore a workspace");
  }

  if (workspace.kind === "PERSONAL") {
    throw new ValidationError("Cannot archive a personal workspace");
  }

  return await db.workspace.update({
    where: { id: workspaceId },
    data: {
      archivedAt: archive ? new Date() : null,
    },
  });
}

/**
 * Transfers ownership of a workspace to another active member.
 * Actor must be current OWNER.
 * Target must be an active member of the workspace.
 * Target becomes OWNER; prior owner becomes ADMIN.
 */
export async function transferWorkspaceOwnership(
  actorUserId: string,
  workspaceId: string,
  newOwnerUserId: string
) {
  if (actorUserId === newOwnerUserId) {
    throw new ValidationError("Cannot transfer ownership to yourself");
  }

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.archivedAt) {
    throw new NotFoundError("Workspace not found");
  }

  if (workspace.ownerUserId !== actorUserId) {
    throw new ForbiddenError("Only the workspace owner can transfer ownership");
  }

  const targetMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: newOwnerUserId, removedAt: null },
  });

  if (!targetMembership) {
    throw new NotFoundError("Target user is not an active member of this workspace");
  }

  const actorMembership = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: actorUserId, removedAt: null },
  });

  if (!actorMembership) {
    throw new ForbiddenError("Actor is not an active member of this workspace");
  }

  return await db.$transaction(async (tx) => {
    // 1. Update workspace owner
    const updatedWs = await tx.workspace.update({
      where: { id: workspaceId },
      data: { ownerUserId: newOwnerUserId },
    });

    // 2. Promote target member to OWNER
    await tx.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { role: "OWNER" },
    });

    // 3. Demote current actor to ADMIN
    await tx.workspaceMember.update({
      where: { id: actorMembership.id },
      data: { role: "ADMIN" },
    });

    return updatedWs;
  });
}

