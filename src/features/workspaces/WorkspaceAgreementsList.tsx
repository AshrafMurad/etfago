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
          <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
            {t("tabs.agreements")} ({agreements.length})
          </h2>
        </div>
        <Link
          href={`/${locale}/agreements/new?workspaceId=${workspaceId}`}
          className="sketch-btn sketch-btn-primary text-xs inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t("createAgreementInWorkspace")}</span>
        </Link>
      </div>

      {agreements.length === 0 ? (
        <div className="sketch-card p-8 text-center space-y-4 border-dashed">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-center text-[var(--dp-color-ink-muted)]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold font-marker text-base text-[var(--dp-color-ink)]">
              {agT("noAgreements")}
            </h3>
            <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] mt-1">
              {agT("createFirst")}
            </p>
          </div>
          <Link
            href={`/${locale}/agreements/new?workspaceId=${workspaceId}`}
            className="sketch-btn sketch-btn-primary text-xs inline-flex items-center gap-2"
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
              className="sketch-card p-5 hover:shadow-[3px_3px_0px_var(--dp-color-ink)] transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-[4px_2px_5px_3px] font-bold font-marker border ${
                      ag.lifecycleStatus === "AGREED"
                        ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border-[#96b79d]"
                        : ag.lifecycleStatus === "DRAFT"
                        ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border-[var(--dp-color-ink)]"
                        : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border-[var(--dp-color-line)]"
                    }`}
                  >
                    {agT(`status.${ag.lifecycleStatus}`)}
                  </span>
                  {ag.pendingReviewVersionId && (
                    <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-annotation)] border border-[var(--dp-color-annotation)] font-bold font-marker">
                      {agT("pendingReviewVersion")}
                    </span>
                  )}
                </div>

                <h3 className="font-bold font-marker text-base text-[var(--dp-color-ink)] group-hover:text-[var(--dp-color-accent)] transition-colors line-clamp-1">
                  {ag.title}
                </h3>

                {ag.description && (
                  <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading line-clamp-2">
                    {ag.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--dp-color-line)]/60 flex items-center justify-between text-xs text-[var(--dp-color-ink-muted)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 font-marker">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{ag.termsCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-marker">
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
