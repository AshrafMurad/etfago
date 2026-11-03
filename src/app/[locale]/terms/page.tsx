import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  const tLegal = await getTranslations({ locale, namespace: "Legal" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {tLegal("termsTitle")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {tLegal("termsSubtitle")}
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <section className="space-y-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>⚖️</span>
            <span>{tLegal("termsSection1Title")}</span>
          </h2>
          <p>{tLegal("termsSection1Text")}</p>
        </section>

        <section className="space-y-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🧊</span>
            <span>{tLegal("termsSection2Title")}</span>
          </h2>
          <p>{tLegal("termsSection2Text")}</p>
        </section>

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-xs text-amber-800 dark:text-amber-200">
          <strong className="block font-semibold mb-1">
            {locale === "ar" ? "تنبيه تشغيلي وقانوني:" : "Operational & Legal Notice:"}
          </strong>
          {tCommon("disclaimer")}
        </div>
      </div>

      <div className="pt-4 flex items-center gap-4 text-xs text-zinc-500">
        <Link
          href={`/${locale}/privacy`}
          className="hover:text-zinc-900 dark:hover:text-zinc-200 underline"
        >
          {tLegal("privacyTitle")}
        </Link>
        <span>•</span>
        <Link
          href={`/${locale}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-200 underline"
        >
          {locale === "ar" ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </div>
    </div>
  );
}
