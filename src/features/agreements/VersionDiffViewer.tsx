"use client";

import React, { useState } from "react";
import { diffTerms, TermDiff } from "../../lib/diff";
import { StructuredTerm } from "../../lib/schemas/agreements";

interface VersionDiffViewerProps {
  baseVersionNumber?: number;
  compareVersionNumber?: number | string; // e.g. "Draft" or 2
  baseTerms: StructuredTerm[];
  compareTerms: StructuredTerm[];
  translations: {
    title: string;
    description: string;
    noDifferences: string;
    addedCount: string;
    removedCount: string;
    modifiedCount: string;
    unchangedCount: string;
    filterAll: string;
    filterChangesOnly: string;
    fields: {
      title: string;
      body: string;
      amount: string;
      currency: string;
      dueDate: string;
      assignedParticipantId: string;
    };
    statuses: {
      ADDED: string;
      REMOVED: string;
      MODIFIED: string;
      UNCHANGED: string;
    };
    before: string;
    after: string;
  };
}

export function VersionDiffViewer({
  baseVersionNumber,
  compareVersionNumber,
  baseTerms,
  compareTerms,
  translations,
}: VersionDiffViewerProps) {
  const [changesOnly, setChangesOnly] = useState(true);

  const diffResult = diffTerms(baseTerms, compareTerms);
  const displayedTerms = changesOnly
    ? diffResult.terms.filter((t) => t.status !== "UNCHANGED")
    : diffResult.terms;

  return (
    <div className="space-y-4 font-reading">
      {/* Header & Stats Bar */}
      <div className="sketch-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
              <span>{translations.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)] font-mono">
                {baseVersionNumber !== undefined ? `V${baseVersionNumber}` : "Base"} ➔{" "}
                {typeof compareVersionNumber === "number"
                  ? `V${compareVersionNumber}`
                  : compareVersionNumber || "Compare"}
              </span>
            </h3>
            <p className="text-xs text-[var(--dp-color-ink-muted)] mt-0.5">
              {translations.description}
            </p>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--dp-color-ground)] rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)] text-xs font-marker font-bold">
            <button
              type="button"
              onClick={() => setChangesOnly(true)}
              className={`px-2.5 py-1 rounded-[4px_2px_5px_3px] transition-colors cursor-pointer ${
                changesOnly
                  ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                  : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
              }`}
            >
              {translations.filterChangesOnly}
            </button>
            <button
              type="button"
              onClick={() => setChangesOnly(false)}
              className={`px-2.5 py-1 rounded-[4px_2px_5px_3px] transition-colors cursor-pointer ${
                !changesOnly
                  ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                  : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
              }`}
            >
              {translations.filterAll} ({diffResult.terms.length})
            </button>
          </div>
        </div>

        {/* Counts summary pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-[var(--dp-color-line)] text-xs">
          <span className="px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d] font-bold font-marker">
            + {diffResult.addedCount} {translations.addedCount}
          </span>
          <span className="px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-bold font-marker">
            - {diffResult.removedCount} {translations.removedCount}
          </span>
          <span className="px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-bold font-marker">
            ~ {diffResult.modifiedCount} {translations.modifiedCount}
          </span>
          <span className="px-2.5 py-1 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
            = {diffResult.unchangedCount} {translations.unchangedCount}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {!diffResult.hasDifferences && (
        <div className="sketch-card p-8 text-center text-[var(--dp-color-ink-muted)] text-sm">
          ✓ {translations.noDifferences}
        </div>
      )}

      {/* Terms Diff List */}
      <div className="space-y-3">
        {displayedTerms.map((termDiff) => (
          <DiffTermCard
            key={termDiff.termId}
            termDiff={termDiff}
            translations={translations}
          />
        ))}
      </div>
    </div>
  );
}

function DiffTermCard({
  termDiff,
  translations,
}: {
  termDiff: TermDiff;
  translations: VersionDiffViewerProps["translations"];
}) {
  const { status, oldTerm, newTerm, fieldChanges } = termDiff;

  const getStatusBadge = () => {
    switch (status) {
      case "ADDED":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold font-marker bg-[#eaf3ea] text-[var(--dp-color-ink)] border border-[#96b79d]">
            {translations.statuses.ADDED}
          </span>
        );
      case "REMOVED":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold font-marker bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]">
            {translations.statuses.REMOVED}
          </span>
        );
      case "MODIFIED":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold font-marker bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)]">
            {translations.statuses.MODIFIED}
          </span>
        );
      case "UNCHANGED":
        return (
          <span className="px-2 py-0.5 rounded-[4px_2px_5px_3px] text-[10px] font-bold font-marker bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]">
            {translations.statuses.UNCHANGED}
          </span>
        );
    }
  };

  const currentTerm = newTerm || oldTerm;
  if (!currentTerm) return null;

  return (
    <div
      className={`sketch-card p-4 space-y-3 ${
        status === "ADDED"
          ? "border-[#96b79d] bg-[#f2f8f2]"
          : status === "REMOVED"
          ? "border-[var(--dp-color-accent)] bg-[#fcf2ef] opacity-80"
          : status === "MODIFIED"
          ? "border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <h4
            className={`font-marker font-bold text-base ${
              status === "REMOVED"
                ? "line-through text-[var(--dp-color-ink-muted)]"
                : "text-[var(--dp-color-ink)]"
            }`}
          >
            {newTerm?.title || oldTerm?.title}
          </h4>
        </div>
        <span className="text-[10px] text-[var(--dp-color-ink-muted)] font-mono">
          #{termDiff.termId}
        </span>
      </div>

      {/* Field changes details when MODIFIED */}
      {status === "MODIFIED" && fieldChanges.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-dashed border-[var(--dp-color-line)]">
          {fieldChanges.map((change) => {
            const fieldLabel =
              translations.fields[change.field] || change.field;

            return (
              <div
                key={change.field}
                className="text-xs rounded-[6px_3px_8px_4px] p-2.5 bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] space-y-1.5"
              >
                <div className="font-bold text-[var(--dp-color-ink)] flex items-center gap-1.5 font-marker">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--dp-color-accent)]"></span>
                  {fieldLabel}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Before */}
                  <div className="p-2 rounded-[4px_2px_5px_3px] bg-[#fbeee9] border border-[var(--dp-color-accent)]/50 text-[var(--dp-color-accent)]">
                    <span className="text-[10px] font-bold font-marker block mb-0.5">
                      {translations.before}:
                    </span>
                    <span className="whitespace-pre-wrap font-reading">
                      {change.oldValue ? change.oldValue : "—"}
                    </span>
                  </div>

                  {/* After */}
                  <div className="p-2 rounded-[4px_2px_5px_3px] bg-[#eaf3ea] border border-[#96b79d] text-[var(--dp-color-ink)]">
                    <span className="text-[10px] font-bold font-marker text-[#2d5a37] block mb-0.5">
                      {translations.after}:
                    </span>
                    <span className="whitespace-pre-wrap font-reading">
                      {change.newValue ? change.newValue : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Body preview for ADDED or REMOVED */}
      {(status === "ADDED" || status === "REMOVED") && (
        <div
          className={`text-xs whitespace-pre-wrap font-reading ${
            status === "REMOVED"
              ? "line-through text-[var(--dp-color-ink-muted)]"
              : "text-[var(--dp-color-ink)]"
          }`}
        >
          {currentTerm.body}
        </div>
      )}
    </div>
  );
}
