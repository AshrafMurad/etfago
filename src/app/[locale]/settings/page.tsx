import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import { getUserNotificationPreferences } from "@/server/notifications/preferences";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/features/settings/NotificationPreferencesForm";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const preferences = await getUserNotificationPreferences(user.id);
  const t = await getTranslations({ locale, namespace: "Settings" });
  const authT = await getTranslations({ locale, namespace: "Auth" });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-marker text-[var(--dp-color-ink)]">
          {t("title")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Account Info Card */}
      <div className="sketch-card p-6 space-y-4 relative">
        <div className="sketch-tape-top" />
        <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)] border-b border-[var(--dp-color-line)] pb-3">
          {t("accountTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs font-marker text-[var(--dp-color-ink-muted)] block mb-1">
              {t("emailLabel")}
            </span>
            <span className="font-mono text-[var(--dp-color-ink)] text-sm" dir="ltr">
              {user.email}
            </span>
          </div>
          <div>
            <span className="text-xs font-marker text-[var(--dp-color-ink-muted)] block mb-1">
              {authT("statusLabel") || "Status"}
            </span>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold font-marker px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]">
                ✓ {t("verifiedNotice")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold font-marker px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]">
                ! {t("unverifiedNotice")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="sketch-card p-6 space-y-5 relative">
        <div>
          <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
            {t("preferencesTitle")}
          </h2>
          <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-1">
            {t("preferencesSubtitle")}
          </p>
        </div>

        <NotificationPreferencesForm
          initialReviewReminders={preferences.reviewReminders}
          initialCommitmentReminders={preferences.commitmentReminders}
        />
      </div>
    </div>
  );
}
