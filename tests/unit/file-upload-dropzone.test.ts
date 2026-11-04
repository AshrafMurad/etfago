import { describe, it, expect } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

describe("FileUploadDropzone & Files Translations Parity", () => {
  it("has parity for all new Files translation keys between ar and en", () => {
    const requiredKeys = [
      "title",
      "upload",
      "uploading",
      "privateStorageNotice",
      "allowedFormats",
      "noAttachments",
      "uploadedBy",
      "download",
      "delete",
      "confirmDelete",
      "dropzoneTitle",
      "dropzoneActive",
      "browseFiles",
      "dropzoneHint",
      "privateStorageBadge",
      "uploadProgress",
      "fileTooLarge",
      "unsupportedType",
      "uploadFailed",
      "uploadSuccess",
      "emptyStateSubtitle",
      "userFallback",
      "archivedReadOnly",
      "filesCount",
      "downloadTooltip",
      "deleteTooltip",
    ] as const;

    for (const key of requiredKeys) {
      expect(ar.Files).toHaveProperty(key);
      expect(en.Files).toHaveProperty(key);
      expect(typeof ar.Files[key]).toBe("string");
      expect(typeof en.Files[key]).toBe("string");
      expect(ar.Files[key].length).toBeGreaterThan(0);
      expect(en.Files[key].length).toBeGreaterThan(0);
    }
  });

  it("replaces template variables correctly in upload messages", () => {
    const enProgress = en.Files.uploadProgress
      .replace("{fileName}", "contract.pdf")
      .replace("{current}", "1")
      .replace("{total}", "3");
    expect(enProgress).toBe("Uploading contract.pdf (1 of 3)...");

    const arProgress = ar.Files.uploadProgress
      .replace("{fileName}", "contract.pdf")
      .replace("{current}", "1")
      .replace("{total}", "3");
    expect(arProgress).toBe("جاري رفع contract.pdf (1 من 3)...");

    const enLimit = en.Files.fileTooLarge
      .replace("{name}", "large.pdf")
      .replace("{size}", "15.0 MB");
    expect(enLimit).toBe('File "large.pdf" exceeds the 10 MB limit (15.0 MB).');
  });

  it("handles uploader display fallback safely avoiding 'undefined'", () => {
    const getUploaderDisplay = (
      name: string | null | undefined,
      fallback: string
    ) => {
      if (!name || name === "undefined" || name.trim() === "") {
        return fallback;
      }
      return name;
    };

    expect(getUploaderDisplay(undefined, en.Files.userFallback)).toBe("User");
    expect(getUploaderDisplay("undefined", en.Files.userFallback)).toBe("User");
    expect(getUploaderDisplay(null, ar.Files.userFallback)).toBe("مستخدم");
    expect(getUploaderDisplay("", ar.Files.userFallback)).toBe("مستخدم");
    expect(getUploaderDisplay("Sara", en.Files.userFallback)).toBe("Sara");
    expect(getUploaderDisplay("أحمد", ar.Files.userFallback)).toBe("أحمد");
  });
});
