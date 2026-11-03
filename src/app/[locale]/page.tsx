import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const tCommon = useTranslations("Common");
  const tNav = useTranslations("Navigation");
  const tAgreements = useTranslations("Agreements");

  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherLocaleName = locale === "ar" ? "English" : "العربية";

  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-lg shadow-sm">
            ات
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--primary)]">
              {tCommon("appName")}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {tCommon("tagline")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/${otherLocale}`}
            className="text-sm font-medium px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            {otherLocaleName}
          </Link>
          <Link
            href={`/${locale}/auth/sign-in`}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-95 transition-opacity"
          >
            {tNav("signIn")}
          </Link>
        </div>
      </header>

      {/* Main hero */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-8">
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm">
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[var(--primary)] mb-3">
            v0.1.0 — Arabic-first Workspace
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--foreground)] mb-4">
            {tAgreements("subtitle")}
          </h2>
          <p className="text-base text-[var(--muted-foreground)] leading-relaxed mb-6">
            اتفاق واحد. أطراف متعددة. كل تغيير واضح. منصة تتيح توثيق الاتفاقات ببنود مهيكلة،
            ومراجعة النسخ المجمدة، وتسجيل الموافقة الصريحة دون مطالبات التوقيع الرقمي القانوني الموثق.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/app/agreements`}
              className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              {tAgreements("createNew")}
            </Link>
            <Link
              href={`/${locale}/app`}
              className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              {tNav("home")}
            </Link>
          </div>
        </section>

        {/* Disclaimer card per doc 08 / 12 */}
        <section className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">تنبيه ومحددات المنصة (Trust Boundary):</p>
          <p>{tCommon("disclaimer")}</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)]">
        &copy; {new Date().getFullYear()} {tCommon("appName")}. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
