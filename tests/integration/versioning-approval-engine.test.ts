import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import {
  createAgreement,
  getAgreementDetail,
  updateDraft,
} from "../../src/server/agreements/service";
import {
  inviteParticipant,
  redeemInvitation,
  removeParticipant,
} from "../../src/server/invitations/service";
import {
  submitDraftForReview,
  recordReviewDecision,
  withdrawPendingReview,
  prepareAmendmentDraft,
  listAgreementVersions,
  getVersionDetail,
} from "../../src/server/agreements/versions";
import { ConflictError, ForbiddenError } from "../../src/lib/errors";

describe("Sprint 4 Integration: Versioning & Review Engine", () => {
  let organizerUserId: string;
  let organizerWorkspaceId: string;
  let partnerUserId: string;
  let thirdPartyUserId: string;
  let outsiderUserId: string;

  let agreementId: string;

  const emailOrganizer = "organizer.versioning@example.com";
  const emailPartner = "partner.versioning@example.com";
  const emailThirdParty = "thirdparty.versioning@example.com";
  const emailOutsider = "outsider.versioning@example.com";

  beforeAll(async () => {
    // Clean up before test run
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [emailOrganizer, emailPartner, emailThirdParty, emailOutsider],
        },
      },
    });

    // 1. Organizer
    const orgReg = await registerOrGetUser({
      email: emailOrganizer,
      name: "Tariq Organizer",
      locale: "ar",
    });
    organizerUserId = orgReg.user.id;
    organizerWorkspaceId = orgReg.workspaceId;
    await db.user.update({
      where: { id: organizerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Partner
    const partnerReg = await registerOrGetUser({
      email: emailPartner,
      name: "Sara Partner",
      locale: "ar",
    });
    partnerUserId = partnerReg.user.id;
    await db.user.update({
      where: { id: partnerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Third Party
    const thirdReg = await registerOrGetUser({
      email: emailThirdParty,
      name: "Zaid ThirdParty",
      locale: "ar",
    });
    thirdPartyUserId = thirdReg.user.id;
    await db.user.update({
      where: { id: thirdPartyUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 4. Outsider
    const outsiderReg = await registerOrGetUser({
      email: emailOutsider,
      name: "Outsider",
      locale: "en",
    });
    outsiderUserId = outsiderReg.user.id;
    await db.user.update({
      where: { id: outsiderUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create Agreement with initial terms
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: organizerWorkspaceId,
      title: "اتفاقية تطوير برمجي",
      description: "تطوير المنصة الرقمية وفق المواصفات الفنية",
      category: "SERVICE",
      initialTerms: [
        {
          id: "term_scope",
          title: "نطاق العمل",
          body: "تنفيذ المرحلة الأولى من منصة اتفقنا",
          amount: "50000",
          currency: "SAR",
          dueDate: "2026-12-31",
          assignedParticipantId: null,
        },
        {
          id: "term_ip",
          title: "الملكية الفكرية",
          body: "تعود ملكية جميع المخرجات البرمجية إلى الطرف الأول",
          amount: null,
          currency: null,
          dueDate: null,
          assignedParticipantId: null,
        },
      ],
    });
    agreementId = agreement.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [emailOrganizer, emailPartner, emailThirdParty, emailOutsider],
        },
      },
    });
  });

  it("1. enforces quorum: rejects submission if fewer than two verified required participants have joined", async () => {
    // Currently only the organizer exists
    await expect(
      submitDraftForReview(organizerUserId, {
        agreementId,
        expectedDraftRevision: 1,
      })
    ).rejects.toThrow(ConflictError);
  });

  it("2. invites partner, redeems invitation, and freezes draft into Version 1 (IN_REVIEW)", async () => {
    // Invite partner
    const invite = await inviteParticipant(organizerUserId, {
      agreementId,
      email: emailPartner,
      partyDisplayName: "سارة الشريك التقني",
      partyKind: "PERSON",
      agreementRole: "REVIEWER",
      requiredByDefault: true,
    });

    // Partner redeems
    await redeemInvitation(partnerUserId, invite.rawToken);

    // Now organizer submits draft for review
    const v1 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: 1,
    });

    expect(v1.versionNumber).toBe(1);
    expect(v1.state).toBe("IN_REVIEW");
    expect(v1.contentHash).toHaveLength(64);
    expect(v1.reviewers).toHaveLength(2);

    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreement.pendingReviewVersionId).toBe(v1.id);
    expect(agreement.currentApprovedVersionId).toBeNull();
    expect(agreement.lifecycleStatus).toBe("DRAFT");
  });

  it("3. rejects draft edits while a review is pending", async () => {
    await expect(
      updateDraft(organizerUserId, {
        agreementId,
        expectedRevision: 1,
        content: {
          schemaVersion: 1,
          title: "محاولة تعديل أثناء المراجعة",
          description: null,
          terms: [],
        },
      })
    ).rejects.toThrow(ConflictError);
  });

  it("4. rejects review decisions with stale or mismatched content hash", async () => {
    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    const staleHash = "0".repeat(64);

    await expect(
      recordReviewDecision(partnerUserId, {
        agreementId,
        versionId: agreement.pendingReviewVersionId!,
        decision: "APPROVE",
        expectedVersionHash: staleHash,
      })
    ).rejects.toThrow(ConflictError);
  });

  it("5. first approval records decision but keeps version IN_REVIEW until unanimous", async () => {
    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    const v1Id = agreement.pendingReviewVersionId!;
    const v1Detail = await getVersionDetail(partnerUserId, agreementId, v1Id);

    // Partner approves
    const result1 = await recordReviewDecision(partnerUserId, {
      agreementId,
      versionId: v1Id,
      decision: "APPROVE",
      expectedVersionHash: v1Detail.contentHash,
    });

    expect(result1.status).toBe("RECORDED");
    expect(result1.decision).toBe("APPROVE");
    expect(result1.versionState).toBe("IN_REVIEW");
    expect(result1.isUnanimouslyApproved).toBe(false);

    // Check agreement still pending
    const afterFirstApproval = await getAgreementDetail(organizerUserId, agreementId);
    expect(afterFirstApproval.pendingReviewVersionId).toBe(v1Id);
    expect(afterFirstApproval.currentApprovedVersionId).toBeNull();

    // Idempotent retry: partner approves again with same decision
    const retryResult = await recordReviewDecision(partnerUserId, {
      agreementId,
      versionId: v1Id,
      decision: "APPROVE",
      expectedVersionHash: v1Detail.contentHash,
    });
    expect(retryResult.status).toBe("RECORDED");
  });

  it("6. organizer approval satisfies unanimous requirement, promoting V1 to APPROVED and lifecycle to AGREED", async () => {
    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    const v1Id = agreement.pendingReviewVersionId!;
    const v1Detail = await getVersionDetail(organizerUserId, agreementId, v1Id);

    // Organizer approves
    const result2 = await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v1Id,
      decision: "APPROVE",
      expectedVersionHash: v1Detail.contentHash,
    });

    expect(result2.status).toBe("APPROVED");
    expect(result2.isUnanimouslyApproved).toBe(true);
    expect(result2.versionState).toBe("APPROVED");

    // Check agreement pointers
    const agreedAgreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreedAgreement.pendingReviewVersionId).toBeNull();
    expect(agreedAgreement.currentApprovedVersionId).toBe(v1Id);
    expect(agreedAgreement.lifecycleStatus).toBe("AGREED");

    // Version record reflects APPROVED
    const updatedV1 = await getVersionDetail(organizerUserId, agreementId, v1Id);
    expect(updatedV1.state).toBe("APPROVED");
    expect(updatedV1.resolvedAt).not.toBeNull();
  });

  it("7. amendment flow: updates draft, submits V2, and handles REQUEST_CHANGES (rejects V2 without altering agreed V1)", async () => {
    // 1. Prepare amendment draft from V1
    const v1Id = (await getAgreementDetail(organizerUserId, agreementId)).currentApprovedVersionId!;
    await prepareAmendmentDraft(organizerUserId, {
      agreementId,
      versionId: v1Id,
    });

    const agreementWithDraft = await getAgreementDetail(organizerUserId, agreementId);
    const draftRev = agreementWithDraft.draft!.revision;

    // 2. Organizer updates draft terms
    const updatedDraft = await updateDraft(organizerUserId, {
      agreementId,
      expectedRevision: draftRev,
      content: {
        schemaVersion: 1,
        title: "اتفاقية تطوير برمجي — تعديل المدة",
        description: "تمديد موعد التسليم النهائي",
        terms: [
          {
            id: "term_scope",
            title: "نطاق العمل المعدل",
            body: "تنفيذ المرحلة الأولى وتضمين النسخ الاحتياطي",
            amount: "60000",
            currency: "SAR",
            dueDate: "2027-01-31",
            assignedParticipantId: null,
          },
        ],
      },
    });

    // 3. Organizer submits V2 for review
    const v2 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: updatedDraft.newRevision,
    });

    expect(v2.versionNumber).toBe(2);
    expect(v2.state).toBe("IN_REVIEW");

    // Invariant: V1 is still the currentApprovedVersionId while V2 is in review!
    const midReviewAgreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(midReviewAgreement.currentApprovedVersionId).toBe(v1Id);
    expect(midReviewAgreement.pendingReviewVersionId).toBe(v2.id);

    // 4. Partner requests changes on V2
    const changeResult = await recordReviewDecision(partnerUserId, {
      agreementId,
      versionId: v2.id,
      decision: "REQUEST_CHANGES",
      expectedVersionHash: v2.contentHash,
      reason: "المبلغ المقترح غير مطابق للاتفاق الشفهي",
    });

    expect(changeResult.status).toBe("REJECTED");
    expect(changeResult.versionState).toBe("REJECTED");

    // Invariant: Rejecting V2 terminates review, clears pending pointer, but leaves agreed V1 intact!
    const afterRejectAgreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(afterRejectAgreement.pendingReviewVersionId).toBeNull();
    expect(afterRejectAgreement.currentApprovedVersionId).toBe(v1Id);

    const v2Detail = await getVersionDetail(organizerUserId, agreementId, v2.id);
    expect(v2Detail.state).toBe("REJECTED");
  });

  it("8. resubmission (V3): both approve, promoting V3 to current approved and marking V1 SUPERSEDED", async () => {
    const agreementBeforeV3 = await getAgreementDetail(organizerUserId, agreementId);
    const v1Id = agreementBeforeV3.currentApprovedVersionId!;
    const draftRev = agreementBeforeV3.draft!.revision;

    // Update draft to agreed terms
    const draftV3 = await updateDraft(organizerUserId, {
      agreementId,
      expectedRevision: draftRev,
      content: {
        schemaVersion: 1,
        title: "اتفاقية تطوير برمجي — النسخة النهائية للمرحلة 1",
        description: null,
        terms: [
          {
            id: "term_scope",
            title: "نطاق العمل المتفق عليه",
            body: "تنفيذ المرحلة الأولى وتضمين النسخ الاحتياطي",
            amount: "55000",
            currency: "SAR",
            dueDate: "2027-01-15",
            assignedParticipantId: null,
          },
        ],
      },
    });

    // Submit V3
    const v3 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draftV3.newRevision,
    });
    expect(v3.versionNumber).toBe(3);

    // Both parties approve V3
    await recordReviewDecision(partnerUserId, {
      agreementId,
      versionId: v3.id,
      decision: "APPROVE",
      expectedVersionHash: v3.contentHash,
    });

    const v3Promoted = await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v3.id,
      decision: "APPROVE",
      expectedVersionHash: v3.contentHash,
    });

    expect(v3Promoted.status).toBe("APPROVED");
    expect(v3Promoted.isUnanimouslyApproved).toBe(true);

    // Invariant: V3 is now currentApprovedVersionId, and old V1 is SUPERSEDED
    const finalAgreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(finalAgreement.currentApprovedVersionId).toBe(v3.id);
    expect(finalAgreement.pendingReviewVersionId).toBeNull();

    const v1Final = await getVersionDetail(organizerUserId, agreementId, v1Id);
    expect(v1Final.state).toBe("SUPERSEDED");

    const allVersions = await listAgreementVersions(organizerUserId, agreementId);
    expect(allVersions).toHaveLength(3);
    expect(allVersions.map((v) => ({ num: v.versionNumber, state: v.state }))).toEqual([
      { num: 3, state: "APPROVED" },
      { num: 2, state: "REJECTED" },
      { num: 1, state: "SUPERSEDED" },
    ]);
  });

  it("9. withdrawal flow: organizer withdraws pending review, returning draft to mutable state", async () => {
    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    const draftRev = agreement.draft!.revision;

    // Submit V4
    const v4 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draftRev,
    });
    expect(v4.versionNumber).toBe(4);
    expect(v4.state).toBe("IN_REVIEW");

    // Partner cannot withdraw (only organizer)
    await expect(
      withdrawPendingReview(partnerUserId, {
        agreementId,
        versionId: v4.id,
        reason: "محاولة سحب غير مصرح بها",
      })
    ).rejects.toThrow(ForbiddenError);

    // Organizer withdraws
    const withdrawn = await withdrawPendingReview(organizerUserId, {
      agreementId,
      versionId: v4.id,
      reason: "تم سحب المراجعة لإعادة صياغة الشروط",
    });
    expect(withdrawn.state).toBe("WITHDRAWN");

    const afterWithdrawAgreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(afterWithdrawAgreement.pendingReviewVersionId).toBeNull();
    // V3 still remains the currentApprovedVersionId!
    expect(afterWithdrawAgreement.currentApprovedVersionId).not.toBeNull();
  });

  it("10. participant removal during pending review automatically withdraws review to prevent stale roster decisions", async () => {
    // 1. Invite third party
    const invite = await inviteParticipant(organizerUserId, {
      agreementId,
      email: emailThirdParty,
      partyDisplayName: "زيد الطرف الثالث",
      partyKind: "PERSON",
      agreementRole: "REVIEWER",
      requiredByDefault: true,
    });
    await redeemInvitation(thirdPartyUserId, invite.rawToken);

    // Find third party participant ID
    const agreementWithThird = await getAgreementDetail(organizerUserId, agreementId);
    const thirdPart = agreementWithThird.participants.find((p) => p.userId === thirdPartyUserId)!;

    // 2. Submit V5
    const v5 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: agreementWithThird.draft!.revision,
    });
    expect(v5.versionNumber).toBe(5);
    expect(v5.state).toBe("IN_REVIEW");

    // 3. Organizer removes third party while V5 is pending
    await removeParticipant(organizerUserId, agreementId, thirdPart.id);

    // Invariant: V5 was automatically withdrawn because participant roster changed
    const v5Detail = await getVersionDetail(organizerUserId, agreementId, v5.id);
    expect(v5Detail.state).toBe("WITHDRAWN");

    const agreementAfterRemoval = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreementAfterRemoval.pendingReviewVersionId).toBeNull();
  });
});
