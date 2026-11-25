import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "../../../../server/auth/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin?error=missing_token`, request.url)
    );
  }

  try {
    await verifyEmailToken({ email, token });
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin?verified=true`, request.url)
    );
  } catch (error) {
    console.error("[Verify Email Error]", error);
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin?error=invalid_token`, request.url)
    );
  }
}
