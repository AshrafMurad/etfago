# 03 — User journeys and UX specification

## Information architecture
```text
/ar or /en
  /                  marketing / brief explanation
  /auth/sign-in      authentication
  /auth/verify-email
  /app               needs-attention home
  /app/agreements    searchable list + filters
  /app/agreements/new
  /app/agreements/[id]
    overview         current approved agreement + attention panel
    draft            organizer draft editor, if allowed
    versions         immutable frozen versions and side-by-side diff
    discussion       version-/term-linked comments
    commitments      tasks from the agreement
    files            authorized private attachments
    activity         audit-friendly event timeline
  /app/invitations   incoming pending invitations
  /app/workspaces    personal/business workspace switcher/settings
  /app/settings      profile, language, notification preferences
```
Avoid deep route nesting if tabs can be rendered inside agreement detail with URL query/tab state. API contracts are defined in doc 05.

## Journey A: first-time organizer creates an agreement
1. Opens app, signs up and verifies email. Personal workspace is created automatically.
2. Presses **اتفاق جديد**. Enters title + optional summary. Chooses personal workspace or business workspace.
3. Adds 1–N **terms** (`title`, `description`, optional `amount/currency`, optional `due date`, optional `assignee`): one reusable term editor, not a legal document canvas.
4. Adds invited parties (person or organization name, email, required reviewer yes/no). Organizer included as reviewer by default.
5. Saves as draft. Can see explicit status: "مسودة — لم يراجعها الأطراف بعد".
6. Presses **إرسال للمراجعة** when required reviewers have joined. UI previews frozen content and reviewer list.
7. Server submits immutable version and sends private review links.
8. Overview says "بانتظار موافقة 1 من 2" or similar and shows pending requests.

**Empty/errors:** no terms; one required reviewer only; unverified invitee; invite bounced/expired; duplicate emails; unsaved edits; session expires. Each error provides an actionable Arabic sentence.

## Journey B: invitee reviews
1. Receives email; opens link. If logged out, signs in and verifies matching email.
2. Redeems invite, sees simple purpose and participating parties.
3. Sees **Version N** and frozen terms; views explicit differences from last approved version if any.
4. Can comment on an individual term (not rewrite it) and choose **أوافق على هذه النسخة** or **أطلب تعديلًا**.
5. Approval confirmation modal shows version number and that this is a platform-recorded acknowledgement (not legal e-signature).
6. Request-changes requires a short reason and closes review; organizer receives notification.

## Journey C: proposed change after existing approval
1. Current approved Version 1 is visible throughout.
2. Participant proposes term change (before/after + explanation).
3. Organizer accepts proposal into **editable draft** or rejects with explanation. A proposal is not an approved amendment.
4. Organizer publishes a new frozen Version 2 for review; overview shows Version 1 CURRENT, Version 2 PENDING.
5. All required reviewers approve Version 2. Atomic promotion makes Version 2 CURRENT and marks V1 superseded.
6. If any reviewer requests changes, Version 2 becomes rejected, V1 remains CURRENT, and a fresh draft starts from V2 (or V1, organizer chooses explicitly). No silent reuse of V2 approvals.

## Journey D: commitment tracking
1. From approved agreement, organizer creates commitment with title, optional due date and assigned participant.
2. Assigned person marks progress (`TODO`, `IN_PROGRESS`, `DONE`). Organizer can edit assignment.
3. If underlying approved term changes later, linked commitment shows "Review after amendment" rather than silently rewriting due date or assignee.
4. Agreement can be completed after organizer confirms commitments handled; incomplete tasks require explicit confirmation/warning.

## Core UI surfaces
- **Home:** personal action list (invites, reviews, change proposals, due soon) before analytics.
- **Agreement list:** title, partner(s), current/pending state, updated date, next action. Search+filter.
- **Overview:** approved Version N as the main content; pending version visibly separate, not merged.
- **Review screen:** sticky version identification, per-term before/after, comments, clear review decisions.
- **Change dialog:** old field (read-only), proposed value, reason, field validation, save and undo confirmation.
- **History:** timeline with action, actor, timestamp and version link. Use meaningful status labels.
- **Files:** filename, uploader, date, type, size, download; no inline browser execution of untrusted files.

## UX details and accessibility
- Mobile-first: one-column edit and detail view, accessible menus/dialogs, no horizontal overflow in RTL.
- Use status wording, not color alone; prevent accidental approval by separate confirmation.
- Don't show agreement as "تم الاتفاق" until each required reviewer approved a frozen version.
- Provide helpful read-only screens to removed/revoked users? **No:** removed participants immediately lose content access; show generic access-denied page.
- Loading/saving/error/empty states for every screen; optimistic client changes only when rollback is safe.
- Use readable relative dates with exact datetime available in tooltip/detail.
- Important empty states: no agreements; pending invitation; no approved version yet; no changes; no commitments; archived agreement.

## Bilingual microcopy examples
| English | Arabic |
|---|---|
| Agreement | اتفاق |
| Draft | مسودة |
| Submit for review | إرسال للمراجعة |
| This version is awaiting approval | هذه النسخة بانتظار الموافقة |
| Current agreed version | النسخة التي وافق عليها الأطراف حاليًا |
| Propose change | اقتراح تعديل |
| Request changes | طلب تعديلات |
| Record approval | تسجيل الموافقة |
| Outstanding commitments | التزامات غير مكتملة |
| Recorded approval does not constitute verified legal signature | تسجيل الموافقة لا يمثل توقيعًا قانونيًا موثقًا |
