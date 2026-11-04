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
  const isAr = locale === "ar";

  return (
    <div className="flex-1 flex flex-col py-8 sm:py-12 px-4 sm:px-6">
      <main className="max-w-5xl mx-auto w-full flex flex-col gap-12 sm:gap-16">
        {/* Section 1: Opening Split Working Sheet Header */}
        <section className="relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Handwritten Statement & Primary CTA */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-[var(--dp-color-scrap)] border-[1.5px] border-[var(--dp-color-line)] rounded-[7px_3px_11px_4px] shadow-[1px_1px_0px_var(--dp-color-line)] text-xs font-semibold text-[var(--dp-color-annotation)]">
                <span className="w-2 h-2 rounded-full bg-[var(--dp-color-accent)] inline-block"></span>
                <span>v0.1.0 — {isAr ? "مساحة عمل عربية أولاً" : "Arabic-first Workspace"}</span>
              </div>

              <div className="relative">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-marker text-[var(--dp-color-ink)] leading-[1.25]">
                  {tAgreements("subtitle")}
                </h1>
                {/* Irregular hand-drawn underline */}
                <svg
                  className="w-full max-w-[340px] h-3.5 mt-1 text-[var(--dp-color-accent)] opacity-85"
                  viewBox="0 0 340 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M 4 8 Q 85 2 170 8 T 336 6" />
                </svg>
              </div>

              <p className="text-lg sm:text-xl font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                {isAr
                  ? "اتفاق واحد. أطراف متعددة. كل تغيير واضح. منصة تتيح توثيق الاتفاقات ببنود مهيكلة، ومراجعة النسخ المجمدة، وتسجيل الموافقة الصريحة دون مطالبات التوقيع الرقمي القانوني الموثق."
                  : "One agreement. Multiple parties. Every revision clear. Structured terms, frozen snapshots, and explicit consensus without misleading electronic signature claims."}
              </p>

              {/* Action Buttons & Hand-Drawn Arrow */}
              <div className="relative pt-2">
                <div className="flex flex-wrap items-center gap-3.5">
                  <Link
                    href={`/${locale}/agreements`}
                    className="sketch-btn sketch-btn-primary px-6 py-3 text-base sm:text-lg"
                  >
                    ✦ {tNav("agreements")}
                  </Link>
                  <Link
                    href={`/${locale}/workspaces`}
                    className="sketch-btn sketch-btn-secondary px-5 py-3 text-sm sm:text-base"
                  >
                    {tNav("workspaces")}
                  </Link>
                  <Link
                    href={`/${locale}/auth/signin`}
                    className="sketch-btn sketch-btn-outline px-5 py-3 text-sm sm:text-base"
                  >
                    {tNav("signIn")}
                  </Link>
                </div>

                {/* Hand-drawn arrow directing attention toward main action */}
                <div
                  className="hidden sm:flex items-center gap-2 mt-3 text-xs font-reading text-[var(--dp-color-annotation)]"
                  aria-hidden="true"
                >
                  <svg
                    className={`w-6 h-6 text-[var(--dp-color-annotation)] ${isAr ? "scale-x-[-1]" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 18 C 8 10, 14 6, 20 6" />
                    <path d="M15 2 L 20 6 L 15 10" />
                  </svg>
                  <span>{isAr ? "ابدأ بإدارة اتفاقاتك فوراً" : "Start managing your agreements"}</span>
                </div>
              </div>
            </div>

            {/* Side Cluster of Pinned Scrap Notes & Line Drawing */}
            <div className="lg:col-span-5 flex flex-col gap-4 relative">
              <div className="sketch-card p-6 relative rotate-[-0.7deg] hover:rotate-0 transition-transform">
                {/* Torn tape strip at top of card */}
                <div className="sketch-tape sketch-tape-top" aria-hidden="true" />

                <div className="flex items-center justify-between border-b border-dashed border-[var(--dp-color-line)] pb-3 mb-4">
                  <span className="font-marker font-bold text-sm text-[var(--dp-color-ink)]">
                    {isAr ? "مفكرة المبادئ الجوهرية" : "Core Working Principles"}
                  </span>
                  <span className="text-xs font-reading text-[var(--dp-color-annotation)]">
                    #01
                  </span>
                </div>

                {/* Simple line illustration of agreement & pencil */}
                <div className="flex justify-center mb-4 text-[var(--dp-color-ink)]" aria-hidden="true">
                  <svg className="w-24 h-16" viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="25" y="8" width="50" height="48" rx="2" strokeDasharray="3 2" fill="var(--dp-color-ground)" />
                    <line x1="33" y1="18" x2="67" y2="18" />
                    <line x1="33" y1="26" x2="60" y2="26" />
                    <line x1="33" y1="34" x2="55" y2="34" />
                    <circle cx="60" cy="44" r="5" stroke="var(--dp-color-accent)" fill="var(--dp-color-highlight)" />
                    <path d="M68 6 L80 18 L76 22 L64 10 Z" fill="var(--dp-color-scrap)" />
                    <path d="M64 10 L61 13 L65 14 Z" fill="var(--dp-color-ink)" />
                  </svg>
                </div>

                <div className="space-y-3 font-reading text-sm text-[var(--dp-color-ink)]">
                  <div className="flex items-start gap-2 bg-[var(--dp-color-ground)] p-2.5 rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)]">
                    <span className="text-[var(--dp-color-accent)] font-bold text-base leading-none">✓</span>
                    <div>
                      <strong className="block text-xs font-bold text-[var(--dp-color-ink)]">
                        {isAr ? "النسخ المعتمدة مجمدة وثابتة" : "Frozen Immutable Versions"}
                      </strong>
                      <span className="text-xs text-[var(--dp-color-ink-muted)]">
                        {isAr ? "لا تعديل على أي نسخة تم تجميدها بعد طرحها." : "Snapshots and reviewer rosters are immutable."}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-[var(--dp-color-ground)] p-2.5 rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)]">
                    <span className="text-[var(--dp-color-annotation)] font-bold text-base leading-none">✓</span>
                    <div>
                      <strong className="block text-xs font-bold text-[var(--dp-color-ink)]">
                        {isAr ? "لا موافقة بالسكوت أو الإهمال" : "No Approval by Silence"}
                      </strong>
                      <span className="text-xs text-[var(--dp-color-ink-muted)]">
                        {isAr ? "الموافقة صريحة من كل طرف على نفس الهاش المشفر." : "Every required participant must explicitly approve."}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-[var(--dp-color-ground)] p-2.5 rounded-[6px_3px_8px_4px] border border-[var(--dp-color-line)]">
                    <span className="text-[var(--dp-color-ink)] font-bold text-base leading-none">✓</span>
                    <div>
                      <strong className="block text-xs font-bold text-[var(--dp-color-ink)]">
                        {isAr ? "تخزين خادم خاص حصري" : "Private Server File Storage"}
                      </strong>
                      <span className="text-xs text-[var(--dp-color-ink-muted)]">
                        {isAr ? "الملفات لا تُرفع على سحابة عامة، وفحص الصلاحيات دائم." : "Isolated server filesystem with constant auth check."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Facts Beneath a Drawn Bracket */}
        <section className="relative pt-4">
          <div className="text-center mb-3">
            <span className="font-reading text-xs font-semibold tracking-wider text-[var(--dp-color-ink-muted)] uppercase">
              {isAr ? "مؤشرات الثقة والنزاهة" : "Integrity & Platform Indicators"}
            </span>
          </div>

          {/* Drawn Bracket SVG */}
          <div className="w-full flex justify-center text-[var(--dp-color-line)] mb-4" aria-hidden="true">
            <svg
              className="w-full max-w-2xl h-6"
              viewBox="0 0 600 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M 10 6 Q 150 7 285 7 Q 295 7 300 20 Q 305 7 315 7 Q 450 7 590 6" />
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
            <div className="sketch-card p-4 sm:p-5">
              <div className="text-3xl sm:text-4xl font-marker font-bold text-[var(--dp-color-accent)]">
                100%
              </div>
              <p className="text-sm font-reading text-[var(--dp-color-ink)] font-semibold mt-1">
                {isAr ? "تجميد النسخ ومطابقة الهاش" : "Frozen Snapshots & Hash Matching"}
              </p>
              <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-0.5">
                {isAr ? "بصمة تشفيرية لكل مراجعة" : "Deterministic canonical hash per version"}
              </p>
            </div>

            <div className="sketch-card p-4 sm:p-5">
              <div className="text-3xl sm:text-4xl font-marker font-bold text-[var(--dp-color-annotation)]">
                0
              </div>
              <p className="text-sm font-reading text-[var(--dp-color-ink)] font-semibold mt-1">
                {isAr ? "لا اعتماد بالسكوت" : "Zero Approval by Silence"}
              </p>
              <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-0.5">
                {isAr ? "إلزامية التأكيد الإيجابي الصريح" : "Mandatory explicit positive review"}
              </p>
            </div>

            <div className="sketch-card p-4 sm:p-5">
              <div className="text-3xl sm:text-4xl font-marker font-bold text-[var(--dp-color-ink)]">
                1
              </div>
              <p className="text-sm font-reading text-[var(--dp-color-ink)] font-semibold mt-1">
                {isAr ? "مسودة تفاوض واحدة نشطة" : "Single Active Draft"}
              </p>
              <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] mt-0.5">
                {isAr ? "منع تشتت التعديلات وتضاربها" : "Prevents diverging edits and conflicts"}
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Process on Darker Irregular Paper Strip */}
        <section className="sketch-strip p-6 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold font-marker text-[var(--dp-color-ink)]">
                {isAr ? "مسار العمل المعتمد خطوة بخطوة" : "The Core Agreement Workflow"}
              </h2>
              <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] mt-1">
                {isAr ? "كيف يتحول التفاوض إلى اتفاق معتمد موثق" : "How drafting transforms into an agreed version"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="bg-[var(--dp-color-scrap)] p-5 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] shadow-[1px_2px_0px_var(--dp-color-line)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-[var(--dp-color-accent)] text-white font-marker font-bold flex items-center justify-center text-sm shadow-[1px_1px_0px_var(--dp-color-ink)]">
                      1
                    </span>
                    <h3 className="font-marker font-bold text-base text-[var(--dp-color-ink)]">
                      {isAr ? "صياغة البنود المهيكلة" : "Draft Structured Terms"}
                    </h3>
                  </div>
                  <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                    {isAr
                      ? "إضافة بنود واضحة تشمل التزامات الأطراف، والمبالغ، وتواريخ الاستحقاق دون غموض."
                      : "Define clear obligations, amounts, and dates without contractual ambiguity."}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[var(--dp-color-scrap)] p-5 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] shadow-[1px_2px_0px_var(--dp-color-line)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-[var(--dp-color-annotation)] text-white font-marker font-bold flex items-center justify-center text-sm shadow-[1px_1px_0px_var(--dp-color-ink)]">
                      2
                    </span>
                    <h3 className="font-marker font-bold text-base text-[var(--dp-color-ink)]">
                      {isAr ? "تجميد النسخة للمراجعة" : "Freeze for Review"}
                    </h3>
                  </div>
                  <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                    {isAr
                      ? "تثبيت قائمة المراجعين ولقطة المحتوى مع بصمة تجزئة تشفيرية غير قابلة للتحوير."
                      : "Freeze the snapshot and reviewer roster with an immutable cryptographic hash."}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[var(--dp-color-scrap)] p-5 rounded-[8px_4px_12px_5px] border border-[var(--dp-color-line)] shadow-[1px_2px_0px_var(--dp-color-line)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] border border-[var(--dp-color-ink)] font-marker font-bold flex items-center justify-center text-sm shadow-[1px_1px_0px_var(--dp-color-ink)]">
                      3
                    </span>
                    <h3 className="font-marker font-bold text-base text-[var(--dp-color-ink)]">
                      {isAr ? "الموافقة الصريحة" : "Explicit Consensus"}
                    </h3>
                  </div>
                  <p className="text-xs font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                    {isAr
                      ? "يسجل كل طرف موافقته على النسخة ذاتها، لتترقى إلى الاتفاق المعتمد النافذ بينكم."
                      : "Every required participant approves the exact snapshot to promote it to Agreed."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Features as Open Thoughts with Subtle Vertical Staggering */}
        <section className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
              {isAr ? "ميزات مصممة للأمان والوضوح التام" : "Features Built for Trust & Clarity"}
            </h2>
            <p className="text-base font-reading text-[var(--dp-color-ink-muted)] mt-1">
              {isAr ? "أدوات مخصصة تحمي حقوق كل طرف" : "Purpose-built tools protecting every party's rights"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Feature 1 - Stagger mt-0 */}
            <div className="sketch-card p-6 rotate-[-0.5deg] hover:rotate-0 transition-transform">
              <div className="w-10 h-10 rounded-[6px_3px_9px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-center text-xl mb-4 shadow-[1px_1px_0px_var(--dp-color-line)]">
                📁
              </div>
              <h3 className="font-marker font-bold text-lg text-[var(--dp-color-ink)] mb-2">
                {isAr ? "تخزين خادم محلي خاص" : "Private Persistent Server Storage"}
              </h3>
              <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                {isAr
                  ? "المرفقات والملفات محفوظة في نظام ملفات خادم معزول، مع فحص الصلاحيات عند كل تحميل، دون الاعتماد على خدمات تخزين سحابي عامة."
                  : "Attachments reside on an isolated server filesystem with server-enforced access checks on every request, never public cloud buckets."}
              </p>
            </div>

            {/* Feature 2 - Stagger mt-4 on large screens */}
            <div className="sketch-card p-6 lg:mt-4 rotate-[0.4deg] hover:rotate-0 transition-transform">
              <div className="w-10 h-10 rounded-[6px_3px_9px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-center text-xl mb-4 shadow-[1px_1px_0px_var(--dp-color-line)]">
                🔍
              </div>
              <h3 className="font-marker font-bold text-lg text-[var(--dp-color-ink)] mb-2">
                {isAr ? "مقارنة الفروقات وتتبع السجل" : "Version Diff & Immutable Audit Trail"}
              </h3>
              <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                {isAr
                  ? "مقارنة مرئية دقيقة بين أي نسختين، مع تسجيل كامل لجميع التغييرات، والدعوات، والملاحظات في سجل تدقيق لا يمكن حذفه."
                  : "Visual line-by-line diff between versions with an append-only transaction-backed activity log."}
              </p>
            </div>

            {/* Feature 3 - Stagger mt-2 on large screens */}
            <div className="sketch-card p-6 lg:mt-2 rotate-[-0.3deg] hover:rotate-0 transition-transform">
              <div className="w-10 h-10 rounded-[6px_3px_9px_4px] bg-[var(--dp-color-ground)] border border-[var(--dp-color-line)] flex items-center justify-center text-xl mb-4 shadow-[1px_1px_0px_var(--dp-color-line)]">
                🛡️
              </div>
              <h3 className="font-marker font-bold text-lg text-[var(--dp-color-ink)] mb-2">
                {isAr ? "عزل صارم لمساحات العمل" : "Strict Workspace & Tenancy Isolation"}
              </h3>
              <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] leading-relaxed">
                {isAr
                  ? "إدارة مساحات عمل شخصية ومؤسسية مع سياسة أمان افتراضية تمنع الوصول إلا للمشاركين المدعوين صراحة."
                  : "Personal and business workspaces with default-deny server authorization across all boundaries."}
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Trust Boundary Speech Scrap Note */}
        <section className="sketch-card p-6 relative max-w-3xl mx-auto w-full rotate-[0.3deg]">
          <div className="sketch-tape sketch-tape-corner" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="space-y-1">
              <p className="font-marker font-bold text-sm text-[var(--dp-color-annotation)]">
                {isAr ? "تنبيه ومحددات المنصة (Trust Boundary):" : "Platform Boundaries & Notice:"}
              </p>
              <p className="text-sm font-reading text-[var(--dp-color-ink)] leading-relaxed">
                {tCommon("disclaimer")}
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Large Red Statement Above Lightly Divided Footer */}
        <section className="text-center py-6 sm:py-8 border-b-[1.5px] border-dashed border-[var(--dp-color-line)]">
          <p className="font-marker text-2xl sm:text-3xl lg:text-4xl text-[var(--dp-color-accent)] font-bold leading-normal max-w-3xl mx-auto px-4">
            {isAr
              ? "اتفاق واحد. أطراف متعددة. كل تغيير واضح وموثق بالرضا الصريح."
              : "One agreement. Multiple parties. Every revision clear and explicitly agreed."}
          </p>
        </section>
      </main>
    </div>
  );
}
