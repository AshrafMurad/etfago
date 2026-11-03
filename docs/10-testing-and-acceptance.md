# 10 — Testing strategy and release acceptance

## Testing layers
- **Unit:** Zod constraints, canonical serialization/content hash, term comparison, state transitions, permission decision functions, currency/date formatting.
- **Integration (real PostgreSQL test DB):** repository authorization, review transactions, concurrent final approvals, invitation redemption, storage metadata/reconciler, outbox behavior.
- **E2E (Playwright or equivalent):** Arabic signup, separate accounts and invited party, create draft, submit, approve, amend, review again, commitments, authorized file download, print.
- **Operational:** restart/redeploy, backup restore of database and server file volume, disk-full simulation in staging, email outage handling.

## Product acceptance scenarios
| ID | Given | When | Then |
|---|---|---|---|
| A-01 | Verified organizer | Creates agreement without price/date | Draft saved; no business-only required fields |
| A-02 | Organizer and invited account | Invite accepted using matching verified email | Joined member can view exactly shared agreement |
| A-03 | Invited but unverified recipient | Attempts invite redemption / review | Denied with verify-email action |
| A-04 | Draft with joined required reviewers | Organizer submits | Frozen V1 and reviewer snapshot created |
| A-05 | Organizer alone has approved V1 | Views agreement | It is pending, never 'agreed' |
| A-06 | All required reviewers approve V1 | Last required approval recorded | Current approved = V1, activity + notifications consistent |
| A-07 | V1 approved | Participant proposes a term change | V1 unchanged, change request OPEN |
| A-08 | Proposal accepted into draft | Organizer submits V2 | V1 remains current, V2 pending with diff |
| A-09 | Reviewer requests changes on V2 | Review resolves | V2 REJECTED; current remains V1; new review required |
| A-10 | Approved V1 + pending V2 | All required approve V2 | V2 current; V1 superseded; all links still viewable |
| A-11 | Approved V1 | User adds commitment | Assignee sees task; optional due date works |
| A-12 | Version-linked commitment, later term change | V2 approved | Linked commitment flagged for review, not silently rewritten |
| A-13 | Authorized participant | Uploads valid PDF/image | File READY on private volume; metadata visible |
| A-14 | Authorized participant | Downloads file after app redeploy | File still present and correct bytes |
| A-15 | Nonparticipant / revoked participant | Reads version, comment or file | Forbidden / not found, no information disclosure |
| A-16 | Organizer | Prints Arabic agreement summary | Original and current versions correctly differentiated; disclaimer present |
| A-17 | Email provider temporarily fails | Invitation/notice attempted | User sees honest status and can retry; no fake success claim |
| A-18 | Archived agreement | User tries to mutate | Server denies, history remains visible to authorized participant |

## Mandatory security and adversarial scenarios
1. **IDOR:** change `agreementId`, `versionId`, `attachmentId`, `workspaceId` in every route; unrelated actors cannot access another resource.
2. **Role forgery:** client submits `organizerUserId` or `reviewerId` of another person; server ignores or rejects.
3. **Version race:** simultaneous final approvals trigger one promotion, not duplicate events or stale pointer.
4. **Stale review:** changing a frozen version is impossible; approval with stale content hash rejects.
5. **Reviewer removal:** removal during pending review withdraws it transactionally; removed user can no longer access shared files.
6. **Invitation abuse:** wrong email, replayed token, expired token, leaked token in logs, invite enumeration/rate limiting.
7. **Upload abuse:** MIME mismatch, forged extension, oversized body, quota race, path traversal, symlink, SSRF-like URL requests (URLs not supported), dangerous filename header.
8. **Download abuse:** path discovery, unauthenticated direct route, CDN/static path guessing, attachment belonging to other agreement.
9. **XSS:** agreement titles, comments, term descriptions, filenames rendered safely; don't render arbitrary HTML.
10. **CSRF:** cookie authenticated mutation from foreign origin cannot approve or upload.
11. **Disk failure:** low space, permission denied, partial stream, checksum mismatch; metadata not READY unless bytes committed.
12. **Auth lifecycle:** revoked session and changed email cannot keep approval/invite authority.

## End-to-end smoke scenario (minimum)
- Alice creates service agreement in personal workspace with 3 terms and no mandatory financial amount.
- Alice invites Bob's address; Bob verifies, signs in, accepts.
- Alice submits V1; Alice approves; Bob approves; UI shows both decisions and agreed V1.
- Bob proposes a later date; Alice accepts proposal into draft and submits V2.
- Bob requests changes; V2 rejected, V1 remains effective.
- Alice revises draft and submits V3; both approve; V3 becomes effective, V1 superseded, V2 remains historical rejected.
- Alice adds commitment; Bob updates an assigned task.
- Alice uploads an image, Bob downloads it; Charlie cannot access agreement or file.
- App container is replaced, same persistent volume mounted; file remains downloadable.
- Print view shows V3, timestamp, party list, decision records, limitations/disclaimer.

## Quantitative QA checks
- Seed at least 100 agreements and 20 terms each to check pagination/readability.
- Run keyboard navigation and axe-like accessibility checks on core screens.
- Visual review at 320/375/768/1280px in Arabic RTL and English LTR.
- Run production build, TypeScript, lint, unit, integration and E2E relevant tests in CI.
- Test 10 MiB upload boundary and quota behavior with real multipart streaming.
- Verify backup restore of **both** PostgreSQL and private volume with SHA-256.

## Release-blocking conditions
Any unintended cross-tenant access; bypassable review identity; ability to rewrite approved snapshot; an 'agreed' state without required decisions; file public URL; uploads stored on ephemeral filesystem; missing verified restore; key flows failing in Arabic; missing trust disclaimer. Fix before pilot/public launch.
