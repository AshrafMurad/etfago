import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "../../../../server/auth/session";
import { getWorkspace } from "../../../../server/workspaces/service";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { WorkspaceMemberList } from "../../../../features/workspaces/WorkspaceMemberList";
import { ForbiddenError, NotFoundError } from "../../../../lib/errors";

interface WorkspaceDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function WorkspaceDetailPage({ params }: WorkspaceDetailPageProps) {
  const { locale, id } = await params;
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

  const t = await getTranslations({ locale, namespace: "Workspaces" });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/${locale}/workspaces`} className="hover:text-zinc-900 dark:hover:text-zinc-100">
          ← {t("title")}
        </Link>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                workspace.kind === "PERSONAL"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
              }`}
            >
              {workspace.kind === "PERSONAL" ? t("personal") : t("business")}
            </span>
            <span className="text-xs text-zinc-500">
              {t(`roles.${workspace.currentActorRole}`)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {workspace.name}
          </h1>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(workspace.createdAt).toLocaleDateString(locale)}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
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
    </div>
  );
}
