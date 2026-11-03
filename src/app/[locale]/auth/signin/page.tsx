import { getTranslations } from "next-intl/server";
import { SignInForm } from "../../../../features/auth/SignInForm";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; verified?: string; error?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return {
    title: t("signInTitle"),
  };
}

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { locale } = await params;
  const search = await searchParams;

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <SignInForm
        locale={locale}
        defaultEmail={search.email || ""}
        verified={search.verified === "true"}
      />
    </div>
  );
}
