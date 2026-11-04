"use client";

import { usePathname, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface LocaleSwitcherProps {
  locale: string;
  className?: string;
}

function LocaleSwitcherInner({ locale, className }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherLocaleName = locale === "ar" ? "English" : "العربية";

  const queryString = searchParams.toString();
  const targetPath = queryString ? `${pathname}?${queryString}` : (pathname || "/");

  const baseClasses = "sketch-btn sketch-btn-secondary text-xs px-2.5 py-1.5 font-marker";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <Link
      href={targetPath}
      locale={otherLocale}
      className={combinedClasses}
      aria-label={otherLocale === "ar" ? "التبديل إلى العربية" : "Switch to English"}
    >
      {otherLocaleName}
    </Link>
  );
}

export function LocaleSwitcher({ locale, className }: LocaleSwitcherProps) {
  const otherLocaleName = locale === "ar" ? "English" : "العربية";
  const baseClasses = "sketch-btn sketch-btn-secondary text-xs px-2.5 py-1.5 font-marker opacity-80 pointer-events-none";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <Suspense
      fallback={
        <span className={combinedClasses}>
          {otherLocaleName}
        </span>
      }
    >
      <LocaleSwitcherInner locale={locale} className={className} />
    </Suspense>
  );
}
