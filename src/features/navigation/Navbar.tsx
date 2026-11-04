import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "../../server/auth/session";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "../../server/actions/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";

interface NavbarProps {
  locale: string;
}

export async function Navbar({ locale }: NavbarProps) {
  const user = await getCurrentUser();
  const tNav = await getTranslations({ locale, namespace: "Navigation" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const authT = await getTranslations({ locale, namespace: "Auth" });

  return (
    <header className="border-b-[1.5px] border-[var(--dp-color-line)] bg-[var(--dp-color-ground)]/95 backdrop-blur-xs px-4 sm:px-6 py-3.5 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 group py-0.5">
          <Image
            src="/logo.png"
            alt={tCommon("appName")}
            width={120}
            height={44}
            className="h-9 w-auto object-contain transition-transform group-hover:scale-102"
            priority
          />
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-5 text-base font-reading font-semibold text-[var(--dp-color-ink-muted)]">
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

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Desktop user status, language switcher & sign in/out */}
        <div className="hidden md:flex items-center gap-3">
          <LocaleSwitcher locale={locale} />
          {user ? (
            <>
              <div className="flex flex-col text-end font-reading">
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

              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="sketch-btn sketch-btn-outline text-xs px-3 py-1.5 font-marker"
                >
                  {tNav("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href={`/${locale}/auth/signin`}
              className="sketch-btn sketch-btn-primary text-xs px-3.5 py-1.5 font-marker"
            >
              {tNav("signIn")}
            </Link>
          )}
        </div>

        {/* Mobile Hamburger menu */}
        <div className="md:hidden flex items-center">
          <MobileNav
            locale={locale}
            user={
              user
                ? {
                    id: user.id,
                    name: user.name ?? null,
                    email: user.email,
                    emailVerified: !!user.emailVerified,
                  }
                : null
            }
            translations={{
              menu: tNav("menu"),
              openMenu: tNav("openMenu"),
              closeMenu: tNav("closeMenu"),
              home: tNav("home"),
              agreements: tNav("agreements"),
              newAgreement: tNav("newAgreement"),
              workspaces: tNav("workspaces"),
              settings: tNav("settings"),
              privacy: tNav("privacy"),
              terms: tNav("terms"),
              signOut: tNav("signOut"),
              signIn: tNav("signIn"),
              verifiedBadge: authT("verifiedBadge"),
              unverifiedBadge: authT("unverifiedBadge"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
