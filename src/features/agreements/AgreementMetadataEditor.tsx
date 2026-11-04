"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAgreementMetadataAction } from "../../server/actions/agreements";

interface AgreementMetadataEditorProps {
  agreementId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialCategory: string | null;
  translations: {
    rename: string;
    titleLabel: string;
    descriptionLabel: string;
    categoryLabel: string;
    save: string;
    cancel: string;
    loading: string;
    optional: string;
  };
}

export function AgreementMetadataEditor({
  agreementId,
  initialTitle,
  initialDescription,
  initialCategory,
  translations: t,
}: AgreementMetadataEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const [category, setCategory] = useState(initialCategory || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category.trim());

    try {
      const res = await updateAgreementMetadataAction(null, formData);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update details");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5"
      >
        ✎ {t.rename}
      </button>
    );
  }

  return (
    <div className="sketch-card p-5 space-y-4 mb-4 relative">
      <div className="flex items-center justify-between border-b border-[var(--dp-color-line)] pb-2">
        <h3 className="text-sm font-bold font-marker text-[var(--dp-color-ink)]">{t.rename}</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] p-1 cursor-pointer font-marker"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-[6px_3px_7px_4px] bg-[#fbeee9] text-xs text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-bold font-marker text-[var(--dp-color-ink)] mb-1">
            {t.titleLabel} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            required
            className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-sm text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold font-marker text-[var(--dp-color-ink)] mb-1">
            {t.categoryLabel} ({t.optional})
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={64}
            className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-sm text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold font-marker text-[var(--dp-color-ink)] mb-1">
            {t.descriptionLabel} ({t.optional})
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            rows={2}
            className="w-full px-3 py-2 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] text-xs text-[var(--dp-color-ink)] font-reading focus:outline-dashed focus:outline-[var(--dp-color-annotation)]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--dp-color-line)]">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="sketch-btn sketch-btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
          >
            {isSaving ? t.loading : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
