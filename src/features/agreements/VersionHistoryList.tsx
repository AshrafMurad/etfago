"use client";

import { useState, useTransition } from "react";
import { AgreementVersionDetail } from "../../server/agreements/versions";
import { prepareAmendmentDraftAction } from "../../server/actions/versions";

interface VersionHistoryListProps {
  agreementId: string;
  versions: AgreementVersionDetail[];
  isOrganizer: boolean;
  canAmend: boolean;
  translations: {
    versionHistoryTitle: string;
    versionHistoryDesc: string;
    noVersionsYet: string;
    amendFromVersion: string;
    versionTermsSnapshot: string;
    hashLabel: string;
    copyHash: string;
    versionState: Record<string, string>;
    loading: string;
  };
}

export function VersionHistoryList({
  agreementId,
  versions,
  canAmend,
  translations,
}: VersionHistoryListProps) {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCopyHash = (versionId: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(versionId);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const handleAmendFromVersion = (versionId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("agreementId", agreementId);
      formData.set("versionId", versionId);
      await prepareAmendmentDraftAction(null, formData);
    });
  };

  if (versions.length === 0) {
    return (
      <div className="sketch-card p-12 text-center border-dashed space-y-2">
        <span className="text-3xl">📜</span>
        <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
          {translations.versionHistoryTitle}
        </h3>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] max-w-sm mx-auto">
          {translations.noVersionsYet}
        </p>
      </div>
    );
  }

  const getStateBadge = (state: string) => {
    const label = translations.versionState[state] || state;
    switch (state) {
      case "APPROVED":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-bold font-marker bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]">
            ✓ {label}
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-bold font-marker bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]">
            ⏳ {label}
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-bold font-marker bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]">
            ⚠️ {label}
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-bold font-marker bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]">
            🚫 {label}
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="px-2.5 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-bold font-marker bg-[var(--dp-color-ground)] text-[var(--dp-color-annotation)] border border-[var(--dp-color-annotation)]">
            🔄 {label}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-xs font-medium font-marker bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)]">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-reading">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
            {translations.versionHistoryTitle}
          </h3>
          <p className="text-xs text-[var(--dp-color-ink-muted)]">
            {translations.versionHistoryDesc}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {versions.map((ver) => {
          const isExpanded = expandedVersionId === ver.id;

          return (
            <div
              key={ver.id}
              className="sketch-card p-5 space-y-3 hover:rotate-[-0.1deg] transition-all"
            >
              {/* Version Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold font-marker px-2.5 py-1 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ink)] text-[var(--dp-color-scrap)] shadow-[1px_1px_0px_var(--dp-color-ink)]">
                    v{ver.versionNumber}
                  </span>
                  {getStateBadge(ver.state)}
                  <span className="text-xs text-[var(--dp-color-ink-muted)] font-mono" dir="ltr">
                    {new Date(ver.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedVersionId(isExpanded ? null : ver.id)
                    }
                    className="sketch-btn sketch-btn-secondary px-3 py-1 text-xs font-marker"
                  >
                    {isExpanded ? "إخفاء البنود" : translations.versionTermsSnapshot} (
                    {ver.snapshot.terms.length})
                  </button>

                  {canAmend && ver.state !== "IN_REVIEW" && (
                    <button
                      type="button"
                      onClick={() => handleAmendFromVersion(ver.id)}
                      disabled={isPending}
                      className="sketch-btn sketch-btn-outline px-3 py-1 text-xs font-marker"
                    >
                      {isPending ? translations.loading : translations.amendFromVersion}
                    </button>
                  )}
                </div>
              </div>

              {/* Hash & Reviewers Info */}
              <div className="pt-2 border-t border-dashed border-[var(--dp-color-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--dp-color-ink-muted)]">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-reading text-xs">{translations.hashLabel}:</span>
                  <span className="bg-[var(--dp-color-ground)] px-1.5 py-0.5 rounded border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] select-all font-semibold">
                    {ver.contentHash.slice(0, 16)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(ver.id, ver.contentHash)}
                    className="text-[var(--dp-color-annotation)] font-reading font-semibold hover:underline text-xs cursor-pointer"
                  >
                    {copiedHashId === ver.id ? "✓ تم" : translations.copyHash}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-reading font-bold">المراجعون:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {ver.reviewers.map((r) => {
                      const approved = r.decision?.decision === "APPROVE";
                      const rejected = r.decision?.decision === "REQUEST_CHANGES";

                      return (
                        <span
                          key={r.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-[3px_2px_4px_2px] border ${
                            approved
                              ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border-[#96b79d]"
                              : rejected
                              ? "bg-[#fbeee9] text-[var(--dp-color-accent)] border-[var(--dp-color-accent)]"
                              : "bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border-[var(--dp-color-line)]"
                          }`}
                          title={r.decision?.reason || undefined}
                        >
                          {r.nameSnapshot}{" "}
                          {approved ? "✓" : rejected ? "⚠️" : "⏳"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Expandable Terms Snapshot */}
              {isExpanded && (
                <div className="pt-3 border-t border-[var(--dp-color-line)] space-y-2">
                  <h4 className="text-xs font-bold font-marker text-[var(--dp-color-ink)]">
                    البنود المجمدة في النسخة v{ver.versionNumber}:
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {ver.snapshot.terms.map((term, index) => (
                      <div
                        key={term.id}
                        className="p-3 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-xs space-y-1"
                      >
                        <div className="font-semibold text-[var(--dp-color-ink)] flex items-center gap-2">
                          <span className="text-[var(--dp-color-accent)] font-marker font-bold">#{index + 1}</span>
                          <span className="font-marker font-bold">{term.title}</span>
                          {term.amount && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)] font-mono">
                              {term.amount} {term.currency || ""}
                            </span>
                          )}
                          {term.dueDate && (
                            <span className="text-[10px] text-[var(--dp-color-ink-muted)]">
                              📅 {term.dueDate}
                            </span>
                          )}
                        </div>
                        {term.body && (
                          <p className="text-[11px] text-[var(--dp-color-ink-muted)] whitespace-pre-wrap leading-relaxed">
                            {term.body}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
