"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDraftAction } from "../../server/actions/agreements";
import { DraftContent, StructuredTerm } from "../../lib/schemas/agreements";
import { SketchDatePicker } from "../ui/SketchDatePicker";
import { FieldErrorMessage, FormAlert } from "../ui";
import { validateAmount, validateCurrency } from "../../lib/validation";

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
    optional?: string;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, { title?: string; amount?: string; currency?: string }>>({});

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

    const termId = updatedTerms[index]?.id;
    if (termId && fieldErrors[termId]) {
      setFieldErrors((prev) => {
        const current = prev[termId];
        if (!current) return prev;
        return { ...prev, [termId]: { ...current, [field]: undefined } };
      });
    }
  };

  const handleRemoveTerm = (index: number) => {
    if (!canEdit) return;
    const termId = terms[index]?.id;
    if (termId && fieldErrors[termId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[termId];
        return copy;
      });
    }
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

    // Validate terms
    const errors: Record<string, { title?: string; amount?: string; currency?: string }> = {};
    terms.forEach((term) => {
      const errs: { title?: string; amount?: string; currency?: string } = {};
      const trimmedTitle = term.title.trim();
      if (!trimmedTitle) {
        errs.title = "عنوان البند مطلوب";
      } else if (trimmedTitle.length > 120) {
        errs.title = "يجب ألا يتجاوز عنوان البند 120 حرفًا";
      }

      if (term.amount?.trim()) {
        const amtErr = validateAmount(term.amount);
        if (amtErr) errs.amount = amtErr;
      }

      if (term.currency?.trim()) {
        const curErr = validateCurrency(term.currency);
        if (curErr) errs.currency = curErr;
      }

      if (Object.keys(errs).length > 0) {
        errors[term.id] = errs;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("يرجى مراجعة بنود المسودة وتصحيح الأخطاء الموضحة أدناه");
      return;
    }

    setFieldErrors({});
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
      <div className="sketch-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)]">
            {t.revision?.includes("{number}")
              ? t.revision.replace("{number}", revision.toString())
              : `${t.revision} ${revision}`}
          </span>
          {isDirty && (
            <span className="text-xs font-semibold font-reading text-[var(--dp-color-accent)]">
              ● {t.unsavedChanges}
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs font-semibold font-reading text-[var(--dp-color-annotation)]">
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
              className="sketch-btn sketch-btn-secondary px-3 py-1.5 text-xs font-marker"
            >
              + {t.addTerm}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="sketch-btn sketch-btn-primary px-4 py-1.5 text-xs font-marker disabled:opacity-50"
            >
              {isSaving ? t.saving : t.saveDraft}
            </button>
          </div>
        )}
      </div>

      {/* Error & Conflict Alert */}
      {errorMessage && (
        <div className="p-4 rounded-[8px_4px_12px_5px] bg-[#fbeee9] border-[1.5px] border-[var(--dp-color-accent)] text-sm font-reading text-[var(--dp-color-accent)] flex items-center justify-between gap-4">
          <span>{errorMessage}</span>
          {isConflict && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="sketch-btn sketch-btn-primary px-3 py-1 text-xs font-marker"
            >
              {t.reload}
            </button>
          )}
        </div>
      )}

      {/* Terms List */}
      {terms.length === 0 ? (
        <div className="sketch-card p-12 text-center space-y-3">
          <div className="text-3xl">📄</div>
          <p className="text-base font-reading text-[var(--dp-color-ink-muted)]">{t.noTermsYet}</p>
          {canEdit && (
            <button
              type="button"
              onClick={handleAddTerm}
              className="sketch-btn sketch-btn-primary px-4 py-2 text-xs font-marker"
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
              className="sketch-card p-5 space-y-3 hover:rotate-[-0.1deg] transition-all"
            >
              {/* Term Header */}
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--dp-color-line)] pb-2.5">
                <span className="text-sm font-bold font-marker text-[var(--dp-color-accent)]">
                  #{index + 1}
                </span>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveTerm(index, "up")}
                      className="sketch-btn sketch-btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                      title={t.moveUp}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === terms.length - 1}
                      onClick={() => handleMoveTerm(index, "down")}
                      className="sketch-btn sketch-btn-outline text-xs px-2 py-0.5 disabled:opacity-30"
                      title={t.moveDown}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(index)}
                      className="text-xs text-[var(--dp-color-accent)] hover:underline px-2 py-0.5 font-bold cursor-pointer"
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
                    aria-invalid={Boolean(fieldErrors[term.id]?.title)}
                    className={`w-full px-3.5 py-2 text-base font-bold font-marker ${
                      fieldErrors[term.id]?.title ? "sketch-input-error" : ""
                    }`}
                  />
                  <FieldErrorMessage error={fieldErrors[term.id]?.title} />
                </div>
              ) : (
                <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
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
                    className="w-full px-3.5 py-2.5 text-sm font-reading"
                  />
                </div>
              ) : (
                term.body && (
                  <p className="text-base font-reading text-[var(--dp-color-ink)] leading-relaxed whitespace-pre-wrap">
                    {term.body}
                  </p>
                )
              )}

              {/* Term Metadata Fields (Amount, Currency, Due Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {canEdit ? (
                  <>
                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.amount} {t.optional && <span className="font-normal">({t.optional})</span>}
                      </label>
                      <input
                        type="text"
                        value={term.amount || ""}
                        onChange={(e) => handleUpdateTerm(index, "amount", e.target.value)}
                        placeholder="5000"
                        maxLength={32}
                        aria-invalid={Boolean(fieldErrors[term.id]?.amount)}
                        className={`w-full px-2.5 py-1.5 text-xs ${
                          fieldErrors[term.id]?.amount ? "sketch-input-error" : ""
                        }`}
                      />
                      <FieldErrorMessage error={fieldErrors[term.id]?.amount} />
                    </div>
                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.currency} {t.optional && <span className="font-normal">({t.optional})</span>}
                      </label>
                      <input
                        type="text"
                        value={term.currency || ""}
                        onChange={(e) => handleUpdateTerm(index, "currency", e.target.value)}
                        placeholder="SAR"
                        maxLength={10}
                        aria-invalid={Boolean(fieldErrors[term.id]?.currency)}
                        className={`w-full px-2.5 py-1.5 text-xs uppercase ${
                          fieldErrors[term.id]?.currency ? "sketch-input-error" : ""
                        }`}
                      />
                      <FieldErrorMessage error={fieldErrors[term.id]?.currency} />
                    </div>
                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.dueDate} {t.optional && <span className="font-normal">({t.optional})</span>}
                      </label>
                      <SketchDatePicker
                        value={term.dueDate || ""}
                        onChange={(val) => handleUpdateTerm(index, "dueDate", val || null)}
                        placeholder={t.dueDate}
                        size="sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {term.amount && (
                      <div className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
                        <span className="font-bold text-[var(--dp-color-ink)]">
                          {term.amount} {term.currency || ""}
                        </span>
                      </div>
                    )}
                    {term.dueDate && (
                      <div className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
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
