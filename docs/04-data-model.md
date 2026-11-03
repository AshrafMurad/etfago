# 04 — Data model and PostgreSQL/Prisma design

This is an implementation-level schema contract, **not a generated `schema.prisma`**. Build the exact Prisma schema during Sprint 1, then derive migrations. UUID/CUID2 primary keys are acceptable if consistent; use UUID where DB-level references are needed. Store UTC timestamps; audit timestamps are server generated.

## Schema graph (conceptual)
```text
User 1---N WorkspaceMember N---1 Workspace
User 1---N AgreementParticipant N---1 Agreement N---1 Workspace
Agreement 1---0..1 AgreementDraft
Agreement 1---N AgreementVersion
AgreementVersion 1---N VersionReviewer
VersionReviewer 1---0..1 ReviewDecision
Agreement 1---N ChangeRequest
Agreement 1---N Comment
Agreement 1---N Commitment
Agreement 1---N Attachment
Agreement 1---N ActivityEvent
Agreement 1---N AgreementInvitation
NotificationOutbox belongs to event/recipient
```

## Tables and key fields

### Identity and tenancy
- **User**: `id`, `name?`, `emailNormalized` UNIQUE, `emailVerifiedAt?`, `locale` (ar/en), `createdAt`, `updatedAt`; Auth.js adapter tables `Account`, `Session`, `VerificationToken` as required by chosen auth mode.
- **Workspace**: `id`, `kind` (`PERSONAL|BUSINESS`), `name`, `ownerUserId`, `createdAt`, `updatedAt`, `archivedAt?`.
- **WorkspaceMember**: `(workspaceId,userId)` UNIQUE, `role` (`OWNER|ADMIN|MEMBER`), `joinedAt`, `removedAt?`; only active members count.

### Agreements
- **Agreement**: `id`, `workspaceId`, `organizerUserId`, `title`, `description?`, `category?`, `lifecycleStatus` (`DRAFT|AGREED|ACTIVE|COMPLETED|CANCELLED|ARCHIVED`), `currentApprovedVersionId?`, `pendingReviewVersionId?`, `createdAt`, `updatedAt`, `archivedAt?`, `rowRevision` INTEGER. Optional display-only reference code unique within workspace.
- **AgreementParticipant**: `id`, `agreementId`, `userId?`, `emailNormalized`, `partyDisplayName`, `partyKind` (`PERSON|ORGANIZATION`), `agreementRole` (`ORGANIZER|EDITOR|REVIEWER|OBSERVER`), `requiredByDefault`, `joinedAt?`, `removedAt?`, `createdAt`. Unique active `agreementId + emailNormalized` enforced with partial unique SQL index if necessary.
- **AgreementInvitation**: `id`, `agreementId`, `participantId`, `emailNormalized`, `tokenHash` UNIQUE, `status` (`PENDING|ACCEPTED|REVOKED|EXPIRED`), `expiresAt`, `consumedAt?`, `invitedByUserId`, `createdAt`. Never store raw invite token.

### Drafts and immutable snapshots
- **AgreementDraft**: `id`, `agreementId` UNIQUE, `basedOnVersionId?`, `contentJson`, `revision` INTEGER, `updatedByUserId`, `updatedAt`. Mutable, writable only by authorized editors/organizer. Snapshot is a validated array of stable term IDs and optional metadata.
- **AgreementVersion**: `id`, `agreementId`, `versionNumber` INTEGER, `basedOnVersionId?`, `snapshotJson`, `contentHash` (SHA-256 hex), `state` (`IN_REVIEW|APPROVED|REJECTED|WITHDRAWN|SUPERSEDED`), `submittedByUserId`, `submittedAt`, `resolvedAt?`. `UNIQUE(agreementId,versionNumber)`. `snapshotJson` and hash cannot be updated after INSERT. Database trigger/limited mutation service recommended to enforce immutability.
- **VersionReviewer**: `id`, `versionId`, `participantId`, `userId`, `emailSnapshot`, `nameSnapshot`, `partyKindSnapshot`, `roleSnapshot`, `required` BOOL, `createdAt`; `UNIQUE(versionId,participantId)`. Frozen roster per version. Every required reviewer must be linked to a joined verified user at submission.
- **ReviewDecision**: `id`, `versionReviewerId` UNIQUE, `versionId`, `actingUserId`, `decision` (`APPROVE|REQUEST_CHANGES`), `reason?`, `versionHashSnapshot`, `createdAt`. Row inserted once; never edited or reassigned; request-changes ends review.

