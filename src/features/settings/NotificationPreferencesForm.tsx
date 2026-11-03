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
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-4">
        {/* Review Reminders Option */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <label
              htmlFor="reviewReminders"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              {t("reviewRemindersTitle")}
            </label>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("reviewRemindersDesc")}
            </p>
          </div>
          <input
            id="reviewReminders"
            type="checkbox"
            checked={reviewReminders}
            onChange={(e) => setReviewReminders(e.target.checked)}
            className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 mt-1 cursor-pointer accent-emerald-600"
          />
        </div>

        {/* Commitment Reminders Option */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <label
              htmlFor="commitmentReminders"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
            >
              {t("commitmentRemindersTitle")}
            </label>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("commitmentRemindersDesc")}
            </p>
          </div>
          <input
            id="commitmentReminders"
            type="checkbox"
            checked={commitmentReminders}
            onChange={(e) => setCommitmentReminders(e.target.checked)}
            className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 mt-1 cursor-pointer accent-emerald-600"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {isSubmitting ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
