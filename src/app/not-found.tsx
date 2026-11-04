import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex items-center justify-center p-6">
        <div className="sketch-card-elevated max-w-md w-full p-8 text-center space-y-4">
          <div className="sketch-tape sketch-tape-top" />
          <div className="flex justify-center mb-1">
            <Link href="/ar">
              <Image
                src="/logo.png"
                alt="اتفقنا | Etfago"
                width={120}
                height={44}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          </div>
          <h1 className="text-5xl font-extrabold font-marker text-[var(--dp-color-accent)] mb-2">404</h1>
          <h2 className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
            الصفحة غير موجودة | Page Not Found
          </h2>
          <p className="text-base font-reading text-[var(--dp-color-ink-muted)]">
            عذرًا، لم نتمكن من العثور على الصفحة المطلوبة.
          </p>
          <div className="pt-2">
            <Link
              href="/ar"
              className="sketch-btn sketch-btn-primary px-5 py-2.5 text-sm font-marker"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
