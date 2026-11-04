import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

interface FooterProps {
  locale: string;
}

export async function Footer({ locale }: FooterProps) {
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const tNav = await getTranslations({ locale, namespace: "Navigation" });

  return (
    <footer className="border-t-[1.5px] border-dashed border-[var(--dp-color-line)] bg-[var(--dp-color-ground)] py-8 px-6 mt-auto text-sm text-[var(--dp-color-ink-muted)] font-reading">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-start">
          <Link href={`/${locale}`} className="inline-flex items-center">
            <Image
              src="/logo.png"
              alt={tCommon("appName")}
              width={90}
              height={33}
              className="h-6 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </Link>
          <span className="hidden sm:inline text-[var(--dp-color-line)]">•</span>
          <span>{tCommon("tagline")}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link
            href={`/${locale}/privacy`}
            className="hover:text-[var(--dp-color-accent)] hover:underline transition-colors"
          >
            {tNav("privacy")}
          </Link>
          <span className="text-[var(--dp-color-line)]">•</span>
          <Link
            href={`/${locale}/terms`}
            className="hover:text-[var(--dp-color-accent)] hover:underline transition-colors"
          >
            {tNav("terms")}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-4 pt-4 border-t border-[var(--dp-color-line)]/50 text-center text-xs text-[var(--dp-color-ink-muted)]">
        <p className="sketch-highlight inline-block">{tCommon("disclaimer")}</p>
      </div>
    </footer>
  );
}
