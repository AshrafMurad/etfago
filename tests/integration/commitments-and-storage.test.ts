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
} from "../../src/server/invitations/service";
import {
  submitDraftForReview,
  recordReviewDecision,
  getVersionDetail,
} from "../../src/server/agreements/versions";
import {
  createCommitment,
  updateCommitmentStatus,
  deleteCommitment,
  listCommitments,
} from "../../src/server/commitments/service";
import {
  saveAttachment,
  getAttachmentForDownload,
  deleteAttachment,
  listAttachments,
} from "../../src/server/storage/service";
import { resolveSafeStoragePath } from "../../src/server/storage/filesystem";
import { ForbiddenError, NotFoundError, ConflictError } from "../../src/lib/errors";
import fs from "fs";

describe("Sprint 6 Integration: Action Commitments & Private Server File Storage", () => {
  let organizerUserId: string;
  let reviewerUserId: string;
  let outsiderUserId: string;
  let workspaceId: string;
  let agreementId: string;
  let reviewerParticipantId: string;
  let v1Id: string;
  let commitmentId: string;
  let attachmentId: string;
  let attachmentStorageKey: string;

  const orgEmail = "organizer.commitments@example.com";
  const revEmail = "reviewer.commitments@example.com";
  const outEmail = "outsider.commitments@example.com";

  beforeAll(async () => {
    // 1. Clean up test users
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, revEmail, outEmail],
        },
      },
    });

    // 2. Register Organizer
    const orgReg = await registerOrGetUser({
      email: orgEmail,
      name: "Organizer User",
      locale: "ar",
    });
    organizerUserId = orgReg.user.id;
    workspaceId = orgReg.workspaceId;
    await db.user.update({
      where: { id: organizerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Register Reviewer
    const revReg = await registerOrGetUser({
      email: revEmail,
      name: "Reviewer User",
      locale: "ar",
    });
    reviewerUserId = revReg.user.id;
    await db.user.update({
      where: { id: reviewerUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 4. Register Outsider
    const outReg = await registerOrGetUser({
      email: outEmail,
      name: "Outsider User",
      locale: "ar",
    });
    outsiderUserId = outReg.user.id;
    await db.user.update({
      where: { id: outsiderUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 5. Create agreement with initial terms
    const agreement = await createAgreement(organizerUserId, {
      workspaceId,
      title: "Sprint 6 Commitments & Attachments Agreement",
      initialTerms: [
        {
          id: "term_delivery",
          title: "Milestone 1 Delivery",
          body: "Deliver alpha product build by Dec 1",
          amount: "10000",
          currency: "SAR",
          dueDate: "2026-12-01",
          assignedParticipantId: null,
        },
        {
          id: "term_qa",
          title: "QA Acceptance Testing",
          body: "Pass all regression test suites",
          amount: null,
          currency: null,
          dueDate: "2026-12-10",
          assignedParticipantId: null,
        },
      ],
    });
    agreementId = agreement.id;

    // 6. Invite Reviewer
    const invite = await inviteParticipant(organizerUserId, {
      agreementId,
      email: revEmail,
      partyDisplayName: "Reviewer Party",
      agreementRole: "REVIEWER",
      partyKind: "PERSON",
    });
    reviewerParticipantId = invite.participantId;
    await redeemInvitation(reviewerUserId, invite.rawToken);

    // 7. Submit draft for review -> V1
    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });
    const pendingV1 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draft.revision,
    });
    v1Id = pendingV1.id;
    const v1Hash = pendingV1.contentHash;

    // 8. Both parties approve V1 -> V1 becomes APPROVED
    await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v1Id,
      expectedVersionHash: v1Hash,
      decision: "APPROVE",
    });
    await recordReviewDecision(reviewerUserId, {
      agreementId,
      versionId: v1Id,
      expectedVersionHash: v1Hash,
      decision: "APPROVE",
    });

    const v1Detail = await getVersionDetail(organizerUserId, agreementId, v1Id);
    expect(v1Detail.state).toBe("APPROVED");
  });

  afterAll(async () => {
    // Cleanup users
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, revEmail, outEmail],
        },
      },
    });
  });

  // ==========================================
  // SECTION 1: COMMITMENTS LIFECYCLE
  // ==========================================

  it("1. creates an action commitment linked to an approved term and assigned to a party", async () => {
    const commitment = await createCommitment(organizerUserId, {
      agreementId,
      sourceVersionId: v1Id,
      sourceTermId: "term_delivery",
      title: "Deliver compiled binaries and documentation",
      details: "Upload binary tarball and link docs",
      assigneeParticipantId: reviewerParticipantId,
      dueAt: "2026-12-01T12:00:00Z",
    });

    expect(commitment.id).toBeDefined();
    expect(commitment.title).toBe("Deliver compiled binaries and documentation");
    expect(commitment.status).toBe("TODO");
    expect(commitment.needsReview).toBe(false);
    expect(commitment.assigneeName).toBe("Reviewer Party");
    expect(commitment.sourceTermId).toBe("term_delivery");

    commitmentId = commitment.id;

    // Check list
    const list = await listCommitments(reviewerUserId, agreementId);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(commitmentId);
  });

  it("2. updates commitment status with optimistic concurrency control", async () => {
    // Reviewer transitions status to IN_PROGRESS
    const updated = await updateCommitmentStatus(reviewerUserId, {
      agreementId,
      commitmentId,
      status: "IN_PROGRESS",
      expectedRevision: 1,
    });

    expect(updated.status).toBe("IN_PROGRESS");

    // Stale revision must be rejected with ConflictError
    await expect(
      updateCommitmentStatus(reviewerUserId, {
        agreementId,
        commitmentId,
        status: "DONE",
        expectedRevision: 1, // stale!
      })
    ).rejects.toThrow(ConflictError);

    // Current revision is 2 -> update to DONE succeeds
    const completed = await updateCommitmentStatus(reviewerUserId, {
      agreementId,
      commitmentId,
      status: "DONE",
      expectedRevision: 2,
    });

    expect(completed.status).toBe("DONE");
  });

  it("3. denies unauthorized users from viewing or managing commitments", async () => {
    // Outsider cannot list commitments
    await expect(listCommitments(outsiderUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Outsider cannot create commitment
    await expect(
      createCommitment(outsiderUserId, {
        agreementId,
        title: "Unauthorized commitment",
      })
    ).rejects.toThrow(ForbiddenError);

    // Outsider cannot update commitment status
    await expect(
      updateCommitmentStatus(outsiderUserId, {
        agreementId,
        commitmentId,
        status: "TODO",
        expectedRevision: 3,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("4. critical invariant: agreement amendment flags linked commitments with needsReview = true", async () => {
    // Organizer modifies the term "term_delivery" in the mutable draft
    const draftBefore = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    await updateDraft(organizerUserId, {
      agreementId,
      expectedRevision: draftBefore.revision,
      content: {
        schemaVersion: 1,
        title: "Sprint 6 Commitments & Attachments Agreement",
        description: null,
        terms: [
          {
            id: "term_delivery",
            title: "Milestone 1 Delivery (Amended Scope)",
            body: "Deliver beta product build by Dec 15 with full QA",
            amount: "15000",
            currency: "SAR",
            dueDate: "2026-12-15",
            assignedParticipantId: null,
          },
          {
            id: "term_qa",
            title: "QA Acceptance Testing",
            body: "Pass all regression test suites",
            amount: null,
            currency: null,
            dueDate: "2026-12-10",
            assignedParticipantId: null,
          },
        ],
      },
    });

    const draftAfter = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    // Submit draft -> V2
    const pendingV2 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draftAfter.revision,
    });
    const v2Id = pendingV2.id;

    // Both parties approve V2
    await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v2Id,
      expectedVersionHash: pendingV2.contentHash,
      decision: "APPROVE",
    });
    await recordReviewDecision(reviewerUserId, {
      agreementId,
      versionId: v2Id,
      expectedVersionHash: pendingV2.contentHash,
      decision: "APPROVE",
    });

    // V2 is now approved!
    const v2Detail = await getVersionDetail(organizerUserId, agreementId, v2Id);
    expect(v2Detail.state).toBe("APPROVED");

    // Invariant verification: Commitment linked to "term_delivery" MUST have needsReview = true!
    const commitments = await listCommitments(organizerUserId, agreementId);
    const flaggedCommitment = commitments.find((c) => c.id === commitmentId);
    expect(flaggedCommitment).toBeDefined();
    expect(flaggedCommitment!.needsReview).toBe(true);

    // Verify activity event was emitted
    const flaggedEvent = await db.activityEvent.findFirst({
      where: {
        agreementId,
        action: "COMMITMENT_FLAGGED_FOR_REVIEW",
      },
    });
    expect(flaggedEvent).not.toBeNull();
  });

  // ==========================================
  // SECTION 2: PRIVATE SERVER FILE STORAGE
  // ==========================================

  it("5. saves a valid PDF attachment to persistent server filesystem with magic bytes verification", async () => {
    const validPdfBuffer = Buffer.from(
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    );

    const attachment = await saveAttachment(
      organizerUserId,
      agreementId,
      validPdfBuffer,
      "architectural_blueprint.pdf"
    );

    expect(attachment.id).toBeDefined();
    expect(attachment.originalFilename).toBe("architectural_blueprint.pdf");
    expect(attachment.mimeDetected).toBe("application/pdf");

    const record = await db.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
    });
    attachmentId = attachment.id;
    attachmentStorageKey = record.storageKey;
    expect(attachmentStorageKey).toHaveLength(64);

    // Invariant: Verify file exists on local private filesystem
    const diskPath = resolveSafeStoragePath(attachmentStorageKey);
    expect(fs.existsSync(diskPath)).toBe(true);
    const diskBytes = fs.readFileSync(diskPath);
    expect(diskBytes.equals(validPdfBuffer)).toBe(true);

    // Verify list attachments
    const list = await listAttachments(reviewerUserId, agreementId);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(attachmentId);
  });

  it("6. rejects files with invalid magic bytes or unsupported types", async () => {
    const fakePdf = Buffer.from("NOT A REAL PDF FILE AT ALL");

    await expect(
      saveAttachment(
        organizerUserId,
        agreementId,
        fakePdf,
        "fake.pdf"
      )
    ).rejects.toThrow("Unsupported file format");
  });

  it("7. authorizes download for agreement participants and denies outsiders", async () => {
    // Reviewer can download
    const download = await getAttachmentForDownload(reviewerUserId, attachmentId);
    expect(download.attachment.originalFilename).toBe("architectural_blueprint.pdf");
    expect(download.attachment.mimeDetected).toBe("application/pdf");
    expect(fs.existsSync(download.filePath)).toBe(true);

    // Outsider is denied
    await expect(
      getAttachmentForDownload(outsiderUserId, attachmentId)
    ).rejects.toThrow(NotFoundError);
  });

  it("8. deletes attachment and removes binary from server filesystem", async () => {
    const diskPath = resolveSafeStoragePath(attachmentStorageKey);
    expect(fs.existsSync(diskPath)).toBe(true);

    await deleteAttachment(organizerUserId, agreementId, attachmentId);

    // Verify row is no longer returned in active list
    const list = await listAttachments(organizerUserId, agreementId);
    expect(list.length).toBe(0);

    // Verify physical file was removed from server disk
    expect(fs.existsSync(diskPath)).toBe(false);

    // Verify FILE_DELETED activity event recorded
    const deleteEvent = await db.activityEvent.findFirst({
      where: {
        agreementId,
        action: "FILE_DELETED",
      },
    });
    expect(deleteEvent).not.toBeNull();
  });
});
