# 01 — Product requirements and scope

Requirement IDs are stable; use them in tests and sprint reports. **P0** = release-blocking core, **P1** = first public release support, **P2** = post-launch consideration.

## Functional requirements

| ID | Priority | Requirement | Acceptance summary |
|---|---|---|---|
| F-01 | P0 | Account registration, sign-in, sign-out, verified email | Non-verified users cannot approve/reject agreement versions or accept invites. |
| F-02 | P0 | Personal workspace auto-created; optional business workspace | Workspace has owner; business metadata is display-only, not verified legal identity. |
| F-03 | P0 | Create/edit agreement draft: title, description, optional category, freeform structured terms | Valid draft saves server-side; title and at least one nonempty term required for submission. |
| F-04 | P0 | Individual and organization-name parties | Party display names/roles captured; required reviewers use verified accounts. |
| F-05 | P0 | Invite participants by verified email | Secure one-use, expiring invitation; only target signed-in verified email may redeem. |
| F-06 | P0 | Submit immutable version for review | Snapshot, reviewer roster and content hash are frozen; cannot overwrite afterward. |
| F-07 | P0 | Approve or request changes on pending version | Explicit decision by eligible reviewer; duplicate/substituted action rejected. |
| F-08 | P0 | Promote unanimously approved version | All required reviewers of that version approved; transactionally update current approved version. |
| F-09 | P0 | Propose amendment, review old/new terms, create next version | Prior approved version remains authoritative until replacement reaches approval. |
| F-10 | P0 | Agreement detail: current agreed terms vs pending proposal | Never present unapproved changes as currently agreed. |
| F-11 | P0 | Activity history and version timeline | Who performed what, when, and on which version; no silent deletion. |
| F-12 | P0 | Agreement-level authorization and isolation | Members only see explicitly accessible agreements; blocked requests get 403/404. |
| F-13 | P1 | Term-specific comments on review version | Participants can discuss; comments do not mutate snapshot. |
| F-14 | P1 | Commitments with assignee and optional due date | Participants can track progress without rewriting agreed snapshot. |
| F-15 | P1 | File attachments stored privately on persistent server disk | Authorized upload/download; no public disk path; bounded types, quotas. |
| F-16 | P1 | Essential email notifications | Invite, review requested, decision, agreed; non-sensitive summaries and app links. |
| F-17 | P1 | Printable agreement summary / PDF via browser print | Shows version, participants, terms, decisions and disclaimers. |
| F-18 | P1 | Agreement list, filters, action-needed, archive | Fast keyboard-accessible searchable list; archived agreements remain readable. |
| F-19 | P1 | Arabic and English localization | Arabic default, full RTL; all system-visible strings localized. |
| F-20 | P1 | Data export & account privacy tools | Download own agreement summary; basic user/account deletion request flow documented. |
| F-21 | P2 | Templates | Personal/shared responsibility/service/supply starter templates. |
| F-22 | P2 | Reminders and due-date email | Idempotent background scheduling; respect notification settings. |
| F-23 | P2 | Advanced approval policies and ordered/quorum review | Initial release supports 2–5 required parties with unanimous review; configurable voting/quorum rules require separate design. |
| F-24 | P2 | Advanced business roles/reporting | After real usage and validated requirements. |

### Interpretation of 'accepted'
A platform 'approval' is **a recorded authenticated click by a verified-email account** agreeing to a displayed version for product workflow. UI must never assert legal validity, qualified e-signature, verified real identity, or authority to represent an organization.

## Nonfunctional requirements
- **N-01 Security:** authorization and input validation on server; role/membership isolation for workspace and agreement objects; rate limiting for public auth/invites/uploads.
- **N-02 Consistency:** immutable submitted versions; atomic promotion; no lost approvals from concurrent actions.
- **N-03 Privacy:** no public agreements/files; privacy-conscious emails and logs; data retention and export policy.
- **N-04 Localization:** Arabic first with correct bidi and localized numerals/dates; English parity.
- **N-05 Accessibility:** keyboard access, visible focus, labeled controls, status conveyed by text not color alone; WCAG 2.2 AA aspiration.
- **N-06 Reliability:** persistent PostgreSQL + file volume backups; failure and recovery documented.
- **N-07 Performance targets:** ordinary list/details interactions should remain responsive with 100 agreements/workspace and 20 terms/agreement; test before claiming SLAs.
- **N-08 Operational simplicity:** single persistent VPS deployment; no production dependence on ephemeral filesystem.

## Explicit exclusions from V1
- Legally recognized e-signature / identity verification / notarization.
- Automatically extracting agreements from WhatsApp/email or scraping private chats.
- AI legal drafting and automatic legal advice.
- Payments, invoicing, financial settlement, dispute arbitration.
- Open public share links to private agreements.
- Inline editing of PDFs/Word as agreement source of truth.
- Real-time collaborative rich text; audio/video calling.
- Multi-region hosting or horizontal scaling before shared storage redesign.

## Data limits and configurable constraints (initial defaults)
- Agreement title <= 160 chars; description <= 4,000; each term title <= 120, body <= 4,000.
- Max 50 terms in a draft; max 5 required reviewers initial UI (service model can support more).
- Comment <= 2,000 chars; change proposal explanation <= 2,000.
- Attachments: PDF, PNG, JPG/JPEG, WebP only; max 10 MiB each, 20 attachments/agreement, 200 MiB/workspace. Revisit after observing usage.
- Invite token validity 7 days, single-use; resend invalidates previous outstanding token.
- Bound user-generated text and prevent HTML execution; no markdown/HTML rendering in V1 unless sanitized.

## Release criteria
Core acceptance scenarios and security matrix in `10-testing-and-acceptance.md` pass using separate accounts, not only a seeded owner. The storage backup includes DB and attachment volume and has a rehearsed restore procedure. Internal preview should precede public launch.
