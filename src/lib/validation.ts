/**
 * Etfago Custom Form Validation Utilities
 * Arabic-first, client & server compatible, replacing browser built-in validation popups.
 */

export interface ValidationMessages {
  required?: string;
  emailRequired?: string;
  emailInvalid?: string;
  titleRequired?: string;
  titleMin?: string;
  titleMax?: string;
  workspaceRequired?: string;
  workspaceNameRequired?: string;
  workspaceNameMin?: string;
  workspaceNameMax?: string;
  partyNameRequired?: string;
  partyNameMax?: string;
  termTitleRequired?: string;
  termTitleMax?: string;
  termBodyRequired?: string;
  termBodyMax?: string;
  commitmentTitleRequired?: string;
  reasonRequired?: string;
  withdrawReasonRequired?: string;
  declineReasonRequired?: string;
  commentRequired?: string;
  amountInvalid?: string;
  currencyInvalid?: string;
  dateInvalid?: string;
  quorumThresholdInvalid?: string;
  formHasErrors?: string;
}

const DEFAULT_MESSAGES: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    required: "هذا الحقل مطلوب",
    emailRequired: "يرجى إدخال البريد الإلكتروني",
    emailInvalid: "يرجى إدخال بريد إلكتروني صحيح (مثال: user@example.com)",
    titleRequired: "عنوان الاتفاق مطلوب",
    titleMin: "يجب ألا يقل العنوان عن حرفين",
    titleMax: "يجب ألا يتجاوز العنوان 160 حرفًا",
    workspaceRequired: "يرجى اختيار مساحة العمل",
    workspaceNameRequired: "اسم مساحة العمل مطلوب",
    workspaceNameMin: "يجب ألا يقل اسم مساحة العمل عن حرفين",
    workspaceNameMax: "يجب ألا يتجاوز اسم مساحة العمل 100 حرف",
    partyNameRequired: "اسم الطرف المشارك مطلوب",
    partyNameMax: "يجب ألا يتجاوز اسم الطرف 120 حرفًا",
    termTitleRequired: "عنوان البند مطلوب",
    termTitleMax: "يجب ألا يتجاوز عنوان البند 120 حرفًا",
    termBodyRequired: "تفاصيل البند مطلوبة",
    termBodyMax: "يجب ألا تتجاوز تفاصيل البند 4000 حرف",
    commitmentTitleRequired: "عنوان الالتزام مطلوب",
    reasonRequired: "يرجى توضيح سبب طلب التعديل",
    withdrawReasonRequired: "سبب سحب المراجعة مطلوب",
    declineReasonRequired: "سبب رفض الاقتراح مطلوب",
    commentRequired: "يرجى كتابة نص التعليق",
    amountInvalid: "يرجى إدخال مبلغ مالي صحيح (أرقام فقط)",
    currencyInvalid: "رمز عملة غير صالح (مثال: SAR)",
    dateInvalid: "صيغة التاريخ غير صالحة",
    quorumThresholdInvalid: "عدد الأصوات المطلوب غير صالح",
    formHasErrors: "يرجى مراجعة الحقول وتصحيح الأخطاء الموضحة أدناه",
  },
  en: {
    required: "This field is required",
    emailRequired: "Please enter your email address",
    emailInvalid: "Please enter a valid email address (e.g. user@example.com)",
    titleRequired: "Agreement title is required",
    titleMin: "Title must be at least 2 characters",
    titleMax: "Title cannot exceed 160 characters",
    workspaceRequired: "Please select a workspace",
    workspaceNameRequired: "Workspace name is required",
    workspaceNameMin: "Workspace name must be at least 2 characters",
    workspaceNameMax: "Workspace name cannot exceed 100 characters",
    partyNameRequired: "Party name is required",
    partyNameMax: "Party name cannot exceed 120 characters",
    termTitleRequired: "Term title is required",
    termTitleMax: "Term title cannot exceed 120 characters",
    termBodyRequired: "Term details are required",
    termBodyMax: "Term details cannot exceed 4000 characters",
    commitmentTitleRequired: "Commitment title is required",
    reasonRequired: "Please provide a reason for the change request",
    withdrawReasonRequired: "Withdrawal reason is required",
    declineReasonRequired: "Decline reason is required",
    commentRequired: "Please enter a comment",
    amountInvalid: "Please enter a valid amount (numbers only)",
    currencyInvalid: "Invalid currency code (e.g. SAR)",
    dateInvalid: "Invalid date format",
    quorumThresholdInvalid: "Invalid quorum threshold count",
    formHasErrors: "Please review the form and fix the errors below",
  },
};

