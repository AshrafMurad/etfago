import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { instantiateTemplateTerms, STARTER_TEMPLATES } from "../../src/lib/templates/registry";
import { createAgreement, getAgreementDetail, updateDraft } from "../../src/server/agreements/service";
import { inviteParticipant, redeemInvitation } from "../../src/server/invitations/service";
import { submitDraftForReview, recordReviewDecision } from "../../src/server/agreements/versions";
import { ForbiddenError } from "../../src/lib/errors";

describe("Sprint 8 Integration: Starter Templates by Agreement Purpose (F-21)", () => {
  let organizerUserId: string;
  let organizerWsId: string;
  let reviewerUserId: string;
  let outsiderUserId: string;
  let outsiderWsId: string;

  const emailOrganizer = "organizer.templates@example.com";
  const emailReviewer = "reviewer.templates@example.com";
  const emailOutsider = "outsider.templates@example.com";

  beforeAll(async () => {
    // Clean up test users
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailReviewer, emailOutsider] },
      },
    });

    // 1. Register organizer
    const orgReg = await registerOrGetUser({
      email: emailOrganizer,
      name: "Organizer Templates",
      locale: "ar",
    });
    organizerUserId = orgReg.user.id;
    organizerWsId = orgReg.workspaceId;

    await db.user.update({
      where: { id: organizerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 2. Register reviewer
    const revReg = await registerOrGetUser({
      email: emailReviewer,
      name: "Reviewer Templates",
      locale: "ar",
    });
    reviewerUserId = revReg.user.id;

    await db.user.update({
      where: { id: reviewerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Register outsider
    const outReg = await registerOrGetUser({
      email: emailOutsider,
      name: "Outsider Templates",
      locale: "en",
    });
    outsiderUserId = outReg.user.id;
    outsiderWsId = outReg.workspaceId;

    await db.user.update({
      where: { id: outsiderUserId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailReviewer, emailOutsider] },
      },
    });
  });

  it("1. instantiates Freelance Services template and creates agreement with populated draft in PostgreSQL", async () => {
    const templateId = "freelance-professional-services";
    const instantiated = instantiateTemplateTerms(templateId, "ar");

    expect(instantiated.terms.length).toBe(5);

    const agreementSummary = await createAgreement(organizerUserId, {
      workspaceId: organizerWsId,
      title: instantiated.title,
      description: instantiated.description,
      category: instantiated.category,
      templateId,
      initialTerms: instantiated.terms,
    });

    expect(agreementSummary.id).toBeDefined();
    expect(agreementSummary.termsCount).toBe(5);
    expect(agreementSummary.isOrganizer).toBe(true);

    // Fetch detail from DB
    const detail = await getAgreementDetail(organizerUserId, agreementSummary.id);
    expect(detail.title).toBe(instantiated.title);
    expect(detail.category).toBe("SERVICES");
    expect(detail.draft?.content.terms.length).toBe(5);
    expect(detail.draft?.content.terms[0].title).toBe("نطاق العمل والمخرجات المطلوبة");

    // Verify organizer participant is created
    expect(detail.participants.length).toBe(1);
    expect(detail.participants[0].userId).toBe(organizerUserId);
    expect(detail.participants[0].agreementRole).toBe("ORGANIZER");

    // Verify ActivityEvent records templateId
    const events = await db.activityEvent.findMany({
      where: { agreementId: agreementSummary.id, action: "AGREEMENT_CREATED" },
    });
    expect(events.length).toBe(1);
    const summary = events[0].summaryJson as { templateId?: string; termsCount?: number };
    expect(summary.templateId).toBe(templateId);
    expect(summary.termsCount).toBe(5);
  });

  it("2. strictly blocks unauthorized user from creating agreement in another workspace", async () => {
    const instantiated = instantiateTemplateTerms("personal-shared-responsibility", "en");

    await expect(
      createAgreement(outsiderUserId, {
        workspaceId: organizerWsId, // outsider trying to use organizer's workspace
        title: instantiated.title,
        description: instantiated.description,
        category: instantiated.category,
        templateId: "personal-shared-responsibility",
        initialTerms: instantiated.terms,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("3. supports editing, customizing, and updating draft initialized from a template", async () => {
    const instantiated = instantiateTemplateTerms("goods-supply-procurement", "ar");

    const created = await createAgreement(organizerUserId, {
      workspaceId: organizerWsId,
      title: "اتفاق توريد مخصص للمعدات",
      description: instantiated.description,
      category: instantiated.category,
      templateId: "goods-supply-procurement",
      initialTerms: instantiated.terms,
    });

    const detail = await getAgreementDetail(organizerUserId, created.id);
    expect(detail.draft).not.toBeNull();
    const draftContent = detail.draft!.content;

    // Add a custom financial amount to term 4 and append a 5th custom term
    const updatedTerms = [...draftContent.terms];
    updatedTerms[3] = {
      ...updatedTerms[3],
      amount: "50000.00",
      currency: "SAR",
    };

    updatedTerms.push({
      id: `custom_term_${Date.now()}`,
      title: "بند إضافي: الضمان والصيانة لمدة سنة",
      body: "يلتزم المورد بتقديم ضمان شامل وصيانة مجانية لمدة 12 شهرًا من الاستلام.",
      amount: null,
      currency: null,
      dueDate: "2027-01-01",
      assignedParticipantId: null,
    });

    const updateResult = await updateDraft(organizerUserId, {
      agreementId: created.id,
      expectedRevision: detail.draft!.revision,
      content: {
        ...draftContent,
        terms: updatedTerms,
      },
    });

    expect(updateResult.newRevision).toBe(2);

    const reloaded = await getAgreementDetail(organizerUserId, created.id);
    expect(reloaded.draft?.revision).toBe(2);
    expect(reloaded.draft?.content.terms.length).toBe(5);
    expect(reloaded.draft?.content.terms[3].amount).toBe("50000.00");
    expect(reloaded.draft?.content.terms[3].currency).toBe("SAR");
  });

  it("4. seamlessly carries template-instantiated draft through version freeze and unanimous approval", async () => {
    // 1. Create agreement from Confidentiality NDA template
    const templateId = "mutual-confidentiality-nda";
    const instantiated = instantiateTemplateTerms(templateId, "ar");

    const created = await createAgreement(organizerUserId, {
      workspaceId: organizerWsId,
      title: instantiated.title,
      description: instantiated.description,
      category: instantiated.category,
      templateId,
      initialTerms: instantiated.terms,
    });

    // 2. Invite reviewer
    const inviteRes = await inviteParticipant(organizerUserId, {
      agreementId: created.id,
      email: emailReviewer,
      partyDisplayName: "Reviewer Partner",
      partyKind: "PERSON",
      agreementRole: "REVIEWER",
      requiredByDefault: true,
    });

    // 3. Reviewer redeems invitation
    await redeemInvitation(reviewerUserId, inviteRes.rawToken);

    // 4. Organizer submits template-derived draft for review -> Version 1
    const v1 = await submitDraftForReview(organizerUserId, {
      agreementId: created.id,
      expectedDraftRevision: 1,
    });
    expect(v1.versionNumber).toBe(1);
    expect(v1.contentHash).toBeDefined();

    // 5. Both parties approve Version 1
    await recordReviewDecision(organizerUserId, {
      agreementId: created.id,
      versionId: v1.id,
      decision: "APPROVE",
      expectedVersionHash: v1.contentHash,
    });

    const finalDecision = await recordReviewDecision(reviewerUserId, {
      agreementId: created.id,
      versionId: v1.id,
      decision: "APPROVE",
      expectedVersionHash: v1.contentHash,
    });

    expect(finalDecision.isUnanimouslyApproved).toBe(true);

    // 6. Verify agreement is now AGREED with currentApprovedVersionId = V1
    const finalDetail = await getAgreementDetail(organizerUserId, created.id);
    expect(finalDetail.lifecycleStatus).toBe("AGREED");
    expect(finalDetail.currentApprovedVersionId).toBe(v1.id);
  });

  it("5. instantiates all starter templates successfully into PostgreSQL without errors", async () => {
    for (const tmpl of STARTER_TEMPLATES) {
      const instantiated = instantiateTemplateTerms(tmpl.id, "ar");
      const created = await createAgreement(organizerUserId, {
        workspaceId: organizerWsId,
        title: `Test ${tmpl.id}`,
        description: instantiated.description,
        category: instantiated.category,
        templateId: tmpl.id,
        initialTerms: instantiated.terms,
      });

      expect(created.id).toBeDefined();
      expect(created.termsCount).toBe(tmpl.terms.length);
    }
  });
});
