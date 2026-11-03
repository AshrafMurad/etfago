import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
  assertCanEditDraft,
} from "../auth/permissions";
import {
  computeVersionContentHash,
  VersionCanonicalComposite,
} from "../../lib/canonical-json";
import {
  DraftContent,
  DraftContentSchema,
} from "../../lib/schemas/agreements";
import { checkCommitmentsAfterAmendment } from "../commitments/service";
import {
  SubmitForReviewInput,
  SubmitForReviewSchema,
  RecordReviewDecisionInput,
  RecordReviewDecisionSchema,
  WithdrawReviewInput,
  WithdrawReviewSchema,
  ResetDraftFromVersionInput,
  ResetDraftFromVersionSchema,
} from "../../lib/schemas/versions";
import {
  VersionState,
  ReviewDecisionType,
  AgreementLifecycleStatus,
  ApprovalPolicy,
} from "@prisma/client";

export interface VersionReviewerSummary {
  id: string;
  versionId: string;
  participantId: string;
  userId: string;
  emailSnapshot: string;
  nameSnapshot: string;
  partyKindSnapshot: string;
  roleSnapshot: string;
  required: boolean;
  stepOrder: number;
  decision: {
    id: string;
    decision: ReviewDecisionType;
    reason: string | null;
    createdAt: Date;
  } | null;
}

export interface AgreementVersionDetail {
  id: string;
  agreementId: string;
  versionNumber: number;
  basedOnVersionId: string | null;
  snapshot: DraftContent;
  contentHash: string;
  state: VersionState;
  approvalPolicy: ApprovalPolicy;
  quorumThreshold: number | null;
  isSequential: boolean;
  submittedByUserId: string;
  submittedAt: Date;
  resolvedAt: Date | null;
  reviewers: VersionReviewerSummary[];
}

export interface ReviewDecisionResult {
  status: "APPROVED" | "REJECTED" | "RECORDED";
  decision: ReviewDecisionType;
  versionState: VersionState;
  isUnanimouslyApproved: boolean;
  approvedCount: number;
  requiredCount: number;
  isApproved: boolean;
}

/**
 * Freezes the current mutable draft into an immutable AgreementVersion,
 * computes deterministic RFC 8785 content hash over snapshot + reviewers roster,
 * sets the agreement's pendingReviewVersionId, and emits an activity event.
 *
 * Preconditions:
 * - Caller is organizer (or editor).
 * - Agreement is not ARCHIVED.
 * - No pending review is currently in progress.
 * - Expected draft revision matches current draft revision.
 * - Quorum: at least two joined, email-verified required participants exist (including organizer).
 */
