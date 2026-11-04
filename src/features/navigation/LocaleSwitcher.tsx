"use client";

import { usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface LocaleSwitcherProps {
  locale: string;
}

function LocaleSwitcherInner({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherLocaleName = locale === "ar" ? "English" : "العربية";

  const queryString = searchParams.toString();
  const targetPath = queryString ? `${pathname}?${queryString}` : (pathname || "/");

  return (
    <Link
      href={targetPath}
      locale={otherLocale}
      className="sketch-btn sketch-btn-secondary text-xs px-2.5 py-1.5 font-marker"
      aria-label={otherLocale === "ar" ? "التبديل إلى العربية" : "Switch to English"}
    >
      {otherLocaleName}
    </Link>
  );
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const otherLocaleName = locale === "ar" ? "English" : "العربية";

  return (
    <Suspense
      fallback={
        <span className="sketch-btn sketch-btn-secondary text-xs px-2.5 py-1.5 font-marker opacity-80 pointer-events-none">
          {otherLocaleName}
        </span>
      }
    >
      <LocaleSwitcherInner locale={locale} />
    </Suspense>
  );
}
