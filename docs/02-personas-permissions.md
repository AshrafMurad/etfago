# 02 — Personas, authorization and participation

## Personas
1. **Individual organizer:** wants to document a shared responsibility, agreement, or service purchase, without company fields.
2. **Small business operator:** owns agreements with customers/suppliers, wants collaborators and auditability.
3. **External counterparty:** invited to only one/few agreements; reviews version, comments, approves/requests changes.
4. **Workspace administrator:** can manage workspace members and workspace metadata; cannot automatically inspect private agreements owned by other workspace members unless included or granted explicit access (policy choice).

## Identity and ownership
- Every registered user has one initial **personal workspace**. They may create or join business workspaces.
- Each agreement belongs to one workspace and has a creator/organizer. Ownership determines who can submit versions, manage participant invites, close/archive the agreement and curate drafts.
- A user can be a `WorkspaceMember` without being a participant in a specific agreement.
- A participant can be invited from outside the owning workspace; they get access only to that agreement.
- A party's `partyKind` (`PERSON` or `ORGANIZATION`) is descriptive. A verified email doesn't prove organizational authorization.

## Workspace roles
- `OWNER`: workspace settings, membership, creation, billing placeholder; no blanket private agreement read unless additionally authorized.
- `ADMIN`: manage workspace membership and workspace-level information, create agreements; no blanket agreement read.
- `MEMBER`: create agreements in workspace and access owned/explicitly shared agreements.

## Agreement roles
- `ORGANIZER`: creates and edits mutable draft; issues invites; submits/retracts versions; initiates lifecycle changes.
- `EDITOR`: optional co-editor explicitly granted by organizer; edits mutable draft and may submit only if configured; release defaults to organizer-only submission.
- `REVIEWER`: reads shared versions, comments, makes change proposals, and makes explicit review decision if `isRequiredReviewer = true`.
- `OBSERVER`: can view shared version and comments; no approvals, edits or proposals.

A user may be both organizer and reviewer; **required reviewer roster contains distinct participant records**, each tied to a verified account at submission. For the initial product, organizer is included as required reviewer by default; at least one other required reviewer is necessary to complete an agreement. This prevents one-sided "agreed" status.

## Authorization matrix
Legend: O=organizer, E=editor (if enabled), R=reviewer, V=observer, X=unrelated workspace member / outsider.

| Action | O | E | R | V | X |
|---|---:|---:|---:|---:|---:|
| View agreement and approved/review versions | ✓ | ✓ | ✓ | ✓ | — |
| Edit current mutable draft | ✓ | configured | — | — | — |
| Create change proposal | ✓ | ✓ | ✓ | — | — |
| Accept proposal into draft | ✓ | configured | — | — | — |
| Invite/remove participants | ✓ | — | — | — | — |
| Submit new review version | ✓ | configured | — | — | — |
| Approve / request changes | only if required | only if required | only if required | — | — |
| Add review comment | ✓ | ✓ | ✓ | configured | — |
| Create/update commitments | ✓ | ✓ | only assigned or explicit editor | — | — |
| Upload attachments | ✓ | ✓ | configured | — | — |
| Download permitted attachment | ✓ | ✓ | ✓ | ✓ | — |
| Archive/reopen | ✓ | — | — | — | — |

## Invitation protocol
1. Organizer selects address, visible name, party kind, review role and whether required.
2. Server normalizes email, checks abuse thresholds, creates **hashed** random token and invite with 7-day expiry.
3. Notification sends a one-time token URL. URL is never logged and token is not stored in plaintext in DB.
4. Recipient signs in / registers and verifies **same normalized email**.
5. Server verifies token hash, expiry, status and target email, then links the participant to account atomically and marks invite consumed.
6. Organizer sees `Invited → Joined`; unaccepted invite does not count as an approval. No review version can be submitted while a required reviewer remains unjoined.
7. Revoked/removed participants lose access immediately, but historical reviewer snapshots and decision records are preserved. To change the required roster after submitting a review, organizer must withdraw/reject current review and submit a new snapshot.

## Access checks and object ownership
Always load agreement in a server service and derive permission from organizer or linked participant, not from `workspaceId` alone. Explicit non-participant workspace members get denied. All child objects (comment, attachment, commitment, version, change request) must resolve parent agreement and pass parent access and object-specific checks. Never let client-supplied `workspaceId`, `userId` or role override session-derived identity.

## Abuse cases
- A guessed agreement ID must not reveal details to non-members.
- An invited person using a different verified email cannot redeem the invitation.
- Removed participants lose access even if they still have old links; historical snapshots remain.
- Organizer cannot fabricate another participant's decision; each reviewer clicks for themselves.
- A user excluded from version roster cannot approve it even if they can view it.
- Changing email on a user account must invalidate access decisions until re-verification and must not silently transfer invitations.
