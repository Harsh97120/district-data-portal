import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsersCollection, normalizeEmail, toSafeUser } from "@/lib/models/user";
import { createSession } from "@/lib/session";

export async function GET(request: Request): Promise<NextResponse> {
  const origin =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, origin));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/?auth_error=missing_oauth_code", origin));
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get("google_oauth_state")?.value;

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(new URL("/?auth_error=state_mismatch", origin));
    }

    // Clear state cookie
    cookieStore.delete("google_oauth_state");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/?auth_error=google_credentials_missing", origin));
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Google token exchange error:", errText);
      return NextResponse.redirect(new URL("/?auth_error=token_exchange_failed", origin));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user profile from Google UserInfo
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/?auth_error=profile_fetch_failed", origin));
    }

    const profile = await profileResponse.json();
    const { sub, email, name, picture, email_verified } = profile;

    if (!email) {
      return NextResponse.redirect(new URL("/?auth_error=email_not_provided_by_google", origin));
    }

    const cleanEmail = normalizeEmail(email);
    const users = await getUsersCollection();

    let userDoc = await users.findOne({
      $or: [{ email: cleanEmail }, { providerAccountId: sub }],
    });

    if (!userDoc) {
      // Create new user account
      const newUser = {
        name: name || cleanEmail.split("@")[0],
        email: cleanEmail,
        emailVerified: Boolean(email_verified),
        image: picture || null,
        provider: "google" as const,
        providerAccountId: sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertResult = await users.insertOne(newUser);
      userDoc = { ...newUser, _id: insertResult.insertedId };
    } else {
      // Update existing user profile info
      await users.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            name: name || userDoc.name,
            image: picture || userDoc.image,
            emailVerified: true,
            providerAccountId: sub,
            updatedAt: new Date(),
          },
        }
      );
      userDoc.name = name || userDoc.name;
      userDoc.image = picture || userDoc.image;
      userDoc.emailVerified = true;
    }

    // Set secure JWT session cookie
    await createSession(toSafeUser(userDoc));

    return NextResponse.redirect(new URL("/?auth_success=1", origin));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?auth_error=callback_exception", origin));
  }
}
