import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateAmount,
  validateCurrency,
  validateDate,
  isValidEmail,
  getValidationMessage,
} from "../../src/lib/validation";

describe("Custom Form Validation Rules", () => {
  describe("validateEmail", () => {
    it("accepts valid email addresses", () => {
      expect(validateEmail("user@example.com", "ar")).toBeNull();
      expect(validateEmail("admin.test+tag@company.co.uk", "en")).toBeNull();
      expect(validateEmail("  spaces@trimmed.com  ", "ar")).toBeNull();
    });

    it("rejects empty or whitespace-only email with localized message", () => {
      const arMsg = validateEmail("", "ar");
      const enMsg = validateEmail("   ", "en");
      expect(arMsg).toBe("يرجى إدخال البريد الإلكتروني");
      expect(enMsg).toBe("Please enter your email address");
    });

    it("rejects invalid email formats with localized message", () => {
      const invalidEmails = [
        "notanemail",
        "missingatsign.com",
        "@nodomain.com",
        "user@",
        "user@domain",
        "user@domain.",
      ];

      for (const email of invalidEmails) {
        expect(validateEmail(email, "ar")).toBe("يرجى إدخال بريد إلكتروني صحيح (مثال: user@example.com)");
        expect(validateEmail(email, "en")).toBe("Please enter a valid email address (e.g. user@example.com)");
      }
    });

    it("supports isValidEmail helper directly", () => {
      expect(isValidEmail("test@test.com")).toBe(true);
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("validateRequired", () => {
    it("returns null for non-empty values", () => {
      expect(validateRequired("hello", "ar")).toBeNull();
      expect(validateRequired("  valid  ", "en")).toBeNull();
    });

    it("returns error message for empty/null/whitespace values", () => {
      expect(validateRequired("", "ar")).toBe("هذا الحقل مطلوب");
      expect(validateRequired(null, "en")).toBe("This field is required");
      expect(validateRequired(undefined, "ar")).toBe("هذا الحقل مطلوب");
      expect(validateRequired("   ", "en")).toBe("This field is required");
    });
  });

  describe("validateMinLength", () => {
    it("validates string length against minimum threshold", () => {
      expect(validateMinLength("ab", 2, "ar")).toBeNull();
      expect(validateMinLength("abc", 2, "en")).toBeNull();

      expect(validateMinLength("a", 2, "ar")).toBe("يجب ألا يقل هذا الحقل عن 2 أحرف");
      expect(validateMinLength("a", 2, "en")).toBe("Must be at least 2 characters");
    });

    it("fails required if value is empty", () => {
      expect(validateMinLength("", 3, "ar")).toBe("هذا الحقل مطلوب");
      expect(validateMinLength("  ", 3, "en")).toBe("This field is required");
    });
  });

  describe("validateMaxLength", () => {
    it("validates string length against maximum threshold", () => {
      expect(validateMaxLength("abc", 5, "ar")).toBeNull();
      expect(validateMaxLength("abcdef", 5, "ar")).toBe("يجب ألا يتجاوز هذا الحقل 5 حرفًا");
      expect(validateMaxLength("abcdef", 5, "en")).toBe("Cannot exceed 5 characters");
    });
  });

  describe("validateAmount (Optional structured term amount)", () => {
    it("allows empty or omitted amount values (money is optional)", () => {
      expect(validateAmount("", "ar")).toBeNull();
      expect(validateAmount(null, "ar")).toBeNull();
      expect(validateAmount(undefined, "en")).toBeNull();
      expect(validateAmount("   ", "en")).toBeNull();
    });

    it("accepts valid numeric values and comma-formatted numbers", () => {
      expect(validateAmount("100", "ar")).toBeNull();
      expect(validateAmount("1000.50", "en")).toBeNull();
      expect(validateAmount("5,000", "ar")).toBeNull();
      expect(validateAmount("1,000,000.99", "en")).toBeNull();
    });

    it("rejects invalid amounts", () => {
      expect(validateAmount("abc", "ar")).toBe("يرجى إدخال مبلغ مالي صحيح (أرقام فقط)");
      expect(validateAmount("-500", "en")).toBe("Please enter a valid amount (numbers only)");
      expect(validateAmount("10.12345", "ar")).toBe("يرجى إدخال مبلغ مالي صحيح (أرقام فقط)");
    });
  });

  describe("validateCurrency (Optional structured term currency)", () => {
    it("allows empty or omitted currency (currency is optional)", () => {
      expect(validateCurrency("", "ar")).toBeNull();
      expect(validateCurrency(null, "en")).toBeNull();
      expect(validateCurrency(undefined, "ar")).toBeNull();
    });

    it("accepts valid currency codes", () => {
      expect(validateCurrency("SAR", "ar")).toBeNull();
      expect(validateCurrency("USD", "en")).toBeNull();
      expect(validateCurrency("EUR", "ar")).toBeNull();
      expect(validateCurrency("ر.س", "ar")).toBeNull();
    });

    it("rejects invalid currency codes", () => {
      expect(validateCurrency("A", "ar")).toBe("رمز عملة غير صالح (مثال: SAR)");
      expect(validateCurrency("TOOLONGFORCURRENCY", "en")).toBe("Invalid currency code (e.g. SAR)");
    });
  });

  describe("validateDate (Optional term dueDate)", () => {
    it("allows empty or omitted dates", () => {
      expect(validateDate("", "ar")).toBeNull();
      expect(validateDate(null, "en")).toBeNull();
    });

    it("accepts ISO format YYYY-MM-DD", () => {
      expect(validateDate("2026-11-04", "ar")).toBeNull();
      expect(validateDate("2027-01-01", "en")).toBeNull();
    });

    it("rejects invalid dates or wrong formats", () => {
      expect(validateDate("04-11-2026", "ar")).toBe("صيغة التاريخ غير صالحة");
      expect(validateDate("2026/11/04", "en")).toBe("Invalid date format");
      expect(validateDate("invalid-date", "ar")).toBe("صيغة التاريخ غير صالحة");
    });
  });

  describe("getValidationMessage fallback", () => {
    it("returns override if supplied", () => {
      expect(getValidationMessage("required", "ar", "مخصص")).toBe("مخصص");
    });

    it("returns correct language for known keys", () => {
      expect(getValidationMessage("workspaceRequired", "ar")).toBe("يرجى اختيار مساحة العمل");
      expect(getValidationMessage("workspaceRequired", "en")).toBe("Please select a workspace");
    });
  });
});
