import { redirect } from "next/navigation";
import { verifyEmailToken } from "../../../../server/auth/service";

interface VerifyPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyPage({ params, searchParams }: VerifyPageProps) {
  const { locale } = await params;
  const { token, email } = await searchParams;

  if (!token || !email) {
    redirect(`/${locale}/auth/signin?error=missing_token`);
  }

  try {
    await verifyEmailToken({ email, token });
    redirect(`/${locale}/auth/signin?verified=true`);
  } catch (error) {
    console.error("[Verify Email Page Error]", error);
    redirect(`/${locale}/auth/signin?error=invalid_token`);
  }
}
