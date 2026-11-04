"use client";

import { useState } from "react";
import { updatePreferencesAction } from "@/server/actions/settings";
import { useTranslations } from "next-intl";

interface NotificationPreferencesFormProps {
  initialReviewReminders: boolean;
  initialCommitmentReminders: boolean;
}

export function NotificationPreferencesForm({
  initialReviewReminders,
  initialCommitmentReminders,
}: NotificationPreferencesFormProps) {
  const t = useTranslations("Settings");
  const [reviewReminders, setReviewReminders] = useState(initialReviewReminders);
  const [commitmentReminders, setCommitmentReminders] = useState(initialCommitmentReminders);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set("reviewReminders", reviewReminders ? "true" : "false");
    formData.set("commitmentReminders", commitmentReminders ? "true" : "false");

    try {
      const res = await updatePreferencesAction(null, formData);
      if (res.success) {
        setFeedback({ type: "success", message: t("saveSuccess") });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update" });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-[6px_3px_7px_4px] text-xs font-reading border ${
            feedback.type === "success"
              ? "bg-[#eaf3ea] text-[var(--dp-color-ink)] border-[#96b79d]"
              : "bg-[#fbeee9] text-[var(--dp-color-accent)] border border-[var(--dp-color-accent)]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-4">
        {/* Review Reminders Option */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]">
          <div className="space-y-1">
            <label
              htmlFor="reviewReminders"
              className="text-sm font-bold font-marker text-[var(--dp-color-ink)] cursor-pointer"
            >
              {t("reviewRemindersTitle")}
            </label>
            <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading">
              {t("reviewRemindersDesc")}
            </p>
          </div>
          <input
            id="reviewReminders"
            type="checkbox"
            checked={reviewReminders}
            onChange={(e) => setReviewReminders(e.target.checked)}
            className="w-5 h-5 rounded-[3px] accent-[var(--dp-color-accent)] focus:outline-dashed focus:outline-[var(--dp-color-annotation)] mt-1 cursor-pointer"
          />
        </div>

        {/* Commitment Reminders Option */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]">
          <div className="space-y-1">
            <label
              htmlFor="commitmentReminders"
              className="text-sm font-bold font-marker text-[var(--dp-color-ink)] cursor-pointer"
            >
              {t("commitmentRemindersTitle")}
            </label>
            <p className="text-xs text-[var(--dp-color-ink-muted)] font-reading">
              {t("commitmentRemindersDesc")}
            </p>
          </div>
          <input
            id="commitmentReminders"
            type="checkbox"
            checked={commitmentReminders}
            onChange={(e) => setCommitmentReminders(e.target.checked)}
            className="w-5 h-5 rounded-[3px] accent-[var(--dp-color-accent)] focus:outline-dashed focus:outline-[var(--dp-color-annotation)] mt-1 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="sketch-btn sketch-btn-primary text-xs px-5 py-2.5 disabled:opacity-50"
        >
          {isSubmitting ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
