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
      <div className="sketch-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--dp-color-accent)]" />
            <span>{t("title")}</span>
          </h2>
          <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={`/api/workspaces/${report.workspace.id}/export?format=csv`}
            download
            className="sketch-btn sketch-btn-primary text-xs inline-flex items-center justify-center gap-2 px-3 py-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t("exportCsv")}</span>
          </a>
          <a
            href={`/api/workspaces/${report.workspace.id}/export?format=json`}
            download
            className="sketch-btn sketch-btn-outline text-xs inline-flex items-center justify-center gap-2 px-3 py-1.5"
          >
            <FileCode className="w-4 h-4" />
            <span>{t("exportJson")}</span>
          </a>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Agreements Overview Card */}
        <div className="sketch-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-marker text-[var(--dp-color-ink-muted)]">
              {t("totalAgreements")}
            </span>
            <div className="p-2 bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-annotation)] rounded-[4px_2px_5px_3px]">
              <FileText className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold font-marker text-[var(--dp-color-ink)] font-mono">
              {metrics.agreements.total}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--dp-color-line)]/60 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d] font-marker font-bold">
                {t("agreedAgreements")}: {metrics.agreements.agreed}
              </span>
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-marker font-bold">
                {t("draftAgreements")}: {metrics.agreements.draft}
              </span>
              {metrics.agreements.pendingReview > 0 && (
                <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-annotation)] border border-[var(--dp-color-annotation)] font-marker font-bold">
                  {t("pendingReviews")}: {metrics.agreements.pendingReview}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Commitments & Completion Rate Card */}
        <div className="sketch-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-marker text-[var(--dp-color-ink-muted)]">
              {t("totalCommitments")}
            </span>
            <div className="p-2 bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] rounded-[4px_2px_5px_3px]">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold font-marker text-[var(--dp-color-ink)] font-mono">
                {metrics.commitments.total}
              </div>
              <div className="text-xs font-bold font-marker text-[var(--dp-color-ink)] font-mono">
                {metrics.commitments.completionRate}% {t("completionRate")}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="bg-[var(--dp-color-highlight)] border-e border-[var(--dp-color-ink)] h-full transition-all duration-500"
                style={{ width: `${metrics.commitments.completionRate}%` }}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--dp-color-line)]/60 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d] font-marker">
                {t("completedCommitments")}: {metrics.commitments.done}
              </span>
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
                {t("inProgressCommitments")}: {metrics.commitments.inProgress}
              </span>
              {metrics.commitments.overdue > 0 && (
                <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-marker font-bold">
                  {t("overdueCommitments")}: {metrics.commitments.overdue}
                </span>
              )}
              {metrics.commitments.needsReview > 0 && (
                <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-marker">
                  {t("needsReviewCommitments")}: {metrics.commitments.needsReview}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Members & Governance Card */}
        <div className="sketch-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-marker text-[var(--dp-color-ink-muted)]">
              {report.workspace.kind === "PERSONAL" ? t("personalSpace") : t("teamMembers")}
            </span>
            <div className="p-2 bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-annotation)] rounded-[4px_2px_5px_3px]">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-bold font-marker text-[var(--dp-color-ink)] font-mono">
              {metrics.members.total}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--dp-color-line)]/60 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)] font-marker">
                {t("owners")}: {metrics.members.owners}
              </span>
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)] font-marker">
                {t("admins")}: {metrics.members.admins}
              </span>
              <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
                {t("members")}: {metrics.members.regularMembers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commitments Table */}
      <div className="sketch-card overflow-hidden">
        <div className="p-5 border-b border-[var(--dp-color-line)]">
          <h3 className="font-bold font-marker text-[var(--dp-color-ink)] text-sm">
            {t("commitmentsBreakdown")} ({commitments.length})
          </h3>
        </div>

        {commitments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--dp-color-ink-muted)] font-reading border-dashed">
            {t("noCommitments")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" dir={locale === "ar" ? "rtl" : "ltr"}>
              <thead className="bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] border-b border-[var(--dp-color-line)] font-marker">
                <tr>
                  <th className="py-3 px-4 font-bold">{t("tableCommitment")}</th>
                  <th className="py-3 px-4 font-bold">{t("tableAgreement")}</th>
                  <th className="py-3 px-4 font-bold">{t("tableAssignee")}</th>
                  <th className="py-3 px-4 font-bold">{t("tableDueDate")}</th>
                  <th className="py-3 px-4 font-bold">{t("tableStatus")}</th>
                  <th className="py-3 px-4 font-bold">{t("tableFlags")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dp-color-line)]/50">
                {commitments.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--dp-color-ground)]/50 transition-colors">
                    <td className="py-3 px-4 font-bold font-marker text-[var(--dp-color-ink)]">
                      {c.title}
                    </td>
                    <td className="py-3 px-4 text-[var(--dp-color-ink)] font-reading">
                      <a
                        href={`/${locale}/agreements/${c.agreementId}`}
                        className="hover:underline text-[var(--dp-color-annotation)] font-marker"
                      >
                        {c.agreementTitle}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-[var(--dp-color-ink-muted)] font-mono">
                      {c.assigneeName || c.assigneeEmail || "—"}
                    </td>
                    <td className="py-3 px-4 text-[var(--dp-color-ink-muted)] font-mono">
                      {c.dueAt ? new Date(c.dueAt).toLocaleDateString(locale) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-[4px_2px_5px_3px] font-bold font-marker border ${
                          c.status === "DONE"
                            ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border-[#96b79d]"
                            : c.status === "IN_PROGRESS"
                            ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)]"
                            : c.status === "CANCELLED"
                            ? "bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] line-through"
                            : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]"
                        }`}
                      >
                        {commT(`status.${c.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.isOverdue && (
                          <span className="px-1.5 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-bold font-marker">
                            {t("overdueBadge")}
                          </span>
                        )}
                        {c.needsReview && (
                          <span className="px-1.5 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-bold font-marker">
                            {t("needsReviewBadge")}
                          </span>
                        )}
                        {!c.isOverdue && !c.needsReview && (
                          <span className="text-[var(--dp-color-ink-muted)] text-xs">—</span>
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
      <div className="sketch-card overflow-hidden">
        <div className="p-5 border-b border-[var(--dp-color-line)]">
          <h3 className="font-bold font-marker text-[var(--dp-color-ink)] text-sm">
            {t("recentActivity")}
          </h3>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--dp-color-ink-muted)] font-reading border-dashed">
            {t("noActivity")}
          </div>
        ) : (
          <div className="divide-y divide-[var(--dp-color-line)]/50 p-2">
            {recentActivity.map((act) => (
              <div
                key={act.id}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--dp-color-accent)]" />
                  <span className="font-bold font-marker text-[var(--dp-color-ink)]">
                    {act.actorName || act.actorEmail || "—"}
                  </span>
                  <span className="text-[var(--dp-color-ink-muted)] font-mono">
                    [{act.action}]
                  </span>
                  <a
                    href={`/${locale}/agreements/${act.agreementId}`}
                    className="text-[var(--dp-color-annotation)] hover:underline font-marker"
                  >
                    {act.agreementTitle}
                  </a>
                </div>
                <div className="text-[var(--dp-color-ink-muted)] font-mono">
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
