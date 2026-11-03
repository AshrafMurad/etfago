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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Account Info Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          {t("accountTitle")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-zinc-500 block mb-1">
              {t("emailLabel")}
            </span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100 text-sm" dir="ltr">
              {user.email}
            </span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block mb-1">
              {authT("statusLabel") || "Status"}
            </span>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ✓ {t("verifiedNotice")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                ! {t("unverifiedNotice")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t("preferencesTitle")}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
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
