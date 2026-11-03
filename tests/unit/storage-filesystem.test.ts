import { describe, it, expect } from "vitest";
import {
  detectFileMime,
  resolveSafeStoragePath,
  sanitizeFilename,
} from "../../src/server/storage/filesystem";
import { ForbiddenError } from "../../src/lib/errors";

describe("Sprint 6 Unit: Storage Filesystem Adapter", () => {
  describe("detectFileMime (magic-byte detection)", () => {
    it("detects PDF magic bytes (%PDF-)", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7\nTest content");
      expect(detectFileMime(pdfBuffer)).toBe("application/pdf");
    });

    it("detects JPEG magic bytes (0xFF 0xD8 0xFF)", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      expect(detectFileMime(jpegBuffer)).toBe("image/jpeg");
    });

    it("detects PNG magic bytes (0x89 PNG)", () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(detectFileMime(pngBuffer)).toBe("image/png");
    });

    it("detects WebP magic bytes (RIFF....WEBP)", () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectFileMime(webpBuffer)).toBe("image/webp");
    });

    it("rejects unknown or invalid signatures (e.g. text or PE executable)", () => {
      const textBuffer = Buffer.from("Hello, this is just plain text");
      expect(detectFileMime(textBuffer)).toBeNull();

      const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00");
      expect(detectFileMime(exeBuffer)).toBeNull();

      const shortBuffer = Buffer.from("%PDF");
      expect(detectFileMime(shortBuffer)).toBeNull();
    });
  });

  describe("resolveSafeStoragePath", () => {
    const validKey = "a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890";

    it("resolves valid 64-hex key to prefix subdirectory path", () => {
      const resolved = resolveSafeStoragePath(validKey);
      expect(resolved).toContain("a1");
      expect(resolved.endsWith(validKey)).toBe(true);
    });

    it("rejects invalid key formats (non-hex, wrong length)", () => {
      expect(() => resolveSafeStoragePath("invalid-key")).toThrow(ForbiddenError);
      expect(() => resolveSafeStoragePath(validKey.slice(0, 63))).toThrow(ForbiddenError);
      expect(() => resolveSafeStoragePath(validKey.toUpperCase())).toThrow(ForbiddenError);
    });

    it("rejects path traversal attempts", () => {
      expect(() => resolveSafeStoragePath("../" + validKey.slice(3))).toThrow(ForbiddenError);
      expect(() => resolveSafeStoragePath("..\\..\\etc\\passwd")).toThrow(ForbiddenError);
    });
  });

  describe("sanitizeFilename", () => {
    it("strips path separators and directory traversal sequences", () => {
      expect(sanitizeFilename("../../secret.pdf")).toBe("secret.pdf");
      expect(sanitizeFilename("C:\\Users\\admin\\file.png")).toBe("file.png");
    });

    it("replaces forbidden characters with underscores", () => {
      expect(sanitizeFilename('my<contract>:v1*"?.pdf')).toBe("my_contract_v1_.pdf");
    });

    it("truncates extremely long filenames", () => {
      const longName = "a".repeat(250) + ".pdf";
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(200);
    });

    it("falls back to attachment if empty", () => {
      expect(sanitizeFilename("")).toBe("attachment");
      expect(sanitizeFilename("   ")).toBe("attachment");
    });
  });
});
