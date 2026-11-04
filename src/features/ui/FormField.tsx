"use client";

import React, { useId } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface FieldErrorMessageProps {
  id?: string;
  error?: string | null;
  className?: string;
}

/**
 * FieldErrorMessage: Hand-drawn sketch styled inline error message.
 * Screen-reader accessible with role="alert" and aria-live="polite".
 */
export function FieldErrorMessage({ id, error, className = "" }: FieldErrorMessageProps) {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-1.5 mt-1.5 text-xs text-[var(--dp-color-accent)] font-reading animate-sketch-shake ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

export interface FormFieldProps {
  id?: string;
  label?: React.ReactNode;
  required?: boolean;
  optionalLabel?: string;
  error?: string | null;
  helpText?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}

/**
 * FormField: Form group wrapper providing consistent label, required indicator,
 * optional note, helper text, and accessible error message.
 */
export function FormField({
  id: providedId,
  label,
  required = false,
  optionalLabel,
  error,
  helpText,
  className = "",
  labelClassName = "",
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = providedId || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className={`block text-xs font-bold font-reading text-[var(--dp-color-ink)] ${labelClassName}`}
        >
          {label}
          {required && (
            <span
              className="text-[var(--dp-color-accent)] font-bold ms-1"
              aria-hidden="true"
            >
              *
            </span>
          )}
          {optionalLabel && !required && (
            <span className="text-[var(--dp-color-ink-muted)] font-normal ms-1 text-[11px]">
              ({optionalLabel})
            </span>
          )}
        </label>
      )}

      {/* Render children; if child supports aria attributes, can be connected */}
      <div>{children}</div>

      {helpText && !error && (
        <p id={helpId} className="text-[11px] text-[var(--dp-color-ink-muted)] font-reading">
          {helpText}
        </p>
      )}

      <FieldErrorMessage id={errorId} error={error} />
    </div>
  );
}

export interface FormAlertProps {
  type?: "error" | "success" | "warning";
  message?: string | null;
  className?: string;
  onDismiss?: () => void;
}

/**
 * FormAlert: High-visibility sketch feedback card for form-level notices.
 */
export function FormAlert({
  type = "error",
  message,
  className = "",
  onDismiss,
}: FormAlertProps) {
  if (!message) return null;

  const styles = {
    error: {
      bg: "bg-[#fbeee9]",
      border: "border-[var(--dp-color-accent)]",
      text: "text-[var(--dp-color-accent)]",
      Icon: AlertCircle,
    },
    success: {
      bg: "bg-[#eaf3ea]",
      border: "border-[#96b79d]",
      text: "text-[var(--dp-color-ink)]",
      Icon: CheckCircle2,
    },
    warning: {
      bg: "bg-[var(--dp-color-highlight)]",
      border: "border-[var(--dp-color-ink)]",
      text: "text-[var(--dp-color-ink)]",
      Icon: AlertCircle,
    },
  }[type];

  const Icon = styles.Icon;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`p-3.5 rounded-[6px_3px_8px_4px] border ${styles.bg} ${styles.border} ${styles.text} text-xs font-reading flex items-start justify-between gap-2.5 animate-sketch-shake ${className}`}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="leading-relaxed">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs hover:opacity-75 font-bold cursor-pointer shrink-0 p-0.5"
          aria-label="إغلاق التنبيه"
        >
          ✕
        </button>
      )}
    </div>
  );
}
