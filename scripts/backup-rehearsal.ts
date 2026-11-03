import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../src/server/db/prisma";
import { getStorageRoot, resolveSafeStoragePath } from "../src/server/storage/filesystem";

/**
 * Sprint 7 Operational Script: Backup & Restore Rehearsal
 * 
 * Verifies consistency between PostgreSQL attachment records and
 * the private server persistent filesystem storage bytes.
 * Computes SHA-256 hashes of disk files and verifies they match DB metadata.
 */
export async function runBackupRehearsal(): Promise<{
  success: boolean;
  totalDbRecords: number;
  verifiedFilesCount: number;
  totalBytes: bigint;
  discrepancies: string[];
}> {
  const root = getStorageRoot();
  const discrepancies: string[] = [];
  let verifiedFilesCount = 0;
  let totalBytes = BigInt(0);

  if (!fs.existsSync(root)) {
    return {
      success: false,
      totalDbRecords: 0,
      verifiedFilesCount: 0,
      totalBytes: BigInt(0),
      discrepancies: [`Storage root directory does not exist: ${root}`],
    };
  }

  // 1. Fetch all non-deleted READY attachments from DB
  const attachments = await db.attachment.findMany({
    where: {
      deletedAt: null,
      state: "READY",
    },
    select: {
      id: true,
      originalFilename: true,
      storageKey: true,
      sizeBytes: true,
      sha256: true,
      mimeDetected: true,
    },
  });

  // 2. Verify each attachment on disk
  for (const att of attachments) {
    try {
      const diskPath = resolveSafeStoragePath(att.storageKey);
      if (!fs.existsSync(diskPath)) {
        discrepancies.push(
          `Missing disk file for attachment ${att.id} (${att.originalFilename}) at ${diskPath}`
        );
        continue;
      }

      const fileBytes = fs.readFileSync(diskPath);
      const computedHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

      if (computedHash !== att.sha256) {
        discrepancies.push(
          `Checksum mismatch for attachment ${att.id}: DB has ${att.sha256}, disk has ${computedHash}`
        );
        continue;
      }

      if (BigInt(fileBytes.length) !== att.sizeBytes) {
        discrepancies.push(
          `Size mismatch for attachment ${att.id}: DB has ${att.sizeBytes} bytes, disk has ${fileBytes.length}`
        );
        continue;
      }

      verifiedFilesCount++;
      totalBytes += att.sizeBytes;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      discrepancies.push(`Error verifying attachment ${att.id}: ${message}`);
    }
  }

  const success = discrepancies.length === 0;

  return {
    success,
    totalDbRecords: attachments.length,
    verifiedFilesCount,
    totalBytes,
    discrepancies,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runBackupRehearsal()
    .then((result) => {
      console.log("=== ETFAGO BACKUP & STORAGE REHEARSAL REPORT ===");
      console.log(`Status: ${result.success ? "PASSED" : "FAILED"}`);
      console.log(`DB Attachment Records: ${result.totalDbRecords}`);
      console.log(`Verified On-Disk Files: ${result.verifiedFilesCount}`);
      console.log(`Total Storage Bytes: ${result.totalBytes}`);
      if (result.discrepancies.length > 0) {
        console.error("Discrepancies found:");
        result.discrepancies.forEach((d) => console.error(` - ${d}`));
        process.exit(1);
      }
      console.log("Integrity verified: all files match recorded SHA-256 checksums.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal error during rehearsal:", err);
      process.exit(1);
    });
}
