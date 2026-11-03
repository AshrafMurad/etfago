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
    <div className="space-y-4">
      {/* Header & Stats Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{translations.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                {baseVersionNumber !== undefined ? `V${baseVersionNumber}` : "Base"} ➔{" "}
                {typeof compareVersionNumber === "number"
                  ? `V${compareVersionNumber}`
                  : compareVersionNumber || "Compare"}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {translations.description}
            </p>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setChangesOnly(true)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                changesOnly
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {translations.filterChangesOnly}
            </button>
            <button
              type="button"
              onClick={() => setChangesOnly(false)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                !changesOnly
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {translations.filterAll} ({diffResult.terms.length})
            </button>
          </div>
        </div>

        {/* Counts summary pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 font-medium">
            + {diffResult.addedCount} {translations.addedCount}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 font-medium">
            - {diffResult.removedCount} {translations.removedCount}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 font-medium">
            ~ {diffResult.modifiedCount} {translations.modifiedCount}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            = {diffResult.unchangedCount} {translations.unchangedCount}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {!diffResult.hasDifferences && (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
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
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            {translations.statuses.ADDED}
          </span>
        );
      case "REMOVED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
            {translations.statuses.REMOVED}
          </span>
        );
      case "MODIFIED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
            {translations.statuses.MODIFIED}
          </span>
        );
      case "UNCHANGED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {translations.statuses.UNCHANGED}
          </span>
        );
    }
  };

  const currentTerm = newTerm || oldTerm;
  if (!currentTerm) return null;

  return (
    <div
      className={`p-4 rounded-xl border bg-white dark:bg-zinc-900 transition-shadow shadow-2xs space-y-3 ${
        status === "ADDED"
          ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20"
          : status === "REMOVED"
          ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20 opacity-80"
          : status === "MODIFIED"
          ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/15"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <h4
            className={`font-semibold text-sm ${
              status === "REMOVED"
                ? "line-through text-zinc-500"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {newTerm?.title || oldTerm?.title}
          </h4>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono">
          #{termDiff.termId}
        </span>
      </div>

      {/* Field changes details when MODIFIED */}
      {status === "MODIFIED" && fieldChanges.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-amber-100 dark:border-amber-950/60">
          {fieldChanges.map((change) => {
            const fieldLabel =
              translations.fields[change.field] || change.field;

            return (
              <div
                key={change.field}
                className="text-xs rounded-lg p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5"
              >
                <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {fieldLabel}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Before */}
                  <div className="p-2 rounded bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 text-rose-900 dark:text-rose-200">
                    <span className="text-[10px] font-bold text-rose-600 block mb-0.5">
                      {translations.before}:
                    </span>
                    <span className="whitespace-pre-wrap font-sans">
                      {change.oldValue ? change.oldValue : "—"}
                    </span>
                  </div>

                  {/* After */}
                  <div className="p-2 rounded bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 text-emerald-900 dark:text-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-600 block mb-0.5">
                      {translations.after}:
                    </span>
                    <span className="whitespace-pre-wrap font-sans">
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
          className={`text-xs whitespace-pre-wrap ${
            status === "REMOVED"
              ? "line-through text-zinc-500"
              : "text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {currentTerm.body}
        </div>
      )}
    </div>
  );
}
