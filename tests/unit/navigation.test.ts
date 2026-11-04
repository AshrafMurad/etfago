import { describe, it, expect, vi } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

vi.mock("../../src/server/auth/auth", () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

import { signOutAction } from "../../src/server/actions/auth";
import { signOut } from "../../src/server/auth/auth";

describe("Mobile Navigation & Navbar Configuration", () => {
  it("provides all necessary navigation translation keys in Arabic and English", () => {
    const requiredKeys = [
      "home",
      "agreements",
      "newAgreement",
      "workspaces",
      "settings",
      "privacy",
      "terms",
      "signOut",
      "signIn",
      "menu",
      "openMenu",
      "closeMenu",
    ] as const;

    for (const key of requiredKeys) {
      expect(ar.Navigation[key]).toBeDefined();
      expect(typeof ar.Navigation[key]).toBe("string");
      expect(ar.Navigation[key].length).toBeGreaterThan(0);

      expect(en.Navigation[key]).toBeDefined();
      expect(typeof en.Navigation[key]).toBe("string");
      expect(en.Navigation[key].length).toBeGreaterThan(0);
    }
  });

  it("handles signOutAction with locale parameter or FormData", async () => {
    // Call with string
    await signOutAction("en");
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/en/auth/signin" });

    // Call with FormData
    const formData = new FormData();
    formData.append("locale", "ar");
    await signOutAction(formData);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/ar/auth/signin" });

    // Call with undefined defaults to 'ar'
    await signOutAction();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/ar/auth/signin" });
  });
});
