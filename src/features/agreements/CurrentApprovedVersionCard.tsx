"use client";

import { useState } from "react";
import { AgreementVersionDetail } from "../../server/agreements/versions";

interface CurrentApprovedVersionCardProps {
  version: AgreementVersionDetail;
  translations: {
    currentAgreedVersion: string;
    hashLabel: string;
    copyHash: string;
    disclaimer: string;
    versionTermsSnapshot: string;
  };
}

export function CurrentApprovedVersionCard({
  version,
  translations,
}: CurrentApprovedVersionCardProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(version.contentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
            v{version.versionNumber}
          </span>
          <h2 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            {translations.currentAgreedVersion}
          </h2>
          {version.resolvedAt && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              ({new Date(version.resolvedAt).toLocaleDateString()})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTerms(!showTerms)}
            className="px-3 py-1 text-xs font-medium rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {translations.versionTermsSnapshot} ({version.snapshot.terms.length})
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-emerald-200 dark:border-emerald-900/60 font-mono">
        <div className="flex items-center gap-1.5">
          <span>{translations.hashLabel}</span>
          <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300">
            {version.contentHash}
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="text-emerald-700 dark:text-emerald-400 hover:underline text-[10px] cursor-pointer"
          >
            {copiedHash ? "✓ تم النسخ" : translations.copyHash}
          </button>
        </div>

        <div className="text-[10px] text-zinc-500 italic">
          🛡️ {translations.disclaimer}
        </div>
      </div>

      {/* Collapsible Terms Snapshot */}
      {showTerms && (
        <div className="pt-3 border-t border-emerald-200 dark:border-emerald-900/40 space-y-2">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            البنود المعتمدة في هذه النسخة:
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {version.snapshot.terms.map((term, index) => (
              <div
                key={term.id}
                className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-zinc-800 text-xs space-y-1"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="text-zinc-400">#{index + 1}</span>
                  <span>{term.title}</span>
                  {term.amount && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
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
}
