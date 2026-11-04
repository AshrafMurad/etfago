import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const tLegal = await getTranslations({ locale, namespace: "Legal" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="space-y-2 border-b-[1.5px] border-dashed border-[var(--dp-color-line)] pb-6">
        <h1 className="text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
          {tLegal("privacyTitle")}
        </h1>
        <p className="text-base font-reading text-[var(--dp-color-ink-muted)]">
          {tLegal("privacySubtitle")}
        </p>
      </div>

      <div className="space-y-6 text-base font-reading text-[var(--dp-color-ink)] leading-relaxed">
        <section className="space-y-2 p-6 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] shadow-[1.5px_2px_0px_var(--dp-color-line)]">
          <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <span>🔒</span>
            <span>{tLegal("privacySection1Title")}</span>
          </h2>
          <p className="text-sm text-[var(--dp-color-ink-muted)]">{tLegal("privacySection1Text")}</p>
        </section>

        <section className="space-y-2 p-6 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] bg-[var(--dp-color-scrap)] shadow-[1.5px_2px_0px_var(--dp-color-line)]">
          <h2 className="text-lg font-bold font-marker text-[var(--dp-color-ink)] flex items-center gap-2">
            <span>🗄️</span>
            <span>{tLegal("privacySection2Title")}</span>
          </h2>
          <p className="text-sm text-[var(--dp-color-ink-muted)]">{tLegal("privacySection2Text")}</p>
        </section>

        <div className="p-4 rounded-[8px_4px_12px_5px] bg-[var(--dp-color-highlight)]/40 border border-[var(--dp-color-line)] text-xs text-[var(--dp-color-ink)]">
          <strong className="block font-bold font-marker mb-1">
            {locale === "ar" ? "تنبيه تشغيلي:" : "Operational Notice:"}
          </strong>
          <p>{tCommon("disclaimer")}</p>
        </div>
      </div>

      <div className="pt-4 flex items-center gap-4 text-xs font-reading text-[var(--dp-color-ink-muted)]">
        <Link
          href={`/${locale}/terms`}
          className="hover:text-[var(--dp-color-accent)] hover:underline"
        >
          {tLegal("termsTitle")}
        </Link>
        <span>•</span>
        <Link
          href={`/${locale}`}
          className="hover:text-[var(--dp-color-accent)] hover:underline"
        >
          {locale === "ar" ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </div>
    </div>
  );
}
