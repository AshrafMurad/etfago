import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../src/server/db/prisma";
import { registerOrGetUser } from "../../src/server/auth/service";
import { createAgreement, getAgreementDetail } from "../../src/server/agreements/service";
import { inviteParticipant, redeemInvitation } from "../../src/server/invitations/service";
import {
  submitDraftForReview,
  recordReviewDecision,
  getVersionDetail,
} from "../../src/server/agreements/versions";
import {
  createChangeRequest,
  resolveChangeRequest,
  cancelChangeRequest,
  listChangeRequests,
} from "../../src/server/agreements/proposals";
import {
  createComment,
  updateComment,
  deleteComment,
  listComments,
} from "../../src/server/agreements/comments";
import { diffTerms } from "../../src/lib/diff";
import { ForbiddenError, NotFoundError, ConflictError } from "../../src/lib/errors";

describe("Sprint 5 Integration: Change Proposals, Discussions & Version Diffing", () => {
  let organizerUserId: string;
  let reviewerUserId: string;
  let outsiderUserId: string;
  let workspaceId: string;
  let agreementId: string;
  let reviewerParticipantId: string;
  let v1Id: string;
  let v1Hash: string;

  const orgEmail = "organizer.proposals@example.com";
  const revEmail = "reviewer.proposals@example.com";
  const outEmail = "outsider.proposals@example.com";

  beforeAll(async () => {
    // Clean up test data
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, revEmail, outEmail],
        },
      },
    });

    // 1. Register Organizer
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

    // 2. Register Reviewer
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

    // 3. Register Outsider
    const outReg = await registerOrGetUser({
      email: outEmail,
      name: "Outsider User",
      locale: "en",
    });
    outsiderUserId = outReg.user.id;
    await db.user.update({
      where: { id: outsiderUserId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({
      where: {
        emailNormalized: {
          in: [orgEmail, revEmail, outEmail],
        },
      },
    });
  });

  it("1. bootstraps agreement with Reviewer, submits V1 and unanimously approves it", async () => {
    // Create agreement with initial terms
    const agreement = await createAgreement(organizerUserId, {
      workspaceId,
      title: "Software Delivery Agreement",
      initialTerms: [
        {
          id: "term_delivery",
          title: "Milestone 1 Delivery",
          body: "Deliver alpha version by Dec 1",
          amount: "10000",
          currency: "SAR",
          dueDate: "2026-12-01",
        },
        {
          id: "term_payment",
          title: "Payment Milestones",
          body: "Full payment upon delivery acceptance",
          amount: "10000",
          currency: "SAR",
        },
      ],
    });
    agreementId = agreement.id;

    // Invite Reviewer
    const invite = await inviteParticipant(organizerUserId, {
      agreementId,
      email: revEmail,
      partyDisplayName: "Client Partner",
      requiredByDefault: true,
    });
    reviewerParticipantId = invite.participantId;

    // Redeem invitation as Reviewer
    await redeemInvitation(reviewerUserId, invite.rawToken);

    // Submit V1 for review
    const v1 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: 1,
    });
    v1Id = v1.id;
    v1Hash = v1.contentHash;

    // Both record approval on V1
    await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v1Id,
      decision: "APPROVE",
      expectedVersionHash: v1Hash,
    });

    const finalDecision = await recordReviewDecision(reviewerUserId, {
      agreementId,
      versionId: v1Id,
      decision: "APPROVE",
      expectedVersionHash: v1Hash,
    });

    expect(finalDecision.status).toBe("APPROVED");
    expect(finalDecision.isUnanimouslyApproved).toBe(true);

    // Verify Agreement state is now AGREED with currentApprovedVersionId = v1Id
    const detail = await getAgreementDetail(organizerUserId, agreementId);
    expect(detail.lifecycleStatus).toBe("AGREED");
    expect(detail.currentApprovedVersionId).toBe(v1Id);
    expect(detail.pendingReviewVersionId).toBeNull();
  });

  it("2. Reviewer proposes a term change; V1 remains immutable and unaffected", async () => {
    const proposal = await createChangeRequest(reviewerUserId, {
      agreementId,
      baseVersionId: v1Id,
      termId: "term_delivery",
      operation: "UPDATE",
      oldTermJson: {
        id: "term_delivery",
        title: "Milestone 1 Delivery",
        body: "Deliver alpha version by Dec 1",
        amount: "10000",
        currency: "SAR",
        dueDate: "2026-12-01",
      },
      newTermJson: {
        id: "term_delivery",
        title: "Milestone 1 Delivery (Extended)",
        body: "Deliver beta version with UI testing by Dec 15",
        amount: "12000",
        currency: "SAR",
        dueDate: "2026-12-15",
      },
      reason: "Additional testing time required for quality",
    });

    expect(proposal.status).toBe("OPEN");
    expect(proposal.operation).toBe("UPDATE");
    expect(proposal.newTerm?.title).toBe("Milestone 1 Delivery (Extended)");

    // Invariant: V1 snapshot remains unchanged!
    const v1Detail = await getVersionDetail(organizerUserId, agreementId, v1Id);
    expect(v1Detail.snapshot.terms[0].title).toBe("Milestone 1 Delivery");
    expect(v1Detail.snapshot.terms[0].amount).toBe("10000");

    // Invariant: Current approved version is still V1
    const agreementDetail = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreementDetail.currentApprovedVersionId).toBe(v1Id);
  });

  it("3. enforces authorization: outsider denied, reviewer cannot accept proposals", async () => {
    // Outsider cannot list proposals
    await expect(listChangeRequests(outsiderUserId, agreementId)).rejects.toThrow(
      NotFoundError
    );

    // Outsider cannot create proposal
    await expect(
      createChangeRequest(outsiderUserId, {
        agreementId,
        termId: "term_delivery",
        operation: "UPDATE",
        newTermJson: { id: "term_delivery", title: "Hacked" },
      })
    ).rejects.toThrow(ForbiddenError);

    // Get open proposals
    const proposals = await listChangeRequests(organizerUserId, agreementId);
    expect(proposals.length).toBe(1);
    const openCrId = proposals[0].id;

    // Reviewer cannot resolve (accept or decline) proposals
    await expect(
      resolveChangeRequest(reviewerUserId, {
        agreementId,
        changeRequestId: openCrId,
        action: "ACCEPT",
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("4. Organizer accepts proposal into draft; draft revision increments and term updates", async () => {
    const proposals = await listChangeRequests(organizerUserId, agreementId);
    const openCr = proposals[0];

    const resolved = await resolveChangeRequest(organizerUserId, {
      agreementId,
      changeRequestId: openCr.id,
      action: "ACCEPT",
    });

    expect(resolved.status).toBe("ACCEPTED_IN_DRAFT");
    expect(resolved.resolvedByUserId).toBe(organizerUserId);

    // Check that draft terms now reflect the proposal
    const detail = await getAgreementDetail(organizerUserId, agreementId);
    expect(detail.draft?.revision).toBe(2);
    const modifiedTerm = detail.draft?.content.terms.find(
      (t) => t.id === "term_delivery"
    );
    expect(modifiedTerm?.title).toBe("Milestone 1 Delivery (Extended)");
    expect(modifiedTerm?.amount).toBe("12000");
    expect(modifiedTerm?.dueDate).toBe("2026-12-15");

    // Still, current approved version V1 is untouched
    expect(detail.currentApprovedVersionId).toBe(v1Id);
  });

  it("5. computes version diff between approved V1 and updated draft", async () => {
    const v1 = await getVersionDetail(organizerUserId, agreementId, v1Id);
    const detail = await getAgreementDetail(organizerUserId, agreementId);

    const diff = diffTerms(v1.snapshot.terms, detail.draft!.content.terms);
    expect(diff.hasDifferences).toBe(true);
    expect(diff.modifiedCount).toBe(1);
    expect(diff.unchangedCount).toBe(1);

    const changedTerm = diff.terms.find((t) => t.termId === "term_delivery");
    expect(changedTerm?.status).toBe("MODIFIED");
    expect(changedTerm?.fieldChanges.length).toBe(4); // title, body, amount, dueDate
  });

  it("6. supports discussions/comments on agreement, version, and terms", async () => {
    // Reviewer posts a comment
    const comment1 = await createComment(reviewerUserId, {
      agreementId,
      versionId: v1Id,
      termId: "term_delivery",
      body: "Thanks for incorporating the milestone extension into the draft!",
    });

    expect(comment1.authorUserId).toBe(reviewerUserId);
    expect(comment1.termId).toBe("term_delivery");

    // Organizer replies
    const comment2 = await createComment(organizerUserId, {
      agreementId,
      versionId: v1Id,
      body: "Submitting Version 2 for review now.",
    });

    // List comments
    const allComments = await listComments(organizerUserId, agreementId);
    expect(allComments.length).toBe(2);

    // Reviewer edits their comment
    const edited = await updateComment(reviewerUserId, {
      agreementId,
      commentId: comment1.id,
      body: "Thanks for incorporating the milestone extension! Let's submit V2.",
    });
    expect(edited.body).toContain("Let's submit V2");
    expect(edited.editedAt).not.toBeNull();

    // Organizer soft-deletes a comment
    await deleteComment(organizerUserId, {
      agreementId,
      commentId: comment2.id,
    });

    const activeCommentsAfterDelete = await listComments(
      organizerUserId,
      agreementId
    );
    expect(activeCommentsAfterDelete.length).toBe(1);
  });

  it("7. submits V2 from draft, both approve, promoting V2 and superseding V1", async () => {
    // Submit V2
    const v2 = await submitDraftForReview(organizerUserId, {
      agreementId,
      expectedDraftRevision: 2,
    });
    expect(v2.versionNumber).toBe(2);

    // Both approve V2
    await recordReviewDecision(organizerUserId, {
      agreementId,
      versionId: v2.id,
      decision: "APPROVE",
      expectedVersionHash: v2.contentHash,
    });

    const v2Outcome = await recordReviewDecision(reviewerUserId, {
      agreementId,
      versionId: v2.id,
      decision: "APPROVE",
      expectedVersionHash: v2.contentHash,
    });

    expect(v2Outcome.status).toBe("APPROVED");
    expect(v2Outcome.isUnanimouslyApproved).toBe(true);

    // Verify Agreement state: V2 is now currentApprovedVersionId, V1 is SUPERSEDED
    const agreementDetail = await getAgreementDetail(organizerUserId, agreementId);
    expect(agreementDetail.currentApprovedVersionId).toBe(v2.id);

    const oldV1 = await getVersionDetail(organizerUserId, agreementId, v1Id);
    expect(oldV1.state).toBe("SUPERSEDED");
  });

  it("8. tests declining a proposal with explanation", async () => {
    const addProposal = await createChangeRequest(reviewerUserId, {
      agreementId,
      termId: "term_unreasonable",
      operation: "ADD",
      newTermJson: {
        id: "term_unreasonable",
        title: "Immediate 100% Advance Payment",
        body: "All amounts payable on day 1",
      },
      reason: "Want upfront payment",
    });

    const declined = await resolveChangeRequest(organizerUserId, {
      agreementId,
      changeRequestId: addProposal.id,
      action: "DECLINE",
      declineReason: "Payment terms must follow deliverables schedule",
    });

    expect(declined.status).toBe("DECLINED");
    expect(declined.reason).toBe(
      "Payment terms must follow deliverables schedule"
    );

    // Check list filter
    const openOnly = await listChangeRequests(
      organizerUserId,
      agreementId,
      "OPEN"
    );
    expect(openOnly.some((p) => p.id === addProposal.id)).toBe(false);
  });

  it("9. tests cancelling an open proposal by its author", async () => {
    const removeProposal = await createChangeRequest(reviewerUserId, {
      agreementId,
      termId: "term_payment",
      operation: "REMOVE",
      oldTermJson: {
        id: "term_payment",
        title: "Payment Milestones",
      },
      reason: "Accidental proposal",
    });

    const cancelled = await cancelChangeRequest(reviewerUserId, {
      agreementId,
      changeRequestId: removeProposal.id,
    });

    expect(cancelled.status).toBe("CANCELLED");

    // Cannot cancel already cancelled proposal
    await expect(
      cancelChangeRequest(reviewerUserId, {
        agreementId,
        changeRequestId: removeProposal.id,
      })
    ).rejects.toThrow(ConflictError);
  });
});
