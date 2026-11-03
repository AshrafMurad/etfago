import { describe, it, expect } from "vitest";
import { routing } from "../../src/i18n/routing";

describe("Sprint 0: Smoke & Locale routing tests", () => {
  it("should have Arabic as the default locale", () => {
    expect(routing.defaultLocale).toBe("ar");
  });

  it("should support both Arabic and English locales", () => {
    expect(routing.locales).toContain("ar");
    expect(routing.locales).toContain("en");
    expect(routing.locales.length).toBe(2);
  });
});
