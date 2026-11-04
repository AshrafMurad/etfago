import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { getInvitationPreview } from "../../../../server/invitations/service";
import Link from "next/link";
import { RedeemInvitationButton } from "../../../../features/invitations/RedeemInvitationButton";

interface RedeemPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function RedeemInvitationPage({
  params,
  searchParams,
}: RedeemPageProps) {
  const { locale } = await params;
  const { token } = await searchParams;

  const [tInvitations, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Invitations" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  if (!token) {
    return (
      <div className="sketch-card max-w-md mx-auto my-12 p-8 text-center space-y-4 relative">
        <div className="sketch-tape-top" />
        <div className="text-4xl text-[var(--dp-color-accent)] font-marker">⚠️</div>
        <h1 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
          {tInvitations("expiredTitle")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
          {tInvitations("expiredDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="sketch-btn sketch-btn-primary text-xs inline-block"
        >
          {tCommon("back")}
        </Link>
      </div>
    );
  }

  let preview;
  try {
    preview = await getInvitationPreview(token);
  } catch {
    return (
      <div className="sketch-card max-w-md mx-auto my-12 p-8 text-center space-y-4 relative">
        <div className="sketch-tape-top" />
        <div className="text-4xl text-[var(--dp-color-accent)] font-marker">⚠️</div>
        <h1 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
          {tInvitations("expiredTitle")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
          {tInvitations("expiredDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="sketch-btn sketch-btn-primary text-xs inline-block"
        >
          {tCommon("back")}
        </Link>
      </div>
    );
  }

  const currentUser = await getCurrentUser();

  const isEmailMatching =
    currentUser &&
    currentUser.email.trim().toLowerCase() === preview.invitedEmail.toLowerCase();

  const isVerified = currentUser && currentUser.emailVerified !== null;

  return (
    <div className="max-w-lg mx-auto my-10 space-y-6">
      <div className="sketch-card p-8 space-y-6 relative">
        <div className="sketch-tape-top" />
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-annotation)] flex items-center justify-center font-bold text-lg mx-auto shadow-[1px_1px_0px_var(--dp-color-ink)] font-marker">
            ✉
          </div>
          <h1 className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
            {tInvitations("redeemTitle")}
          </h1>
          <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading">
            {tInvitations("inviterSubtitle", { inviter: preview.inviterName })}
          </p>
        </div>

        {/* Agreement summary */}
        <div className="p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)] space-y-3">
          <div>
            <span className="text-[11px] font-bold font-marker text-[var(--dp-color-ink-muted)] block mb-0.5">
              {tInvitations("agreement")}
            </span>
            <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
              {preview.agreementTitle}
            </h2>
            {preview.agreementDescription && (
              <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1 line-clamp-2">
                {preview.agreementDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--dp-color-line)] text-xs">
            <div>
              <span className="text-[var(--dp-color-ink-muted)] block text-[10px] font-marker">{tInvitations("partyDisplayName")}</span>
              <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                {preview.partyDisplayName}
              </span>
            </div>
            <div>
              <span className="text-[var(--dp-color-ink-muted)] block text-[10px] font-marker">{tInvitations("role")}</span>
              <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                {tInvitations(`roles.${preview.role}`) || preview.role}
              </span>
            </div>
          </div>
        </div>

        {/* Invited address notice */}
        <div className="text-xs text-[var(--dp-color-ink-muted)] text-center font-mono">
          {tInvitations("invitedEmailNotice", { email: preview.invitedEmail })}
        </div>

        {/* User state handling */}
        {!currentUser ? (
          <div className="space-y-3">
            <Link
              href={`/${locale}/auth/signin?email=${encodeURIComponent(preview.invitedEmail)}`}
              className="sketch-btn sketch-btn-primary block w-full py-3 px-6 text-center font-marker text-sm"
            >
              تسجيل الدخول / إنشاء حساب للمتابعة
            </Link>
          </div>
        ) : !isEmailMatching ? (
          <div className="p-4 rounded-[6px_3px_7px_4px] bg-[#fbeee9] border border-[var(--dp-color-accent)] text-xs text-[var(--dp-color-accent)] space-y-3 font-reading">
            <p>
              {tInvitations("wrongAccountNotice", {
                currentEmail: currentUser.email,
                targetEmail: preview.invitedEmail,
              })}
            </p>
            <Link
              href={`/${locale}/auth/signin?email=${encodeURIComponent(preview.invitedEmail)}`}
              className="inline-block font-bold underline font-marker"
            >
              التبديل إلى الحساب المطلوب
            </Link>
          </div>
        ) : !isVerified ? (
          <div className="p-4 rounded-[6px_3px_7px_4px] bg-[var(--dp-color-highlight)]/40 border border-[var(--dp-color-ink)] text-xs text-[var(--dp-color-ink)] space-y-2 font-reading">
            <p>{tInvitations("unverifiedNotice")}</p>
            <Link
              href={`/${locale}/auth/signin`}
              className="inline-block font-bold underline font-marker"
            >
              إعادة إرسال رابط تأكيد البريد
            </Link>
          </div>
        ) : (
          <RedeemInvitationButton
            token={token}
            locale={locale}
            translations={{
              acceptAndJoin: tInvitations("acceptAndJoin"),
              loading: tCommon("loading"),
            }}
          />
        )}

        <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading text-center leading-relaxed">
          {tInvitations("legalDisclaimer")}
        </p>
      </div>
    </div>
  );
}
