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
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
          {t("title")}
        </h1>
        <p className="text-base font-reading text-[var(--dp-color-ink-muted)] mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* User Verification Warning if unverified */}
      {!user.emailVerified && (
        <div className="sketch-card p-4 border-[1.5px] border-[var(--dp-color-accent)] bg-[#fbeee9] text-sm text-[var(--dp-color-accent)] font-reading">
          <p className="font-bold font-marker">{authT("unverifiedBadge")}</p>
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
            className="sketch-card block p-5 hover:rotate-[-0.2deg] transition-all group"
          >
            <div className="flex items-center justify-between mb-3 font-reading">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-[5px_2px_7px_3px] font-semibold ${
                  ws.kind === "PERSONAL"
                    ? "bg-[var(--dp-color-ground)] text-[var(--dp-color-annotation)] border border-[var(--dp-color-annotation)]"
                    : "bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]"
                }`}
              >
                {ws.kind === "PERSONAL" ? t("personal") : t("business")}
              </span>
              <span className="text-xs text-[var(--dp-color-ink-muted)] font-semibold">
                {t(`roles.${ws.role}`)}
              </span>
            </div>

            <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] group-hover:text-[var(--dp-color-accent)] transition-colors">
              {ws.name}
            </h2>

            <div className="mt-4 flex items-center justify-between text-xs font-reading text-[var(--dp-color-ink-muted)] pt-3 border-t border-dashed border-[var(--dp-color-line)]">
              <span>{t("members")}: {ws.memberCount}</span>
              <span className="font-mono" dir="ltr">{new Date(ws.createdAt).toLocaleDateString(locale)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
