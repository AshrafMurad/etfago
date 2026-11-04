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
    <div className="sketch-card p-5 space-y-3 border-[1.5px] border-[#96b79d] bg-[var(--dp-color-scrap)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-[5px_2px_7px_3px] text-xs font-bold bg-[#2d5a37] text-white font-marker shadow-[1px_1px_0px_var(--dp-color-ink)]">
            v{version.versionNumber}
          </span>
          <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
            {translations.currentAgreedVersion}
          </h2>
          {version.resolvedAt && (
            <span className="text-xs font-reading text-[var(--dp-color-ink-muted)]">
              ({new Date(version.resolvedAt).toLocaleDateString()})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTerms(!showTerms)}
            className="sketch-btn sketch-btn-secondary px-3 py-1 text-xs font-marker"
          >
            {translations.versionTermsSnapshot} ({version.snapshot.terms.length})
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--dp-color-ink-muted)] pt-2 border-t border-dashed border-[var(--dp-color-line)] font-reading">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="font-reading text-xs">{translations.hashLabel}:</span>
          <span className="bg-[var(--dp-color-ground)] px-2 py-0.5 rounded-[4px_2px_6px_3px] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] font-semibold select-all">
            {version.contentHash}
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="text-[var(--dp-color-annotation)] font-reading font-semibold hover:underline cursor-pointer"
          >
            {copiedHash ? "✓ تم النسخ" : translations.copyHash}
          </button>
        </div>

        <div className="text-[11px] text-[var(--dp-color-ink-muted)] italic font-reading">
          🛡️ {translations.disclaimer}
        </div>
      </div>

      {/* Collapsible Terms Snapshot */}
      {showTerms && (
        <div className="pt-3 border-t border-[var(--dp-color-line)] space-y-2">
          <h4 className="text-xs font-bold font-marker text-[var(--dp-color-ink)]">
            البنود المعتمدة في هذه النسخة:
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {version.snapshot.terms.map((term, index) => (
              <div
                key={term.id}
                className="p-3 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-xs space-y-1 font-reading"
              >
                <div className="font-semibold text-[var(--dp-color-ink)] flex items-center gap-2">
                  <span className="text-[var(--dp-color-accent)] font-marker font-bold">#{index + 1}</span>
                  <span className="font-marker font-bold">{term.title}</span>
                  {term.amount && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] border border-[var(--dp-color-line)] font-mono">
                      {term.amount} {term.currency || ""}
                    </span>
                  )}
                  {term.dueDate && (
                    <span className="text-[11px] text-[var(--dp-color-ink-muted)]">
                      📅 {term.dueDate}
                    </span>
                  )}
                </div>
                {term.body && (
                  <p className="text-[11px] text-[var(--dp-color-ink-muted)] leading-relaxed whitespace-pre-wrap">
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
