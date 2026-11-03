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
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
        <div className="text-4xl text-amber-500">⚠️</div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {tInvitations("expiredTitle")}
        </h1>
        <p className="text-sm text-zinc-500">
          {tInvitations("expiredDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
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
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
        <div className="text-4xl text-amber-500">⚠️</div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {tInvitations("expiredTitle")}
        </h1>
        <p className="text-sm text-zinc-500">
          {tInvitations("expiredDescription")}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
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
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg mx-auto">
            ✉
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {tInvitations("redeemTitle")}
          </h1>
          <p className="text-xs text-zinc-500">
            {tInvitations("inviterSubtitle", { inviter: preview.inviterName })}
          </p>
        </div>

        {/* Agreement summary */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div>
            <span className="text-[11px] font-semibold text-zinc-400 block mb-0.5">
              {tInvitations("agreement")}
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {preview.agreementTitle}
            </h2>
            {preview.agreementDescription && (
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                {preview.agreementDescription}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/60 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px]">{tInvitations("partyDisplayName")}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {preview.partyDisplayName}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">{tInvitations("role")}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {tInvitations(`roles.${preview.role}`) || preview.role}
              </span>
            </div>
          </div>
        </div>

        {/* Invited address notice */}
        <div className="text-xs text-zinc-500 text-center font-mono">
          {tInvitations("invitedEmailNotice", { email: preview.invitedEmail })}
        </div>

        {/* User state handling */}
        {!currentUser ? (
          <div className="space-y-3">
            <Link
              href={`/${locale}/auth/signin?email=${encodeURIComponent(preview.invitedEmail)}`}
              className="block w-full py-3 px-6 rounded-xl bg-emerald-600 text-white font-bold text-sm text-center hover:bg-emerald-700 transition-colors shadow-xs"
            >
              تسجيل الدخول / إنشاء حساب للمتابعة
            </Link>
          </div>
        ) : !isEmailMatching ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-3">
            <p>
              {tInvitations("wrongAccountNotice", {
                currentEmail: currentUser.email,
                targetEmail: preview.invitedEmail,
              })}
            </p>
            <Link
              href={`/${locale}/auth/signin?email=${encodeURIComponent(preview.invitedEmail)}`}
              className="inline-block font-semibold underline"
            >
              التبديل إلى الحساب المطلوب
            </Link>
          </div>
        ) : !isVerified ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 space-y-2">
            <p>{tInvitations("unverifiedNotice")}</p>
            <Link
              href={`/${locale}/auth/signin`}
              className="inline-block font-semibold underline"
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

        <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
          {tInvitations("legalDisclaimer")}
        </p>
      </div>
    </div>
  );
}
