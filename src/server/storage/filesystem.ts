import fs from "fs";
import path from "path";
import { ForbiddenError } from "../../lib/errors";

const MAX_UPLOAD_BYTES = parseInt(
  process.env.MAX_UPLOAD_BYTES || "10485760",
  10
); // 10 MiB
const MAX_WORKSPACE_STORAGE_BYTES = parseInt(
  process.env.MAX_WORKSPACE_STORAGE_BYTES || "209715200",
  10
); // 200 MiB
const MAX_AGREEMENT_FILES = 20;

/**
 * Returns the absolute canonical storage root directory.
 * Ensures storage root is set, outside public/, and initialized with safe permissions.
 */
export function getStorageRoot(): string {
  const rootEnv = process.env.STORAGE_ROOT || "./storage/private-files";
  const resolved = path.resolve(rootEnv);

  // Security check: storage root must not be inside public/ or .next
  const publicDir = path.resolve(process.cwd(), "public");
  const nextDir = path.resolve(process.cwd(), ".next");

  if (resolved.startsWith(publicDir) || resolved.startsWith(nextDir)) {
    throw new Error(
      "SECURITY VIOLATION: STORAGE_ROOT cannot reside inside public/ or .next directories."
    );
  }

  // Ensure root directory exists
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  }

  // Ensure tmp directory exists
  const tmpDir = path.join(resolved, "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true, mode: 0o700 });
  }

  return resolved;
}

/**
 * Validates that a storage key is well-formed (64 hex characters)
 * and resolves strictly within the storage root directory.
 */
export function resolveSafeStoragePath(storageKey: string): string {
  if (!/^[a-f0-9]{64}$/.test(storageKey)) {
    throw new ForbiddenError("Invalid storage key format");
  }

  const root = getStorageRoot();
  const prefix = storageKey.slice(0, 2);
  const targetDir = path.join(root, prefix);
  const targetFile = path.join(targetDir, storageKey);

  // Path containment check against directory traversal
  const relative = path.relative(root, targetFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ForbiddenError("Path traversal attempt detected");
  }

  return targetFile;
}

export type SupportedMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

/**
 * Detects file type from binary magic bytes.
 * Rejects any file that does not match allowed signatures.
 */
export function detectFileMime(buffer: Buffer): SupportedMime | null {
  if (buffer.length < 12) return null;

  // 1. PDF: starts with %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // 2. JPEG: starts with 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // 3. PNG: starts with 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // 4. WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Sanitizes untrusted original filename for safe header and display presentation.
 */
export function sanitizeFilename(filename: string): string {
  // Strip paths
  const base = path.basename(filename);
  // Remove control characters, backslashes, quotes
  const cleaned = base.replace(/[\x00-\x1f\x7f\\/":*?<>|]+/g, "_").trim();
  return cleaned.slice(0, 200) || "attachment";
}

export { MAX_UPLOAD_BYTES, MAX_WORKSPACE_STORAGE_BYTES, MAX_AGREEMENT_FILES };
