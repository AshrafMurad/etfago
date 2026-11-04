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
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b-[1.5px] border-dashed border-[var(--dp-color-line)]">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-[6px_3px_8px_4px] text-xs font-marker font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                  : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-scrap)]"
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
            className="sketch-card p-5 flex flex-col justify-between hover:rotate-[-0.1deg] transition-all group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-[5px_2px_7px_3px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] group-hover:scale-105 transition-transform text-[var(--dp-color-ink)]">
                    {renderIcon(template.icon)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
                      {template.category}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[var(--dp-color-ink-muted)] font-reading font-semibold">
                  {template.termsCount} {locale === "ar" ? "بنود" : "terms"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)] leading-snug">
                  {template.title}
                </h3>
                <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {template.suggestedRoles.length > 0 && (
                <div className="text-[11px] font-reading text-[var(--dp-color-ink-muted)] pt-1">
                  <span className="font-bold text-[var(--dp-color-ink)]">
                    {labels.suggestedRoles}:{" "}
                  </span>
                  <span>{template.suggestedRoles.join(" • ")}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 mt-3 border-t border-dashed border-[var(--dp-color-line)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="sketch-btn sketch-btn-outline px-3 py-1.5 text-xs font-marker flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {labels.preview}
              </button>

              <button
                type="button"
                onClick={() => onSelectTemplate(template)}
                className="sketch-btn sketch-btn-primary px-3.5 py-1.5 text-xs font-marker flex items-center gap-1.5"
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
