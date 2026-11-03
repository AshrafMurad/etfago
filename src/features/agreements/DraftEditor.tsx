"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDraftAction } from "../../server/actions/agreements";
import { DraftContent, StructuredTerm } from "../../lib/schemas/agreements";

interface DraftEditorProps {
  agreementId: string;
  initialRevision: number;
  initialContent: DraftContent;
  canEdit: boolean;
  translations: {
    addTerm: string;
    termTitle: string;
    termTitlePlaceholder: string;
    termBody: string;
    termBodyPlaceholder: string;
    amount: string;
    currency: string;
    dueDate: string;
    saveDraft: string;
    saving: string;
    saved: string;
    revision: string;
    unsavedChanges: string;
    conflictError: string;
    reload: string;
    moveUp: string;
    moveDown: string;
    removeTerm: string;
    noTermsYet: string;
    addFirstTerm: string;
  };
}

export function DraftEditor({
  agreementId,
  initialRevision,
  initialContent,
  canEdit,
  translations: t,
}: DraftEditorProps) {
  const router = useRouter();

  const [revision, setRevision] = useState(initialRevision);
  const [content, setContent] = useState<DraftContent>(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const terms = content.terms || [];

  const handleAddTerm = () => {
    if (!canEdit || terms.length >= 50) return;
    const newTerm: StructuredTerm = {
      id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: "",
      body: null,
      amount: null,
      currency: null,
      dueDate: null,
      assignedParticipantId: null,
    };
    setContent({
      ...content,
      terms: [...terms, newTerm],
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleUpdateTerm = (
    index: number,
    field: keyof StructuredTerm,
    value: string | null
  ) => {
    if (!canEdit) return;
    const updatedTerms = [...terms];
    updatedTerms[index] = {
      ...updatedTerms[index],
      [field]: value,
    };
    setContent({
      ...content,
      terms: updatedTerms,
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleRemoveTerm = (index: number) => {
    if (!canEdit) return;
    setContent({
      ...content,
      terms: terms.filter((_, i) => i !== index),
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleMoveTerm = (index: number, direction: "up" | "down") => {
    if (!canEdit) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= terms.length) return;

    const newTerms = [...terms];
    const temp = newTerms[index];
    newTerms[index] = newTerms[targetIndex];
    newTerms[targetIndex] = temp;

    setContent({
      ...content,
      terms: newTerms,
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!canEdit || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setIsConflict(false);

    // Normalize empty strings to null or trimmed values
    const cleanedContent: DraftContent = {
      schemaVersion: 1,
      title: content.title.trim() || initialContent.title,
      description: content.description?.trim() || null,
      terms: terms.map((term) => ({
        ...term,
        title: term.title.trim(),
        body: term.body?.trim() || null,
        amount: term.amount?.trim() || null,
        currency: term.currency?.trim() || null,
        dueDate: term.dueDate?.trim() || null,
      })),
    };

    try {
      const res = await updateDraftAction({
        agreementId,
        expectedRevision: revision,
        content: cleanedContent,
      });

      if (res.success && res.newRevision) {
        setRevision(res.newRevision);
        setContent(cleanedContent);
        setIsDirty(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        if (res.error?.includes("Optimistic concurrency conflict") || res.error?.includes("Revision conflict")) {
          setIsConflict(true);
          setErrorMessage(t.conflictError);
        } else {
          setErrorMessage(res.error || "Failed to save draft");
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
            {t.revision.replace("{number}", revision.toString())}
          </span>
          {isDirty && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ● {t.unsavedChanges}
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ {t.saved}
            </span>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleAddTerm}
              disabled={terms.length >= 50 || isSaving}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              + {t.addTerm}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
            >
              {isSaving ? t.saving : t.saveDraft}
            </button>
          </div>
        )}
      </div>

      {/* Error & Conflict Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-4">
          <span>{errorMessage}</span>
          {isConflict && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
            >
              {t.reload}
            </button>
          )}
        </div>
      )}

      {/* Terms List */}
      {terms.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="text-zinc-400 text-3xl">📄</div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noTermsYet}</p>
          {canEdit && (
            <button
              type="button"
              onClick={handleAddTerm}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              + {t.addFirstTerm}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {terms.map((term, index) => (
            <div
              key={term.id}
              className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-2xs transition-shadow hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              {/* Term Header */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  #{index + 1}
                </span>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveTerm(index, "up")}
                      className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      title={t.moveUp}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === terms.length - 1}
                      onClick={() => handleMoveTerm(index, "down")}
                      className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      title={t.moveDown}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(index)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      title={t.removeTerm}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Term Title */}
              {canEdit ? (
                <div>
                  <input
                    type="text"
                    value={term.title}
                    onChange={(e) => handleUpdateTerm(index, "title", e.target.value)}
                    placeholder={t.termTitlePlaceholder}
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {term.title}
                </h3>
              )}

              {/* Term Body */}
              {canEdit ? (
                <div>
                  <textarea
                    value={term.body || ""}
                    onChange={(e) => handleUpdateTerm(index, "body", e.target.value)}
                    placeholder={t.termBodyPlaceholder}
                    maxLength={4000}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                term.body && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {term.body}
                  </p>
                )
              )}

              {/* Term Metadata Fields (Amount, Currency, Due Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {canEdit ? (
                  <>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">{t.amount}</label>
                      <input
                        type="text"
                        value={term.amount || ""}
                        onChange={(e) => handleUpdateTerm(index, "amount", e.target.value)}
                        placeholder="5000"
                        maxLength={32}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">{t.currency}</label>
                      <input
                        type="text"
                        value={term.currency || ""}
                        onChange={(e) => handleUpdateTerm(index, "currency", e.target.value)}
                        placeholder="SAR"
                        maxLength={10}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-1">{t.dueDate}</label>
                      <input
                        type="date"
                        value={term.dueDate || ""}
                        onChange={(e) => handleUpdateTerm(index, "dueDate", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {term.amount && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {term.amount} {term.currency || ""}
                        </span>
                      </div>
                    )}
                    {term.dueDate && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        <span>
                          {t.dueDate}: {term.dueDate}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
