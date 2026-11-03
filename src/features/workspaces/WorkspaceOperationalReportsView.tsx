import { useTranslations } from "next-intl";
import { WorkspaceOperationalReport } from "../../server/workspaces/reporting";
import {
  FileSpreadsheet,
  FileCode,
  FileText,
  Users,
  Activity,
  CheckSquare,
} from "lucide-react";

interface WorkspaceOperationalReportsViewProps {
  report: WorkspaceOperationalReport;
  locale: string;
}

export function WorkspaceOperationalReportsView({
  report,
  locale,
}: WorkspaceOperationalReportsViewProps) {
  const t = useTranslations("Workspaces.reports");
  const commT = useTranslations("Commitments");

  const { metrics, commitments, recentActivity } = report;

  return (
    <div className="space-y-8">
      {/* Header and Export Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("title")}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={`/api/workspaces/${report.workspace.id}/export?format=csv`}
            download
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t("exportCsv")}</span>
          </a>
          <a
            href={`/api/workspaces/${report.workspace.id}/export?format=json`}
            download
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>{t("exportJson")}</span>
          </a>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Agreements Overview Card */}
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("totalAgreements")}
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {metrics.agreements.total}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {t("agreedAgreements")}: {metrics.agreements.agreed}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {t("draftAgreements")}: {metrics.agreements.draft}
              </span>
              {metrics.agreements.pendingReview > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                  {t("pendingReviews")}: {metrics.agreements.pendingReview}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Commitments & Completion Rate Card */}
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("totalCommitments")}
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {metrics.commitments.total}
              </div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                {metrics.commitments.completionRate}% {t("completionRate")}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.commitments.completionRate}%` }}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {t("completedCommitments")}: {metrics.commitments.done}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {t("inProgressCommitments")}: {metrics.commitments.inProgress}
              </span>
              {metrics.commitments.overdue > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">
                  {t("overdueCommitments")}: {metrics.commitments.overdue}
                </span>
              )}
              {metrics.commitments.needsReview > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {t("needsReviewCommitments")}: {metrics.commitments.needsReview}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Members & Governance Card */}
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {report.workspace.kind === "PERSONAL" ? "Personal Space" : "Team & Members"}
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {metrics.members.total}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Owners: {metrics.members.owners}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Admins: {metrics.members.admins}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Members: {metrics.members.regularMembers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commitments Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            {t("commitmentsBreakdown")} ({commitments.length})
          </h3>
        </div>

        {commitments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("noCommitments")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={locale === "ar" ? "rtl" : "ltr"}>
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">{t("tableCommitment")}</th>
                  <th className="py-3 px-4 font-semibold">{t("tableAgreement")}</th>
                  <th className="py-3 px-4 font-semibold">{t("tableAssignee")}</th>
                  <th className="py-3 px-4 font-semibold">{t("tableDueDate")}</th>
                  <th className="py-3 px-4 font-semibold">{t("tableStatus")}</th>
                  <th className="py-3 px-4 font-semibold">{t("tableFlags")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {commitments.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {c.title}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                      <a
                        href={`/${locale}/agreements/${c.agreementId}`}
                        className="hover:underline text-emerald-600 dark:text-emerald-400"
                      >
                        {c.agreementTitle}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {c.assigneeName || c.assigneeEmail || "—"}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {c.dueAt ? new Date(c.dueAt).toLocaleDateString(locale) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          c.status === "DONE"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : c.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            : c.status === "CANCELLED"
                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {commT(`status.${c.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.isOverdue && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">
                            {t("overdueBadge")}
                          </span>
                        )}
                        {c.needsReview && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {t("needsReviewBadge")}
                          </span>
                        )}
                        {!c.isOverdue && !c.needsReview && (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Workspace Activity Stream */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
            {t("recentActivity")}
          </h3>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("noActivity")}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 p-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {act.actorName || act.actorEmail || "User"}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                    [{act.action}]
                  </span>
                  <a
                    href={`/${locale}/agreements/${act.agreementId}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {act.agreementTitle}
                  </a>
                </div>
                <div className="text-zinc-400 font-mono">
                  {new Date(act.createdAt).toLocaleString(locale)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