export async function submitDraftForReview(
  actorUserId: string,
  input: SubmitForReviewInput
): Promise<AgreementVersionDetail> {
  const validated = SubmitForReviewSchema.parse(input);

  await assertCanEditDraft(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    // 1. Acquire row lock on Agreement to serialize concurrent submissions/updates
    const agreementRows = await tx.$queryRaw<
      Array<{
        id: string;
        organizerUserId: string;
        lifecycleStatus: AgreementLifecycleStatus;
        pendingReviewVersionId: string | null;
        currentApprovedVersionId: string | null;
        rowRevision: number;
      }>
    >`SELECT id, "organizerUserId", "lifecycleStatus", "pendingReviewVersionId", "currentApprovedVersionId", "rowRevision" FROM "Agreement" WHERE id = ${validated.agreementId} FOR UPDATE`;

    if (agreementRows.length === 0) {
      throw new NotFoundError("Agreement not found");
    }

    const agreement = agreementRows[0];

    if (agreement.lifecycleStatus === "ARCHIVED") {
      throw new ConflictError("Archived agreements cannot be submitted for review");
    }

    if (agreement.pendingReviewVersionId) {
      throw new ConflictError(
        "A version is already pending review. You must withdraw it before submitting a new version."
      );
    }

    // 2. Fetch the draft and verify optimistic concurrency revision
    const draft = await tx.agreementDraft.findUnique({
      where: { agreementId: validated.agreementId },
    });

    if (!draft) {
      throw new NotFoundError("Agreement draft not found");
    }

    if (draft.revision !== validated.expectedDraftRevision) {
      throw new ConflictError(
        `Optimistic concurrency conflict: Expected draft revision ${validated.expectedDraftRevision} but draft is at revision ${draft.revision}. Please refresh.`
      );
    }

    // Parse draft content
    const parsedDraftContent = DraftContentSchema.parse(draft.contentJson);

    // 3. Reviewer quorum validation (DEC-004 & docs/06-versioning-approval-engine.md)
    // "At least two distinct required joined verified users are necessary to submit, including organizer as a required reviewer."
    const participants = await tx.agreementParticipant.findMany({
      where: {
        agreementId: validated.agreementId,
        removedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            emailVerifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Check organizer eligibility
    const organizerParticipant = participants.find(
      (p) => p.userId === agreement.organizerUserId
    );

    if (!organizerParticipant || !organizerParticipant.user?.emailVerifiedAt) {
      throw new ConflictError(
        "The agreement organizer must have a verified email before submitting for review."
      );
    }

    // Ensure organizer is marked as required
    const requiredParticipants = participants.filter((p) => p.requiredByDefault);

    const verifiedRequiredUserIds = new Set<string>();
    for (const part of requiredParticipants) {
      if (part.userId && part.user?.emailVerifiedAt) {
        verifiedRequiredUserIds.add(part.userId);
      }
    }

    if (verifiedRequiredUserIds.size < 2) {
      throw new ConflictError(
        "An agreement requires at least two joined and email-verified required participants (including the organizer) before submitting for review."
      );
    }

    // 4. Allocate monotonic versionNumber
    const lastVersion = await tx.agreementVersion.findFirst({
      where: { agreementId: validated.agreementId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const basedOnVersionId =
      agreement.currentApprovedVersionId ?? draft.basedOnVersionId ?? null;

    const approvalPolicy: ApprovalPolicy = validated.approvalPolicy ?? "UNANIMOUS";
    const quorumThreshold = validated.quorumThreshold ?? null;
    const isSequential = validated.isSequential ?? false;

    if (approvalPolicy === "QUORUM_THRESHOLD") {
      const requiredCount = requiredParticipants.length;
      if (!quorumThreshold || quorumThreshold < 1 || quorumThreshold > requiredCount) {
        throw new ConflictError(
          `Quorum threshold must be between 1 and the total required reviewers count (${requiredCount}).`
        );
      }
    }

    // 5. Freeze reviewer roster for snapshot
    const reviewersRoster = participants
      .filter((p) => p.userId !== null)
      .map((p) => ({
        participantId: p.id,
        userId: p.userId!,
        emailSnapshot: p.emailNormalized,
        nameSnapshot: p.partyDisplayName,
        partyKindSnapshot: p.partyKind,
        roleSnapshot: p.agreementRole,
        required: p.requiredByDefault,
        stepOrder: p.stepOrder ?? 1,
      }));

    // 6. Compute deterministic canonical content hash (composite of content + frozen reviewers)
    const canonicalComposite: VersionCanonicalComposite = {
      schemaVersion: 1,
      approvalPolicy,
      quorumThreshold,
      isSequential,
      content: parsedDraftContent,
      reviewers: reviewersRoster,
    };
    const contentHash = computeVersionContentHash(canonicalComposite);

    // 7. Create immutable AgreementVersion
    const version = await tx.agreementVersion.create({
      data: {
        agreementId: validated.agreementId,
        versionNumber: nextVersionNumber,
        basedOnVersionId,
        snapshotJson: parsedDraftContent,
        contentHash,
        state: "IN_REVIEW",
        approvalPolicy,
        quorumThreshold,
        isSequential,
        submittedByUserId: actorUserId,
      },
    });

    // 8. Create frozen VersionReviewer records
    const createdReviewers: VersionReviewerSummary[] = [];
    for (const r of reviewersRoster) {
      const reviewerRow = await tx.versionReviewer.create({
        data: {
          versionId: version.id,
          participantId: r.participantId,
          userId: r.userId,
          emailSnapshot: r.emailSnapshot,
          nameSnapshot: r.nameSnapshot,
          partyKindSnapshot: r.partyKindSnapshot,
          roleSnapshot: r.roleSnapshot,
          required: r.required,
          stepOrder: r.stepOrder,
        },
      });

      createdReviewers.push({
        id: reviewerRow.id,
        versionId: version.id,
        participantId: reviewerRow.participantId,
        userId: reviewerRow.userId,
        emailSnapshot: reviewerRow.emailSnapshot,
        nameSnapshot: reviewerRow.nameSnapshot,
        partyKindSnapshot: reviewerRow.partyKindSnapshot,
        roleSnapshot: reviewerRow.roleSnapshot,
        required: reviewerRow.required,
        stepOrder: reviewerRow.stepOrder,
        decision: null,
      });
    }

    // 9. Update Agreement pendingReviewVersionId
    await tx.agreement.update({
      where: { id: validated.agreementId },
      data: {
        pendingReviewVersionId: version.id,
      },
    });

    // 10. Record ActivityEvent in same atomic transaction
    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        versionId: version.id,
        action: "VERSION_SUBMITTED_FOR_REVIEW",
        summaryJson: {
          versionNumber: nextVersionNumber,
          versionId: version.id,
          contentHash,
          approvalPolicy,
          quorumThreshold,
          isSequential,
          termsCount: parsedDraftContent.terms.length,
          reviewersCount: reviewersRoster.length,
          requiredReviewersCount: reviewersRoster.filter((r) => r.required).length,
        },
      },
    });

    return {
      id: version.id,
      agreementId: version.agreementId,
      versionNumber: version.versionNumber,
      basedOnVersionId: version.basedOnVersionId,
      snapshot: parsedDraftContent,
      contentHash: version.contentHash,
      state: version.state,
      approvalPolicy: version.approvalPolicy,
      quorumThreshold: version.quorumThreshold,
      isSequential: version.isSequential,
      submittedByUserId: version.submittedByUserId,
      submittedAt: version.submittedAt,
      resolvedAt: version.resolvedAt,
      reviewers: createdReviewers,
    };
  });
}

/**
 * Records an explicit review decision (APPROVE or REQUEST_CHANGES) on an in-review version.
 *
 * Preconditions:
 * - Agreement is locked via FOR UPDATE inside an atomic transaction.
 * - Target version matches agreement.pendingReviewVersionId.
 * - Agreement is not ARCHIVED.
 * - Target version is IN_REVIEW.
 * - Client expectedVersionHash matches version.contentHash (stale hash rejected with 409).
 * - Actor is an eligible, joined, verified required reviewer in the frozen VersionReviewer roster.
 * - Retries with the same decision are idempotent.
 * - Conflicting opposite decisions reject with 409.
 * - REQUEST_CHANGES immediately marks version REJECTED, clears pending pointer, keeps current approved version.
 * - APPROVE checks unanimous approval of all required reviewers. When all approve, atomically:
 *   - Supersedes old approved version.
 *   - Promotes this version to APPROVED.
 *   - Sets agreement.currentApprovedVersionId to this version.
 *   - Clears pendingReviewVersionId.
 *   - Advances lifecycleStatus to AGREED if previously DRAFT.
 */
export async function recordReviewDecision(
  actorUserId: string,
  input: RecordReviewDecisionInput
): Promise<ReviewDecisionResult> {
  const validated = RecordReviewDecisionSchema.parse(input);

  return await db.$transaction(async (tx) => {
    // 1. Lock Agreement row to prevent concurrent promotion/withdrawal race conditions
    const agreementRows = await tx.$queryRaw<
      Array<{
        id: string;
        lifecycleStatus: AgreementLifecycleStatus;
        pendingReviewVersionId: string | null;
        currentApprovedVersionId: string | null;
      }>
    >`SELECT id, "lifecycleStatus", "pendingReviewVersionId", "currentApprovedVersionId" FROM "Agreement" WHERE id = ${validated.agreementId} FOR UPDATE`;

    if (agreementRows.length === 0) {
      throw new NotFoundError("Agreement not found");
    }

    const agreement = agreementRows[0];

    if (agreement.lifecycleStatus === "ARCHIVED") {
      throw new ConflictError("Cannot record review decisions on an archived agreement");
    }

    if (agreement.pendingReviewVersionId !== validated.versionId) {
      throw new ConflictError(
        "This version is no longer pending review. It may have already been resolved or withdrawn."
      );
    }

    // 2. Fetch the version and its frozen reviewers
    const version = await tx.agreementVersion.findUnique({
      where: { id: validated.versionId },
      include: {
        reviewers: {
          include: { decision: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundError("Agreement version not found");
    }

    if (version.state !== "IN_REVIEW") {
      throw new ConflictError(
        `Version is not in review (current state: ${version.state})`
      );
    }

    // 3. Stale content hash guard (docs/06-versioning-approval-engine.md line 55)
    if (validated.expectedVersionHash !== version.contentHash) {
      throw new ConflictError(
        "Content hash mismatch: The version has changed or your review preview is stale. Please refresh."
      );
    }

    // 4. Check actor's reviewer eligibility in the frozen roster
    const reviewer = version.reviewers.find((r) => r.userId === actorUserId);

    if (!reviewer) {
      throw new ForbiddenError(
        "You are not a designated reviewer in the frozen roster for this version."
      );
    }

    if (!reviewer.required) {
      throw new ForbiddenError(
        "Observers are not required reviewers and cannot record formal approval decisions."
      );
    }

    // Verify actor is still an active participant (not removed)
    const activeParticipant = await tx.agreementParticipant.findFirst({
      where: {
        id: reviewer.participantId,
        agreementId: validated.agreementId,
        removedAt: null,
      },
    });

    if (!activeParticipant) {
      throw new ForbiddenError(
        "You are no longer an active participant of this agreement."
      );
    }

    // Verify actor email is verified
    const actorUser = await tx.user.findUnique({
      where: { id: actorUserId },
      select: { emailVerifiedAt: true },
    });

    if (!actorUser?.emailVerifiedAt) {
      throw new ForbiddenError(
        "You must have a verified email to record a review decision."
      );
    }

    // 4b. Sequential review sequence check
    if (version.isSequential && reviewer.stepOrder > 1) {
      const priorStepReviewers = version.reviewers.filter(
        (r) => r.required && r.stepOrder < reviewer.stepOrder
      );
      const allPriorStepsApproved = priorStepReviewers.every(
        (r) => r.decision?.decision === "APPROVE"
      );

      if (!allPriorStepsApproved) {
        throw new ConflictError(
          `Prior review steps must approve before step ${reviewer.stepOrder} can record a decision.`
        );
      }
    }

    // 5. Check if decision already recorded
    if (reviewer.decision) {
      if (reviewer.decision.decision === validated.decision) {
        const allReq = await tx.versionReviewer.findMany({
          where: { versionId: version.id, required: true },
          include: { decision: true },
        });
        const approvedCount = allReq.filter((r) => r.decision?.decision === "APPROVE").length;
        const requiredCount = allReq.length;
        const isUnanimous = approvedCount === requiredCount;
        return {
          status: "RECORDED",
          decision: reviewer.decision.decision,
          versionState: version.state,
          isUnanimouslyApproved: isUnanimous,
          approvedCount,
          requiredCount,
          isApproved: false,
        };
      }
      throw new ConflictError(
        "A conflicting decision has already been recorded for this version and cannot be altered."
      );
    }

    // 6. Record ReviewDecision
    await tx.reviewDecision.create({
      data: {
        versionReviewerId: reviewer.id,
        versionId: version.id,
        actingUserId: actorUserId,
        decision: validated.decision,
        reason: validated.reason ?? null,
        versionHashSnapshot: version.contentHash,
      },
    });

    // 7. Activity event for the actor's decision
    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        versionId: version.id,
        action:
          validated.decision === "APPROVE"
            ? "REVIEW_APPROVED"
            : "REVIEW_CHANGES_REQUESTED",
        summaryJson: {
          reviewerName: reviewer.nameSnapshot,
          reviewerEmail: reviewer.emailSnapshot,
          decision: validated.decision,
          reason: validated.reason ?? null,
          versionNumber: version.versionNumber,
        },
      },
    });

    // 8. Fetch updated reviewers status to evaluate approval policy
    const allRequiredReviewers = await tx.versionReviewer.findMany({
      where: {
        versionId: version.id,
        required: true,
      },
      include: {
        decision: true,
      },
    });

    const approvedCount = allRequiredReviewers.filter(
      (r) => r.decision?.decision === "APPROVE"
    ).length;
    const changesRequestedCount = allRequiredReviewers.filter(
      (r) => r.decision?.decision === "REQUEST_CHANGES"
    ).length;
    const requiredCount = allRequiredReviewers.length;
    const remainingCount = requiredCount - approvedCount - changesRequestedCount;

    let targetThreshold = requiredCount; // UNANIMOUS default
    if (version.approvalPolicy === "MAJORITY") {
      targetThreshold = Math.floor(requiredCount / 2) + 1;
    } else if (version.approvalPolicy === "QUORUM_THRESHOLD") {
      targetThreshold = version.quorumThreshold ?? requiredCount;
    }

    const isThresholdMet = approvedCount >= targetThreshold;
    const isQuorumImpossible = approvedCount + remainingCount < targetThreshold;

    // Handle REQUEST_CHANGES
    if (validated.decision === "REQUEST_CHANGES") {
      if (version.approvalPolicy === "UNANIMOUS" || isQuorumImpossible) {
        await tx.agreementVersion.update({
          where: { id: version.id },
          data: {
            state: "REJECTED",
            resolvedAt: new Date(),
          },
        });

        await tx.agreement.update({
          where: { id: validated.agreementId },
          data: {
            pendingReviewVersionId: null,
          },
        });

        await tx.activityEvent.create({
          data: {
            agreementId: validated.agreementId,
            actorUserId,
            versionId: version.id,
            action: "VERSION_REJECTED",
            summaryJson: {
              versionNumber: version.versionNumber,
              rejectedBy: reviewer.nameSnapshot,
              reason: validated.reason ?? null,
              approvalPolicy: version.approvalPolicy,
              approvedCount,
              changesRequestedCount,
              requiredCount,
            },
          },
        });

        return {
          status: "REJECTED",
          decision: "REQUEST_CHANGES",
          versionState: "REJECTED",
          isUnanimouslyApproved: false,
          approvedCount,
          requiredCount,
          isApproved: false,
        };
      }

      // In MAJORITY or QUORUM_THRESHOLD, if quorum is still possible, review remains open
      return {
        status: "RECORDED",
        decision: "REQUEST_CHANGES",
        versionState: "IN_REVIEW",
        isUnanimouslyApproved: false,
        approvedCount,
        requiredCount,
        isApproved: false,
      };
    }

    // Handle APPROVE
    if (isThresholdMet) {
      // Supersede previously approved version if one exists
      if (agreement.currentApprovedVersionId) {
        const oldVersion = await tx.agreementVersion.findUnique({
          where: { id: agreement.currentApprovedVersionId },
          select: { snapshotJson: true },
        });

        if (oldVersion && oldVersion.snapshotJson) {
          try {
            const oldContent = DraftContentSchema.parse(oldVersion.snapshotJson);
            const newContent = DraftContentSchema.parse(version.snapshotJson);
            await checkCommitmentsAfterAmendment(
              tx,
              validated.agreementId,
              oldContent.terms,
              newContent.terms
            );
          } catch (e) {
            console.error("Failed to check commitments after amendment:", e);
          }
        }

        await tx.agreementVersion.update({
          where: { id: agreement.currentApprovedVersionId },
          data: {
            state: "SUPERSEDED",
          },
        });
      }

      // Mark this version APPROVED
      await tx.agreementVersion.update({
        where: { id: version.id },
        data: {
          state: "APPROVED",
          resolvedAt: new Date(),
        },
      });

      // Update agreement pointers & lifecycle status
      const nextLifecycle: AgreementLifecycleStatus =
        agreement.lifecycleStatus === "DRAFT" ? "AGREED" : agreement.lifecycleStatus;

      await tx.agreement.update({
        where: { id: validated.agreementId },
        data: {
          currentApprovedVersionId: version.id,
          pendingReviewVersionId: null,
          lifecycleStatus: nextLifecycle,
        },
      });

      const isUnanimous = approvedCount === requiredCount;

      await tx.activityEvent.create({
        data: {
          agreementId: validated.agreementId,
          actorUserId,
          versionId: version.id,
          action: "VERSION_PROMOTED_TO_AGREED",
          summaryJson: {
            versionNumber: version.versionNumber,
            promotedVersionId: version.id,
            previousApprovedVersionId: agreement.currentApprovedVersionId,
            approvalPolicy: version.approvalPolicy,
            quorumThreshold: version.quorumThreshold,
            approvedCount,
            requiredCount,
            isUnanimous,
          },
        },
      });

      return {
        status: "APPROVED",
        decision: "APPROVE",
        versionState: "APPROVED",
        isUnanimouslyApproved: isUnanimous,
        approvedCount,
        requiredCount,
        isApproved: true,
      };
    }

    // Threshold not met yet, review continues
    return {
      status: "RECORDED",
      decision: "APPROVE",
      versionState: "IN_REVIEW",
      isUnanimouslyApproved: false,
      approvedCount,
      requiredCount,
      isApproved: false,
    };
  });
}

/**
 * Withdraws a pending review version, unlocking the draft for new edits.
 * Only the agreement organizer can withdraw.
 */
export async function withdrawPendingReview(
  actorUserId: string,
  input: WithdrawReviewInput
): Promise<AgreementVersionDetail> {
  const validated = WithdrawReviewSchema.parse(input);

  await assertCanEditDraft(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const agreementRows = await tx.$queryRaw<
      Array<{
        id: string;
        organizerUserId: string;
        pendingReviewVersionId: string | null;
      }>
    >`SELECT id, "organizerUserId", "pendingReviewVersionId" FROM "Agreement" WHERE id = ${validated.agreementId} FOR UPDATE`;

    if (agreementRows.length === 0) {
      throw new NotFoundError("Agreement not found");
    }

    const agreement = agreementRows[0];

    if (agreement.organizerUserId !== actorUserId) {
      throw new ForbiddenError("Only the organizer can withdraw a pending review");
    }

    if (agreement.pendingReviewVersionId !== validated.versionId) {
      throw new ConflictError("This version is no longer pending review");
    }

    const version = await tx.agreementVersion.update({
      where: { id: validated.versionId },
      data: {
        state: "WITHDRAWN",
        resolvedAt: new Date(),
      },
      include: {
        reviewers: {
          include: { decision: true },
        },
      },
    });

    await tx.agreement.update({
      where: { id: validated.agreementId },
      data: {
        pendingReviewVersionId: null,
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        versionId: version.id,
        action: "VERSION_WITHDRAWN",
        summaryJson: {
          versionNumber: version.versionNumber,
          reason: validated.reason ?? null,
        },
      },
    });

    const parsedSnapshot = DraftContentSchema.parse(version.snapshotJson);

    return {
      id: version.id,
      agreementId: version.agreementId,
      versionNumber: version.versionNumber,
      basedOnVersionId: version.basedOnVersionId,
      snapshot: parsedSnapshot,
      contentHash: version.contentHash,
      state: version.state,
      approvalPolicy: version.approvalPolicy,
      quorumThreshold: version.quorumThreshold,
      isSequential: version.isSequential,
      submittedByUserId: version.submittedByUserId,
      submittedAt: version.submittedAt,
      resolvedAt: version.resolvedAt,
      reviewers: version.reviewers.map((r) => ({
        id: r.id,
        versionId: r.versionId,
        participantId: r.participantId,
        userId: r.userId,
        emailSnapshot: r.emailSnapshot,
        nameSnapshot: r.nameSnapshot,
        partyKindSnapshot: r.partyKindSnapshot,
        roleSnapshot: r.roleSnapshot,
        required: r.required,
        stepOrder: r.stepOrder,
        decision: r.decision
          ? {
              id: r.decision.id,
              decision: r.decision.decision,
              reason: r.decision.reason,
              createdAt: r.decision.createdAt,
            }
          : null,
      })),
    };
  });
}

/**
 * Resets the working draft from a specific approved version snapshot
 * so that the organizer can draft an amendment.
 */
export async function prepareAmendmentDraft(
  actorUserId: string,
  input: ResetDraftFromVersionInput
): Promise<{ draftId: string; revision: number }> {
  const validated = ResetDraftFromVersionSchema.parse(input);

  await assertCanEditDraft(actorUserId, validated.agreementId);

  return await db.$transaction(async (tx) => {
    const agreementRows = await tx.$queryRaw<
      Array<{
        id: string;
        lifecycleStatus: AgreementLifecycleStatus;
        pendingReviewVersionId: string | null;
      }>
    >`SELECT id, "lifecycleStatus", "pendingReviewVersionId" FROM "Agreement" WHERE id = ${validated.agreementId} FOR UPDATE`;

    if (agreementRows.length === 0) {
      throw new NotFoundError("Agreement not found");
    }

    const agreement = agreementRows[0];

    if (agreement.lifecycleStatus === "ARCHIVED") {
      throw new ConflictError("Cannot amend an archived agreement");
    }

    if (agreement.pendingReviewVersionId) {
      throw new ConflictError(
        "Cannot edit draft while a review is pending. Withdraw the pending review first."
      );
    }

    const version = await tx.agreementVersion.findFirst({
      where: {
        id: validated.versionId,
        agreementId: validated.agreementId,
      },
    });

    if (!version) {
      throw new NotFoundError("Source version not found");
    }

    const draft = await tx.agreementDraft.findUnique({
      where: { agreementId: validated.agreementId },
    });

    if (!draft) {
      throw new NotFoundError("Agreement draft not found");
    }

    const nextRevision = draft.revision + 1;
    const parsedSnapshot = DraftContentSchema.parse(version.snapshotJson);

    const updatedDraft = await tx.agreementDraft.update({
      where: { agreementId: validated.agreementId },
      data: {
        contentJson: parsedSnapshot,
        basedOnVersionId: version.id,
        revision: nextRevision,
        updatedByUserId: actorUserId,
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId: validated.agreementId,
        actorUserId,
        action: "DRAFT_RESET_FROM_VERSION",
        summaryJson: {
          fromVersionId: version.id,
          versionNumber: version.versionNumber,
          newRevision: nextRevision,
        },
      },
    });

    return {
      draftId: updatedDraft.id,
      revision: nextRevision,
    };
  });
}

/**
 * Returns all versions of an agreement ordered by versionNumber descending.
 */
export async function listAgreementVersions(
  actorUserId: string,
  agreementId: string
): Promise<AgreementVersionDetail[]> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const versions = await db.agreementVersion.findMany({
    where: { agreementId },
    include: {
      reviewers: {
        include: { decision: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { versionNumber: "desc" },
  });

  return versions.map((v) => {
    const parsedSnapshot = DraftContentSchema.parse(v.snapshotJson);
    return {
      id: v.id,
      agreementId: v.agreementId,
      versionNumber: v.versionNumber,
      basedOnVersionId: v.basedOnVersionId,
      snapshot: parsedSnapshot,
      contentHash: v.contentHash,
      state: v.state,
      approvalPolicy: v.approvalPolicy,
      quorumThreshold: v.quorumThreshold,
      isSequential: v.isSequential,
      submittedByUserId: v.submittedByUserId,
      submittedAt: v.submittedAt,
      resolvedAt: v.resolvedAt,
      reviewers: v.reviewers.map((r) => ({
        id: r.id,
        versionId: r.versionId,
        participantId: r.participantId,
        userId: r.userId,
        emailSnapshot: r.emailSnapshot,
        nameSnapshot: r.nameSnapshot,
        partyKindSnapshot: r.partyKindSnapshot,
        roleSnapshot: r.roleSnapshot,
        required: r.required,
        stepOrder: r.stepOrder,
        decision: r.decision
          ? {
              id: r.decision.id,
              decision: r.decision.decision,
              reason: r.decision.reason,
              createdAt: r.decision.createdAt,
            }
          : null,
      })),
    };
  });
}

/**
 * Returns full details for a specific version.
 */
export async function getVersionDetail(
  actorUserId: string,
  agreementId: string,
  versionId: string
): Promise<AgreementVersionDetail> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const version = await db.agreementVersion.findFirst({
    where: {
      id: versionId,
      agreementId,
    },
    include: {
      reviewers: {
        include: { decision: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!version) {
    throw new NotFoundError("Version not found");
  }

  const parsedSnapshot = DraftContentSchema.parse(version.snapshotJson);

  return {
    id: version.id,
    agreementId: version.agreementId,
    versionNumber: version.versionNumber,
    basedOnVersionId: version.basedOnVersionId,
    snapshot: parsedSnapshot,
    contentHash: version.contentHash,
    state: version.state,
    approvalPolicy: version.approvalPolicy,
    quorumThreshold: version.quorumThreshold,
    isSequential: version.isSequential,
    submittedByUserId: version.submittedByUserId,
    submittedAt: version.submittedAt,
    resolvedAt: version.resolvedAt,
    reviewers: version.reviewers.map((r) => ({
      id: r.id,
      versionId: r.versionId,
      participantId: r.participantId,
      userId: r.userId,
      emailSnapshot: r.emailSnapshot,
      nameSnapshot: r.nameSnapshot,
      partyKindSnapshot: r.partyKindSnapshot,
      roleSnapshot: r.roleSnapshot,
      required: r.required,
      stepOrder: r.stepOrder,
      decision: r.decision
        ? {
            id: r.decision.id,
            decision: r.decision.decision,
            reason: r.decision.reason,
            createdAt: r.decision.createdAt,
          }
        : null,
    })),
  };
}

/**
 * Returns the currently pending review version (if any), with reviewers and decisions.
 */
export async function getPendingReview(
  actorUserId: string,
  agreementId: string
): Promise<AgreementVersionDetail | null> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: { pendingReviewVersionId: true },
  });

  if (!agreement?.pendingReviewVersionId) {
    return null;
  }

  return await getVersionDetail(actorUserId, agreementId, agreement.pendingReviewVersionId);
}
