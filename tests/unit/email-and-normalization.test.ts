import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail } from "../../src/lib/email";

describe("Email normalization and validation", () => {
  it("normalizes uppercase and mixed case emails to lowercase", () => {
    expect(normalizeEmail("Test.User@Example.COM")).toBe("test.user@example.com");
  });

  it("trims whitespace from email addresses", () => {
    expect(normalizeEmail("   user@domain.com  \n\t")).toBe("user@domain.com");
  });

  it("applies Unicode NFC normalization", () => {
    // Decomposed vs composed unicode representations
    const decomposed = "u\u0308ser@domain.com";
    const composed = "\u00fcser@domain.com";
    expect(normalizeEmail(decomposed)).toBe(composed);
  });

  it("validates RFC-compliant email syntax", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.domain.co")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });

  it("throws on empty or non-string input", () => {
    expect(() => normalizeEmail("")).toThrow("Invalid email input");
    // @ts-expect-error test invalid input
    expect(() => normalizeEmail(null)).toThrow("Invalid email input");
  });
});
