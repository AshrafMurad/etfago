"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { registerPasswordAction } from "../../server/actions/auth";
import { useTranslations } from "next-intl";
import { FieldErrorMessage, FormAlert } from "../ui";
import { validateEmail } from "../../lib/validation";

interface SignInFormProps {
  locale: string;
  defaultEmail?: string;
  verified?: boolean;
}

export function SignInForm({ locale, defaultEmail = "", verified = false }: SignInFormProps) {
  const t = useTranslations("Auth");
  const common = useTranslations("Common");

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    verified ? t("verifiedSuccess") : null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email, locale);
    if (err) {
      setEmailError(err);
      return;
    }
    if (password.length < 12) {
      setError(t("passwordTooShort"));
      return;
    }

    setEmailError(null);
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "register") {
        const registration = await registerPasswordAction({
          email: email.trim(),
          name: name.trim() || undefined,
          password,
          locale,
        });
        if (registration.error) {
          setError(t("registerFailed"));
          return;
        }
      }

      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }
      window.location.assign(`/${locale}/workspaces`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailError) {
      setEmailError(validateEmail(val, locale));
    }
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email, locale));
  };

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
        <div className="mb-4">
          <FormAlert type="success" message={message} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <FormAlert type="error" message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--dp-color-ground)] p-1" role="tablist" aria-label={t("accountAccessMode")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => { setMode("signin"); setError(null); }}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === "signin" ? "bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] shadow-sm" : "text-[var(--dp-color-ink-muted)]"}`}
          >
            {t("signInTab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => { setMode("register"); setError(null); }}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${mode === "register" ? "bg-[var(--dp-color-scrap)] text-[var(--dp-color-ink)] shadow-sm" : "text-[var(--dp-color-ink-muted)]"}`}
          >
            {t("registerTab")}
          </button>
        </div>

        {mode === "register" && (
          <div>
            <label htmlFor="signin-name" className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
              {t("nameLabel")} <span className="text-[var(--dp-color-ink-muted)] font-normal text-[11px]">({common("optional")})</span>
            </label>
            <input
              id="signin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === "ar" ? "الاسم الكريم" : "Your full name"}
              autoComplete="name"
              maxLength={100}
              className="w-full px-3 py-2 text-sm font-reading"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="signin-email"
            className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1"
          >
            {t("emailLabel")} <span className="text-[var(--dp-color-accent)] font-bold">*</span>
          </label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="user@example.com"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "signin-email-error" : undefined}
            className={`w-full px-3 py-2 text-sm font-reading ${
              emailError ? "sketch-input-error" : ""
            }`}
            dir="ltr"
            autoComplete="email"
            required
          />
          <FieldErrorMessage id="signin-email-error" error={emailError} />
        </div>

        <div>
          <label htmlFor="signin-password" className="block text-xs font-bold font-reading text-[var(--dp-color-ink)] mb-1">
            {t("passwordLabel")} <span className="text-[var(--dp-color-accent)] font-bold">*</span>
          </label>
          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={12}
            maxLength={128}
            required
            dir="ltr"
            className="w-full px-3 py-2 text-sm font-reading"
          />
          {mode === "register" && <p className="mt-1 text-xs text-[var(--dp-color-ink-muted)]">{t("passwordHint")}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sketch-btn sketch-btn-primary w-full py-3 px-4 font-marker text-base disabled:opacity-50"
        >
          {loading ? common("loading") : mode === "register" ? t("createAccount") : t("signInButton")}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-dashed border-[var(--dp-color-line)] text-xs text-[var(--dp-color-ink-muted)] font-reading text-center leading-relaxed">
        {t("temporaryVerificationNote")}
      </div>
    </div>
  );
}
