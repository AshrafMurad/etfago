"use client";

import React, { useState, useTransition } from "react";
import { createCommitmentAction } from "../../server/actions/commitments";
import { StructuredTerm } from "../../lib/schemas/agreements";

interface CreateCommitmentModalProps {
  agreementId: string;
  sourceVersionId?: string | null;
  participants: Array<{
    id: string;
    partyDisplayName: string;
    emailNormalized: string;
  }>;
  terms: StructuredTerm[];
  translations: {
    createButton: string;
    modalTitle: string;
    modalSubtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    assigneeLabel: string;
    noAssignee: string;
    dueDateLabel: string;
    linkTermLabel: string;
    noLinkedTerm: string;
    submit: string;
    cancel: string;
    loading: string;
  };
}

export function CreateCommitmentModal({
  agreementId,
  sourceVersionId,
  participants,
  terms,
  translations,
}: CreateCommitmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkedTermId, setLinkedTermId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    if (sourceVersionId) {
      formData.append("sourceVersionId", sourceVersionId);
    }
    if (linkedTermId) {
      formData.append("sourceTermId", linkedTermId);
    }
    formData.append("title", title.trim());
    if (details.trim()) {
      formData.append("details", details.trim());
    }
    if (assigneeId) {
      formData.append("assigneeParticipantId", assigneeId);
    }
    if (dueDate) {
      formData.append("dueAt", dueDate);
    }

    startTransition(async () => {
      const res = await createCommitmentAction(null, formData);
      if (res.success) {
        setTitle("");
        setDetails("");
        setAssigneeId("");
        setDueDate("");
        setLinkedTermId("");
        setIsOpen(false);
      } else {
        setError(res.error || "Failed to create commitment");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1.5"
      >
        <span>+</span>
        <span>{translations.createButton}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {translations.modalTitle}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {translations.modalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {translations.titleLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={translations.titlePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {translations.detailsLabel}
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={translations.detailsPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {translations.assigneeLabel}
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">{translations.noAssignee}</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partyDisplayName} ({p.emailNormalized})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {translations.dueDateLabel}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              {terms.length > 0 && (
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {translations.linkTermLabel}
                  </label>
                  <select
                    value={linkedTermId}
                    onChange={(e) => setLinkedTermId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">{translations.noLinkedTerm}</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} - {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs disabled:opacity-60"
                >
                  {isPending ? translations.loading : translations.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
