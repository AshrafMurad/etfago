import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-[#f8f9fc] text-[#202a40] p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-4xl font-extrabold text-[#243b70] mb-2">404</h1>
          <h2 className="text-xl font-bold mb-4">الصفحة غير موجودة | Page Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            عذرًا، لم نتمكن من العثور على الصفحة المطلوبة.
          </p>
          <Link
            href="/ar"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#243b70] text-white font-medium hover:opacity-95 transition-opacity"
          >
            العودة للرئيسية
          </Link>
        </div>
      </body>
    </html>
  );
}
