# 08 — UI system, Arabic-first localization and accessibility

## Design principles
Product character: **calm, trustworthy, precise, approachable**; clear information hierarchy over visual spectacle. Agreement overview should explain **what is agreed, what is pending, who must act**.

### Proposed initial identity (not final branding approval)
- Primary ink: `#243B70` (deep blue; use for primary actions/links sparingly)
- Base background: `#F8F9FC`; surface: `#FFFFFF`; primary text: `#202A40`.
- Secondary: neutral slate; status accents from semantic tokens (not arbitrary color use).
- Arabic type: `IBM Plex Sans Arabic`; English: `IBM Plex Sans` or `Inter` depending on visual QA. Font choice can be updated before implementation sign-off.
- Radius: 10–14px panels; subtle borders; shadows only for dialogs/overlays.
- Spacing scale: 4/8/12/16/24/32px; 8px grid; generous vertical separation between unrelated groups.

These are a starting point, not a reuse of another product's identity. Define semantic tokens in CSS to permit redesign without touching component logic.

## Design tokens and themes
```css
:root {
  --background: ...;
  --foreground: ...;
  --surface: ...;
  --border: ...;
  --muted: ...;
  --muted-foreground: ...;
  --primary: ...;
  --primary-foreground: ...;
  --success: ...;
  --warning: ...;
  --danger: ...;
  --focus-ring: ...;
}
```
Use approved WCAG contrast checks for normal text, focus and disabled states; do not rely on raw hex color use in each component. Light-first initially; dark theme can be added in an independent sprint without compromising light mode.

## Layout
- Responsive sidebar on desktop; collapsible drawer on small screens; main workspace max-width ~1200px.
- Home: greeting/context, actionable requests, recent agreements; no unnecessary charts.
- Lists: aligned columns, distinct row actions, sensible empty/loading/error states, minimum widths for status chips to avoid jumpy tables.
- Detail: summary header + **Current agreed version** + visibly separate **Pending review** + collapsible history.
- Dialogs for sensitive review confirmation, change proposal and participant invite. No browser-default styling for important selects.
- Print layout is separate, minimal, suitable for A4 and bidi text; include page breaks at semantic boundaries.

## Component inventory
`AppShell`, `WorkspaceSwitcher`, `AgreementCard`, `AgreementTable`, `StatusPill`, `AgreementSummary`, `TermsList`, `TermEditor`, `VersionBadge`, `VersionDiff`, `ReviewDecisionBar`, `InviteParticipantDialog`, `ChangeRequestDialog`, `CommentThread`, `ActivityTimeline`, `CommitmentRow`, `AttachmentList`, `AttentionItem`, `EmptyState`, `ErrorState`, `ConfirmDialog`.

## Localization requirements
- Routes `/ar` (default) and `/en`; html `lang` and `dir` set correctly per locale at layout level.
- Translate all labels, validation errors, notification subjects/templates, loading states, status descriptions and confirmation text via `next-intl`.
- Avoid CSS logical-direction bugs: use `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, etc., not physical left/right when direction matters.
- Use `<bdi>` around emails, IDs, version hashes and mixed Latin/Arabic sequences; preserve original term text and explicit numbers.
- Store timestamps in UTC; display using locale; store date-only agreement dates as date-only rather than converting through timezone offset.
- Currency formatting must respect explicitly chosen ISO currency without assuming user's location.
- Translation fallbacks must not hide untranslated keys.
- Emails should be sent in each recipient's preferred language when known; default Arabic for unknown user.

## Accessibility
- Target WCAG 2.2 AA where feasible. Accessible labels, visible focus, semantic headings, descriptive button text, keyboard reachable review dialogs.
- Radix/shadcn UI primitives are helpful but require correct use, focus management and screen-reader feedback for async saves.
- Status chips have text and consistent minimum width; not color alone.
- Use clear destructive action dialogs; keyboard Escape behavior should not drop unsaved edits without warning.
- Motion respects `prefers-reduced-motion`; animate only small feedback, never core status changes.
- Test Arabic and English at mobile widths 320, 375, 768, 1280; long terms, mixed Latin emails, large font scaling.

## Product wording policy
- Use "تمت الموافقة على النسخة" not "تم توقيع العقد قانونيًا".
- Use "النسخة الحالية التي وافق عليها الأطراف" for frozen mutually accepted state.
- Use "مقترح" for amendment draft and "قيد المراجعة" for submitted pending version.
- Use "أقرّ بالموافقة على هذه النسخة داخل المنصة" as consent action explanation, not claim of official e-signature.
- Do not imply one person can accept on behalf of another without identity/authority verification.

## Minimum design QA
- No clipped Arabic headings, misaligned mixed-direction numbers, browser-native inconsistent selects, unlabeled icons or low-contrast dark-on-dark text.
- Mobile review approval buttons remain accessible without horizontal scrolling.
- Printing a long Arabic agreement preserves term grouping and page breaks.
