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

  return (
    <div className="flex-1 flex flex-col">
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
              href={`/${locale}/agreements`}
              className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              {tNav("agreements")}
            </Link>
            <Link
              href={`/${locale}/workspaces`}
              className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              {tNav("workspaces")}
            </Link>
            <Link
              href={`/${locale}/auth/signin`}
              className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              {tNav("signIn")}
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
