# 06 — Agreement versioning, review and approval state machines

This file overrides ambiguous visual/status descriptions elsewhere. Implement the exact invariants and transition preconditions here before designing review UI.

## Core model: two parallel tracks
1. **Current agreed version**: optional immutable `Agreement.currentApprovedVersionId`; remains current until replaced by unanimously approved newer snapshot.
2. **Pending review version**: optional immutable `Agreement.pendingReviewVersionId`; may coexist with current agreed version. Only one per agreement.

Separately, `AgreementDraft` is the **one mutable working copy**. A draft is not proof of an agreement. The UI must clearly label each track.

### Version states
`IN_REVIEW → APPROVED → SUPERSEDED` or `IN_REVIEW → REJECTED` or `IN_REVIEW → WITHDRAWN`.
- A version cannot return to `IN_REVIEW` after terminal decision; changes always create a **new version number and ID**.
- Only `state` and resolution timestamps may change after submission. Frozen `snapshotJson`, `contentHash`, `submittedAt`, and `VersionReviewer` roster are never rewritten.
- Previous `APPROVED` version changes to `SUPERSEDED` only when a new `APPROVED` version replaces it.

### Lifecycle status (orthogonal to review)
`DRAFT → AGREED → ACTIVE → COMPLETED`; `ARCHIVED` can be entered from any non-archived lifecycle state with explicit organizer confirmation (and is read-only in V1). Optionally `CANCELLED` from `DRAFT|AGREED|ACTIVE` is a **status recorded by organizer**, not proof all parties accepted cancellation. Completion is also an organizer-recorded operational status, not independent verification. Closing an agreement does not erase versions or access-control obligations.
- `DRAFT`: no current agreed version.
- `AGREED`: current approved version exists; not yet marked active.
- `ACTIVE`: organizer began execution.
- `COMPLETED`: organizer marked work complete, after warning about open commitments.
- `ARCHIVED`: read-only by organizer action; no new reviews/edits; archival event remains.
- `CANCELLED`: organizer marked it canceled; history remains; do not imply parties consented.
- Pending review can exist while lifecycle is `DRAFT|AGREED|ACTIVE`; UI shows a separate "review pending" signal. Never reset `ACTIVE` to `DRAFT` because an amendment started.

## Creation and initial review
1. Organizer creates `Agreement`, `AgreementDraft`, and organizer's joined participant record in one transaction.
2. Organizer adds terms and other parties, sends invites. At least **two distinct required joined verified users** are necessary to submit, including organizer as a required reviewer.
3. Organizer explicitly previews content and reviewer list, then submits. Server checks membership/verification and draft `revision`.
4. Within one transaction: serialize draft deterministically; freeze snapshot; freeze reviewer roster; compute SHA-256 hash over canonical composite `{schemaVersion, content, reviewers}`; allocate monotonic `versionNumber`; set version `IN_REVIEW`, pointer `pendingReviewVersionId`, record event.
5. Each required reviewer (including organizer) separately records `APPROVE` or `REQUEST_CHANGES` while version still pending. A voluntary observer never counts toward required threshold.
6. When the last required reviewer approves, atomically: set version `APPROVED`; supersede old current version (if any); set `currentApprovedVersionId` to new version; clear pending pointer; set `AGREED` if previously `DRAFT`; write event and notification intents. The organizer's approval is an actual click, not implicit just because they submitted.
7. If any required reviewer requests changes, immediately mark version `REJECTED`, clear pending pointer, retain all prior review decisions and events; last current approved version unchanged.

## Amending an agreement
1. A joined eligible participant creates `ChangeRequest` referencing an existing term ID (or adding/removing) and shows exact before/after.
2. Organizer accepts proposal **into the mutable draft** (or declines). If draft did not exist, initialize it from current agreed version. The draft is not the active version.
3. Organizer submits a new frozen version; reviewer decisions start from zero regardless of prior version.
4. Current approved version stays visible and authoritative for product display until replacement receives all required approvals.
5. If the organizer edits content while pending review, the server **rejects the edit**. Organizer must withdraw pending version first; this is recorded and pending approvals become historically visible but are no longer usable. A new submit makes a new version.