export function getValidationMessage(
  key: keyof ValidationMessages,
  locale: string = "ar",
  override?: string
): string {
  if (override) return override;
  const lang = locale === "en" ? "en" : "ar";
  return DEFAULT_MESSAGES[lang][key] || DEFAULT_MESSAGES.ar[key] || "حقل غير صالح";
}

// RFC 5322 compatible email pattern for practical web forms
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

export function validateEmail(
  email: string | null | undefined,
  locale: string = "ar",
  customMessage?: string
): string | null {
  const trimmed = email ? email.trim() : "";
  if (!trimmed) {
    return getValidationMessage("emailRequired", locale, customMessage);
  }
  if (!isValidEmail(trimmed)) {
    return getValidationMessage("emailInvalid", locale, customMessage);
  }
  return null;
}

export function validateRequired(
  value: string | null | undefined,
  locale: string = "ar",
  customMessage?: string
): string | null {
  const trimmed = value ? value.trim() : "";
  if (!trimmed) {
    return getValidationMessage("required", locale, customMessage);
  }
  return null;
}

export function validateMinLength(
  value: string | null | undefined,
  min: number,
  locale: string = "ar",
  customMessage?: string
): string | null {
  const trimmed = value ? value.trim() : "";
  if (!trimmed) {
    return getValidationMessage("required", locale, customMessage);
  }
  if (trimmed.length < min) {
    if (customMessage) return customMessage;
    return locale === "en"
      ? `Must be at least ${min} characters`
      : `يجب ألا يقل هذا الحقل عن ${min} أحرف`;
  }
  return null;
}

export function validateMaxLength(
  value: string | null | undefined,
  max: number,
  locale: string = "ar",
  customMessage?: string
): string | null {
  const trimmed = value ? value.trim() : "";
  if (trimmed.length > max) {
    if (customMessage) return customMessage;
    return locale === "en"
      ? `Cannot exceed ${max} characters`
      : `يجب ألا يتجاوز هذا الحقل ${max} حرفًا`;
  }
  return null;
}

export function validateAmount(
  value: string | null | undefined,
  locale: string = "ar",
  customMessage?: string
): string | null {
  if (!value || !value.trim()) return null; // Amount is optional in Etfago
  const trimmed = value.trim();
  // Valid numeric amounts: digits, optional decimal point with up to 4 decimal places, optional comma thousands separators
  const cleaned = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{1,4})?$/.test(cleaned) || Number.isNaN(Number(cleaned)) || Number(cleaned) < 0) {
    return getValidationMessage("amountInvalid", locale, customMessage);
  }
  return null;
}

export function validateCurrency(
  value: string | null | undefined,
  locale: string = "ar",
  customMessage?: string
): string | null {
  if (!value || !value.trim()) return null; // Currency is optional
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length < 2 || trimmed.length > 10 || !/^[A-Z0-9$€£¥\u0600-\u06FF. ]+$/i.test(trimmed)) {
    return getValidationMessage("currencyInvalid", locale, customMessage);
  }
  return null;
}

export function validateDate(
  value: string | null | undefined,
  locale: string = "ar",
  customMessage?: string
): string | null {
  if (!value || !value.trim()) return null; // Date is optional
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return getValidationMessage("dateInvalid", locale, customMessage);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return getValidationMessage("dateInvalid", locale, customMessage);
  }
  return null;
}
