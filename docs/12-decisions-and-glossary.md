# 12 — Decision register, assumptions and shared glossary

This file exists so future contributors do not reinterpret the product mid-implementation.

## Confirmed product decisions
| ID | Decision | Reason/status |
|---|---|---|
| DEC-001 | Name: **Etfago / اتفقنا** | Confirmed |
| DEC-002 | Universal product for individuals AND businesses | Confirmed; no freelancer-only framing |
| DEC-003 | Collaboration between invited parties | Confirmed core feature |
| DEC-004 | Structured terms + explicit amendments + frozen review versions | Confirmed core differentiator |
| DEC-005 | Next.js full-stack, PostgreSQL + Prisma, Auth.js | Selected implementation architecture |
| DEC-006 | Arabic-first UI with English | Selected initial language support |
| DEC-007 | **Store attachment bytes on server persistent disk, not S3** | Explicit user update; must not revert |
| DEC-008 | Verified-email account approval on a specific version, not legal signature | Required trust boundary |
| DEC-009 | Single persistent VPS instance initially | Necessitated by private local file storage model |
| DEC-010 | Time budget expanded beyond one day | Confirmed; prioritize real product and quality |
| DEC-011 | Sprint 1 Identity & Tenancy: Auth.js custom adapter mapping `emailNormalized`/`emailVerifiedAt`, atomic personal workspace auto-provisioning on user creation, deny-by-default agreement permission functions | Confirmed & Implemented |
| DEC-012 | Local Docker PostgreSQL port mapped to 5434 to eliminate collision with host port 5432 | Confirmed |
| DEC-013 | Sprint 2 Structured Draft & Agreements: Canonical V1 Schema with structured terms (optional money/dates/assignees, max 50 terms, title <= 120, body <= 4000), atomic auto-creation of organizer AgreementParticipant, optimistic concurrency revision lock on draft saves, and atomic activity event logging on every agreement mutation | Confirmed & Implemented |
| DEC-014 | Sprint 3 Invites & Reviewer Roster: 7-day single-use invitation tokens hashed via SHA-256 (raw token never stored), target-verified email matching on redemption, atomic participant-user linkage and activity event logging, resend token invalidation, and strict agreement-scoped participant authorization | Confirmed & Implemented |
| DEC-015 | Sprint 4 Versioning & Approval Engine: RFC 8785 deterministic composite content hash (SHA-256 over canonical snapshot + participantId-sorted frozen reviewer roster), atomic row-locking on Agreement (`FOR UPDATE`), unanimous explicit approval requirement for promotion to AGREED, immediate termination on REQUEST_CHANGES without altering agreed base version, draft edit locking during pending review, and automatic review withdrawal on participant removal | Confirmed & Implemented |
| DEC-016 | Sprint 5 Change Proposals, Discussions & Version Diffing: Structured term-level before/after ChangeRequests (ADD, UPDATE, REMOVE operations with reason), organizer-only draft-staging acceptance (`ACCEPTED_IN_DRAFT` incrementing draft revision without altering current agreed snapshot), soft-deletable version/term discussions with XSS-safe text constraints, pure deterministic term diff engine detecting additions/removals/field-level modifications, and atomic activity event logging (`CHANGE_REQUEST_CREATED`, `CHANGE_REQUEST_ACCEPTED`, `CHANGE_REQUEST_DECLINED`, `CHANGE_REQUEST_CANCELLED`, `COMMENT_ADDED`) | Confirmed & Implemented |
| DEC-017 | Sprint 6 Operational Commitments, Private Persistent Server File Storage, Export & Notifications: Action commitments with status workflow (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`), assignees, deadlines, and optimistic concurrency locks; critical invariant: automatic flagging (`needsReview = true` and `COMMITMENT_FLAGGED_FOR_REVIEW` event) of linked commitments when agreement terms are amended and promoted to `APPROVED`; strictly private server filesystem storage (`STORAGE_ROOT`) refusing S3/Cloudinary, partitioned by 64-hex prefix subdirs, magic-byte inspection (PDF, JPEG, PNG, WebP), path traversal defense, and server-authorized streaming downloads with `nosniff`/`private, no-store`; printable bilingual export (`/[locale]/agreements/[id]/export`) with prominent legal disclaimer; email notifications for reviews and commitment assignments via persistent `NotificationOutbox` | Confirmed & Implemented |
| DEC-018 | Sprint 7 Product Hardening, Security Matrix & Release QA: Comprehensive 3-party end-to-end smoke acceptance scenario (D1-D5) passing all stages (amendments, rejection, resubmission, commitments, private uploads/downloads, and outsider blocking); complete adversarial security suite covering IDOR across all entities, role forgery defense, concurrent final approval row-locking race conditions, stale hash rejection, transactional reviewer removal review withdrawal, upload exploits (>10 MiB, fake MIME, traversal keys), and archived agreement immutability; localized privacy policy, terms of service, accessible RTL/LTR 404 and global error boundaries; verified automated backup & restore rehearsal script confirming on-disk file checksum matches against PostgreSQL records | Confirmed & Implemented |
| DEC-019 | Sprint 8 Starter Templates by Agreement Purpose (F-21): Curated, schema-validated starter templates covering Personal & Shared Responsibility, Freelance & Professional Services, Goods Supply & Procurement, and Mutual Confidentiality & NDA; fully localized in Arabic (RTL) and English (LTR) with structured operational clauses respecting V1 schema constraints (<= 50 terms, title <= 120, body <= 4000, optional money/dates); client-side and server-action instantiation with unique term IDs, draft customization, category filtering, accessible modal preview, and activity event logging (`templateId` in summaryJson); explicit trust disclaimer stating starter templates are operational guidelines and not legal counsel | Confirmed & Implemented |

## Proposed, implementation-adjustable defaults
- Personal workspace for every account; business workspaces optional.
- Organizer + at least one separate required verified reviewer for agreed status.
- Structured term list rather than rich legal-document editor.
- 7-day one-use invitations; 10 MiB file cap; 200 MiB per workspace; PDF/image formats only.
- Resend for outbound email with local development adapter.
- Print-friendly HTML as first PDF export path.
- Single pending version per agreement, immutable snapshot + frozen reviewer roster.
- Minimal palette and IBM Plex Sans Arabic typography. Requires visual review, not a fixed final brand system.

## Remaining decisions before public launch
1. Public domain and sender email verification.
2. Exact authentication flow/provider and user recovery options.
3. Applicable privacy/data-retention policy by launch geography and users.
4. Whether to require two parties for all categories (initial default yes).
5. If an organizer may remove a party after approval and how this affects existing sharing/privacy obligations; removal is logged and must never rewrite history.
6. Whether commitment edits are organizer-only or assignee-limited with explicit review privileges (default: assignee status update, organizer ownership of details).
7. Malware scanning provider/engine and moderation for attachments before public traffic.
8. Exact backup destination, encryption and restore schedule.
9. Color palette/logo approval; no forced brand resemblance to another project.

## Product terminology
- **Agreement / اتفاق:** named collaboration space for structured terms, participants and history.
- **Term / بند:** one substantive clause/condition with its own stable ID.
- **Draft / مسودة:** mutable unapproved working copy; cannot be represented as agreed.
- **Version / نسخة:** frozen snapshot submitted for review, with frozen required reviewers.
- **Current approved version / النسخة المعتمدة حاليًا:** most recent version unanimously accepted by required reviewers. "Approved" here is platform workflow, not legal certification.
- **Reviewer / مراجع:** participant eligible to make explicit version decision if included in frozen required roster.
- **Decision / قرار المراجعة:** approval or request-changes recorded by the actor for one version.
- **Change Request / طلب تعديل:** proposal to alter terms, may be accepted into draft but not automatically into approved agreement.
- **Commitment / التزام:** operational action due by a person; distinct from legal enforceability.
- **Activity Event / حدث:** append-only application-level history for user actions and state transitions.
- **Workspace / مساحة عمل:** personal/business organizing container; membership alone is not agreement-wide content access.
- **Invitation / دعوة:** single-use email-bound link to join an agreement; not general public sharing.
- **Attachment / مرفق:** private file bytes on VPS disk, metadata in DB, downloads through server authorization.

## What cannot be claimed
- No guarantee of legal enforceability or of legally recognized signatures.
- No verified real-world identity merely because email verified.
- No immutable, cryptographically tamper-proof or court-certified audit log.
- No end-to-end encryption or zero-knowledge file privacy on server-side disk.
- No automatic agreement by silence or by organizer's unilateral declaration.
- No portability of file persistence to serverless/ephemeral environments without redesign.

## Change process
Before a major change, add:
```text
Decision ID:
Date:
Question:
Options considered:
Selected approach:
Effect on users / DB / API / security / storage:
Migration/rollback:
Approver:
```
If altering storage, agreement review semantics, identity requirements or participant data access, obtain explicit product approval before implementation.
