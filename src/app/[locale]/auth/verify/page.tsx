import { VerifySignIn } from "../../../../features/auth/VerifySignIn";

export default async function VerifyPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { locale } = await params;
  const { token = "", email = "" } = await searchParams;
  return <VerifySignIn locale={locale} token={token} email={email} />;
}
