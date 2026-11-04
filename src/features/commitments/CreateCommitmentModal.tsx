"use client";

import React, { useState, useTransition } from "react";
import { createCommitmentAction } from "../../server/actions/commitments";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { SketchSelect } from "../ui/SketchSelect";

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
        className="sketch-btn sketch-btn-primary text-xs flex items-center gap-1.5"
      >
        <span>+</span>
        <span>{translations.createButton}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[var(--dp-color-ground)] border-2 border-[var(--dp-color-ink)] rounded-[12px_4px_18px_6px] max-w-md w-full p-6 shadow-[6px_6px_0px_var(--dp-color-ink)] space-y-4 max-h-[90vh] overflow-y-auto relative">
            <div className="sketch-tape-top" />
            <div className="flex items-center justify-between border-b border-[var(--dp-color-line)] pb-3">
              <div>
                <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.modalTitle}
                </h3>
                <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-0.5">
                  {translations.modalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] font-marker text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs rounded-[6px_3px_7px_4px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.titleLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={translations.titlePlaceholder}
                  className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.detailsLabel}
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={translations.detailsPlaceholder}
                  className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.assigneeLabel}
                </label>
                <SketchSelect
                  value={assigneeId}
                  onChange={(val) => setAssigneeId(val)}
                  placeholder={translations.noAssignee}
                  options={[
                    { value: "", label: translations.noAssignee },
                    ...participants.map((p) => ({
                      value: p.id,
                      label: p.partyDisplayName,
                      description: p.emailNormalized,
                    })),
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.dueDateLabel}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-mono focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                />
              </div>

              {terms.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                    {translations.linkTermLabel}
                  </label>
                  <SketchSelect
                    value={linkedTermId}
                    onChange={(val) => setLinkedTermId(val)}
                    placeholder={translations.noLinkedTerm}
                    options={[
                      { value: "", label: translations.noLinkedTerm },
                      ...terms.map((t) => ({
                        value: t.id,
                        label: t.title,
                        badge: (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-mono">
                            #{t.id}
                          </span>
                        ),
                      })),
                    ]}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--dp-color-line)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="sketch-btn sketch-btn-primary text-xs px-4 py-1.5 disabled:opacity-60"
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
