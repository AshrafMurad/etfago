"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

interface SignInFormProps {
  locale: string;
  defaultEmail?: string;
  verified?: boolean;
}

export function SignInForm({ locale, defaultEmail = "", verified = false }: SignInFormProps) {
  const t = useTranslations("Auth");
  const common = useTranslations("Common");

  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    verified ? t("verifiedSuccess") : null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await signIn("credentials", {
        email,
        name: name || undefined,
        redirect: false,
        callbackUrl: `/${locale}/workspaces`,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setMessage(t("verificationNotice"));
        // Redirect to workspaces after short delay if signed in
        window.location.href = `/${locale}/workspaces`;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sketch-card w-full max-w-md mx-auto p-6 sm:p-8 relative">
      <div className="sketch-tape sketch-tape-top" aria-hidden="true" />

      <div className="mb-6 text-center">
        <Link href={`/${locale}`} className="inline-flex items-center justify-center mb-4 group">
          <Image
            src="/logo.png"
            alt={common("appName")}
            width={130}
            height={48}
            className="h-11 w-auto object-contain transition-transform group-hover:scale-102"
            priority
          />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-marker text-[var(--dp-color-ink)]">
          {t("signInTitle")}
        </h1>
        <p className="text-sm font-reading text-[var(--dp-color-ink-muted)] mt-1">
          {t("signInSubtitle")}
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-[#eaf3ea] border border-[#96b79d] text-[var(--dp-color-ink)] rounded-[6px_3px_8px_4px] text-xs font-reading">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-[#fbeee9] border border-[var(--dp-color-accent)] text-[var(--dp-color-accent)] rounded-[6px_3px_8px_4px] text-xs font-reading">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
            {t("emailLabel")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            className="w-full px-3 py-2 text-sm font-reading"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
            {t("nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكريم"
            className="w-full px-3 py-2 text-sm font-reading"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="sketch-btn sketch-btn-primary w-full py-3 px-4 font-marker text-base disabled:opacity-50"
        >
          {loading ? common("loading") : t("sendLink")}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-dashed border-[var(--dp-color-line)] text-xs text-[var(--dp-color-ink-muted)] font-reading text-center leading-relaxed">
        {t("legalNote")}
      </div>
    </div>
  );
}