### Collaboration/operations
- **ChangeRequest**: `id`, `agreementId`, `baseVersionId?`, `createdByUserId`, `termId`, `operation` (`ADD|UPDATE|REMOVE`), `oldTermJson?`, `newTermJson?`, `reason?`, `status` (`OPEN|ACCEPTED_IN_DRAFT|DECLINED|CANCELLED`), `resolvedByUserId?`, `resolvedAt?`, `createdAt`. Proposals do not directly change approved snapshots.
- **Comment**: `id`, `agreementId`, `versionId?`, `termId?`, `authorUserId`, `body`, `createdAt`, `editedAt?`, `deletedAt?` (soft-delete). Comments are attached to version when discussing immutable content.
- **Commitment**: `id`, `agreementId`, `sourceVersionId?`, `sourceTermId?`, `title`, `details?`, `assigneeParticipantId?`, `dueAt?`, `status` (`TODO|IN_PROGRESS|DONE|CANCELLED`), `needsReview` BOOL, `createdByUserId`, `createdAt`, `updatedAt`, `rowRevision`.
- **Attachment**: `id`, `agreementId`, `uploadedByUserId`, `versionId?`, `originalFilename`, `storageKey` UNIQUE, `mimeDetected`, `sizeBytes` BIGINT, `sha256`, `state` (`PENDING|READY|DELETED|FAILED`), `createdAt`, `deletedAt?`. `storageKey` is an opaque relative key, not a user path or URL.
- **ActivityEvent**: `id`, `agreementId`, `actorUserId?`, `action` enum/string validated, `versionId?`, `objectId?`, `summaryJson` (safe bounded JSON, no secrets), `createdAt`. App-layer append-only; not cryptographically tamper-proof.
- **NotificationOutbox**: `id`, `eventKey` UNIQUE, `recipientUserId?`, `recipientEmailNormalized`, `template`, `payloadJson` (no secrets beyond short-lived invite link generation path), `state` (`PENDING|SENT|FAILED`), `attempts`, `nextAttemptAt?`, `createdAt`, `sentAt?`; inject actual invitation link at send from secure transient token workflow or send synchronously with bounded retries and mask secrets.

## Content JSON format (canonical schema v1)
```json
{
  "schemaVersion": 1,
  "title": "تصميم وتركيب مطبخ",
  "description": "اختياري",
  "terms": [
    {
      "id": "term_001",
      "title": "موعد التسليم",
      "body": "التسليم في الموعد المتفق عليه",
      "amount": null,
      "currency": null,
      "dueDate": "2026-11-20",
      "assignedParticipantId": null
    }
  ]
}
```
Store dates without timezone for agreement calendar dates (`YYYY-MM-DD`), and time-stamped events as UTC instants. `amount` serialized as decimal **string**, not floating-point; ISO currency code optional and not inferred. Terms sorted in their user-defined explicit order; canonical serialization uses stable property order, canonical numeric/string semantics, and a defined JSON canonicalization library or RFC 8785 to produce `contentHash`.

The **version's immutable `snapshotJson` alone is not enough to prove who had to approve**; freeze the roster as VersionReviewer rows in same DB transaction. The hash may be of a canonical composite `{content, reviewers, schemaVersion}` rather than only terms, and the code must document this choice consistently. Recommended: hash composite `{content, reviewerRoster}` sorted by participant ID.

## Constraints and indexes
- Compound indexes: `Agreement(workspaceId,updatedAt)`, `Agreement(organizerUserId,updatedAt)`, `AgreementParticipant(userId,agreementId)`, `AgreementVersion(agreementId,versionNumber DESC)`, `VersionReviewer(versionId,required)`, `ActivityEvent(agreementId,createdAt)`.
- Foreign keys on all child resources; enforce parent agreement relation in services.
- `Agreement.currentApprovedVersionId` and `pendingReviewVersionId` must point to versions belonging to same agreement; Prisma relation alone may not enforce same-parent linkage, so use transactional checks and optionally composite FK SQL.
- Prefer `ON DELETE RESTRICT` for versions/decisions; use soft-delete/archive and explicit retention workflows instead of cascading evidence destruction.
- `rowRevision` supports optimistic concurrency on drafts and commitments; pending review uniqueness protected by a transaction/lock, not client state.
- `ReviewDecision.versionId` and `versionReviewerId` must agree; service validates even if denormalized for query convenience.

## Migration/seed requirements
- Seed a personal workspace for sample user, a business workspace, 2+ sample agreements, version history, pending review and commitments. Seed data MUST be labeled demo and not shipped as customer data.
- Migration must include active-invitation uniqueness and email normalization strategy; test Prisma and raw SQL index behavior.
- Do not store auth tokens, raw invite tokens or file bytes in activity JSON.
