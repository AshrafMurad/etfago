import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import {
  registerOrGetUser,
  verifyEmailToken,
  issueVerificationToken,
} from "../../src/server/auth/service";
import {
  createBusinessWorkspace,
  listUserWorkspaces,
  getWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "../../src/server/workspaces/service";
import { ForbiddenError, ValidationError } from "../../src/lib/errors";

describe("Sprint 1 Integration: Identity, Workspaces & Permission Skeleton", () => {
  const user1Email = "khalid.founder@EXAMPLE.com";
  const user2Email = "sara.partner@example.COM";

  let user1Id: string;
  let user2Id: string;
  let user1PersonalWorkspaceId: string;
  let user2PersonalWorkspaceId: string;
  let businessWorkspaceId: string;

  beforeAll(async () => {
    // Clean up test data if any exists
    const normalized1 = "khalid.founder@example.com";
    const normalized2 = "sara.partner@example.com";

    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [normalized1, normalized2] },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    const normalized1 = "khalid.founder@example.com";
    const normalized2 = "sara.partner@example.com";

    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [normalized1, normalized2] },
      },
    });
    await db.$disconnect();
  });

  it("1. registers User 1 with normalized email and auto-provisions a personal workspace", async () => {
    const res = await registerOrGetUser({
      email: user1Email,
      name: "Khalid Al-Otaibi",
      locale: "ar",
    });

    expect(res.user.emailNormalized).toBe("khalid.founder@example.com");
    expect(res.user.name).toBe("Khalid Al-Otaibi");
    expect(res.user.emailVerifiedAt).toBeNull();
    expect(res.isNewUser).toBe(true);
    expect(res.verificationToken).toBeDefined();

    user1Id = res.user.id;
    user1PersonalWorkspaceId = res.workspaceId;

    // Verify workspace in DB
    const ws = await db.workspace.findUnique({
      where: { id: user1PersonalWorkspaceId },
      include: { members: true },
    });

    expect(ws).not.toBeNull();
    expect(ws?.kind).toBe("PERSONAL");
    expect(ws?.ownerUserId).toBe(user1Id);
    expect(ws?.members).toHaveLength(1);
    expect(ws?.members[0].role).toBe("OWNER");
    expect(ws?.members[0].userId).toBe(user1Id);
  });

  it("2. allows User 1 to verify email using verification token", async () => {
    const token = await issueVerificationToken("khalid.founder@example.com");

    const verifyRes = await verifyEmailToken({
      email: "khalid.founder@example.com",
      token,
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.emailVerifiedAt).toBeInstanceOf(Date);

    // Re-using token must fail
    await expect(
      verifyEmailToken({
        email: "khalid.founder@example.com",
        token,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("3. registers User 2 with complete isolation from User 1", async () => {
    const res = await registerOrGetUser({
      email: user2Email,
      name: "Sara Al-Dosari",
      locale: "en",
    });

    expect(res.user.emailNormalized).toBe("sara.partner@example.com");
    expect(res.user.id).not.toBe(user1Id);
    expect(res.workspaceId).not.toBe(user1PersonalWorkspaceId);

    user2Id = res.user.id;
    user2PersonalWorkspaceId = res.workspaceId;

    // Verify email for User 2 as well
    const token2 = res.verificationToken!;
    await verifyEmailToken({
      email: "sara.partner@example.com",
      token: token2,
    });

    // Check isolation: User 1 cannot access User 2's personal workspace
    await expect(getWorkspace(user1Id, user2PersonalWorkspaceId)).rejects.toThrow(
      ForbiddenError
    );

    // User 2 cannot access User 1's personal workspace
    await expect(getWorkspace(user2Id, user1PersonalWorkspaceId)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("4. User 1 creates a Business workspace and manages members", async () => {
    const businessWs = await createBusinessWorkspace(user1Id, {
      name: "شركة النور للتقنية",
    });

    expect(businessWs.kind).toBe("BUSINESS");
    expect(businessWs.name).toBe("شركة النور للتقنية");
    expect(businessWs.ownerUserId).toBe(user1Id);
    expect(businessWs.role).toBe("OWNER");

    businessWorkspaceId = businessWs.id;

    // User 2 initially cannot access User 1's business workspace
    await expect(getWorkspace(user2Id, businessWorkspaceId)).rejects.toThrow(
      ForbiddenError
    );

    // User 1 adds User 2 as MEMBER
    const addedMember = await addWorkspaceMember(user1Id, businessWorkspaceId, {
      email: "sara.partner@example.com",
      role: "MEMBER",
    });

    expect(addedMember.userId).toBe(user2Id);
    expect(addedMember.role).toBe("MEMBER");

    // User 2 can now access the business workspace
    const wsForUser2 = await getWorkspace(user2Id, businessWorkspaceId);
    expect(wsForUser2.name).toBe("شركة النور للتقنية");
    expect(wsForUser2.currentActorRole).toBe("MEMBER");

    // User 2 (MEMBER) cannot remove User 1 (OWNER)
    await expect(
      removeWorkspaceMember(user2Id, businessWorkspaceId, user1Id)
    ).rejects.toThrow(ForbiddenError);

    // User 1 promotes User 2 to ADMIN
    const updatedMember = await updateWorkspaceMemberRole(
      user1Id,
      businessWorkspaceId,
      user2Id,
      "ADMIN"
    );
    expect(updatedMember.role).toBe("ADMIN");

    // User 1 removes User 2 from the workspace
    await removeWorkspaceMember(user1Id, businessWorkspaceId, user2Id);

    // User 2 immediately loses access
    await expect(getWorkspace(user2Id, businessWorkspaceId)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("5. lists workspaces with strict tenancy separation", async () => {
    const user1Workspaces = await listUserWorkspaces(user1Id);
    const user2Workspaces = await listUserWorkspaces(user2Id);

    // User 1 has Personal + Business workspace
    expect(user1Workspaces.length).toBe(2);
    expect(user1Workspaces.map((w) => w.id)).toContain(user1PersonalWorkspaceId);
    expect(user1Workspaces.map((w) => w.id)).toContain(businessWorkspaceId);

    // User 2 only has Personal workspace (since removed from Business workspace)
    expect(user2Workspaces.length).toBe(1);
    expect(user2Workspaces[0].id).toBe(user2PersonalWorkspaceId);
  });
});
