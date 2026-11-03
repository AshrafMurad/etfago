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
  listAgreementVersions,
} from "../../src/server/agreements/versions";
import {
  createChangeRequest,
  resolveChangeRequest,
  listChangeRequests,
} from "../../src/server/agreements/proposals";
import {
  createCommitment,
  updateCommitmentStatus,
  listCommitments,
} from "../../src/server/commitments/service";
import {
  saveAttachment,
  getAttachmentForDownload,
  listAttachments,
} from "../../src/server/storage/service";
import { runBackupRehearsal } from "../../scripts/backup-rehearsal";
import { ForbiddenError, NotFoundError } from "../../src/lib/errors";
import fs from "fs";

describe("Sprint 7 End-to-End Release Smoke Acceptance Scenario (D1-D5)", () => {
  let aliceUserId: string;
  let bobUserId: string;
  let charlieUserId: string;
  let aliceWorkspaceId: string;
  let agreementId: string;
  let bobParticipantId: string;

  let v1Id: string;
  let v1Hash: string;
  let v2Id: string;
  let v2Hash: string;
  let v3Id: string;
  let v3Hash: string;

  let commitmentId: string;
  let attachmentId: string;

  const aliceEmail = "alice.founder@example.com";
  const bobEmail = "bob.consultant@example.com";
  const charlieEmail = "charlie.outsider@example.com";

  beforeAll(async () => {
    // 1. Clean up test users
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [aliceEmail, bobEmail, charlieEmail],
        },
      },
    });

    // 2. Register Alice (Organizer)
    const aliceReg = await registerOrGetUser({
      email: aliceEmail,
      name: "Alice Founder",
      locale: "ar",
    });
    aliceUserId = aliceReg.user.id;
    aliceWorkspaceId = aliceReg.workspaceId;
    await db.user.update({
      where: { id: aliceUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Register Bob (Collaborator / Reviewer)
    const bobReg = await registerOrGetUser({
      email: bobEmail,
      name: "Bob Consultant",
      locale: "en",
    });
    bobUserId = bobReg.user.id;
    await db.user.update({
      where: { id: bobUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // 4. Register Charlie (Outsider)
    const charlieReg = await registerOrGetUser({
      email: charlieEmail,
      name: "Charlie Outsider",
      locale: "ar",
    });
    charlieUserId = charlieReg.user.id;
    await db.user.update({
      where: { id: charlieUserId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [aliceEmail, bobEmail, charlieEmail],
        },
      },
    });
  });

  it("Step 1: Alice creates service agreement in personal workspace with 3 terms and no mandatory amounts", async () => {
    const agreement = await createAgreement(aliceUserId, {
      workspaceId: aliceWorkspaceId,
      title: "Strategic Advisory and Design Agreement",
      category: "Advisory",
      initialTerms: [
        {
          id: "term_discovery",
          title: "Phase 1: Discovery & Architecture",
          body: "Conduct architectural interviews and produce systems specification document",
          amount: null,
          currency: null,
          dueDate: "2026-11-30",
          assignedParticipantId: null,
        },
        {
          id: "term_implementation",
          title: "Phase 2: Core Implementation",
          body: "Deliver fully tested software components per Phase 1 specs",
          amount: "25000",
          currency: "SAR",
          dueDate: "2026-12-31",
          assignedParticipantId: null,
        },
        {
          id: "term_warranty",
          title: "Phase 3: Warranty & Support",
          body: "Provide 60 days bugfix warranty post launch",
          amount: null,
          currency: null,
          dueDate: null,
          assignedParticipantId: null,
        },
      ],
    });

    expect(agreement.id).toBeDefined();
    expect(agreement.lifecycleStatus).toBe("DRAFT");
    expect(agreement.termsCount).toBe(3);
    agreementId = agreement.id;
  });

  it("Step 2: Alice invites Bob; Bob verifies and joins agreement", async () => {
    const invite = await inviteParticipant(aliceUserId, {
      agreementId,
      email: bobEmail,
      partyDisplayName: "Bob & Partners Advisory",
      agreementRole: "REVIEWER",
      partyKind: "ORGANIZATION",
      requiredByDefault: true,
    });

    bobParticipantId = invite.participantId;
    expect(invite.participantId).toBeDefined();

    // Bob redeems invitation
    await redeemInvitation(bobUserId, invite.rawToken);

    // Verify Bob is now an active participant
    const detail = await getAgreementDetail(bobUserId, agreementId);
    expect(detail.participants.length).toBe(2);
    const bobPart = detail.participants.find((p) => p.userId === bobUserId);
    expect(bobPart).toBeDefined();
    expect(bobPart?.agreementRole).toBe("REVIEWER");
  });

  it("Step 3: Alice submits V1; Alice and Bob approve; V1 promoted to AGREED", async () => {
    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    const pendingV1 = await submitDraftForReview(aliceUserId, {
      agreementId,
      expectedDraftRevision: draft.revision,
    });
    v1Id = pendingV1.id;
    v1Hash = pendingV1.contentHash;

    // Both approve
    await recordReviewDecision(aliceUserId, {
      agreementId,
      versionId: v1Id,
      expectedVersionHash: v1Hash,
      decision: "APPROVE",
    });

    await recordReviewDecision(bobUserId, {
      agreementId,
      versionId: v1Id,
      expectedVersionHash: v1Hash,
      decision: "APPROVE",
    });

    // Verification: Agreement is now unanimously AGREED
    const detail = await getAgreementDetail(aliceUserId, agreementId);
    expect(detail.lifecycleStatus).toBe("AGREED");
    expect(detail.currentApprovedVersionId).toBe(v1Id);
    expect(detail.pendingReviewVersionId).toBeNull();
  });

  it("Step 4: Bob proposes extending Phase 2 due date; Alice accepts proposal into draft", async () => {
    const proposal = await createChangeRequest(bobUserId, {
      agreementId,
      baseVersionId: v1Id,
      termId: "term_implementation",
      operation: "UPDATE",
      newTermJson: {
        id: "term_implementation",
        title: "Phase 2: Core Implementation (Extended Timeline)",
        body: "Deliver components with comprehensive end-to-end tests",
        amount: "25000",
        currency: "SAR",
        dueDate: "2027-01-15",
        assignedParticipantId: null,
      },
      reason: "Need additional two weeks to ensure test coverage",
    });

    expect(proposal.status).toBe("OPEN");

    // Alice accepts proposal into draft
    await resolveChangeRequest(aliceUserId, {
      agreementId,
      changeRequestId: proposal.id,
      action: "ACCEPT",
    });

    const proposals = await listChangeRequests(aliceUserId, agreementId);
    const resolved = proposals.find((p) => p.id === proposal.id);
    expect(resolved?.status).toBe("ACCEPTED_IN_DRAFT");

    // Invariant: Current approved version is STILL V1!
    const detail = await getAgreementDetail(aliceUserId, agreementId);
    expect(detail.currentApprovedVersionId).toBe(v1Id);
  });

  it("Step 5: Alice submits V2; Bob requests changes; V2 is REJECTED; V1 remains effective", async () => {
    const draft = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    const pendingV2 = await submitDraftForReview(aliceUserId, {
      agreementId,
      expectedDraftRevision: draft.revision,
    });
    v2Id = pendingV2.id;
    v2Hash = pendingV2.contentHash;

    // Bob requests changes on V2
    await recordReviewDecision(bobUserId, {
      agreementId,
      versionId: v2Id,
      expectedVersionHash: v2Hash,
      decision: "REQUEST_CHANGES",
      reason: "Please also update milestone payment terms accordingly.",
    });

    const v2Detail = await getVersionDetail(aliceUserId, agreementId, v2Id);
    expect(v2Detail.state).toBe("REJECTED");

    // Invariant: V1 remains current approved version!
    const detail = await getAgreementDetail(aliceUserId, agreementId);
    expect(detail.currentApprovedVersionId).toBe(v1Id);
    expect(detail.pendingReviewVersionId).toBeNull();
  });

  it("Step 6: Alice updates draft with requested changes and submits V3; both approve -> V3 is APPROVED", async () => {
    const draftBefore = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    await updateDraft(aliceUserId, {
      agreementId,
      expectedRevision: draftBefore.revision,
      content: {
        schemaVersion: 1,
        title: "Strategic Advisory and Design Agreement",
        description: "Updated terms with phased payments",
        terms: [
          {
            id: "term_discovery",
            title: "Phase 1: Discovery & Architecture",
            body: "Conduct architectural interviews and produce systems specification document",
            amount: "10000",
            currency: "SAR",
            dueDate: "2026-11-30",
            assignedParticipantId: null,
          },
          {
            id: "term_implementation",
            title: "Phase 2: Core Implementation (Extended Timeline)",
            body: "Deliver components with comprehensive end-to-end tests",
            amount: "15000",
            currency: "SAR",
            dueDate: "2027-01-15",
            assignedParticipantId: null,
          },
          {
            id: "term_warranty",
            title: "Phase 3: Warranty & Support",
            body: "Provide 60 days bugfix warranty post launch",
            amount: null,
            currency: null,
            dueDate: null,
            assignedParticipantId: null,
          },
        ],
      },
    });

    const draftAfter = await db.agreementDraft.findUniqueOrThrow({
      where: { agreementId },
    });

    const pendingV3 = await submitDraftForReview(aliceUserId, {
      agreementId,
      expectedDraftRevision: draftAfter.revision,
    });
    v3Id = pendingV3.id;
    v3Hash = pendingV3.contentHash;

    // Both approve V3
    await recordReviewDecision(aliceUserId, {
      agreementId,
      versionId: v3Id,
      expectedVersionHash: v3Hash,
      decision: "APPROVE",
    });

    await recordReviewDecision(bobUserId, {
      agreementId,
      versionId: v3Id,
      expectedVersionHash: v3Hash,
      decision: "APPROVE",
    });

    // Invariant: V3 is now APPROVED; V1 is SUPERSEDED; V2 remains REJECTED
    const v3Detail = await getVersionDetail(aliceUserId, agreementId, v3Id);
    expect(v3Detail.state).toBe("APPROVED");

    const v1Detail = await getVersionDetail(aliceUserId, agreementId, v1Id);
    expect(v1Detail.state).toBe("SUPERSEDED");

    const v2Detail = await getVersionDetail(aliceUserId, agreementId, v2Id);
    expect(v2Detail.state).toBe("REJECTED");

    const agreementDetail = await getAgreementDetail(aliceUserId, agreementId);
    expect(agreementDetail.currentApprovedVersionId).toBe(v3Id);
  });

  it("Step 7: Alice adds operational commitment; Bob tracks and completes task", async () => {
    const commitment = await createCommitment(aliceUserId, {
      agreementId,
      sourceVersionId: v3Id,
      sourceTermId: "term_discovery",
      title: "Deliver Systems Architecture Document",
      details: "Produce complete PDF with network topology and API diagrams",
      assigneeParticipantId: bobParticipantId,
      dueAt: "2026-11-28T18:00:00Z",
    });

    commitmentId = commitment.id;
    expect(commitment.status).toBe("TODO");
    expect(commitment.assigneeName).toBe("Bob & Partners Advisory");

    // Bob marks IN_PROGRESS
    const inProgress = await updateCommitmentStatus(bobUserId, {
      agreementId,
      commitmentId,
      status: "IN_PROGRESS",
      expectedRevision: 1,
    });
    expect(inProgress.status).toBe("IN_PROGRESS");

    // Bob marks DONE
    const completed = await updateCommitmentStatus(bobUserId, {
      agreementId,
      commitmentId,
      status: "DONE",
      expectedRevision: 2,
    });
    expect(completed.status).toBe("DONE");
  });

  it("Step 8: Alice uploads private PDF file; Bob downloads and verifies SHA-256 integrity", async () => {
    const samplePdfBytes = Buffer.from(
      "%PDF-1.7\n% Architecture blueprint document for Etfago\n%%EOF"
    );

    const attachment = await saveAttachment(
      aliceUserId,
      agreementId,
      samplePdfBytes,
      "systems_architecture.pdf",
      v3Id
    );

    attachmentId = attachment.id;
    expect(attachment.mimeDetected).toBe("application/pdf");
    expect(attachment.sizeBytes).toBe(samplePdfBytes.length);

    // Bob downloads file
    const download = await getAttachmentForDownload(bobUserId, attachmentId);
    expect(download.attachment.originalFilename).toBe("systems_architecture.pdf");
    expect(download.attachment.mimeDetected).toBe("application/pdf");
    const downloadedBytes = fs.readFileSync(download.filePath);
    expect(downloadedBytes.equals(samplePdfBytes)).toBe(true);
  });

  it("Step 9: Outsider Charlie is strictly denied access across all resources", async () => {
    // Charlie cannot view agreement
    await expect(getAgreementDetail(charlieUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Charlie cannot list versions
    await expect(listAgreementVersions(charlieUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Charlie cannot list change proposals
    await expect(listChangeRequests(charlieUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Charlie cannot list commitments
    await expect(listCommitments(charlieUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Charlie cannot list attachments
    await expect(listAttachments(charlieUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Charlie cannot download private attachment
    await expect(getAttachmentForDownload(charlieUserId, attachmentId)).rejects.toThrow(
      NotFoundError
    );
  });

  it("Step 10: Operational backup rehearsal verifies database and disk checksums", async () => {
    const rehearsal = await runBackupRehearsal();
    expect(rehearsal.success).toBe(true);
    expect(rehearsal.verifiedFilesCount).toBeGreaterThanOrEqual(1);
    expect(rehearsal.discrepancies.length).toBe(0);
  });
});
