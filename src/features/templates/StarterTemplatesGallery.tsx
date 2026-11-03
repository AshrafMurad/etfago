"use client";

import { useState } from "react";
import { LocalizedStarterTemplate } from "../../lib/schemas/templates";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { Users, Briefcase, Package, ShieldCheck, FileText, Eye, Check } from "lucide-react";

interface StarterTemplatesGalleryProps {
  templates: LocalizedStarterTemplate[];
  onSelectTemplate: (template: LocalizedStarterTemplate) => void;
  locale: string;
  labels: {
    galleryTitle: string;
    gallerySubtitle: string;
    allCategories: string;
    personalCategory: string;
    servicesCategory: string;
    supplyCategory: string;
    confidentialityCategory: string;
    preview: string;
    useTemplate: string;
    suggestedRoles: string;
    termsCount: string;
    disclaimer: string;
    close: string;
    previewTitle: string;
  };
}

export function StarterTemplatesGallery({
  templates,
  onSelectTemplate,
  locale,
  labels,
}: StarterTemplatesGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [previewTemplate, setPreviewTemplate] = useState<LocalizedStarterTemplate | null>(null);

  const categories = [
    { id: "ALL", label: labels.allCategories },
    { id: "PERSONAL", label: labels.personalCategory },
    { id: "SERVICES", label: labels.servicesCategory },
    { id: "SUPPLY", label: labels.supplyCategory },
    { id: "CONFIDENTIALITY", label: labels.confidentialityCategory },
  ];

  const filteredTemplates =
    selectedCategory === "ALL"
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
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
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all flex flex-col justify-between shadow-2xs group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 group-hover:scale-105 transition-transform">
                    {renderIcon(template.icon)}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {template.category}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {template.termsCount} {locale === "ar" ? "بنود" : "terms"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {template.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {template.suggestedRoles.length > 0 && (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {labels.suggestedRoles}:{" "}
                  </span>
                  <span>{template.suggestedRoles.join(" • ")}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {labels.preview}
              </button>

              <button
                type="button"
                onClick={() => onSelectTemplate(template)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {labels.useTemplate}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={(tmpl) => onSelectTemplate(tmpl)}
        locale={locale}
        labels={{
          previewTitle: labels.previewTitle,
          category: labels.allCategories,
          suggestedRoles: labels.suggestedRoles,
          termsCount: labels.termsCount,
          useTemplate: labels.useTemplate,
          close: labels.close,
          disclaimer: labels.disclaimer,
        }}
      />
    </div>
  );
}
