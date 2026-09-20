import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(request: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/?auth_error=google_oauth_not_configured", origin)
    );
  }

  // Generate random state to mitigate CSRF attacks
  const state = crypto.randomBytes(24).toString("hex");

  // Save state in secure HttpOnly cookie (10 min expiry)
  const cookieStore = await cookies();
  cookieStore.set({
    name: "google_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const redirectUri = `${origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
