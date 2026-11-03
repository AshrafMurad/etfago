import Link from "next/link";
import { useTranslations } from "next-intl";
import { AgreementSummary } from "../../server/agreements/service";
import { Plus, FileText, Users, Calendar } from "lucide-react";

interface WorkspaceAgreementsListProps {
  workspaceId: string;
  agreements: AgreementSummary[];
  locale: string;
}

export function WorkspaceAgreementsList({
  workspaceId,
  agreements,
  locale,
}: WorkspaceAgreementsListProps) {
  const t = useTranslations("Workspaces");
  const agT = useTranslations("Agreements");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {t("tabs.agreements")} ({agreements.length})
          </h2>
        </div>
        <Link
          href={`/${locale}/agreements/new?workspaceId=${workspaceId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("createAgreementInWorkspace")}</span>
        </Link>
      </div>

      {agreements.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {agT("noAgreements")}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {agT("createFirst")}
            </p>
          </div>
          <Link
            href={`/${locale}/agreements/new?workspaceId=${workspaceId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t("createAgreementInWorkspace")}</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agreements.map((ag) => (
            <Link
              key={ag.id}
              href={`/${locale}/agreements/${ag.id}`}
              className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:shadow-sm transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      ag.lifecycleStatus === "AGREED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : ag.lifecycleStatus === "DRAFT"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {agT(`status.${ag.lifecycleStatus}`)}
                  </span>
                  {ag.pendingReviewVersionId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 font-medium">
                      {agT("pendingReviewVersion")}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {ag.title}
                </h3>

                {ag.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {ag.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{ag.termsCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{ag.participantCount}</span>
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(ag.updatedAt).toLocaleDateString(locale)}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
