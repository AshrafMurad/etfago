import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { createAgreement } from "../../src/server/agreements/service";
import { inviteParticipant, redeemInvitation } from "../../src/server/invitations/service";
import {
  submitDraftForReview,
  recordReviewDecision,
  getVersionDetail,
} from "../../src/server/agreements/versions";
import { computeVersionContentHash } from "../../src/lib/canonical-json";
import { ConflictError } from "../../src/lib/errors";

describe("Sprint 10 Integration: Advanced Approval Policies & Quorum Review (F-23)", () => {
  const emailOrg = "organizer.policy@example.com";
  const emailRevA = "reviewerA.policy@example.com";
  const emailRevB = "reviewerB.policy@example.com";
  const emailRevC = "reviewerC.policy@example.com";

  let orgId: string;
  let revAId: string;
  let revBId: string;
  let revCId: string;
  let workspaceId: string;

  beforeAll(async () => {
    // Clean up test database
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrg, emailRevA, emailRevB, emailRevC] },
      },
    });

    // 1. Setup Organizer
    const orgReg = await registerOrGetUser({
      email: emailOrg,
      name: "منظم سياسات الاعتماد",
      locale: "ar",
    });
    orgId = orgReg.user.id;
    workspaceId = orgReg.workspaceId;
    await db.user.update({
      where: { id: orgId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Setup Reviewers
    for (const [email, name, setter] of [
      [emailRevA, "مراجع أول", (id: string) => (revAId = id)],
      [emailRevB, "مراجع ثان", (id: string) => (revBId = id)],
      [emailRevC, "مراجع ثالث", (id: string) => (revCId = id)],
    ] as const) {
      const reg = await registerOrGetUser({ email, name, locale: "ar" });
      setter(reg.user.id);
      await db.user.update({
        where: { id: reg.user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrg, emailRevA, emailRevB, emailRevC] },
      },
    });
  });

  it("1. promotes version to APPROVED when MAJORITY quorum is reached despite a change request", async () => {
    // 3 required parties: Organizer, Reviewer A, Reviewer B
    const agreement = await createAgreement(orgId, {
      workspaceId,
      title: "اتفاقية اعتماد بنصاب الأغلبية",
      initialTerms: [{ id: "t1", title: "البند الرئيسي", body: "شروط الاتفاق" }],
    });

    const inviteA = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevA,
      partyDisplayName: "الطرف الأول",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });
    await redeemInvitation(revAId, inviteA.rawToken);

    const inviteB = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevB,
      partyDisplayName: "الطرف الثاني",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });
    await redeemInvitation(revBId, inviteB.rawToken);

    // Submit draft with MAJORITY policy (needs > 50%, i.e. 2 out of 3)
    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId: agreement.id },
    });
    const version = await submitDraftForReview(orgId, {
      agreementId: agreement.id,
      expectedDraftRevision: draft.revision,
      approvalPolicy: "MAJORITY",
    });

    expect(version.approvalPolicy).toBe("MAJORITY");
    expect(version.state).toBe("IN_REVIEW");

    // Decision 1: Reviewer A requests changes
    // In UNANIMOUS, this would immediately reject. In MAJORITY, with 2 potential approvals left, review remains open!
    const decisionA = await recordReviewDecision(revAId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "REQUEST_CHANGES",
      expectedVersionHash: version.contentHash,
      reason: "أقترح تعديل بند الصيانة",
    });
    expect(decisionA.status).toBe("RECORDED");
    expect(decisionA.versionState).toBe("IN_REVIEW");
    expect(decisionA.isApproved).toBe(false);

    // Decision 2: Organizer approves (1 approval so far)
    const decisionOrg = await recordReviewDecision(orgId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });
    expect(decisionOrg.status).toBe("RECORDED");
    expect(decisionOrg.versionState).toBe("IN_REVIEW");

    // Decision 3: Reviewer B approves -> 2 approvals reached!
    // 2 out of 3 > 50% => MAJORITY is met! Promotes to APPROVED!
    const decisionB = await recordReviewDecision(revBId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });
    expect(decisionB.status).toBe("APPROVED");
    expect(decisionB.versionState).toBe("APPROVED");
    expect(decisionB.approvedCount).toBe(2);
    expect(decisionB.requiredCount).toBe(3);
    expect(decisionB.isApproved).toBe(true);

    // Verify Agreement pointers
    const updatedAgreement = await db.agreement.findUniqueOrThrow({
      where: { id: agreement.id },
    });
    expect(updatedAgreement.currentApprovedVersionId).toBe(version.id);
    expect(updatedAgreement.pendingReviewVersionId).toBeNull();
    expect(updatedAgreement.lifecycleStatus).toBe("AGREED");
  });

  it("2. terminates and REJECTS majority review when achieving majority becomes mathematically impossible", async () => {
    // 3 required parties: Organizer, Reviewer A, Reviewer B
    const agreement = await createAgreement(orgId, {
      workspaceId,
      title: "اتفاقية رفض الأغلبية عند استحالة النصاب",
      initialTerms: [{ id: "t1", title: "البند", body: "تفاصيل" }],
    });

    const invA = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevA,
      partyDisplayName: "الطرف أ",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });
    await redeemInvitation(revAId, invA.rawToken);

    const invB = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevB,
      partyDisplayName: "الطرف ب",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });
    await redeemInvitation(revBId, invB.rawToken);

    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId: agreement.id },
    });
    const version = await submitDraftForReview(orgId, {
      agreementId: agreement.id,
      expectedDraftRevision: draft.revision,
      approvalPolicy: "MAJORITY",
    });

    // Reviewer A requests changes: 0 approved, 1 requested changes, 2 remaining -> max possible = 2 (still possible)
    const resA = await recordReviewDecision(revAId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "REQUEST_CHANGES",
      expectedVersionHash: version.contentHash,
    });
    expect(resA.status).toBe("RECORDED");
    expect(resA.versionState).toBe("IN_REVIEW");

    // Reviewer B also requests changes: 0 approved, 2 requested changes, 1 remaining -> max possible = 1 < 2
    // It is now impossible to reach 2 approvals! The version must be automatically REJECTED!
    const resB = await recordReviewDecision(revBId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "REQUEST_CHANGES",
      expectedVersionHash: version.contentHash,
    });
    expect(resB.status).toBe("REJECTED");
    expect(resB.versionState).toBe("REJECTED");

    const updated = await db.agreement.findUniqueOrThrow({
      where: { id: agreement.id },
    });
    expect(updated.pendingReviewVersionId).toBeNull();
  });

  it("3. promotes version when explicit QUORUM_THRESHOLD is satisfied", async () => {
    // 4 required parties: Organizer + Reviewers A, B, C
    const agreement = await createAgreement(orgId, {
      workspaceId,
      title: "اتفاقية نصاب مخصص (2 من 4)",
      initialTerms: [{ id: "t1", title: "البند", body: "مواصفات" }],
    });

    for (const [email, id] of [
      [emailRevA, revAId],
      [emailRevB, revBId],
      [emailRevC, revCId],
    ] as const) {
      const inv = await inviteParticipant(orgId, {
        agreementId: agreement.id,
        email,
        partyDisplayName: `شريك ${email}`,
        agreementRole: "REVIEWER",
        partyKind: "PERSON",
      });
      await redeemInvitation(id, inv.rawToken);
    }

    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId: agreement.id },
    });

    // Quorum threshold: 2 approvals out of 4 required
    const version = await submitDraftForReview(orgId, {
      agreementId: agreement.id,
      expectedDraftRevision: draft.revision,
      approvalPolicy: "QUORUM_THRESHOLD",
      quorumThreshold: 2,
    });
    expect(version.approvalPolicy).toBe("QUORUM_THRESHOLD");
    expect(version.quorumThreshold).toBe(2);

    // Approval 1: Organizer approves (1/2)
    const dec1 = await recordReviewDecision(orgId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });
    expect(dec1.status).toBe("RECORDED");
    expect(dec1.versionState).toBe("IN_REVIEW");

    // Approval 2: Reviewer A approves (2/2) -> threshold met! Promoted!
    const dec2 = await recordReviewDecision(revAId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });
    expect(dec2.status).toBe("APPROVED");
    expect(dec2.versionState).toBe("APPROVED");
    expect(dec2.approvedCount).toBe(2);
  });

  it("4. enforces SEQUENTIAL review ordering where later steps cannot review before prior steps approve", async () => {
    // 3 parties: Organizer (Step 1), Reviewer A (Step 1), Reviewer B (Step 2)
    const agreement = await createAgreement(orgId, {
      workspaceId,
      title: "اتفاقية مراجعة تسلسلية متعددة المراحل",
      initialTerms: [{ id: "t1", title: "مرحلة 1", body: "تسلسل" }],
    });

    // Invite A at Step 1
    const invA = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevA,
      partyDisplayName: "المدير الفني (مرحلة 1)",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
      stepOrder: 1,
    });
    await redeemInvitation(revAId, invA.rawToken);

    // Invite B at Step 2
    const invB = await inviteParticipant(orgId, {
      agreementId: agreement.id,
      email: emailRevB,
      partyDisplayName: "المدير المالي (مرحلة 2)",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
      stepOrder: 2,
    });
    await redeemInvitation(revBId, invB.rawToken);

    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId: agreement.id },
    });

    const version = await submitDraftForReview(orgId, {
      agreementId: agreement.id,
      expectedDraftRevision: draft.revision,
      isSequential: true,
    });
    expect(version.isSequential).toBe(true);

    // Reviewer B (Step 2) attempts to approve before Step 1 finishes -> MUST FAIL WITH CONFLICT
    await expect(
      recordReviewDecision(revBId, {
        agreementId: agreement.id,
        versionId: version.id,
        decision: "APPROVE",
        expectedVersionHash: version.contentHash,
      })
    ).rejects.toThrow(/Prior review steps must approve before step 2/);

    // Step 1: Organizer approves
    await recordReviewDecision(orgId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });

    // Reviewer B still cannot approve because Reviewer A (Step 1) has not approved yet
    await expect(
      recordReviewDecision(revBId, {
        agreementId: agreement.id,
        versionId: version.id,
        decision: "APPROVE",
        expectedVersionHash: version.contentHash,
      })
    ).rejects.toThrow(/Prior review steps must approve before step 2/);

    // Step 1: Reviewer A approves
    await recordReviewDecision(revAId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });

    // Now all Step 1 reviewers have approved! Step 2 Reviewer B can record decision!
    const resB = await recordReviewDecision(revBId, {
      agreementId: agreement.id,
      versionId: version.id,
      decision: "APPROVE",
      expectedVersionHash: version.contentHash,
    });
    expect(resB.status).toBe("APPROVED");
    expect(resB.versionState).toBe("APPROVED");
  });

  it("5. cryptographically includes approval policy in deterministic composite content hash", () => {
    const baseComposite = {
      schemaVersion: 1,
      content: {
        schemaVersion: 1,
        title: "اتفاق سياسة تجريبية",
        description: null,
        terms: [{ id: "t1", title: "بند", body: "محتوى", amount: null, currency: null, dueDate: null, assignedParticipantId: null }],
      },
      reviewers: [
        {
          participantId: "p1",
          userId: "u1",
          emailSnapshot: "u1@example.com",
          nameSnapshot: "User One",
          partyKindSnapshot: "PERSON",
          roleSnapshot: "ORGANIZER",
          required: true,
          stepOrder: 1,
        },
      ],
    };

    const hashUnanimous = computeVersionContentHash({
      ...baseComposite,
      approvalPolicy: "UNANIMOUS",
    });

    const hashMajority = computeVersionContentHash({
      ...baseComposite,
      approvalPolicy: "MAJORITY",
    });

    const hashSequential = computeVersionContentHash({
      ...baseComposite,
      approvalPolicy: "UNANIMOUS",
      isSequential: true,
    });

    expect(hashUnanimous).not.toBe(hashMajority);
    expect(hashUnanimous).not.toBe(hashSequential);
  });
});
