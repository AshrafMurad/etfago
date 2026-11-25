"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function VerifySignIn({ locale, token, email }: {
  locale: string;
  token: string;
  email: string;
}) {
  const t = useTranslations("Auth");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function confirmSignIn() {
    setBusy(true);
    setError(false);
    try {
      const result = await signIn("credentials", { email, token, redirect: false });
      if (result?.error) {
        setError(true);
      } else {
        window.location.assign(`/${locale}/workspaces`);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="confirm-signin-title" className="sketch-card max-w-md mx-auto my-16 p-8 space-y-4">
      <h1 id="confirm-signin-title" className="text-2xl font-bold">{t("confirmSignIn")}</h1>
      <p>{t("confirmSignInHelp")}</p>
      {error && <p role="alert">{t("invalidLink")}</p>}
      <button className="sketch-btn sketch-btn-primary" disabled={busy} aria-busy={busy} onClick={confirmSignIn}>
        {t("confirmSignIn")}
      </button>
      <Link className="block underline" href={`/${locale}/auth/signin`}>{t("requestNewLink")}</Link>
    </section>
  );
}
