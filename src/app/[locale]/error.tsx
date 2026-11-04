"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error("Application error captured by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="sketch-card max-w-md w-full p-8 space-y-4 relative">
        <div className="sketch-tape-top" />
        <div className="w-16 h-16 mx-auto rounded-[8px_4px_10px_5px] bg-[#fbeee9] border border-[var(--dp-color-accent)] flex items-center justify-center text-2xl text-[var(--dp-color-accent)] shadow-[2px_2px_0px_var(--dp-color-ink)] font-marker">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold font-marker text-[var(--dp-color-ink)]">
          {t("errorTitle")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
          {t("errorSubtitle")}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="sketch-btn sketch-btn-primary text-xs px-4 py-2"
          >
            {t("tryAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
