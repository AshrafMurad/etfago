"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  FileText,
  FolderKanban,
  Settings,
  Plus,
  Home,
  Shield,
  FileCheck,
  LogOut,
  LogIn,
  Globe,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { signOutAction } from "../../server/actions/auth";
import { LocaleSwitcher } from "./LocaleSwitcher";

export interface MobileNavProps {
  locale: string;
  otherLocale?: string;
  otherLocaleName?: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
    emailVerified: boolean;
  } | null;
  translations: {
    menu: string;
    openMenu: string;
    closeMenu: string;
    home: string;
    agreements: string;
    newAgreement: string;
    workspaces: string;
    settings: string;
    privacy: string;
    terms: string;
    signOut: string;
    signIn: string;
    verifiedBadge: string;
    unverifiedBadge: string;
  };
}

export function MobileNav({
  locale,
  user,
  translations,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const isLinkActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const drawerContent = (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 animate-fade-in md:hidden"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={translations.menu}
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="fixed inset-y-0 start-0 w-[85%] max-w-xs sm:max-w-sm bg-[var(--dp-color-ground)] z-50 shadow-2xl flex flex-col border-e-[2px] border-[var(--dp-color-line)] p-5 overflow-y-auto animate-drawer-in md:hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[var(--dp-color-line)]">
          <Link
            href={`/${locale}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-accent)] text-white flex items-center justify-center font-bold text-sm border-[1.5px] border-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] font-marker group-hover:rotate-1 transition-transform">
              ات
            </div>
            <span className="font-marker font-bold text-lg text-[var(--dp-color-ink)]">
              {translations.menu}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={translations.closeMenu}
            className="sketch-btn sketch-btn-secondary p-1.5 min-w-8 min-h-8 flex items-center justify-center text-[var(--dp-color-ink)] hover:text-[var(--dp-color-accent)] transition-transform active:scale-95"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 py-4 flex flex-col gap-4">
          {/* User profile card (if authenticated) */}
          {user && (
            <div className="sketch-card p-3 bg-[var(--dp-color-scrap)] flex items-center gap-3 border-[1.5px] border-[var(--dp-color-line)]">
              <div className="w-10 h-10 rounded-[8px_4px_10px_5px] bg-[var(--dp-color-annotation)] text-white flex items-center justify-center font-bold text-base border-[1.5px] border-[var(--dp-color-ink)] shadow-[1.5px_1.5px_0px_var(--dp-color-ink)] font-marker shrink-0">
                {(user.name?.[0] || user.email[0]).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1 font-reading">
                <span className="text-sm font-bold text-[var(--dp-color-ink)] truncate">
                  {user.name || user.email}
                </span>
                {user.name && (
                  <span
                    className="text-xs text-[var(--dp-color-ink-muted)] truncate"
                    dir="ltr"
                  >
                    {user.email}
                  </span>
                )}
                <div className="mt-1">
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--dp-color-annotation)] bg-blue-50/80 px-2 py-0.5 rounded-[4px] border border-blue-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{translations.verifiedBadge}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--dp-color-accent)] bg-amber-50/80 px-2 py-0.5 rounded-[4px] border border-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      <span>{translations.unverifiedBadge}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* New Agreement Action Button (if authenticated) */}
          {user && (
            <Link
              href={`/${locale}/agreements/new`}
              onClick={() => setIsOpen(false)}
              className="sketch-btn sketch-btn-primary w-full py-2.5 text-sm font-marker justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{translations.newAgreement}</span>
            </Link>
          )}

          {/* Main Navigation Links */}
          <nav className="flex flex-col gap-1.5 font-reading">
            {user ? (
              <>
                <Link
                  href={`/${locale}/agreements`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    isLinkActive(`/${locale}/agreements`)
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <FileText className="w-5 h-5 text-[var(--dp-color-accent)] shrink-0" />
                  <span>{translations.agreements}</span>
                </Link>

                <Link
                  href={`/${locale}/workspaces`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    isLinkActive(`/${locale}/workspaces`)
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <FolderKanban className="w-5 h-5 text-[var(--dp-color-annotation)] shrink-0" />
                  <span>{translations.workspaces}</span>
                </Link>

                <Link
                  href={`/${locale}/settings`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    isLinkActive(`/${locale}/settings`)
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <Settings className="w-5 h-5 text-[var(--dp-color-ink)] shrink-0" />
                  <span>{translations.settings}</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    pathname === `/${locale}`
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <Home className="w-5 h-5 text-[var(--dp-color-accent)] shrink-0" />
                  <span>{translations.home}</span>
                </Link>

                <Link
                  href={`/${locale}/privacy`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    isLinkActive(`/${locale}/privacy`)
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <Shield className="w-5 h-5 text-[var(--dp-color-annotation)] shrink-0" />
                  <span>{translations.privacy}</span>
                </Link>

                <Link
                  href={`/${locale}/terms`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--dp-radius-control)] font-marker text-base transition-colors ${
                    isLinkActive(`/${locale}/terms`)
                      ? "bg-[var(--dp-color-highlight)] text-[var(--dp-color-ink)] font-bold border-[1.5px] border-[var(--dp-color-ink)] shadow-[2px_2px_0px_var(--dp-color-ink)]"
                      : "text-[var(--dp-color-ink-muted)] hover:text-[var(--dp-color-ink)] hover:bg-[var(--dp-color-surface-muted)]"
                  }`}
                >
                  <FileCheck className="w-5 h-5 text-[var(--dp-color-ink)] shrink-0" />
                  <span>{translations.terms}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Secondary links (for authenticated users) */}
          {user && (
            <div className="pt-2 border-t border-dashed border-[var(--dp-color-line)] flex items-center justify-around text-xs font-semibold text-[var(--dp-color-ink-muted)]">
              <Link
                href={`/${locale}`}
                onClick={() => setIsOpen(false)}
                className="hover:text-[var(--dp-color-accent)] hover:underline py-1"
              >
                {translations.home}
              </Link>
              <span>•</span>
              <Link
                href={`/${locale}/privacy`}
                onClick={() => setIsOpen(false)}
                className="hover:text-[var(--dp-color-accent)] hover:underline py-1"
              >
                {translations.privacy}
              </Link>
              <span>•</span>
              <Link
                href={`/${locale}/terms`}
                onClick={() => setIsOpen(false)}
                className="hover:text-[var(--dp-color-accent)] hover:underline py-1"
              >
                {translations.terms}
              </Link>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="mt-auto pt-4 border-t border-dashed border-[var(--dp-color-line)] flex flex-col gap-2.5">
          {/* Language Switch */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-[var(--dp-radius-control)] bg-[var(--dp-color-scrap)] border border-[var(--dp-color-line)]">
            <div className="flex items-center gap-2 text-xs font-marker text-[var(--dp-color-ink-muted)]">
              <Globe className="w-4 h-4 text-[var(--dp-color-annotation)]" />
              <span>{locale === "ar" ? "اللغة" : "Language"}</span>
            </div>
            <LocaleSwitcher locale={locale} />
          </div>

          {/* Sign Out / Sign In */}
          {user ? (
            <form action={signOutAction} className="w-full">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="sketch-btn sketch-btn-outline w-full py-2 text-xs font-marker justify-center gap-2 text-[var(--dp-color-accent)] hover:text-[var(--dp-color-accent)]"
              >
                <LogOut className="w-4 h-4" />
                <span>{translations.signOut}</span>
              </button>
            </form>
          ) : (
            <Link
              href={`/${locale}/auth/signin`}
              onClick={() => setIsOpen(false)}
              className="sketch-btn sketch-btn-primary w-full py-2.5 text-sm font-marker justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{translations.signIn}</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        aria-label={isOpen ? translations.closeMenu : translations.openMenu}
        className="sketch-btn sketch-btn-secondary p-2 min-h-10 min-w-10 flex items-center justify-center text-[var(--dp-color-ink)] hover:text-[var(--dp-color-accent)] transition-transform active:scale-95 md:hidden"
      >
        <Menu className="w-5 h-5 stroke-[2.2]" />
      </button>

      {mounted && isOpen ? createPortal(drawerContent, document.body) : null}
    </>
  );
}
