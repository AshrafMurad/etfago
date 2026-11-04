"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileImage,
  File as FileIcon,
  Download,
  Trash2,
  Paperclip,
  AlertCircle,
  X,
  Files,
  Loader2,
} from "lucide-react";
import { AttachmentSummary } from "../../server/storage/service";
import { deleteAttachmentAction } from "../../server/actions/attachments";
import {
  FileUploadDropzone,
  FileUploadDropzoneTranslations,
} from "./FileUploadDropzone";

export interface AttachmentsCardTranslations extends FileUploadDropzoneTranslations {
  title: string;
  upload: string;
  uploading: string;
  privateStorageNotice: string;
  allowedFormats: string;
  noAttachments: string;
  uploadedBy: string;
  download: string;
  delete: string;
  confirmDelete: string;
  emptyStateSubtitle?: string;
  userFallback?: string;
  uploadFailed?: string;
  uploadSuccess?: string;
  downloadTooltip?: string;
  deleteTooltip?: string;
}

interface AttachmentsCardProps {
  agreementId: string;
  attachments: AttachmentSummary[];
  currentUserId: string;
  isOrganizer: boolean;
  canUpload?: boolean;
  isArchived?: boolean;
  translations: AttachmentsCardTranslations;
}

export function AttachmentsCard({
  agreementId,
  attachments,
  currentUserId,
  isOrganizer,
  canUpload = true,
  isArchived = false,
  translations,
}: AttachmentsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isUploadDisabled = isArchived || !canUpload;

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isUploadDisabled) return;

    setError(null);
    setIsUploading(true);

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tmpl =
        translations.uploadProgress ||
        "Uploading {fileName} ({current} of {total})...";
      const progressMsg = tmpl
        .replace("{fileName}", file.name)
        .replace("{current}", String(i + 1))
        .replace("{total}", String(files.length));

      setUploadProgressText(progressMsg);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/agreements/${agreementId}/attachments`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          const failTmpl =
            translations.uploadFailed || "Failed to upload {name}";
          setError(
            `${failTmpl.replace("{name}", file.name)}: ${
              data.error || "Unknown error"
            }`
          );
          break;
        } else {
          successCount++;
        }
      } catch {
        setError("Network error while uploading file");
        break;
      }
    }

    setIsUploading(false);
    setUploadProgressText(null);

    if (successCount > 0) {
      router.refresh();
      window.location.reload();
    }
  };

  const handleDelete = (attachmentId: string) => {
    if (!confirm(translations.confirmDelete)) return;

    setError(null);
    setDeletingId(attachmentId);

    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("attachmentId", attachmentId);

    startTransition(async () => {
      try {
        const res = await deleteAttachmentAction(formData);
        if (!res.success) {
          setError(res.error || "Failed to delete file");
        } else {
          router.refresh();
          window.location.reload();
        }
      } catch {
        setError("Network error while deleting file");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUploaderDisplay = (name: string | null | undefined) => {
    if (!name || name === "undefined" || name.trim() === "") {
      return translations.userFallback || "User";
    }
    return name;
  };

  return (
    <div className="sketch-card p-5 sm:p-6 space-y-6 relative">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--dp-color-line)] pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-[var(--dp-color-annotation)]" />
            <span>{translations.title}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] font-mono">
              {attachments.length}
            </span>
          </h3>
          <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-1 leading-relaxed">
            {translations.privateStorageNotice}
          </p>
        </div>
      </div>

      {/* Global / Action Error Alert */}
      {error && (
        <div className="flex items-start justify-between gap-2 p-3 text-xs rounded-lg bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[var(--dp-color-accent)] hover:opacity-80 p-0.5 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Shadcn-Style File Upload Dropzone */}
      <FileUploadDropzone
        onFilesSelected={handleFilesSelected}
        isUploading={isUploading}
        uploadProgressText={uploadProgressText}
        disabled={isUploadDisabled}
        disabledReason={
          isArchived ? translations.archivedReadOnly : undefined
        }
        translations={translations}
      />

      {/* Uploaded Files Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold font-marker text-[var(--dp-color-ink)]">
            {translations.title}{" "}
            <span className="text-xs text-[var(--dp-color-ink-muted)] font-mono font-normal">
              ({attachments.length})
            </span>
          </h4>
        </div>

        {attachments.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-xl border border-dashed border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]/20 space-y-2">
            <div className="w-10 h-10 rounded-full bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]/70 flex items-center justify-center text-[var(--dp-color-ink-muted)]">
              <Files className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs sm:text-sm font-bold font-marker text-[var(--dp-color-ink)]">
              {translations.noAttachments}
            </p>
            {translations.emptyStateSubtitle && (
              <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading max-w-sm">
                {translations.emptyStateSubtitle}
              </p>
            )}
          </div>
        ) : (
          /* Files list */
          <div className="space-y-2.5">
            {attachments.map((file) => {
              const canDelete =
                !isArchived &&
                (isOrganizer || file.uploadedByUserId === currentUserId);
              const isPdf = file.mimeDetected === "application/pdf";
              const uploaderDisplay = getUploaderDisplay(file.uploaderName);

              return (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] hover:shadow-xs transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* File Icon Badge */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                        isPdf
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {isPdf ? (
                        <FileText className="w-5 h-5" />
                      ) : file.mimeDetected.startsWith("image/") ? (
                        <FileImage className="w-5 h-5" />
                      ) : (
                        <FileIcon className="w-5 h-5" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-bold font-marker text-xs sm:text-sm text-[var(--dp-color-ink)] truncate"
                        title={file.originalFilename}
                      >
                        {file.originalFilename}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--dp-color-ink-muted)] font-reading mt-0.5">
                        <span className="font-mono font-medium">
                          {formatFileSize(file.sizeBytes)}
                        </span>
                        <span>•</span>
                        <span>
                          {translations.uploadedBy} {uploaderDisplay}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--dp-color-line)]/40">
                    <a
                      href={`/api/attachments/${file.id}/download`}
                      download
                      className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5"
                      title={translations.downloadTooltip || translations.download}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{translations.download}</span>
                    </a>

                    {canDelete && (
                      <button
                        type="button"
                        disabled={isPending || deletingId === file.id}
                        onClick={() => handleDelete(file.id)}
                        className="p-1.5 rounded-md text-[var(--dp-color-ink-muted)] hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 cursor-pointer transition-all disabled:opacity-50"
                        title={translations.deleteTooltip || translations.delete}
                        aria-label={translations.delete}
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
