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
        return <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "Briefcase":
        return <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "Package":
        return <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              {renderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {template.category}
                </span>
                <span className="text-xs text-zinc-400">
                  {template.termsCount} {locale === "ar" ? "بنود" : "terms"}
                </span>
              </div>
              <h2
                id="template-preview-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1"
              >
                {template.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {template.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label={labels.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable terms list) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Suggested Roles */}
          {template.suggestedRoles.length > 0 && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {labels.suggestedRoles}:{" "}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {template.suggestedRoles.join(" • ")}
              </span>
            </div>
          )}

          {/* Terms Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {locale === "ar" ? "البنود المقترحة بالنموذج:" : "Template Structured Terms:"}
            </h3>
            {template.terms.map((term, index) => (
              <div
                key={term.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    #{index + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {term.title}
                  </h4>
                </div>
                {term.body && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed ps-7">
                    {term.body}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Trust & Legal Disclaimer */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            ⚠️ {labels.disclaimer}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {labels.close}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(template);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {labels.useTemplate}
          </button>
        </div>
      </div>
    </div>
  );
}
