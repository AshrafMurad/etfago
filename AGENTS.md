# AGENTS.md — Etfago implementation contract

You are implementing **Etfago**, an Arabic-first collaborative agreement workspace for individuals and organizations. The specification in `/docs` is the source of truth. Never replace this with a generic contract editor, Kanban app, or e-signature product.

## Non-negotiable decisions
1. **Storage is a private persistent SERVER FILESYSTEM**, not S3 / Cloudinary / R2 / public static uploads. See `docs/07-private-server-file-storage.md`.
2. Next.js App Router full-stack, TypeScript, Prisma + PostgreSQL, Auth.js, Zod, Tailwind v4, shadcn/ui, next-intl.
3. Both personal and business use cases; all money, deadlines, and commitments optional unless required for a particular structured term.
4. Server-enforced tenant and agreement-level authorization; separately invited external participants may access only explicitly shared agreements.
5. An accepted agreement version is **immutable**. Pending edits cannot alter it. Approval is always version-specific.
6. All required participants must explicitly approve the **same frozen version** before promotion to the current approved version. No approval by silence.
7. A participant may request changes; that review ends and a fresh frozen version is necessary after edits.
8. Email verification proves control of an address, NOT legal identity or authority; no claims of enforceable electronic signatures.
9. Arabic-first accessible RTL UI, with English option; fully translated statuses and validation errors.
10. Do not silently change product requirements, data invariants, or deployment topology. Record proposal in `docs/12-decisions-and-glossary.md` and get approval for major decisions.

## Recommended workflow for each sprint
- Read the relevant docs and state transitions before coding.
- Inspect existing code, schema, tests, and migrations; do not overwrite completed implementation.
- Implement the smallest vertical slice (schema → authorization → domain/service → route/action → UI → tests).
- Run formatting, TypeScript check, lint, database tests, and acceptance cases relevant to changes.
- Update `/docs` if a previously undecided implementation detail becomes a confirmed decision.
- Summarize changed files, migrations, checks actually run, known gaps, and next sprint. Do not claim tests passed unless run.

## Domain invariants (must be covered by tests)
- `Agreement.currentApprovedVersionId` changes only inside an atomic transaction after every required eligible participant approves the exact pending snapshot.
- A version's `snapshot`, `contentHash`, and reviewer roster are never edited after submission.
- The reviewer roster is frozen per submitted version, including parties' names/emails/required flags.
- A changed or rejected review needs a new version ID and new approvals.
- At most one pending version per agreement and at most one editable draft per agreement.
- `Request changes` ends current review and **does not** alter the currently approved version.
- An activity event is recorded in the same transaction as a domain state change.
- Server chooses actor identity from Auth.js session; ignore any client-supplied actor IDs.
- Every object fetch/update/delete and every file download re-checks agreement-level access on the server.
- File metadata alone is not authorization. The file's agreement access is checked every time.

## Code boundaries
```text
src/app/                  # localized pages, layout, route handlers
src/features/agreements/  # UI and view-specific adapters
src/server/auth/          # sessions, email verification, access checks
src/server/agreements/    # transactional domain services and state changes
src/server/storage/       # private filesystem adapter
src/server/notifications/ # email abstractions, outbox
src/lib/                  # shared Zod contracts, formats, translations
prisma/                   # schema, migrations, dev seed
messages/ar.json
messages/en.json
tests/                    # unit/integration/e2e
```
No business-critical validation in client-only functions; a disabled button is not authorization.

## Quality gates
- Input schemas define length limits and normalized values; no raw HTML from users.
- All writes are checked for status, membership, version, and expected optimistic revision.
- Default deny on unauthenticated, unknown resource, invalid invites, expired tokens, and removed participants.
- Access decisions are logged without storing invitation secrets or auth tokens.
- Content hashes use deterministic canonical serialization, not ordinary JS object iteration without a canonicalization rule.
- Use DB transactions and row locking / compare-and-swap for approval races.
- Server uploads enforce size, quota, extension/MIME/signature policy, randomized filename, traversal protection, atomic write, and authorization.
- Display dates/times in the user's selected locale; persist UTC. Currency is optional metadata, never inferred.
- Never invent legal approvals, signatures, organization authority, or legal compliance certification.

## No-go shortcuts
- Do not use browser localStorage as source of truth.
- Do not store file bytes in PostgreSQL or beneath `public/`.
- Do not deploy to ephemeral-only hosting if attachments are persisted on server filesystem.
- Do not auto-accept agreements for users or auto-approve revisions.
- Do not implement a general-purpose rich-text contract builder in the initial release.
- Do not introduce AI summarization, payments, or legal e-signatures without an approved scope change.
