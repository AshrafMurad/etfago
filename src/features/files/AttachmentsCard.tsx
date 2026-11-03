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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>📎</span>
            <span>{translations.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              {attachments.length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
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
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>↑</span>
            <span>
              {isPending ? translations.uploading : translations.upload}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200">
          {error}
        </div>
      )}

      {/* Allowed Formats info */}
      <p className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
        🔒 {translations.allowedFormats}
      </p>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-400">
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
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg">{getMimeIcon(file.mimeDetected)}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {file.originalFilename}
                    </p>
                    <p className="text-[11px] text-zinc-400">
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
                    className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium"
                  >
                    ⬇ {translations.download}
                  </a>

                  {canDelete && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(file.id)}
                      className="text-zinc-400 hover:text-rose-600 px-1 py-1"
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
