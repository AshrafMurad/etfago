"use client";

import React, { useState, useTransition, useRef } from "react";
import { AttachmentSummary } from "../../server/storage/service";
import { deleteAttachmentAction } from "../../server/actions/attachments";

interface AttachmentsCardProps {
  agreementId: string;
  attachments: AttachmentSummary[];
  currentUserId: string;
  isOrganizer: boolean;
  translations: {
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
  };
}

export function AttachmentsCard({
  agreementId,
  attachments,
  currentUserId,
  isOrganizer,
  translations,
}: AttachmentsCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/agreements/${agreementId}/attachments`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to upload file");
        } else {
          // Reset file input and refresh
          if (fileInputRef.current) fileInputRef.current.value = "";
          window.location.reload();
        }
      } catch {
        setError("Network error while uploading file");
      }
    });
  };

  const handleDelete = (attachmentId: string) => {
    if (!confirm(translations.confirmDelete)) return;

    setError(null);
    const formData = new FormData();
    formData.append("agreementId", agreementId);
    formData.append("attachmentId", attachmentId);

    startTransition(async () => {
      const res = await deleteAttachmentAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to delete file");
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMimeIcon = (mime: string) => {
    if (mime === "application/pdf") return "📄";
    return "🖼️";
  };

  return (
    <div className="sketch-card p-6 space-y-5 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--dp-color-line)] pb-3">
        <div>
          <h3 className="text-base font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <span>📎</span>
            <span>{translations.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-[4px_2px_5px_3px] bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border border-[var(--dp-color-ink)] font-mono">
              {attachments.length}
            </span>
          </h3>
          <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading mt-0.5">
            {translations.privateStorageNotice}
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload-input"
            disabled={isPending}
          />
          <label
            htmlFor="file-upload-input"
            className="sketch-btn sketch-btn-primary cursor-pointer text-xs flex items-center gap-1.5"
          >
            <span>↑</span>
            <span>
              {isPending ? translations.uploading : translations.upload}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-[6px_3px_7px_4px] bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading">
          {error}
        </div>
      )}

      {/* Allowed Formats info */}
      <p className="text-[11px] text-[var(--dp-color-ink-muted)] bg-[var(--dp-color-scrap)] p-2.5 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] font-marker">
        🔒 {translations.allowedFormats}
      </p>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--dp-color-ink-muted)] font-reading border border-dashed border-[var(--dp-color-line)] rounded-[6px_3px_7px_4px]">
          {translations.noAttachments}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((file) => {
            const canDelete =
              isOrganizer || file.uploadedByUserId === currentUserId;

            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-[6px_3px_7px_4px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] hover:shadow-[2px_2px_0px_var(--dp-color-line)] transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{getMimeIcon(file.mimeDetected)}</span>
                  <div className="min-w-0">
                    <p className="font-bold font-marker text-[var(--dp-color-ink)] truncate">
                      {file.originalFilename}
                    </p>
                    <p className="text-[11px] text-[var(--dp-color-ink-muted)] font-reading">
                      {formatFileSize(file.sizeBytes)} • {translations.uploadedBy}{" "}
                      {file.uploaderName} •{" "}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/attachments/${file.id}/download`}
                    download
                    className="sketch-btn sketch-btn-outline text-[11px] px-2.5 py-1"
                  >
                    ⬇ {translations.download}
                  </a>

                  {canDelete && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(file.id)}
                      className="text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-accent)] px-1 py-1 cursor-pointer transition-colors"
                      title={translations.delete}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
