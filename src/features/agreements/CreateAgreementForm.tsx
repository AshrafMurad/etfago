"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createAgreementAction } from "../../server/actions/agreements";
import { StructuredTerm } from "../../lib/schemas/agreements";
import { LocalizedStarterTemplate } from "../../lib/schemas/templates";
import { StarterTemplatesGallery } from "../templates/StarterTemplatesGallery";
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
    if (activeTemplateId) {
      formData.append("templateId", activeTemplateId);
    }
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
    <div className="space-y-6">
      {/* Mode Selector Tabs (Templates vs Blank Draft) */}
      {starterTemplates.length > 0 && (
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/60 max-w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "templates"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {templateLabels?.chooseTemplate || (locale === "ar" ? "نماذج جاهزة" : "Starter Templates")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "form"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
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
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              {templateLabels?.galleryTitle ||
                (locale === "ar" ? "ابدأ بسرعة باستخدام النماذج الجاهزة" : "Start Fast with Curated Templates")}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
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
              termsCount: templateLabels?.termsCount || "بنود",
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
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Active Template Applied Banner */}
          {activeTemplateName && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {locale === "ar" ? "تم تطبيق النموذج:" : "Template applied:"}{" "}
                  <strong className="font-bold">{activeTemplateName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("templates")}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 transition-colors font-medium cursor-pointer"
                >
                  {templateLabels?.switchTemplate || (locale === "ar" ? "تغيير النموذج" : "Switch Template")}
                </button>
                <button
                  type="button"
                  onClick={clearTemplate}
                  className="px-2.5 py-1 rounded-md text-zinc-500 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {templateLabels?.clearTemplate || (locale === "ar" ? "إعادة تعيين" : "Reset")}
                </button>
              </div>
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
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t.termTitle} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={term.title}
                      onChange={(e) => handleUpdateTerm(index, "title", e.target.value)}
                      placeholder={t.termTitlePlaceholder}
                      maxLength={120}
                      required
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {t.termBody} <span className="text-zinc-400 font-normal">({t.optional})</span>
                    </label>
                    <textarea
                      value={term.body || ""}
                      onChange={(e) => handleUpdateTerm(index, "body", e.target.value)}
                      placeholder={t.termBodyPlaceholder}
                      maxLength={4000}
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t.amount} <span className="text-zinc-400 font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="text"
                        value={term.amount || ""}
                        onChange={(e) => handleUpdateTerm(index, "amount", e.target.value)}
                        placeholder="1000"
                        maxLength={32}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t.currency} <span className="text-zinc-400 font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="text"
                        value={term.currency || ""}
                        onChange={(e) => handleUpdateTerm(index, "currency", e.target.value.toUpperCase())}
                        placeholder="SAR"
                        maxLength={10}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {t.dueDate} <span className="text-zinc-400 font-normal">({t.optional})</span>
                      </label>
                      <input
                        type="date"
                        value={term.dueDate || ""}
                        onChange={(e) => handleUpdateTerm(index, "dueDate", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {isSubmitting ? t.loading : t.save}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
