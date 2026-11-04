import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

  it("should have brand logo and favicons correctly placed in public and app directories", () => {
    const root = path.resolve(__dirname, "../..");
    const publicFavicon = path.join(root, "public", "favicon.ico");
    const appFavicon = path.join(root, "src", "app", "favicon.ico");
    const publicLogo = path.join(root, "public", "logo.png");

    expect(fs.existsSync(publicFavicon)).toBe(true);
    expect(fs.statSync(publicFavicon).size).toBeGreaterThan(0);

    expect(fs.existsSync(appFavicon)).toBe(true);
    expect(fs.statSync(appFavicon).size).toBeGreaterThan(0);

    expect(fs.existsSync(publicLogo)).toBe(true);
    expect(fs.statSync(publicLogo).size).toBeGreaterThan(0);

    // Verify PNG header for logo
    const logoBuf = fs.readFileSync(publicLogo);
    expect(logoBuf.subarray(0, 4).toString("hex")).toBe("89504e47");
  });
});
