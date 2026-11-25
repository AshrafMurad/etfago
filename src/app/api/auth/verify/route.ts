import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";

  if (!token || !email) {
    return NextResponse.redirect(
      new URL(`/${locale}/auth/signin?error=missing_token`, request.url)
    );
  }

  const target = new URL(`/${locale}/auth/verify`, request.url);
  target.searchParams.set("email", email);
  target.searchParams.set("token", token);
  return NextResponse.redirect(target);
}
