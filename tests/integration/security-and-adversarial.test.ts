import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import {
  createAgreement,
  getAgreementDetail,
  updateDraft,
  archiveAgreement,
} from "../../src/server/agreements/service";
import {
  inviteParticipant,
  redeemInvitation,
  removeParticipant,
} from "../../src/server/invitations/service";
import {
  submitDraftForReview,
  recordReviewDecision,
  getVersionDetail,
} from "../../src/server/agreements/versions";
import {
  createChangeRequest,
  resolveChangeRequest,
} from "../../src/server/agreements/proposals";
import {
  createCommitment,
  updateCommitmentStatus,
} from "../../src/server/commitments/service";
import {
  saveAttachment,
  getAttachmentForDownload,
  deleteAttachment,
} from "../../src/server/storage/service";
import {
  resolveSafeStoragePath,
  sanitizeFilename,
} from "../../src/server/storage/filesystem";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../src/lib/errors";

describe("Sprint 7 Integration: Mandatory Security & Adversarial Scenarios", () => {
  let organizerUserId: string;
  let reviewer1UserId: string;
  let reviewer2UserId: string;
  let outsiderUserId: string;
  let workspaceId: string;
  let agreementId: string;

  let reviewer1ParticipantId: string;
  let reviewer2ParticipantId: string;

  let v1Id: string;
  let v1Hash: string;

  const orgEmail = "sec.organizer@example.com";
  const rev1Email = "sec.reviewer1@example.com";
  const rev2Email = "sec.reviewer2@example.com";
  const outEmail = "sec.outsider@example.com";

  beforeAll(async () => {
    // 1. Clean up test users
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, rev1Email, rev2Email, outEmail],
        },
      },
    });

    // 2. Register users
    const org = await registerOrGetUser({ email: orgEmail, name: "Organizer", locale: "ar" });
    organizerUserId = org.user.id;
    workspaceId = org.workspaceId;
    await db.user.update({ where: { id: organizerUserId }, data: { emailVerifiedAt: new Date() } });

    const r1 = await registerOrGetUser({ email: rev1Email, name: "Reviewer 1", locale: "ar" });
    reviewer1UserId = r1.user.id;
    await db.user.update({ where: { id: reviewer1UserId }, data: { emailVerifiedAt: new Date() } });

    const r2 = await registerOrGetUser({ email: rev2Email, name: "Reviewer 2", locale: "ar" });
    reviewer2UserId = r2.user.id;
    await db.user.update({ where: { id: reviewer2UserId }, data: { emailVerifiedAt: new Date() } });

    const out = await registerOrGetUser({ email: outEmail, name: "Outsider", locale: "en" });
    outsiderUserId = out.user.id;
    await db.user.update({ where: { id: outsiderUserId }, data: { emailVerifiedAt: new Date() } });

    // 3. Create agreement
    const agreement = await createAgreement(organizerUserId, {
      workspaceId,
      title: "Security Verification Agreement",
      initialTerms: [
        {
          id: "term_1",
          title: "Confidentiality Clause",
          body: "Strict confidentiality and non-disclosure obligations",
          amount: null,
          currency: null,
          dueDate: null,
          assignedParticipantId: null,
        },
      ],
    });
    agreementId = agreement.id;

    // 4. Invite Reviewer 1 and Reviewer 2
    const inv1 = await inviteParticipant(organizerUserId, {
      agreementId,
      email: rev1Email,
      partyDisplayName: "Reviewer One",
      agreementRole: "REVIEWER",
      requiredByDefault: true,
    });
    reviewer1ParticipantId = inv1.participantId;
    await redeemInvitation(reviewer1UserId, inv1.rawToken);

    const inv2 = await inviteParticipant(organizerUserId, {
      agreementId,
      email: rev2Email,
      partyDisplayName: "Reviewer Two",
      agreementRole: "REVIEWER",
      requiredByDefault: true,
    });
    reviewer2ParticipantId = inv2.participantId;
    await redeemInvitation(reviewer2UserId, inv2.rawToken);

    // 5. Submit V1 for review
    const draft = await db.agreementDraft.findUniqueOrThrow({ where: { agreementId } });
    const pendingV1 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draft.revision,
    });
    v1Id = pendingV1.id;
    v1Hash = pendingV1.contentHash;
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, rev1Email, rev2Email, outEmail],
        },
      },
    });
  });

  it("1. IDOR Defense: outsider probing foreign agreement resources is denied without existence leakage", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";

    // Probing real agreement as outsider throws NotFoundError
    await expect(getAgreementDetail(outsiderUserId, agreementId)).rejects.toThrow(NotFoundError);

    // Probing non-existent agreement throws NotFoundError identically
    await expect(getAgreementDetail(outsiderUserId, fakeId)).rejects.toThrow(NotFoundError);

    // Version probing
    await expect(getVersionDetail(outsiderUserId, agreementId, v1Id)).rejects.toThrow(NotFoundError);
  });

  it("2. Stale Hash Rejection: approval with stale or forged content hash is rejected", async () => {
    const forgedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    await expect(
      recordReviewDecision(reviewer1UserId, {
        agreementId,
        versionId: v1Id,
        expectedVersionHash: forgedHash,
        decision: "APPROVE",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("3. Version Race & Concurrency: concurrent approvals promote version safely and exactly once", async () => {
    // Organizer approves first
    await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v1Id,
      expectedVersionHash: v1Hash,
      decision: "APPROVE",
    });

    // Both Reviewer 1 and Reviewer 2 submit approval concurrently
    const [res1, res2] = await Promise.all([
      recordReviewDecision(reviewer1UserId, {
        agreementId,
        versionId: v1Id,
        expectedVersionHash: v1Hash,
        decision: "APPROVE",
      }),
      recordReviewDecision(reviewer2UserId, {
        agreementId,
        versionId: v1Id,
        expectedVersionHash: v1Hash,
        decision: "APPROVE",
      }),
    ]);

    // Both succeeded
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual(["APPROVED", "RECORDED"]);

    // Exactly one of them triggered the final promotion to agreed
    const promotionCount = [res1.isUnanimouslyApproved, res2.isUnanimouslyApproved].filter(Boolean).length;
    expect(promotionCount).toBe(1);

    // Agreement is now AGREED
    const agreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreement.lifecycleStatus).toBe("AGREED");
    expect(agreement.currentApprovedVersionId).toBe(v1Id);
    expect(agreement.pendingReviewVersionId).toBeNull();
  });

  it("4. Role Forgery Defense: reviewer cannot perform organizer actions", async () => {
    // Reviewer cannot submit draft for review
    await expect(
      submitDraftForReview(reviewer1UserId, {
        agreementId,
        expectedDraftRevision: 1,
      })
    ).rejects.toThrow(ForbiddenError);

    // Reviewer cannot archive agreement
    await expect(archiveAgreement(reviewer1UserId, agreementId, true)).rejects.toThrow(ForbiddenError);

    // Reviewer cannot accept change proposals
    await expect(
      resolveChangeRequest(reviewer1UserId, {
        agreementId,
        changeRequestId: "00000000-0000-4000-8000-000000000000",
        action: "ACCEPT",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("5. Reviewer Removal During Review: withdrawing pending review automatically and revoking file access", async () => {
    // Setup V2 for review
    const draftBefore = await db.agreementDraft.findUniqueOrThrow({ where: { agreementId } });
    await updateDraft(organizerUserId, {
      agreementId,
      expectedRevision: draftBefore.revision,
      content: {
        schemaVersion: 1,
        title: "Security Verification Agreement",
        description: null,
        terms: [
          {
            id: "term_1",
            title: "Confidentiality Clause (Updated)",
            body: "Strict confidentiality and non-disclosure obligations updated",
            amount: null,
            currency: null,
            dueDate: null,
            assignedParticipantId: null,
          },
        ],
      },
    });

    const draftAfter = await db.agreementDraft.findUniqueOrThrow({ where: { agreementId } });
    const pendingV2 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: draftAfter.revision,
    });

    // Verify V2 is IN_REVIEW
    let agreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreement.pendingReviewVersionId).toBe(pendingV2.id);

    // Organizer removes Reviewer 2 during pending review
    await removeParticipant(
      organizerUserId,
      agreementId,
      reviewer2ParticipantId
    );

    // Invariant: Pending review is automatically WITHDRAWN to prevent stale roster promotion!
    agreement = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreement.pendingReviewVersionId).toBeNull();

    const v2Detail = await getVersionDetail(organizerUserId, agreementId, pendingV2.id);
    expect(v2Detail.state).toBe("WITHDRAWN");

    // Invariant: Removed Reviewer 2 is now denied access to the agreement
    await expect(getAgreementDetail(reviewer2UserId, agreementId)).rejects.toThrow(NotFoundError);
  });

  it("6. Upload Exploit Defense: rejecting oversize, fake MIME, and path traversal", async () => {
    // 1. Oversize rejection (> 10 MiB)
    const elevenMbBuffer = Buffer.alloc(11 * 1024 * 1024, 0x25); // 11 MiB
    await expect(
      saveAttachment(organizerUserId, agreementId, elevenMbBuffer, "huge.pdf")
    ).rejects.toThrow(ConflictError);

    // 2. Fake MIME rejection (executable magic bytes MZ disguised as pdf)
    const fakePdfBytes = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00");
    await expect(
      saveAttachment(organizerUserId, agreementId, fakePdfBytes, "trojan.pdf")
    ).rejects.toThrow("Unsupported file format");

    // 3. Path traversal rejection in key resolution
    expect(() => resolveSafeStoragePath("../../etc/passwd")).toThrow(ForbiddenError);
    expect(() => resolveSafeStoragePath("..\\..\\Windows\\System32")).toThrow(ForbiddenError);

    // 4. Filename sanitization
    expect(sanitizeFilename("../../../etc/shadow")).toBe("shadow");
    expect(sanitizeFilename('exploit<script>:test*|?.pdf')).toBe(
      "exploit_script_test_.pdf"
    );
  });

  it("7. Archived Immutability: archived agreement forbids all draft edits, submissions, proposals, and uploads", async () => {
    // Archive agreement
    await archiveAgreement(organizerUserId, agreementId, true);

    const archived = await getAgreementDetail(organizerUserId, agreementId);
    expect(archived.lifecycleStatus).toBe("ARCHIVED");

    // Attempting draft update throws ConflictError
    await expect(
      updateDraft(organizerUserId, {
        agreementId,
        expectedRevision: 2,
        content: {
          schemaVersion: 1,
          title: "Hacked Title",
          terms: [],
        },
      })
    ).rejects.toThrow(ConflictError);

    // Attempting submit for review throws ConflictError
    await expect(
      submitDraftForReview(organizerUserId, {
        agreementId,
        expectedDraftRevision: 2,
      })
    ).rejects.toThrow(ConflictError);

    // Attempting change proposal throws ForbiddenError (archived)
    await expect(
      createChangeRequest(reviewer1UserId, {
        agreementId,
        termId: "term_1",
        operation: "UPDATE",
        newTermJson: { id: "term_1", title: "New" },
      })
    ).rejects.toThrow(ForbiddenError);

    // Attempting upload throws NotFoundError / ForbiddenError
    const validPdf = Buffer.from("%PDF-1.7\nSample");
    await expect(
      saveAttachment(organizerUserId, agreementId, validPdf, "test.pdf")
    ).rejects.toThrow("Agreement not found or is archived");

    // Attempting commitment creation throws ForbiddenError
    await expect(
      createCommitment(organizerUserId, {
        agreementId,
        title: "Archived Task",
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
