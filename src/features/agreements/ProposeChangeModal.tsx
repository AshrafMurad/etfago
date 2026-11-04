"use client";

import React, { useState, useTransition } from "react";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { createChangeRequestAction } from "../../server/actions/proposals";
import { ChangeOperation } from "../../lib/schemas/proposals";
import { SketchSelect } from "../ui/SketchSelect";
import { SketchDatePicker } from "../ui/SketchDatePicker";

interface ProposeChangeModalProps {
  agreementId: string;
  baseVersionId?: string | null;
  terms: StructuredTerm[];
  translations: {
    proposeChangeButton: string;
    modalTitle: string;
    modalSubtitle: string;
    operationLabel: string;
    operations: {
      UPDATE: string;
      ADD: string;
      REMOVE: string;
    };
    selectTermLabel: string;
    termTitleLabel: string;
    termBodyLabel: string;
    amountLabel: string;
    currencyLabel: string;
    dueDateLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    submitProposal: string;
    cancel: string;
    loading: string;
    disclaimer: string;
  };
}

export function ProposeChangeModal({
  agreementId,
  baseVersionId,
  terms,
  translations,
}: ProposeChangeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [operation, setOperation] = useState<ChangeOperation>("UPDATE");
  const [selectedTermId, setSelectedTermId] = useState<string>(
    terms[0]?.id || ""
  );

  // Form fields for proposed term
  const selectedTerm = terms.find((t) => t.id === selectedTermId) || terms[0];
  const [title, setTitle] = useState(selectedTerm?.title || "");
  const [body, setBody] = useState(selectedTerm?.body || "");
  const [amount, setAmount] = useState(selectedTerm?.amount || "");
  const [currency, setCurrency] = useState(selectedTerm?.currency || "");
  const [dueDate, setDueDate] = useState(selectedTerm?.dueDate || "");
  const [reason, setReason] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    const found = terms.find((t) => t.id === termId);
    if (found) {
      setTitle(found.title);
      setBody(found.body || "");
      setAmount(found.amount || "");
      setCurrency(found.currency || "");
      setDueDate(found.dueDate || "");
    }
  };

  const handleOpen = () => {
    if (terms.length === 0) {
      setOperation("ADD");
      setTitle("");
      setBody("");
      setAmount("");
      setCurrency("");
      setDueDate("");
    } else {
      setOperation("UPDATE");
      handleTermChange(terms[0].id);
    }
    setReason("");
    setError(null);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const termIdToUse =
      operation === "ADD"
        ? `term_${crypto.randomUUID().slice(0, 8)}`
        : selectedTermId;

    const oldTerm =
      operation === "ADD"
        ? null
        : terms.find((t) => t.id === selectedTermId) || null;

    const newTerm: StructuredTerm | null =
      operation === "REMOVE"
        ? null
        : {
            id: termIdToUse,
            title: title.trim(),
            body: body.trim(),
            amount: amount.trim() || null,
            currency: currency.trim() || null,
            dueDate: dueDate.trim() || null,
            assignedParticipantId: selectedTerm?.assignedParticipantId || null,
          };

    const formData = new FormData();
    formData.append("agreementId", agreementId);
    if (baseVersionId) {
      formData.append("baseVersionId", baseVersionId);
    }
    formData.append("termId", termIdToUse);
    formData.append("operation", operation);
    if (oldTerm) {
      formData.append("oldTermJson", JSON.stringify(oldTerm));
    }
    if (newTerm) {
      formData.append("newTermJson", JSON.stringify(newTerm));
    }
    if (reason.trim()) {
      formData.append("reason", reason.trim());
    }

    startTransition(async () => {
      const res = await createChangeRequestAction(null, formData);
      if (res.success) {
        setIsOpen(false);
      } else {
        setError(res.error || "Failed to submit proposal");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="sketch-btn sketch-btn-primary text-xs flex items-center gap-1.5"
      >
        <span>💡</span>
        <span>{translations.proposeChangeButton}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[var(--dp-color-ground)] border-2 border-[var(--dp-color-ink)] rounded-[12px_4px_18px_6px] max-w-lg w-full p-6 shadow-[6px_6px_0px_var(--dp-color-ink)] space-y-4 max-h-[90vh] overflow-y-auto relative">
            <div className="sketch-tape-top" />
            <div className="flex items-center justify-between border-b border-[var(--dp-color-line)] pb-3">
              <div>
                <h3 className="text-lg font-bold font-marker text-[var(--dp-color-ink)]">
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Operation Selection */}
              <div className="space-y-1.5">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.operationLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["UPDATE", "ADD", "REMOVE"] as ChangeOperation[]).map(
                    (op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => {
                          setOperation(op);
                          if (op === "ADD") {
                            setTitle("");
                            setBody("");
                            setAmount("");
                            setCurrency("");
                            setDueDate("");
                          } else if (selectedTerm) {
                            setTitle(selectedTerm.title);
                            setBody(selectedTerm.body || "");
                            setAmount(selectedTerm.amount || "");
                            setCurrency(selectedTerm.currency || "");
                            setDueDate(selectedTerm.dueDate || "");
                          }
                        }}
                        className={`py-2 px-3 rounded-[6px_3px_7px_4px] border text-xs font-marker font-bold transition-all cursor-pointer ${
                          operation === op
                            ? "border-[var(--dp-color-ink)] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                            : "border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
                        }`}
                      >
                        {translations.operations[op]}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Term Selection (for UPDATE & REMOVE) */}
              {operation !== "ADD" && terms.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                    {translations.selectTermLabel}
                  </label>
                  <SketchSelect
                    value={selectedTermId}
                    onChange={(val) => handleTermChange(val)}
                    options={terms.map((t, idx) => ({
                      value: t.id,
                      label: t.title,
                      description: t.body ? t.body.slice(0, 60) + "..." : undefined,
                      badge: (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-mono">
                          #{idx + 1}
                        </span>
                      ),
                    }))}
                  />
                </div>
              )}

              {/* Term Details Fields (for UPDATE & ADD) */}
              {operation !== "REMOVE" && (
                <div className="space-y-3 p-3 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]">
                  <div className="space-y-1">
                    <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                      {translations.termTitleLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                      {translations.termBodyLabel} *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                        {translations.amountLabel}
                      </label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] font-mono focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                        {translations.currencyLabel}
                      </label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink)] font-mono focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                      {translations.dueDateLabel}
                    </label>
                    <SketchDatePicker
                      value={dueDate}
                      onChange={(val) => setDueDate(val)}
                      placeholder={translations.dueDateLabel}
                      size="sm"
                    />
                  </div>
                </div>
              )}

              {/* Proposal Reason */}
              <div className="space-y-1">
                <label className="font-bold font-marker text-[var(--dp-color-ink)]">
                  {translations.reasonLabel}
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={translations.reasonPlaceholder}
                  className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
                />
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-[var(--dp-color-ink-muted)] bg-[var(--dp-color-scrap)] p-2.5 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] font-reading">
                ℹ️ {translations.disclaimer}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--dp-color-line)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="sketch-btn sketch-btn-outline text-xs px-3.5 py-1.5"
                >
                  {translations.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="sketch-btn sketch-btn-primary text-xs px-4 py-1.5 disabled:opacity-60"
                >
                  {isPending ? translations.loading : translations.submitProposal}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
