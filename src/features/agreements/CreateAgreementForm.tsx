"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createAgreementAction } from "../../server/actions/agreements";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { LocalizedStarterTemplate } from "../../lib/schemas/templates";
import { StarterTemplatesGallery } from "../templates/StarterTemplatesGallery";
import { SketchSelect } from "../ui/SketchSelect";
import { SketchDatePicker } from "../ui/SketchDatePicker";
import { Sparkles, FileText, RotateCcw, CheckCircle2 } from "lucide-react";

interface WorkspaceOption {
  id: string;
  name: string;
  kind: "PERSONAL" | "BUSINESS";
}

interface CreateAgreementFormProps {
  locale: string;
  workspaces: WorkspaceOption[];
  starterTemplates?: LocalizedStarterTemplate[];
  initialTemplateId?: string | null;
  initialWorkspaceId?: string | null;
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
  templateLabels?: {
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
    startBlank: string;
    chooseTemplate: string;
    templateAppliedNotice: string;
    switchTemplate: string;
    clearTemplate: string;
  };
}

function createBlankTerm(): StructuredTerm {
  return {
    id: `term_${Date.now()}_1`,
    title: "",
    body: null,
    amount: null,
    currency: null,
    dueDate: null,
    assignedParticipantId: null,
  };
}

