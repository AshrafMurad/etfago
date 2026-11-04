import Link from "next/link";
import { getCurrentUser } from "../../server/auth/session";
import { getTranslations } from "next-intl/server";
import { signOut } from "../../server/auth/auth";

interface NavbarProps {
  locale: string;
}

export async function Navbar({ locale }: NavbarProps) {
  const user = await getCurrentUser();
  const tNav = await getTranslations({ locale, namespace: "Navigation" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const authT = await getTranslations({ locale, namespace: "Auth" });

  const otherLocale = locale === "ar" ? "en" : "ar";
  const otherLocaleName = locale === "ar" ? "English" : "العربية";

  return (
    <header className="border-b-[1.5px] border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]/95 backdrop-blur-xs px-6 py-3.5 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-accent)] text-white flex items-center justify-center font-bold text-sm border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)] font-marker group-hover:rotate-1 transition-transform">
            ات
          </div>
          <span className="text-xl font-bold font-marker text-[var(--dp-color-ink)]">
            {tCommon("appName")}
          </span>
        </Link>

        {user && (
          <nav className="hidden sm:flex items-center gap-5 text-base font-reading font-semibold text-[var(--dp-color-ink-muted)]">
            <Link
              href={`/${locale}/agreements`}
              className="hover:text-[var(--dp-color-accent)] transition-colors"
            >
              {tNav("agreements")}
            </Link>
            <Link
              href={`/${locale}/workspaces`}
              className="hover:text-[var(--dp-color-accent)] transition-colors"
            >
              {tNav("workspaces")}
            </Link>
            <Link
              href={`/${locale}/settings`}
              className="hover:text-[var(--dp-color-accent)] transition-colors"
            >
              {tNav("settings")}
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/${otherLocale}`}
          className="sketch-btn sketch-btn-secondary text-xs px-2.5 py-1.5 font-marker"
        >
          {otherLocaleName}
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-end font-reading">
              <span className="text-xs font-semibold text-[var(--dp-color-ink)]">
                {user.name || user.email}
              </span>
              <span className="text-[11px]" dir="ltr">
                {user.emailVerified ? (
                  <span className="text-[var(--dp-color-annotation)] font-medium">
                    ✓ {authT("verifiedBadge")}
                  </span>
                ) : (
                  <span className="text-[var(--dp-color-accent)] font-medium">
                    ! {authT("unverifiedBadge")}
                  </span>
                )}
              </span>
            </div>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}/auth/signin` });
              }}
            >
              <button
                type="submit"
                className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5 font-marker"
              >
                {tNav("signOut")}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href={`/${locale}/auth/signin`}
            className="sketch-btn sketch-btn-primary text-xs px-3.5 py-1.5 font-marker"
          >
            {tNav("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
