import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const tNav = await getTranslations({ locale, namespace: "Navigation" });

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 px-6 mt-auto text-xs text-zinc-500">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-start">
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {tCommon("appName")}
          </span>
          <span className="hidden sm:inline">•</span>
          <span>{tCommon("tagline")}</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/privacy`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {tNav("privacy")}
          </Link>
          <span>•</span>
          <Link
            href={`/${locale}/terms`}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {tNav("terms")}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-900 text-center text-[11px] text-zinc-400">
        <p>{tCommon("disclaimer")}</p>
      </div>
    </footer>
  );
}
