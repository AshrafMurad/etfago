import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../db/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../lib/errors";
import {
  assertCanViewAgreement,
} from "../auth/permissions";
import {
  getStorageRoot,
  resolveSafeStoragePath,
  detectFileMime,
  sanitizeFilename,
  MAX_UPLOAD_BYTES,
  MAX_WORKSPACE_STORAGE_BYTES,
  MAX_AGREEMENT_FILES,
} from "./filesystem";

export interface AttachmentSummary {
  id: string;
  agreementId: string;
  uploadedByUserId: string;
  uploaderName: string | null;
  versionId: string | null;
  originalFilename: string;
  mimeDetected: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}

/**
 * Saves an uploaded file buffer into the private server filesystem and records metadata.
 * Enforces size limits, magic-byte verification, and workspace quotas.
 */
export async function saveAttachment(
  actorUserId: string,
  agreementId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  versionId?: string | null
): Promise<AttachmentSummary> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const agreement = await db.agreement.findUnique({
    where: { id: agreementId },
    select: {
      id: true,
      workspaceId: true,
      lifecycleStatus: true,
      archivedAt: true,
    },
  });

  if (!agreement || agreement.archivedAt !== null) {
    throw new NotFoundError("Agreement not found or is archived");
  }

  // 1. Check size limit
  if (fileBuffer.length > MAX_UPLOAD_BYTES) {
    throw new ConflictError(
      `File exceeds maximum allowed size of 10 MiB (${fileBuffer.length} bytes received).`
    );
  }

  if (fileBuffer.length === 0) {
    throw new ConflictError("Uploaded file is empty.");
  }

  // 2. Validate magic bytes / MIME
  const detectedMime = detectFileMime(fileBuffer);
  if (!detectedMime) {
    throw new ConflictError(
      "Unsupported file format. Only PDF and image files (JPEG, PNG, WebP) are permitted."
    );
  }

  // 3. Compute SHA-256
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const sanitizedName = sanitizeFilename(originalFilename);

  // 4. Generate opaque storage key (32 random bytes = 64 hex chars)
  const storageKey = crypto.randomBytes(32).toString("hex");

  // 5. Database transaction to enforce quotas and create initial metadata
  const root = getStorageRoot();
  const tmpPath = path.join(root, "tmp", `${crypto.randomUUID()}.tmp`);

  try {
    // Write buffer to temp file first
    fs.writeFileSync(tmpPath, fileBuffer, { mode: 0o600 });

    const attachment = await db.$transaction(async (tx) => {
      // Check agreement files count quota
      const existingFilesCount = await tx.attachment.count({
        where: {
          agreementId,
          deletedAt: null,
          state: "READY",
        },
      });

      if (existingFilesCount >= MAX_AGREEMENT_FILES) {
        throw new ConflictError(
          `Agreement has reached maximum allowed files limit (${MAX_AGREEMENT_FILES} files).`
        );
      }

      // Check workspace storage quota
      const workspaceUsage = await tx.attachment.aggregate({
        where: {
          agreement: { workspaceId: agreement.workspaceId },
          deletedAt: null,
          state: "READY",
        },
        _sum: { sizeBytes: true },
      });

      const currentBytes = Number(workspaceUsage._sum.sizeBytes || 0);
      if (currentBytes + fileBuffer.length > MAX_WORKSPACE_STORAGE_BYTES) {
        throw new ConflictError(
          "Workspace storage quota exceeded (200 MiB limit reached)."
        );
      }

      // Create record in PENDING state
      return await tx.attachment.create({
        data: {
          agreementId,
          uploadedByUserId: actorUserId,
          versionId: versionId ?? null,
          originalFilename: sanitizedName,
          storageKey,
          mimeDetected: detectedMime,
          sizeBytes: BigInt(fileBuffer.length),
          sha256,
          state: "PENDING",
        },
      });
    });

    // Move file atomically to final destination
    const finalPath = resolveSafeStoragePath(storageKey);
    const finalDir = path.dirname(finalPath);
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true, mode: 0o700 });
    }

    fs.renameSync(tmpPath, finalPath);

    // Update state to READY and emit activity event
    await db.$transaction(async (tx) => {
      await tx.attachment.update({
        where: { id: attachment.id },
        data: { state: "READY" },
      });

      const actor = await tx.user.findUnique({
        where: { id: actorUserId },
        select: { name: true, emailNormalized: true },
      });

      await tx.activityEvent.create({
        data: {
          agreementId,
          actorUserId,
          action: "FILE_UPLOADED",
          objectId: attachment.id,
          versionId: versionId ?? null,
          summaryJson: {
            attachmentId: attachment.id,
            filename: sanitizedName,
            sizeBytes: fileBuffer.length,
            mime: detectedMime,
            uploader: actor?.name || actor?.emailNormalized,
          },
        },
      });
    });

    const actor = await db.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, emailNormalized: true },
    });

    return {
      id: attachment.id,
      agreementId: attachment.agreementId,
      uploadedByUserId: attachment.uploadedByUserId,
      uploaderName: actor?.name || actor?.emailNormalized || "User",
      versionId: attachment.versionId,
      originalFilename: sanitizedName,
      mimeDetected: detectedMime,
      sizeBytes: fileBuffer.length,
      sha256,
      createdAt: attachment.createdAt,
    };
  } catch (err) {
    // Clean up temp file on error
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

/**
 * Validates access and returns attachment metadata and physical filesystem path for download.
 * Invariant: Agreement-level authorization is checked every single time.
 */
export async function getAttachmentForDownload(
  actorUserId: string,
  attachmentId: string
): Promise<{
  attachment: {
    id: string;
    agreementId: string;
    originalFilename: string;
    mimeDetected: string;
    sizeBytes: number;
  };
  filePath: string;
}> {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.deletedAt !== null) {
    throw new NotFoundError("Attachment not found");
  }

  if (attachment.state !== "READY") {
    throw new ConflictError("Attachment is not ready for download");
  }

  // Re-verify agreement access for the actor
  await assertCanViewAgreement(actorUserId, attachment.agreementId);

  const filePath = resolveSafeStoragePath(attachment.storageKey);
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError("File content not found on server filesystem");
  }

  return {
    attachment: {
      id: attachment.id,
      agreementId: attachment.agreementId,
      originalFilename: attachment.originalFilename,
      mimeDetected: attachment.mimeDetected,
      sizeBytes: Number(attachment.sizeBytes),
    },
    filePath,
  };
}

