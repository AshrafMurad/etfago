import { describe, it, expect } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

describe("Translations & ICU Formatting", () => {
  it("has parity for Templates.termsCount", () => {
    expect(ar.Templates.termsCount).toBe("{count} بنود مقترحة");
    expect(en.Templates.termsCount).toBe("{count} suggested terms");
  });

  it("has parity for Agreements.termsCount", () => {
    expect(ar.Agreements.termsCount).toBe("{count} بند");
    expect(en.Agreements.termsCount).toBe("{count} term(s)");
  });

  it("has parity for Navigation menu keys", () => {
    expect(ar.Navigation.menu).toBe("القائمة");
    expect(en.Navigation.menu).toBe("Menu");
    expect(ar.Navigation.openMenu).toBe("فتح القائمة");
    expect(en.Navigation.openMenu).toBe("Open menu");
    expect(ar.Navigation.closeMenu).toBe("إغلاق القائمة");
    expect(en.Navigation.closeMenu).toBe("Close menu");
  });

  it("can replace count placeholder properly", () => {
    const arFormatted = ar.Templates.termsCount.replace("{count}", "5");
    expect(arFormatted).toBe("5 بنود مقترحة");

    const enFormatted = en.Templates.termsCount.replace("{count}", "5");
    expect(enFormatted).toBe("5 suggested terms");
  });

  it("has key parity for Validation namespace between Arabic and English", () => {
    const arValidationKeys = Object.keys(ar.Validation).sort();
    const enValidationKeys = Object.keys(en.Validation).sort();
    expect(arValidationKeys).toEqual(enValidationKeys);
    expect(arValidationKeys.length).toBeGreaterThanOrEqual(15);
  });
});