export function CreateAgreementForm({
  locale,
  workspaces,
  starterTemplates = [],
  initialTemplateId = null,
  initialWorkspaceId = null,
  translations: t,
  templateLabels,
}: CreateAgreementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState(
    initialWorkspaceId && workspaces.some((w) => w.id === initialWorkspaceId)
      ? initialWorkspaceId
      : workspaces[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(initialTemplateId);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);

  // Tab mode: "form" | "templates"
  const [activeTab, setActiveTab] = useState<"form" | "templates">(
    initialTemplateId ? "form" : starterTemplates.length > 0 ? "templates" : "form"
  );

  const [terms, setTerms] = useState<StructuredTerm[]>([createBlankTerm()]);

  const applyTemplate = useCallback((template: LocalizedStarterTemplate) => {
    const timestamp = Date.now();
    setTitle(template.title);
    setDescription(template.description);
    setCategory(template.category);
    setActiveTemplateId(template.id);
    setActiveTemplateName(template.title);

    const populatedTerms: StructuredTerm[] = template.terms.map((term, idx) => ({
      id: `term_${timestamp}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
      title: term.title,
      body: term.body ?? null,
      amount: term.amount ?? null,
      currency: term.currency ?? null,
      dueDate: null,
      assignedParticipantId: null,
    }));

    setTerms(populatedTerms.length > 0 ? populatedTerms : [createBlankTerm()]);
    setActiveTab("form");
  }, []);

  // Handle initial template loading
  useEffect(() => {
    if (initialTemplateId && starterTemplates.length > 0) {
      const found = starterTemplates.find((t) => t.id === initialTemplateId);
      if (found) {
        applyTemplate(found);
      }
    }
  }, [initialTemplateId, starterTemplates, applyTemplate]);

  const clearTemplate = () => {
    setActiveTemplateId(null);
    setActiveTemplateName(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setTerms([createBlankTerm()]);
  };

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
      setError(locale === "ar" ? "يرجى اختيار مساحة العمل" : "Please select a workspace");
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
    if (activeTemplateId) {
      formData.append("templateId", activeTemplateId);
    }
    formData.append("termsJson", JSON.stringify(filteredTerms));

    try {
      const res = await createAgreementAction(null, formData);
      if (res.success && res.agreementId) {
        router.push(`/${locale}/agreements/${res.agreementId}`);
      } else {
        setError(
          res.error ||
            (locale === "ar" ? "فشل إنشاء مسودة الاتفاق" : "Failed to create agreement")
        );
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع"
          : "An unexpected error occurred"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector Tabs (Templates vs Blank Draft) */}
      {starterTemplates.length > 0 && (
        <div className="flex items-center gap-2 p-1.5 bg-[var(--dp-color-scrap)] rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] max-w-fit shadow-[1px_1px_0px_var(--dp-color-line)]">
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-3.5 py-1.5 rounded-[6px_3px_8px_4px] text-xs font-bold font-marker flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "templates"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {templateLabels?.chooseTemplate || (locale === "ar" ? "نماذج جاهزة" : "Starter Templates")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`px-3.5 py-1.5 rounded-[6px_3px_8px_4px] text-xs font-bold font-marker flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "form"
                ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] shadow-[1px_1px_0px_var(--dp-color-ink)]"
                : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {templateLabels?.startBlank || (locale === "ar" ? "مسودة مخصصة" : "Custom Draft")}
          </button>
        </div>
      )}

      {/* Templates Gallery Tab View */}
      {activeTab === "templates" && starterTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="sketch-card p-5 space-y-1.5">
            <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
              {templateLabels?.galleryTitle ||
                (locale === "ar" ? "ابدأ بسرعة باستخدام النماذج الجاهزة" : "Start Fast with Curated Templates")}
            </h3>
            <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
              {templateLabels?.gallerySubtitle ||
                (locale === "ar"
                  ? "اختر النموذج المناسب لطبيعة تعاملك لتعبئة البنود المقترحة تلقائيًا، مع إمكانية تعديلها أو حذفها لاحقًا."
                  : "Choose a template to prefill structured terms, with full flexibility to customize terms afterwards.")}
            </p>
          </div>

          <StarterTemplatesGallery
            templates={starterTemplates}
            onSelectTemplate={applyTemplate}
            locale={locale}
            labels={{
              galleryTitle: templateLabels?.galleryTitle || "النماذج الجاهزة",
              gallerySubtitle: templateLabels?.gallerySubtitle || "",
              allCategories: templateLabels?.allCategories || "الكل",
              personalCategory: templateLabels?.personalCategory || "شخصي",
              servicesCategory: templateLabels?.servicesCategory || "خدمات",
              supplyCategory: templateLabels?.supplyCategory || "توريد",
              confidentialityCategory: templateLabels?.confidentialityCategory || "سرية",
              preview: templateLabels?.preview || "معاينة",
              useTemplate: templateLabels?.useTemplate || "استخدام النموذج",
              suggestedRoles: templateLabels?.suggestedRoles || "الأدوار المقترحة",
              termsCount: templateLabels?.termsCount || (locale === "ar" ? "{count} بنود مقترحة" : "{count} suggested terms"),
              disclaimer:
                templateLabels?.disclaimer ||
                "النماذج المقترحة هي مسودات استرشادية لتنظيم العمل والاتفاقات ولا تعد استشارة قانونية.",
              close: templateLabels?.close || "إغلاق",
              previewTitle: templateLabels?.previewTitle || "معاينة بنود النموذج",
            }}
          />
        </div>
      )}

      {/* Agreement Draft Form View */}
      {activeTab === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-[6px_3px_8px_4px] bg-[#fbeee9] border border-[var(--dp-color-accent)] text-xs font-reading text-[var(--dp-color-accent)]">
              {error}
            </div>
          )}

          {/* Active Template Applied Banner */}
          {activeTemplateName && (
            <div className="sketch-strip p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-reading">
              <div className="flex items-center gap-2 text-[var(--dp-color-ink)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--dp-color-annotation)] shrink-0" />
                <span>
                  {locale === "ar" ? "تم تطبيق النموذج:" : "Template applied:"}{" "}
                  <strong className="font-bold font-marker">{activeTemplateName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("templates")}
                  className="sketch-btn sketch-btn-secondary px-3 py-1 text-xs font-marker cursor-pointer"
                >
                  {templateLabels?.switchTemplate || (locale === "ar" ? "تغيير النموذج" : "Switch Template")}
                </button>
                <button
                  type="button"
                  onClick={clearTemplate}
                  className="sketch-btn sketch-btn-outline px-3 py-1 text-xs font-marker text-[var(--dp-color-accent)] cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {templateLabels?.clearTemplate || (locale === "ar" ? "إعادة تعيين" : "Reset")}
                </button>
              </div>
            </div>
          )}

          {/* Workspace & Category */}
          <div className="sketch-card p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1.5">
                  {t.workspaceSelect} <span className="text-[var(--dp-color-accent)]">*</span>
                </label>
                <SketchSelect
                  value={workspaceId}
                  onChange={(val) => setWorkspaceId(val)}
                  options={workspaces.map((ws) => ({
                    value: ws.id,
                    label: ws.name,
                    badge: (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-ground)] text-[var(--dp-color-ink-muted)] border border-[var(--dp-color-line)] font-marker">
                        {ws.kind === "PERSONAL"
                          ? locale === "ar"
                            ? "شخصي"
                            : "Personal"
                          : locale === "ar"
                          ? "أعمال"
                          : "Business"}
                      </span>
                    ),
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1.5">
                  {t.categoryLabel} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t.categoryPlaceholder}
                  maxLength={64}
                  className="w-full px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            {/* Quick Template Picker Dropdown */}
            {starterTemplates.length > 0 && (
              <div className="pt-2 border-t border-dashed border-[var(--dp-color-line)]/50">
                <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--dp-color-annotation)]" />
                  <span>
                    {locale === "ar"
                      ? "تعبئة سريعة من النماذج المقترحة"
                      : "Quick Template Selection"}
                  </span>
                  <span className="text-[var(--dp-color-ink-muted)] font-normal">
                    ({t.optional})
                  </span>
                </label>
                <SketchSelect
                  value={activeTemplateId || ""}
                  onChange={(val) => {
                    const tpl = starterTemplates.find((t) => t.id === val);
                    if (tpl) applyTemplate(tpl);
                  }}
                  placeholder={
                    locale === "ar"
                      ? "اختر قالباً لتعبئة البنود المقترحة تلقائياً..."
                      : "Choose a template to prefill terms..."
                  }
                  options={starterTemplates.map((t) => ({
                    value: t.id,
                    label: t.title,
                    description: t.description,
                    badge: (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-marker">
                        {t.terms.length} {locale === "ar" ? "بنود" : "terms"}
                      </span>
                    ),
                  }))}
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1.5">
                {t.titleLabel} <span className="text-[var(--dp-color-accent)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                maxLength={160}
                required
                className="w-full px-3.5 py-2 text-base font-bold font-marker"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1.5">
                {t.descriptionLabel} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                maxLength={4000}
                rows={3}
                className="w-full px-3.5 py-2 text-sm font-reading"
              />
            </div>
          </div>

          {/* Initial Terms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-marker text-[var(--dp-color-ink)]">
                {t.addTerm} ({terms.length})
              </h2>
              <button
                type="button"
                onClick={handleAddTerm}
                disabled={terms.length >= 50}
                className="sketch-btn sketch-btn-secondary px-3 py-1.5 text-xs font-marker"
              >
                + {t.addTerm}
              </button>
            </div>

            <div className="space-y-3">
              {terms.map((term, index) => (
                <div
                  key={term.id}
                  className="sketch-card p-5 space-y-3 relative hover:rotate-[-0.1deg] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-dashed border-[var(--dp-color-line)] pb-2.5">
                    <span className="text-sm font-bold font-marker text-[var(--dp-color-accent)]">
                      #{index + 1}
                    </span>
                    {terms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(index)}
                        className="text-xs text-[var(--dp-color-accent)] hover:underline p-1 font-bold cursor-pointer"
                        title={t.removeTerm}
                      >
                        ✕ {t.removeTerm}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
                      {t.termTitle} <span className="text-[var(--dp-color-accent)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={term.title}
                      onChange={(e) => handleUpdateTerm(index, "title", e.target.value)}
                      placeholder={t.termTitlePlaceholder}
                      maxLength={120}
                      required
                      className="w-full px-3.5 py-2 text-base font-bold font-marker"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
                      {t.termBody} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
                    </label>
                    <textarea
                      value={term.body || ""}
                      onChange={(e) => handleUpdateTerm(index, "body", e.target.value)}
                      placeholder={t.termBodyPlaceholder}
                      maxLength={4000}
                      rows={2}
                      className="w-full px-3.5 py-2 text-sm font-reading"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.amount} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="text"
                        value={term.amount || ""}
                        onChange={(e) => handleUpdateTerm(index, "amount", e.target.value)}
                        placeholder="1000"
                        maxLength={32}
                        className="w-full px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.currency} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="text"
                        value={term.currency || ""}
                        onChange={(e) => handleUpdateTerm(index, "currency", e.target.value.toUpperCase())}
                        placeholder="SAR"
                        maxLength={10}
                        className="w-full px-3 py-1.5 text-xs uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-reading text-[var(--dp-color-ink-muted)] mb-1">
                        {t.dueDate} <span className="text-[var(--dp-color-ink-muted)] font-normal">({t.optional})</span>
                      </label>
                      <SketchDatePicker
                        value={term.dueDate || ""}
                        onChange={(val) => handleUpdateTerm(index, "dueDate", val || null)}
                        placeholder={t.dueDate}
                        locale={locale}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed border-[var(--dp-color-line)]">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="sketch-btn sketch-btn-outline px-5 py-2.5 text-sm font-marker disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="sketch-btn sketch-btn-primary px-6 py-2.5 text-sm font-marker disabled:opacity-50"
            >
              {isSubmitting ? t.loading : t.save}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
