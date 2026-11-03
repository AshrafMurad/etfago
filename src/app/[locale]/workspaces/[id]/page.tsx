import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { getWorkspace } from "../../../../server/workspaces/service";
import { listAgreements } from "../../../../server/agreements/service";
import { getWorkspaceOperationalReport } from "../../../../server/workspaces/reporting";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { WorkspaceTabs } from "../../../../features/workspaces/WorkspaceTabs";
import { WorkspaceAgreementsList } from "../../../../features/workspaces/WorkspaceAgreementsList";
import { WorkspaceOperationalReportsView } from "../../../../features/workspaces/WorkspaceOperationalReportsView";
import { WorkspaceMemberList } from "../../../../features/workspaces/WorkspaceMemberList";
import { WorkspaceSettingsView } from "../../../../features/workspaces/WorkspaceSettingsView";
import { ForbiddenError, NotFoundError } from "../../../../lib/errors";

interface WorkspaceDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: WorkspaceDetailPageProps) {
  const { locale, id } = await params;
  const { tab = "agreements" } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  let workspace;
  try {
    workspace = await getWorkspace(user.id, id);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const [agreements, report, t] = await Promise.all([
    listAgreements(user.id, { workspaceId: id }),
    getWorkspaceOperationalReport(user.id, id),
    getTranslations({ locale, namespace: "Workspaces" }),
  ]);

  const canManageSettings =
    workspace.currentActorRole === "OWNER" || workspace.currentActorRole === "ADMIN";
  const isOwner = workspace.currentActorRole === "OWNER";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href={`/${locale}/workspaces`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← {t("title")}
        </Link>
      </div>

      {/* Workspace Header */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                workspace.kind === "PERSONAL"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {workspace.kind === "PERSONAL" ? t("personal") : t("business")}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
              {t(`roles.${workspace.currentActorRole}`)}
            </span>
            {workspace.archivedAt && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 font-medium">
                Archived
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {workspace.name}
          </h1>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {new Date(workspace.createdAt).toLocaleDateString(locale)}
        </div>
      </div>

      {/* Tab Navigation */}
      <WorkspaceTabs
        locale={locale}
        workspaceId={workspace.id}
        activeTab={tab}
        canManageSettings={canManageSettings}
        agreementsCount={agreements.length}
        membersCount={workspace.members.length}
      />

      {/* Tab Content */}
      <div className="pt-2">
        {tab === "agreements" && (
          <WorkspaceAgreementsList
            workspaceId={workspace.id}
            agreements={agreements}
            locale={locale}
          />
        )}

        {tab === "reports" && (
          <WorkspaceOperationalReportsView report={report} locale={locale} />
        )}

        {tab === "members" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t("members")} ({workspace.members.length})
            </h2>
            <WorkspaceMemberList
              workspaceId={workspace.id}
              members={workspace.members}
              currentActorRole={workspace.currentActorRole}
              ownerUserId={workspace.ownerUserId}
              currentActorUserId={user.id}
            />
          </div>
        )}

        {tab === "settings" && canManageSettings && (
          <WorkspaceSettingsView
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            workspaceKind={workspace.kind}
            isArchived={!!workspace.archivedAt}
            currentActorRole={workspace.currentActorRole}
            isOwner={isOwner}
            members={workspace.members}
          />
        )}
      </div>
    </div>
  );
}
