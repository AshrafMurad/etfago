import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { createBusinessWorkspace } from "../../src/server/workspaces/service";
import {
  createAgreement,
  getAgreementDetail,
  updateDraft,
  updateAgreementMetadata,
  archiveAgreement,
  listAgreements,
} from "../../src/server/agreements/service";
import { ConflictError, ForbiddenError, NotFoundError } from "../../src/lib/errors";

describe("Sprint 2 Integration: Agreements & Structured Drafts", () => {
  let organizerUserId: string;
  let organizerPersonalWsId: string;
  let businessWsId: string;

  let outsiderUserId: string;
  let coworkerUserId: string;

  const emailOrganizer = "organizer.sprint2@example.com";
  const emailOutsider = "outsider.sprint2@example.com";
  const emailCoworker = "coworker.sprint2@example.com";

  beforeAll(async () => {
    // Cleanup prior test runs
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailOutsider, emailCoworker] },
      },
    });

    // 1. Register organizer (auto-provisions personal workspace)
    const orgReg = await registerOrGetUser({
      email: emailOrganizer,
      name: "Tariq Organizer",
      locale: "ar",
    });
    organizerUserId = orgReg.user.id;
    organizerPersonalWsId = orgReg.workspaceId;

    // Verify organizer email
    await db.user.update({
      where: { id: organizerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create a business workspace for organizer
    const bizWs = await createBusinessWorkspace(organizerUserId, {
      name: "Tech Solutions Co.",
    });
    businessWsId = bizWs.id;

    // 2. Register outsider
    const outsiderReg = await registerOrGetUser({
      email: emailOutsider,
      name: "Outsider User",
      locale: "en",
    });
    outsiderUserId = outsiderReg.user.id;

    // 3. Register coworker and add to business workspace
    const coworkerReg = await registerOrGetUser({
      email: emailCoworker,
      name: "Coworker Member",
      locale: "ar",
    });
    coworkerUserId = coworkerReg.user.id;

    await db.workspaceMember.create({
      data: {
        workspaceId: businessWsId,
        userId: coworkerUserId,
        role: "MEMBER",
      },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: { in: [emailOrganizer, emailOutsider, emailCoworker] },
      },
    });
  });

  it("1. creates an agreement in a personal workspace with organizer participant & initial draft", async () => {
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: organizerPersonalWsId,
      title: "عقد توريد وتركيب أثاث مكتبي",
      description: "توريد الأثاث المكتبي للدور الثاني",
      category: "SUPPLY",
      initialTerms: [
        {
          id: "term_1",
          title: "نطاق التوريد",
          body: "يشمل 10 مكاتب و 20 كرسي",
          amount: "15000",
          currency: "SAR",
          dueDate: "2026-12-01",
          assignedParticipantId: null,
        },
      ],
    });

    expect(agreement.id).toBeDefined();
    expect(agreement.title).toBe("عقد توريد وتركيب أثاث مكتبي");
    expect(agreement.lifecycleStatus).toBe("DRAFT");
    expect(agreement.termsCount).toBe(1);
    expect(agreement.participantCount).toBe(1);
    expect(agreement.isOrganizer).toBe(true);

    // Verify detail fetch
    const detail = await getAgreementDetail(organizerUserId, agreement.id);
    expect(detail.id).toBe(agreement.id);
    expect(detail.draft).not.toBeNull();
    expect(detail.draft?.revision).toBe(1);
    expect(detail.draft?.content.terms[0].title).toBe("نطاق التوريد");

    // Verify Organizer Participant record was auto-created
    expect(detail.participants.length).toBe(1);
    const organizerParticipant = detail.participants[0];
    expect(organizerParticipant.userId).toBe(organizerUserId);
    expect(organizerParticipant.agreementRole).toBe("ORGANIZER");
    expect(organizerParticipant.partyDisplayName).toBe("Tariq Organizer");
    expect(organizerParticipant.requiredByDefault).toBe(true);
    expect(organizerParticipant.joinedAt).not.toBeNull();

    // Verify ActivityEvent created
    expect(detail.recentActivity.length).toBeGreaterThanOrEqual(1);
    expect(detail.recentActivity[0].action).toBe("AGREEMENT_CREATED");
  });

  it("2. updates draft and enforces optimistic revision increment", async () => {
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: organizerPersonalWsId,
      title: "اتفاقية تصميم واجهات",
      initialTerms: [],
    });

    const detailV1 = await getAgreementDetail(organizerUserId, agreement.id);
    expect(detailV1.draft?.revision).toBe(1);

    // Update with expectedRevision = 1
    const updateResult = await updateDraft(organizerUserId, {
      agreementId: agreement.id,
      expectedRevision: 1,
      content: {
        schemaVersion: 1,
        title: "اتفاقية تصميم واجهات - النسخة المعدلة",
        description: "تصميم واجهات الويب والجوال",
        terms: [
          {
            id: "term_ui_1",
            title: "المرحلة الأولى: أبحاث المستخدم",
            body: "إجراء مقابلات المستخدمين وإعداد خريطة الرحلة",
            dueDate: "2026-11-25",
            amount: "8000",
            currency: "SAR",
            assignedParticipantId: null,
          },
          {
            id: "term_ui_2",
            title: "المرحلة الثانية: النماذج الأولية",
            body: "تسليم نماذج Figma التفاعلية",
            dueDate: null,
            amount: null,
            currency: null,
            assignedParticipantId: null,
          },
        ],
      },
    });

    expect(updateResult.newRevision).toBe(2);
    expect(updateResult.content.terms.length).toBe(2);

    const detailV2 = await getAgreementDetail(organizerUserId, agreement.id);
    expect(detailV2.draft?.revision).toBe(2);
    expect(detailV2.title).toBe("اتفاقية تصميم واجهات - النسخة المعدلة");
    expect(detailV2.description).toBe("تصميم واجهات الويب والجوال");

    // Verify activity trail logged DRAFT_UPDATED
    expect(detailV2.recentActivity[0].action).toBe("DRAFT_UPDATED");
  });

  it("3. rejects draft update when expectedRevision does not match (optimistic concurrency conflict)", async () => {
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: organizerPersonalWsId,
      title: "اتفاقية دعم فني",
    });

    // Valid update to bump revision to 2
    await updateDraft(organizerUserId, {
      agreementId: agreement.id,
      expectedRevision: 1,
      content: {
        schemaVersion: 1,
        title: "اتفاقية دعم فني",
        terms: [{ id: "t1", title: "ساعات الدعم" }],
      },
    });

    // Attempt concurrent update with stale expectedRevision = 1
    await expect(
      updateDraft(organizerUserId, {
        agreementId: agreement.id,
        expectedRevision: 1,
        content: {
          schemaVersion: 1,
          title: "تحديث متزامن متعارض",
          terms: [],
        },
      })
    ).rejects.toThrowError(ConflictError);
  });

  it("4. strictly denies unauthorized users from viewing or editing the agreement (default-deny)", async () => {
    // Agreement created in business workspace
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: businessWsId,
      title: "مشروع سري للشركة",
    });

    // 4A. Outsider cannot view (throws NotFoundError to avoid existence leak)
    await expect(getAgreementDetail(outsiderUserId, agreement.id)).rejects.toThrowError(
      NotFoundError
    );

    // 4B. Outsider cannot edit draft (throws ForbiddenError or NotFoundError)
    await expect(
      updateDraft(outsiderUserId, {
        agreementId: agreement.id,
        expectedRevision: 1,
        content: {
          schemaVersion: 1,
          title: "محاولة تعديل غير مصرح بها",
          terms: [],
        },
      })
    ).rejects.toThrowError(ForbiddenError);

    // 4C. Coworker is in the same business workspace, but NOT a participant in this agreement:
    // Under Etfago invariants, workspace membership alone does not grant agreement access!
    await expect(getAgreementDetail(coworkerUserId, agreement.id)).rejects.toThrowError(
      NotFoundError
    );
  });

  it("5. lists only agreements accessible to the actor and filters correctly", async () => {
    const agreementsOrg = await listAgreements(organizerUserId);
    expect(agreementsOrg.length).toBeGreaterThanOrEqual(3);

    const agreementsOutsider = await listAgreements(outsiderUserId);
    expect(agreementsOutsider.length).toBe(0);

    // Search filter
    const searchResult = await listAgreements(organizerUserId, { search: "أثاث" });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].title).toContain("أثاث");
  });

  it("6. archives and restores agreement with activity events", async () => {
    const agreement = await createAgreement(organizerUserId, {
      workspaceId: organizerPersonalWsId,
      title: "اتفاق مؤقت للأرشفة",
    });

    // Non-organizer cannot archive
    await expect(archiveAgreement(outsiderUserId, agreement.id, true)).rejects.toThrowError(
      NotFoundError
    );

    // Organizer archives
    const archived = await archiveAgreement(organizerUserId, agreement.id, true);
    expect(archived.lifecycleStatus).toBe("ARCHIVED");
    expect(archived.archivedAt).not.toBeNull();

    // Check detail
    const detailArchived = await getAgreementDetail(organizerUserId, agreement.id);
    expect(detailArchived.lifecycleStatus).toBe("ARCHIVED");
    expect(detailArchived.canEdit).toBe(false); // cannot edit archived draft
    expect(detailArchived.recentActivity[0].action).toBe("AGREEMENT_ARCHIVED");

    // Organizer restores
    const restored = await archiveAgreement(organizerUserId, agreement.id, false);
    expect(restored.lifecycleStatus).toBe("DRAFT");
    expect(restored.archivedAt).toBeNull();
  });
});
