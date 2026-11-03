import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import {
  createBusinessWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  updateWorkspace,
  transferWorkspaceOwnership,
  archiveWorkspace,
} from "../../src/server/workspaces/service";
import {
  getWorkspaceOperationalReport,
  generateWorkspaceCsvReport,
  generateWorkspaceJsonReport,
} from "../../src/server/workspaces/reporting";
import { createAgreement } from "../../src/server/agreements/service";
import {
  createCommitment,
  updateCommitmentStatus,
} from "../../src/server/commitments/service";
import { ForbiddenError, NotFoundError, ValidationError } from "../../src/lib/errors";

describe("Sprint 11 Integration: Advanced Business Workspace Administration & Reporting (F-24)", () => {
  let ownerUser: { id: string; email: string };
  let adminUser: { id: string; email: string };
  let regularMemberUser: { id: string; email: string };
  let outsiderUser: { id: string; email: string };
  let businessWorkspaceId: string;

  beforeAll(async () => {
    // 1. Setup users
    const ownerRes = await registerOrGetUser({ email: "owner.sprint11@example.com", name: "Workspace Owner" });
    const adminRes = await registerOrGetUser({ email: "admin.sprint11@example.com", name: "Workspace Admin" });
    const memberRes = await registerOrGetUser({ email: "member.sprint11@example.com", name: "Regular Member" });
    const outsiderRes = await registerOrGetUser({ email: "outsider.sprint11@example.com", name: "External Outsider" });

    ownerUser = { id: ownerRes.user.id, email: ownerRes.user.emailNormalized };
    adminUser = { id: adminRes.user.id, email: adminRes.user.emailNormalized };
    regularMemberUser = { id: memberRes.user.id, email: memberRes.user.emailNormalized };
    outsiderUser = { id: outsiderRes.user.id, email: outsiderRes.user.emailNormalized };

    // 2. Create Business Workspace
    const ws = await createBusinessWorkspace(ownerUser.id, { name: "Etfago Operations Hub" });
    businessWorkspaceId = ws.id;

    // 3. Add Admin and Member
    await addWorkspaceMember(ownerUser.id, businessWorkspaceId, {
      email: adminUser.email,
      role: "ADMIN",
    });

    await addWorkspaceMember(ownerUser.id, businessWorkspaceId, {
      email: regularMemberUser.email,
      role: "MEMBER",
    });
  });

  describe("1. Workspace Administration & Role Protections", () => {
    it("allows OWNER and ADMIN to rename workspace, but blocks regular MEMBER", async () => {
      // Admin renames
      const updatedByAdmin = await updateWorkspace(adminUser.id, businessWorkspaceId, {
        name: "Etfago Global Enterprise",
      });
      expect(updatedByAdmin.name).toBe("Etfago Global Enterprise");

      // Owner renames
      const updatedByOwner = await updateWorkspace(ownerUser.id, businessWorkspaceId, {
        name: "Etfago Enterprise Solutions",
      });
      expect(updatedByOwner.name).toBe("Etfago Enterprise Solutions");

      // Regular member attempts rename -> Forbidden
      await expect(
        updateWorkspace(regularMemberUser.id, businessWorkspaceId, {
          name: "Hacked Name",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("prevents ADMIN from demoting or removing the OWNER", async () => {
      await expect(
        updateWorkspaceMemberRole(adminUser.id, businessWorkspaceId, ownerUser.id, "MEMBER")
      ).rejects.toThrow(ForbiddenError);
    });

    it("transfers ownership: promotes target to OWNER and demotes former owner to ADMIN", async () => {
      // Transfer from ownerUser to adminUser
      const transferredWs = await transferWorkspaceOwnership(
        ownerUser.id,
        businessWorkspaceId,
        adminUser.id
      );

      expect(transferredWs.ownerUserId).toBe(adminUser.id);

      // Verify member roles in DB
      const newOwnerMember = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: businessWorkspaceId, userId: adminUser.id } },
      });
      expect(newOwnerMember?.role).toBe("OWNER");

      const oldOwnerMember = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: businessWorkspaceId, userId: ownerUser.id } },
      });
      expect(oldOwnerMember?.role).toBe("ADMIN");

      // Former owner (now Admin) cannot transfer ownership anymore
      await expect(
        transferWorkspaceOwnership(ownerUser.id, businessWorkspaceId, regularMemberUser.id)
      ).rejects.toThrow(ForbiddenError);

      // Transfer back to ownerUser to restore test state
      await transferWorkspaceOwnership(adminUser.id, businessWorkspaceId, ownerUser.id);
    });

    it("rejects transferring ownership to self or non-members", async () => {
      // To self
      await expect(
        transferWorkspaceOwnership(ownerUser.id, businessWorkspaceId, ownerUser.id)
      ).rejects.toThrow(ValidationError);

      // To non-member outsider
      await expect(
        transferWorkspaceOwnership(ownerUser.id, businessWorkspaceId, outsiderUser.id)
      ).rejects.toThrow(NotFoundError);
    });

    it("enforces workspace archiving rules (Owner only, Business only)", async () => {
      // Member attempts archive -> Forbidden
      await expect(
        archiveWorkspace(regularMemberUser.id, businessWorkspaceId, true)
      ).rejects.toThrow(ForbiddenError);

      // Admin attempts archive -> Forbidden
      await expect(
        archiveWorkspace(adminUser.id, businessWorkspaceId, true)
      ).rejects.toThrow(ForbiddenError);

      // Owner attempts archive on personal workspace -> ValidationError
      const personalWs = await db.workspace.findFirst({
        where: { ownerUserId: ownerUser.id, kind: "PERSONAL" },
      });
      expect(personalWs).toBeDefined();
      if (personalWs) {
        await expect(
          archiveWorkspace(ownerUser.id, personalWs.id, true)
        ).rejects.toThrow(ValidationError);
      }

      // Owner archives business workspace -> succeeds
      const archived = await archiveWorkspace(ownerUser.id, businessWorkspaceId, true);
      expect(archived.archivedAt).not.toBeNull();

      // Owner unarchives business workspace -> succeeds
      const restored = await archiveWorkspace(ownerUser.id, businessWorkspaceId, false);
      expect(restored.archivedAt).toBeNull();
    });
  });

  describe("2. Operational Reporting & Metrics Aggregation", () => {
    let ag1Id: string;
    let ag2Id: string;

    beforeAll(async () => {
      // Create Agreement 1 in workspace
      const ag1 = await createAgreement(ownerUser.id, {
        workspaceId: businessWorkspaceId,
        title: "Vendor Supply Contract 2026",
        initialTerms: [
          {
            id: "t1_supply",
            title: "Delivery Timetable",
            body: "Deliveries every Monday morning",
            amount: "10000",
            currency: "SAR",
            dueDate: "2026-12-01",
            assignedParticipantId: null,
          },
        ],
      });
      ag1Id = ag1.id;

      // Create Agreement 2 in workspace
      const ag2 = await createAgreement(adminUser.id, {
        workspaceId: businessWorkspaceId,
        title: "Software Engineering Engagement",
        initialTerms: [
          {
            id: "t2_eng",
            title: "Sprint 1 Deliverables",
            body: "Architecture documents and tests",
            amount: null,
            currency: null,
            dueDate: null,
            assignedParticipantId: null,
          },
        ],
      });
      ag2Id = ag2.id;

      // Add Commitments to ag1:
      // 1. DONE
      const comm1 = await createCommitment(ownerUser.id, {
        agreementId: ag1Id,
        title: "Initial procurement deposit",
      });
      await updateCommitmentStatus(ownerUser.id, {
        agreementId: ag1Id,
        commitmentId: comm1.id,
        status: "DONE",
        expectedRevision: 1,
      });

      // 2. OVERDUE TODO (due in past)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await createCommitment(ownerUser.id, {
        agreementId: ag1Id,
        title: "Deliver sample batch",
        dueAt: yesterday.toISOString(),
      });

      // 3. IN_PROGRESS with needsReview: true
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const comm3 = await createCommitment(ownerUser.id, {
        agreementId: ag1Id,
        title: "Quality inspection signoff",
        dueAt: tomorrow.toISOString(),
      });
      await updateCommitmentStatus(ownerUser.id, {
        agreementId: ag1Id,
        commitmentId: comm3.id,
        status: "IN_PROGRESS",
        expectedRevision: 1,
      });

      // Manually set needsReview: true on comm3 for testing reporting
      await db.commitment.update({
        where: { id: comm3.id },
        data: { needsReview: true },
      });

      // Add Commitment to ag2:
      // 4. IN_PROGRESS (not overdue)
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const comm4 = await createCommitment(adminUser.id, {
        agreementId: ag2Id,
        title: "System Integration Testing",
        dueAt: nextWeek.toISOString(),
      });
      await updateCommitmentStatus(adminUser.id, {
        agreementId: ag2Id,
        commitmentId: comm4.id,
        status: "IN_PROGRESS",
        expectedRevision: 1,
      });
    });

    it("aggregates accurate workspace metrics across agreements and commitments", async () => {
      const report = await getWorkspaceOperationalReport(ownerUser.id, businessWorkspaceId);

      // Workspace metadata
      expect(report.workspace.id).toBe(businessWorkspaceId);
      expect(report.workspace.name).toBe("Etfago Enterprise Solutions");
      expect(report.workspace.memberCount).toBe(3);

      // Agreements Metrics
      expect(report.metrics.agreements.total).toBe(2);
      expect(report.metrics.agreements.draft).toBe(2);

      // Commitments Metrics
      // Total commitments = 4 (1 DONE, 1 OVERDUE TODO, 1 IN_PROGRESS needsReview, 1 IN_PROGRESS)
      expect(report.metrics.commitments.total).toBe(4);
      expect(report.metrics.commitments.done).toBe(1);
      expect(report.metrics.commitments.todo).toBe(1);
      expect(report.metrics.commitments.inProgress).toBe(2);
      expect(report.metrics.commitments.overdue).toBe(1);
      expect(report.metrics.commitments.needsReview).toBe(1);

      // Completion Rate: 1 DONE out of 4 total (non-cancelled) = 25%
      expect(report.metrics.commitments.completionRate).toBe(25);

      // Member Metrics
      expect(report.metrics.members.total).toBe(3);
      expect(report.metrics.members.owners).toBe(1);
      expect(report.metrics.members.admins).toBe(1);
      expect(report.metrics.members.regularMembers).toBe(1);

      // Itemized report lists
      expect(report.agreements.length).toBe(2);
      expect(report.commitments.length).toBe(4);
      expect(report.recentActivity.length).toBeGreaterThan(0);
    });

    it("denies access to non-members attempting to view workspace operational report", async () => {
      await expect(
        getWorkspaceOperationalReport(outsiderUser.id, businessWorkspaceId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("3. Report Serialization Formats (CSV & JSON)", () => {
    it("generates well-formed CSV with UTF-8 BOM, sections, and headers", async () => {
      const report = await getWorkspaceOperationalReport(adminUser.id, businessWorkspaceId);
      const csv = generateWorkspaceCsvReport(report);

      // Check UTF-8 BOM for Excel Arabic / English support
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Check main sections
      expect(csv).toContain("=== WORKSPACE OPERATIONAL REPORT ===");
      expect(csv).toContain("=== METRICS SUMMARY ===");
      expect(csv).toContain("=== AGREEMENTS STATUS ===");
      expect(csv).toContain("=== OPERATIONAL COMMITMENTS ===");

      // Check content presence
      expect(csv).toContain("Vendor Supply Contract 2026");
      expect(csv).toContain("Software Engineering Engagement");
      expect(csv).toContain("Deliver sample batch");
      expect(csv).toContain("Initial procurement deposit");
      expect(csv).toContain("25%");
    });

    it("generates valid JSON report matching the operational data model", async () => {
      const report = await getWorkspaceOperationalReport(ownerUser.id, businessWorkspaceId);
      const jsonStr = generateWorkspaceJsonReport(report);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.workspace.id).toBe(businessWorkspaceId);
      expect(parsed.metrics.commitments.completionRate).toBe(25);
      expect(parsed.agreements.length).toBe(2);
      expect(parsed.commitments.length).toBe(4);
    });
  });
});
