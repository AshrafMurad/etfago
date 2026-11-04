import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFoundPage() {
  const t = await getTranslations("Errors");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="sketch-card max-w-md w-full p-8 space-y-4 relative">
        <div className="sketch-tape-top" />
        <div className="w-16 h-16 mx-auto rounded-[8px_4px_10px_5px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-center text-2xl shadow-[2px_2px_0px_var(--dp-color-ink)]">
          🔍
        </div>
        <h1 className="text-2xl font-bold font-marker text-[var(--dp-color-ink)]">
          {t("notFoundTitle")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)]">
          {t("notFoundSubtitle")}
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="sketch-btn sketch-btn-primary text-xs px-4 py-2 inline-block"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
