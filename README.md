# اتفقنا | Etfago

**Collaborative Agreement Workspace — Arabic-first, for individuals and businesses.**

> اتفاق واحد. أطراف متعددة. كل تغيير واضح.
>
> One agreement. Multiple parties. Every change is clear.

## Product promise
Etfago helps people and small businesses **create structured agreements, invite counterparties, review a specific version, record explicit decisions, propose amendments, and follow commitments**. The **currently agreed version** remains visible even while another version is being reviewed.

This is an agreement-tracking and collaboration product, **not an e-signature, identity-verification, legal advice, or legally certified contracting service**. A platform approval means an authenticated user with a verified email clicked a documented decision on an identified version; it does not by itself establish legal identity, authority, or enforceability.

## Stack — locked for initial implementation
- Next.js App Router + React + TypeScript (single full-stack app; no separate Express server).
- PostgreSQL + Prisma ORM.
- Auth.js for session/authentication, with verified-email gating for agreement decisions.
- Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, next-intl.
- Resend for invitation/notification email; use a provider abstraction so local development can log emails.
- **Private server filesystem** for attachments (persistent Docker bind mount / named volume). **No S3, no object storage, no public upload directory.**
- Docker-based deployment on a single persistent VPS. Reverse proxy with HTTPS.

## Repository plan
```text
AGENTS.md
README.md
.env.example                 # add during implementation; never commit real values
/docs/
  README-AR.md                 # Arabic executive guide
  00-product-vision.md
  01-requirements-and-scope.md
  02-personas-permissions.md
  03-user-flows-and-ux.md
  04-data-model.md
  05-architecture-and-api.md
  06-versioning-approval-engine.md
  07-private-server-file-storage.md
  08-design-system-and-localization.md
  09-implementation-roadmap.md
  10-testing-and-acceptance.md
  11-deployment-and-operations.md
  12-decisions-and-glossary.md
```

## Reading order for implementation agents
1. `AGENTS.md` and `docs/12-decisions-and-glossary.md`.
2. `docs/00-product-vision.md` and `docs/01-requirements-and-scope.md`.
3. `docs/06-versioning-approval-engine.md` **before** modeling approval/version tables.
4. `docs/02-personas-permissions.md`, `docs/04-data-model.md`, `docs/05-architecture-and-api.md`.
5. `docs/07-private-server-file-storage.md` **before** introducing any upload endpoint.
6. `docs/08-design-system-and-localization.md`, `docs/09-implementation-roadmap.md`, `docs/10-testing-and-acceptance.md`, `docs/11-deployment-and-operations.md`.

## Delivery definition
Do not report "done" because UI screens exist. The release is usable when **two separate verified accounts** can collaborate on a real agreement, review and approve an immutable snapshot, propose and approve a subsequent version, track a commitment, and download their authorized private attachment. Non-participants must be denied all agreement and file operations.

### Security and trust boundaries
- The authenticated requester is untrusted until server-side membership checks succeed.
- A workspace member does **not** automatically have access to all agreements in the workspace.
- Do not label an agreement "legally signed" or an approver "identity verified" based solely on email verification.
- Do not expose server file storage with `public/`, `/uploads`, static middleware, direct volume URLs, or client-constructed paths.
- All irreversible or permission-sensitive changes must be enforced and auditable on the server.

## Languages
Product interface defaults to **Arabic (RTL)** with optional **English (LTR)**. Developer documentation is in English to keep entity, API, state, and test names unambiguous. All visible Arabic strings must be translated through `next-intl` message catalogs; no hard-coded user-facing strings.
