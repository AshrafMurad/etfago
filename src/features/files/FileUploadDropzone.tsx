"use client";

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, ShieldCheck, AlertCircle, X, Loader2 } from "lucide-react";

export interface FileUploadDropzoneTranslations {
  dropzoneTitle?: string;
  dropzoneActive?: string;
  browseFiles?: string;
  dropzoneHint?: string;
  privateStorageBadge?: string;
  fileTooLarge?: string;
  unsupportedType?: string;
  uploading?: string;
  uploadProgress?: string;
  archivedReadOnly?: string;
}

interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  uploadProgressText?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  translations?: FileUploadDropzoneTranslations;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

export function FileUploadDropzone({
  onFilesSelected,
  isUploading,
  uploadProgressText,
  disabled = false,
  disabledReason,
  translations = {},
}: FileUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const tDropzoneTitle = translations.dropzoneTitle || "Drop files here, or";
  const tDropzoneActive = translations.dropzoneActive || "Drop files here to upload...";
  const tBrowseFiles = translations.browseFiles || "browse from device";
  const tDropzoneHint =
    translations.dropzoneHint || "Supports PDF, JPG, PNG, and WebP (up to 10 MB per file)";
  const tPrivateStorageBadge =
    translations.privateStorageBadge || "Encrypted persistent server disk";
  const tUploading = translations.uploading || "Uploading...";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      setValidationError(null);
      const validFiles: File[] = [];

      for (const file of files) {
        // Size validation
        if (file.size > MAX_FILE_SIZE_BYTES) {
          const tmpl =
            translations.fileTooLarge ||
            'File "{name}" exceeds the 10 MB limit ({size}).';
          const msg = tmpl
            .replace("{name}", file.name)
            .replace("{size}", formatSize(file.size));
          setValidationError(msg);
          return [];
        }

        // Extension & MIME validation
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
        const isAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : true;

        if (!isAllowedExt || !isAllowedMime) {
          const tmpl =
            translations.unsupportedType ||
            'File "{name}" has an unsupported format. Only PDF, JPG, PNG, and WebP are allowed.';
          setValidationError(tmpl.replace("{name}", file.name));
          return [];
        }

        validFiles.push(file);
      }

      return validFiles;
    },
    [translations.fileTooLarge, translations.unsupportedType]
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const valid = validateFiles(droppedFiles);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      const valid = validateFiles(selected);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
      // Reset input value so re-selecting the same file triggers change
      e.target.value = "";
    }
  };

  const triggerBrowse = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerBrowse();
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        id="shadcn-file-upload-input"
        disabled={disabled || isUploading}
      />

      {/* Dropzone Container */}
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        onClick={triggerBrowse}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={tBrowseFiles}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all duration-150 select-none ${
          disabled
            ? "border-[var(--dp-color-line)]/50 bg-[var(--dp-color-ground)]/40 opacity-60 cursor-not-allowed"
            : isDragOver
            ? "border-[var(--dp-color-annotation)] bg-[var(--dp-color-annotation)]/10 ring-4 ring-[var(--dp-color-annotation)]/15 scale-[1.008] cursor-copy shadow-sm"
            : isUploading
            ? "border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] cursor-wait"
            : "border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]/30 hover:bg-[var(--dp-color-scrap)] hover:border-[var(--dp-color-ink)] cursor-pointer"
        }`}
      >
        {isUploading ? (
          /* Uploading in progress state */
          <div className="flex flex-col items-center justify-center py-2 space-y-3 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)] shadow-xs flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--dp-color-accent)]" />
            </div>
            <div className="w-full space-y-1.5">
              <p className="text-xs sm:text-sm font-marker font-bold text-[var(--dp-color-ink)]">
                {uploadProgressText || tUploading}
              </p>
              {/* Animated Progress Bar */}
              <div className="h-1.5 w-full bg-[var(--dp-color-line)]/30 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--dp-color-accent)] rounded-full animate-pulse w-full transition-all duration-300" />
              </div>
            </div>
          </div>
        ) : isDragOver ? (
          /* Active drag state */
          <div className="flex flex-col items-center justify-center py-2 space-y-2 pointer-events-none">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--dp-color-scrap)] border-2 border-[var(--dp-color-annotation)] flex items-center justify-center shadow-md scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--dp-color-annotation)] animate-bounce" />
            </div>
            <p className="text-sm font-marker font-bold text-[var(--dp-color-annotation)]">
              {tDropzoneActive}
            </p>
          </div>
        ) : (
          /* Idle / Hover state */
          <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
            {/* Upload Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)] shadow-xs flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-[var(--dp-color-ink)] group-hover:shadow-sm">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--dp-color-annotation)] group-hover:text-[var(--dp-color-accent)] transition-colors" />
            </div>

            {/* Prompt */}
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-marker font-bold text-[var(--dp-color-ink)]">
                {tDropzoneTitle}{" "}
                <span className="text-[var(--dp-color-accent)] underline underline-offset-4 decoration-2 decoration-[var(--dp-color-accent)]/40 group-hover:decoration-[var(--dp-color-accent)]">
                  {tBrowseFiles}
                </span>
              </p>
              <p className="text-[11px] sm:text-xs text-[var(--dp-color-ink-muted)] font-reading">
                {disabled && disabledReason ? disabledReason : tDropzoneHint}
              </p>
            </div>

            {/* Private Storage Tag */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-reading text-[var(--dp-color-ink-muted)] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]/70 shadow-2xs mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--dp-color-annotation)]" />
              <span>{tPrivateStorageBadge}</span>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error banner */}
      {validationError && (
        <div className="flex items-start justify-between gap-2 p-3 text-xs rounded-lg bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)] font-reading animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setValidationError(null);
            }}
            className="text-[var(--dp-color-accent)] hover:opacity-80 p-0.5 rounded transition-opacity"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
