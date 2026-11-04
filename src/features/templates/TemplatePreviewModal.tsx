"use client";

import { LocalizedStarterTemplate } from "../../lib/schemas/templates";
import { Users, Briefcase, Package, ShieldCheck, FileText, X, Check } from "lucide-react";

interface TemplatePreviewModalProps {
  template: LocalizedStarterTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: LocalizedStarterTemplate) => void;
  locale: string;
  labels: {
    previewTitle: string;
    category: string;
    suggestedRoles: string;
    termsCount: string;
    useTemplate: string;
    close: string;
    disclaimer: string;
  };
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
  locale,
  labels,
}: TemplatePreviewModalProps) {
  if (!isOpen || !template) return null;

  const renderIcon = () => {
    switch (template.icon) {
      case "Users":
        return <Users className="w-5 h-5 text-[var(--dp-color-annotation)]" />;
      case "Briefcase":
        return <Briefcase className="w-5 h-5 text-[var(--dp-color-ink)]" />;
      case "Package":
        return <Package className="w-5 h-5 text-[#8c5b10]" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-[var(--dp-color-accent)]" />;
      default:
        return <FileText className="w-5 h-5 text-[var(--dp-color-ink-muted)]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dp-color-ink)]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="sketch-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
      >
        <div className="sketch-tape sketch-tape-top" aria-hidden="true" />

        {/* Header */}
        <div className="p-6 border-b-[1.5px] border-dashed border-[var(--dp-color-line)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] text-[var(--dp-color-ink)]">
              {renderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold font-marker uppercase px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)]">
                  {template.category}
                </span>
                <span className="text-xs text-[var(--dp-color-ink-muted)] font-reading">
                  {template.termsCount} {locale === "ar" ? "بنود" : "terms"}
                </span>
              </div>
              <h2
                id="template-preview-title"
                className="text-xl font-bold font-marker text-[var(--dp-color-ink)] mt-1"
              >
                {template.title}
              </h2>
              <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-1 leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sketch-btn sketch-btn-outline p-1.5"
            aria-label={labels.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Scrollable terms list) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Suggested Roles */}
          {template.suggestedRoles.length > 0 && (
            <div className="p-3 bg-[var(--dp-color-ground)] rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)] text-xs font-reading">
              <span className="font-bold text-[var(--dp-color-ink)]">
                {labels.suggestedRoles}:{" "}
              </span>
              <span className="text-[var(--dp-color-ink-muted)]">
                {template.suggestedRoles.join(" • ")}
              </span>
            </div>
          )}

          {/* Terms Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-marker uppercase tracking-wider text-[var(--dp-color-ink)]">
              {locale === "ar" ? "البنود المقترحة بالنموذج:" : "Template Structured Terms:"}
            </h3>
            {template.terms.map((term, index) => (
              <div
                key={term.id}
                className="p-4 rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-marker text-[var(--dp-color-accent)] bg-[var(--dp-color-scrap)] px-2 py-0.5 rounded-[4px_2px_5px_3px] border border-[var(--dp-color-line)]">
                    #{index + 1}
                  </span>
                  <h4 className="text-sm font-bold font-marker text-[var(--dp-color-ink)]">
                    {term.title}
                  </h4>
                </div>
                {term.body && (
                  <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] leading-relaxed ps-7">
                    {term.body}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Trust & Legal Disclaimer */}
          <div className="p-3.5 rounded-[6px_3px_8px_4px] bg-[var(--dp-color-highlight)]/40 border border-[var(--dp-color-line)] text-xs font-reading text-[var(--dp-color-ink)] leading-relaxed">
            ⚠️ {labels.disclaimer}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-dashed border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="sketch-btn sketch-btn-outline px-4 py-2 text-xs font-marker"
          >
            {labels.close}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="sketch-btn sketch-btn-primary px-4 py-2 text-xs font-marker flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {labels.useTemplate}
          </button>
        </div>
      </div>
    </div>
  );
}
