import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../server/auth/session";
import { listUserWorkspaces } from "../../../server/workspaces/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateWorkspaceForm } from "../../../features/workspaces/CreateWorkspaceForm";

interface WorkspacesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function WorkspacesPage({ params }: WorkspacesPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const workspaces = await listUserWorkspaces(user.id);
  const t = await getTranslations({ locale, namespace: "Workspaces" });
  const authT = await getTranslations({ locale, namespace: "Auth" });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* User Verification Warning if unverified */}
      {!user.emailVerified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">{authT("unverifiedBadge")}</p>
          <p className="mt-1 text-xs opacity-90">{authT("legalNote")}</p>
        </div>
      )}

      {/* Create New Business Workspace Form */}
      <CreateWorkspaceForm />

      {/* Workspaces Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            href={`/${locale}/workspaces/${ws.id}`}
            className="block p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 transition-colors shadow-xs group"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  ws.kind === "PERSONAL"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                }`}
              >
                {ws.kind === "PERSONAL" ? t("personal") : t("business")}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t(`roles.${ws.role}`)}
              </span>
            </div>

            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {ws.name}
            </h2>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span>{t("members")}: {ws.memberCount}</span>
              <span>{new Date(ws.createdAt).toLocaleDateString(locale)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
