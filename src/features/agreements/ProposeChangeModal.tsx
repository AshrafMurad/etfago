"use client";

import React, { useState, useTransition } from "react";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { createChangeRequestAction } from "../../server/actions/proposals";
import { ChangeOperation } from "../../lib/schemas/proposals";

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
        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1.5"
      >
        <span>💡</span>
        <span>{translations.proposeChangeButton}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
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
              <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Operation Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
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
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                          operation === op
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {translations.selectTermLabel}
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => handleTermChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Term Details Fields (for UPDATE & ADD) */}
              {operation !== "REMOVE" && (
                <div className="space-y-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {translations.termTitleLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {translations.termBodyLabel} *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {translations.amountLabel}
                      </label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {translations.currencyLabel}
                      </label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {translations.dueDateLabel}
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Proposal Reason */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {translations.reasonLabel}
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={translations.reasonPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                ℹ️ {translations.disclaimer}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