/**
 * Soft deletes an attachment and cleans up filesystem bytes.
 */
export async function deleteAttachment(
  actorUserId: string,
  agreementId: string,
  attachmentId: string
): Promise<void> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      agreementId,
      deletedAt: null,
    },
    include: {
      agreement: {
        select: { organizerUserId: true },
      },
    },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  const isOrganizer = attachment.agreement.organizerUserId === actorUserId;
  const isUploader = attachment.uploadedByUserId === actorUserId;

  if (!isOrganizer && !isUploader) {
    throw new ForbiddenError(
      "Only the agreement organizer or file uploader can delete this attachment"
    );
  }

  await db.$transaction(async (tx) => {
    await tx.attachment.update({
      where: { id: attachment.id },
      data: {
        deletedAt: new Date(),
        state: "DELETED",
      },
    });

    await tx.activityEvent.create({
      data: {
        agreementId,
        actorUserId,
        action: "FILE_DELETED",
        objectId: attachment.id,
        summaryJson: {
          attachmentId: attachment.id,
          filename: attachment.originalFilename,
        },
      },
    });
  });

  // Attempt to delete physical file from disk
  try {
    const filePath = resolveSafeStoragePath(attachment.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Failed to delete physical file bytes:", err);
  }
}

/**
 * Lists all ready attachments for an agreement.
 */
export async function listAttachments(
  actorUserId: string,
  agreementId: string
): Promise<AttachmentSummary[]> {
  await assertCanViewAgreement(actorUserId, agreementId);

  const attachments = await db.attachment.findMany({
    where: {
      agreementId,
      deletedAt: null,
      state: "READY",
    },
    orderBy: { createdAt: "desc" },
  });

  if (attachments.length === 0) return [];

  const uploaderIds = Array.from(new Set(attachments.map((a) => a.uploadedByUserId)));
  const uploaders = await db.user.findMany({
    where: { id: { in: uploaderIds } },
    select: { id: true, name: true, emailNormalized: true },
  });

  const uploaderMap = new Map(
    uploaders.map((u) => [u.id, u.name || u.emailNormalized])
  );

  return attachments.map((a) => ({
    id: a.id,
    agreementId: a.agreementId,
    uploadedByUserId: a.uploadedByUserId,
    uploaderName: uploaderMap.get(a.uploadedByUserId) || "User",
    versionId: a.versionId,
    originalFilename: a.originalFilename,
    mimeDetected: a.mimeDetected,
    sizeBytes: Number(a.sizeBytes),
    sha256: a.sha256,
    createdAt: a.createdAt,
  }));
}
