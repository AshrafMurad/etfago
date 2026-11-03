"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAgreementAction } from "../../server/actions/agreements";
import { StructuredTerm } from "../../lib/schemas/agreements";

interface WorkspaceOption {
  id: string;
  name: string;
  kind: "PERSONAL" | "BUSINESS";
}

interface CreateAgreementFormProps {
  locale: string;
  workspaces: WorkspaceOption[];
  translations: {
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    workspaceSelect: string;
    addTerm: string;
    termTitle: string;
    termTitlePlaceholder: string;
    termBody: string;
    termBodyPlaceholder: string;
    amount: string;
    currency: string;
    dueDate: string;
    removeTerm: string;
    save: string;
    cancel: string;
    loading: string;
    optional: string;
    required: string;
  };
}

export function CreateAgreementForm({
  locale,
  workspaces,
  translations: t,
}: CreateAgreementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [terms, setTerms] = useState<StructuredTerm[]>([
    {
      id: `term_${Date.now()}_1`,
      title: "",
      body: null,
      amount: null,
      currency: null,
      dueDate: null,
      assignedParticipantId: null,
    },
  ]);

  const handleAddTerm = () => {
    if (terms.length >= 50) return;
    setTerms([
      ...terms,
      {
        id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: "",
        body: null,
        amount: null,
        currency: null,
        dueDate: null,
        assignedParticipantId: null,
      },
    ]);
  };

  const handleUpdateTerm = (index: number, field: keyof StructuredTerm, value: string | null) => {
    const updated = [...terms];
    updated[index] = { ...updated[index], [field]: value };
    setTerms(updated);
  };

  const handleRemoveTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.required);
      return;
    }
    if (!workspaceId) {
      setError("Please select a workspace");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Filter out completely empty terms
    const filteredTerms = terms
      .filter((t) => t.title.trim().length > 0)
      .map((term) => ({
        ...term,
        title: term.title.trim(),
        body: term.body?.trim() || null,
        amount: term.amount?.trim() || null,
        currency: term.currency?.trim() || null,
        dueDate: term.dueDate?.trim() || null,
      }));

    const formData = new FormData();
    formData.append("workspaceId", workspaceId);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category.trim());
    formData.append("termsJson", JSON.stringify(filteredTerms));

    try {
      const res = await createAgreementAction(null, formData);
      if (res.success && res.agreementId) {
        router.push(`/${locale}/agreements/${res.agreementId}`);
      } else {
        setError(res.error || "Failed to create agreement");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Workspace & Category */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t.workspaceSelect} <span className="text-red-500">*</span>
            </label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.kind === "PERSONAL" ? "شخصي" : "تجاري"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t.categoryLabel} <span className="text-zinc-400 font-normal">({t.optional})</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t.categoryPlaceholder}
              maxLength={64}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            {t.titleLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.titlePlaceholder}
            maxLength={160}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            {t.descriptionLabel} <span className="text-zinc-400 font-normal">({t.optional})</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descriptionPlaceholder}
            maxLength={4000}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Initial Terms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {t.addTerm} ({terms.length})
          </h2>
          <button
            type="button"
            onClick={handleAddTerm}
            disabled={terms.length >= 50}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            + {t.addTerm}
          </button>
        </div>

        <div className="space-y-3">
          {terms.map((term, index) => (
            <div
              key={term.id}
              className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 relative shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  #{index + 1}
                </span>
                {terms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(index)}
                    className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    title={t.removeTerm}
                  >
                    ✕ {t.removeTerm}
                  </button>
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={term.title}
                  onChange={(e) => handleUpdateTerm(index, "title", e.target.value)}
                  placeholder={t.termTitlePlaceholder}
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <textarea
                  value={term.body || ""}
                  onChange={(e) => handleUpdateTerm(index, "body", e.target.value)}
                  placeholder={t.termBodyPlaceholder}
                  maxLength={4000}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
        >
          {isSubmitting ? t.loading : t.save}
        </button>
      </div>
    </form>
  );
}