## Pseudocode: approve version atomically
```ts
async function recordDecision(actorId, agreementId, versionId, payload) {
  await prisma.$transaction(async (tx) => {
    // Lock Agreement row (SELECT ... FOR UPDATE via tx.$queryRaw or
    // an equivalent atomic conditional update); all review writers use it.
    const agreement = await lockAgreement(tx, agreementId);
    assert(agreement.pendingReviewVersionId === versionId, 'STALE_REVIEW');
    assert(agreement.lifecycleStatus !== 'ARCHIVED', 'CLOSED');

    const version = await getVersionForAgreement(tx, agreementId, versionId);
    assert(version.state === 'IN_REVIEW', 'NOT_REVIEWABLE');
    assert(payload.expectedVersionHash === version.contentHash, 'STALE_CLIENT');

    const reviewer = await getEligibleRequiredReviewer(tx, versionId, actorId);
    assert(reviewer && reviewer.emailWasVerifiedAtDecision, 'NOT_ELIGIBLE');

    const existing = await tx.reviewDecision.findUnique({
      where: { versionReviewerId: reviewer.id }
    });
    if (existing) {
      if (existing.decision === payload.decision) return; // retry, no new event
      throw conflict('DECISION_ALREADY_RECORDED');
    }

    await tx.reviewDecision.create({ data: {
      versionReviewerId: reviewer.id,
      versionId, actingUserId: actorId,
      decision: payload.decision,
      versionHashSnapshot: version.contentHash,
      reason: payload.reason ?? null
    }});

    if (payload.decision === 'REQUEST_CHANGES') {
      await tx.agreementVersion.update({ where: { id: versionId },
        data: { state: 'REJECTED', resolvedAt: new Date() } });
      await tx.agreement.update({ where: { id: agreementId },
        data: { pendingReviewVersionId: null } });
    } else if (await allRequiredReviewersApproved(tx, versionId)) {
      if (agreement.currentApprovedVersionId) {
        await tx.agreementVersion.update({
          where: { id: agreement.currentApprovedVersionId },
          data: { state: 'SUPERSEDED' }
        });
      }
      await tx.agreementVersion.update({ where: { id: versionId },
        data: { state: 'APPROVED', resolvedAt: new Date() } });
      await tx.agreement.update({ where: { id: agreementId }, data: {
        currentApprovedVersionId: versionId,
        pendingReviewVersionId: null,
        lifecycleStatus: agreement.lifecycleStatus === 'DRAFT' ? 'AGREED' : agreement.lifecycleStatus
      }});
    }
    await appendEventAndOutbox(tx, /* derived actor, safe metadata */);
  });
}
```
This is pseudocode, not copy-paste production code; implement row-lock/order and Prisma syntax against actual schema. Ensure commits cannot race, and event emission covers the exact transition that occurred. Same-decision retries should return a stable success response and must not emit duplicate events.

## Decision eligibility
- User is signed in, verified email belongs to that account, account is joined active participant in this agreement.
- User matches frozen `VersionReviewer.userId` and `required = true`, and is not removed from agreement at decision time.
- Version is `IN_REVIEW` and is this agreement's current `pendingReviewVersionId`.
- Client-provided `expectedVersionHash` matches immutable hash.
- Reviewer has not already decided (same retry can be idempotent, opposite decision conflicts).
- Organizer cannot cast a different user's decision or approve before their own explicit click.

## Roster changes and withdrawal
- Do not mutate frozen review roster. If organizer changes required participation, withdraw pending version first and create another submitted version with new reviewer snapshot.
- Participant removal or loss of verification **during a pending review** must withdraw the review transactionally to avoid stale decisions. Removal cannot rewrite historic snapshots.
- Re-invited party is a new current participant relationship or an explicitly reactivated one; historical identity preserved.

## Source-of-truth semantics
- **Terms effective now**: `currentApprovedVersionId.snapshotJson` only.
- **Proposed terms**: `pendingReviewVersionId.snapshotJson`, or `AgreementDraft.contentJson` (not mutually approved).
- **Comments**: attached to a version/term and never modify snapshot.
- **Change requests**: suggestions; `ACCEPTED_IN_DRAFT` does not mean jointly approved.
- **Commitments**: operational tracking, optionally linked to approved term/version; later amendments mark linked commitments `needsReview`, not silently change them.

## Edge-case test cases
- Two reviewers approve simultaneously: only one promotion event; one current pointer.
- Reviewer approves while organizer withdraws: serializable result; either approval before withdrawal without promotion, or conflict; never resurrect withdrawn version.
- Last reviewer approves during participant removal: lock ensures consistent roster decision; removal forces new version if review still pending.
- Approve stale hash: 409; no event.
- Change pending draft without withdrawal: rejected.
- Replay `APPROVE` twice: one decision.
- `REQUEST_CHANGES` after approval resolved: 409.
- New proposal does not affect active agreed terms or amount.
- Archived agreement rejects modifications and uploads; authorized history remains readable.
