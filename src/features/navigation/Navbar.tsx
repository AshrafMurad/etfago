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
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs px-6 py-3.5 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ات
          </div>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {tCommon("appName")}
          </span>
        </Link>

        {user && (
          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link
              href={`/${locale}/agreements`}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {tNav("agreements")}
            </Link>
            <Link
              href={`/${locale}/workspaces`}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {tNav("workspaces")}
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/${otherLocale}`}
          className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          {otherLocaleName}
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-end">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user.name || user.email}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">
                {user.emailVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {authT("verifiedBadge")}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
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
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                {tNav("signOut")}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href={`/${locale}/auth/signin`}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {tNav("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
