# 05 — Architecture, services and API contracts

## Deployment architecture
```text
Browser (ar/en; authenticated UI)
  ↓ TLS
Reverse proxy (HTTPS, size/time limits)
  ↓
Next.js App Router / Route Handlers / Server Actions
  ├─ Auth/session + Zod parse + authorization
  ├─ Agreements domain service (transactional state machine)
  ├─ File storage adapter (private persistent filesystem)
  ├─ Notification service/outbox
  └─ Prisma → PostgreSQL (persistent volume)
                 ↘ File metadata only
Private server volume: attachment bytes (not web-served)
```
Single VPS, single app instance initially. Multiple instances require deliberate redesign of local storage, background jobs and locks; not a supported initial topology.

## Layering
- **UI components**: forms, diff display, translations, interactive state; may not decide permissions.
- **Action/handler layer**: session extraction, Zod validation, CSRF/origin/session protections, rate limiting, domain service invocation, error mapping.
- **Domain services**: authoritative state transitions and access checks, `prisma.$transaction`, append ActivityEvent.
- **Infrastructure adapters**: Prisma, email provider, private file system, clock, tokens.

Use Server Actions for first-party mutation forms where practical; Route Handlers for file streaming and external/invite actions. No duplicate business rules between handlers and actions.

## Core service functions (illustrative types)
```ts
createAgreement(actorId, workspaceId, validatedInput)
updateDraft(actorId, agreementId, input, expectedRevision)
inviteParticipant(actorId, agreementId, email, role, required)
redeemInvitation(actorId, rawToken)
submitForReview(actorId, agreementId, expectedDraftRevision)
recordReviewDecision(actorId, agreementId, versionId, decision, reason?)
proposeChange(actorId, agreementId, termOperation, proposedContent)
resolveChangeProposal(actorId, changeRequestId, resolution)
listVisibleAgreements(actorId, filters)
createCommitment(actorId, agreementId, input)
changeCommitmentStatus(actorId, commitmentId, status, expectedRevision)
requestAttachmentUpload(actorId, agreementId, metadata)
streamAttachment(actorId, attachmentId)
```

## Initial HTTP endpoints (illustrative)
All routes are versioned internally by contract and may be implemented as corresponding Server Actions. JSON errors use `{ code, message, fieldErrors?, requestId }` and never expose ORM traces.

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/agreements` | List current user's visible agreements; pagination & filters |
| POST | `/api/agreements` | Create agreement + initial draft in selected workspace |
| GET | `/api/agreements/:id` | Agreement overview for authorized participant |
| PATCH | `/api/agreements/:id/draft` | Save draft with `expectedRevision` |
| POST | `/api/agreements/:id/invitations` | Organizer creates expiring target-email invite |
| POST | `/api/invitations/redeem` | Consume token by signed-in verified target email |
| POST | `/api/agreements/:id/submit-review` | Freeze draft and reviewer roster into version |
| GET | `/api/agreements/:id/versions/:versionId` | Immutable version snapshot + decisions |
| POST | `/api/agreements/:id/versions/:versionId/decision` | `APPROVE` or `REQUEST_CHANGES` (idempotent semantics) |
| POST | `/api/agreements/:id/change-requests` | Propose term mutation |
| POST | `/api/change-requests/:id/resolve` | Organizer applies to draft or declines |
| GET/POST | `/api/agreements/:id/comments` | Read/create scoped comments |
| GET/POST | `/api/agreements/:id/commitments` | List/create commitments |
| PATCH | `/api/commitments/:id` | Authorized status/edit with revision check |
| POST | `/api/agreements/:id/attachments` | Authenticated bounded multipart upload to private storage |
| GET | `/api/attachments/:id/download` | Authorize, stream binary as attachment |
| DELETE | `/api/attachments/:id` | Authorized soft-delete and clean-up scheduling |
| GET | `/api/agreements/:id/activity` | Paginated event history |

Locale UI routes are prefixed `/ar` or `/en`; API endpoints are language-neutral. CSRF/session framework requirements apply to mutation endpoints. Explicitly verify Origin for cookie-based state changes; avoid changing state via GET.

## Representative request contracts
```json
POST /api/agreements
{
  "workspaceId": "uuid",
  "title": "اتفاق خدمات",
  "description": null,
  "category": "SERVICE",
  "terms": [{ "id": "term_1", "title": "التسليم", "body": "...", "dueDate": null, "amount": null, "currency": null, "assignedParticipantId": null }]
}
```
```json
POST /api/agreements/:id/versions/:versionId/decision
{
  "decision": "APPROVE",
  "expectedVersionHash": "64hexsha256"
}
```
Server must derive acting reviewer from session and `VersionReviewer`, and reject a hash mismatch (409), stale review (409), or unauthorized reviewer (403/404). Never permit client to choose `actingUserId`.

## Error and concurrency model
- `400` invalid input; `401` unauthenticated; `403` forbidden or `404` to avoid existence leak; `404` genuinely missing; `409` version/revision conflict; `410` expired invite; `413` too-large upload; `415` unsupported content; `429` rate-limited.
- Structured server errors with translated UI mapping, no raw DB errors sent to client.
- Submission and last approval use transactions with row locking / conditional updates to avoid double promotion or stale review resolution.
- Concurrency conflicts tell users to refresh. No silent last-write-wins on mutable agreement drafts.
- Network retries: approval is logically idempotent for the **same actor, version, exact decision**. Repetition should not insert duplicate rows, but attempted opposite decision returns `409`.

## Notification semantics
- Emit domain state + ActivityEvent and durable notification intent in same transaction wherever feasible.
- Email is eventually delivered by outbox worker. Use dedup `eventKey` and retry with backoff.
- Invitation links contain secrets; avoid storing plaintext invite tokens in long-lived DB payloads. For V1, send invitation synchronously after commit with short-lived in-memory token and expose safe **Resend invite** on delivery failure; alternatively use a short-lived encrypted outbox payload with operational key rotation. Choose one and document before coding.
- Email content should identify agreement title only when user already authorized; invite email may disclose minimal title to addressed recipient.

## Files
All file bytes flow through `src/server/storage/` and authorization-protected Route Handlers. Upload/download design and exception handling: `07-private-server-file-storage.md`.
