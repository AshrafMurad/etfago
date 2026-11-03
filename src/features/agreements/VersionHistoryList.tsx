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
      <div className="p-12 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
        <span className="text-3xl">📜</span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {translations.versionHistoryTitle}
        </h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
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
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
            ✓ {label}
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
            ⏳ {label}
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
            ⚠️ {label}
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300">
            🚫 {label}
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
            🔄 {label}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {translations.versionHistoryTitle}
          </h3>
          <p className="text-xs text-zinc-500">
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
              className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-2xs"
            >
              {/* Version Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold px-2.5 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    v{ver.versionNumber}
                  </span>
                  {getStateBadge(ver.state)}
                  <span className="text-xs text-zinc-500">
                    {new Date(ver.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedVersionId(isExpanded ? null : ver.id)
                    }
                    className="px-3 py-1 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
                  >
                    {isExpanded ? "إخفاء البنود" : translations.versionTermsSnapshot} (
                    {ver.snapshot.terms.length})
                  </button>

                  {canAmend && ver.state !== "IN_REVIEW" && (
                    <button
                      type="button"
                      onClick={() => handleAmendFromVersion(ver.id)}
                      disabled={isPending}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {isPending ? translations.loading : translations.amendFromVersion}
                    </button>
                  )}
                </div>
              </div>

              {/* Hash & Reviewers Info */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span>{translations.hashLabel}</span>
                  <span className="bg-zinc-50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                    {ver.contentHash.slice(0, 16)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(ver.id, ver.contentHash)}
                    className="text-blue-600 hover:underline text-[10px] cursor-pointer"
                  >
                    {copiedHashId === ver.id ? "✓ تم" : translations.copyHash}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px]">المراجعون:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {ver.reviewers.map((r) => {
                      const approved = r.decision?.decision === "APPROVE";
                      const rejected = r.decision?.decision === "REQUEST_CHANGES";

                      return (
                        <span
                          key={r.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                            approved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : rejected
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-zinc-50 text-zinc-500 border-zinc-200"
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
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    البنود المجمدة في النسخة v{ver.versionNumber}:
                  </h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {ver.snapshot.terms.map((term, index) => (
                      <div
                        key={term.id}
                        className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1"
                      >
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span className="text-zinc-400">#{index + 1}</span>
                          <span>{term.title}</span>
                          {term.amount && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono">
                              {term.amount} {term.currency || ""}
                            </span>
                          )}
                          {term.dueDate && (
                            <span className="text-[10px] text-zinc-500">
                              📅 {term.dueDate}
                            </span>
                          )}
                        </div>
                        {term.body && (
                          <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
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
