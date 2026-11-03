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
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-2xl text-rose-600">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("errorTitle")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("errorSubtitle")}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            {t("tryAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
