import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  getUsersCollection,
  toSafeUser,
} from "@/lib/models/user";
import { createSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, 8, 15 * 60 * 1000); // 8 login attempts per 15 min
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawIdentifier = body.identifier || body.email;
    const { password } = body;

    if (!rawIdentifier || !password || typeof rawIdentifier !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Please enter your username or email, and password." },
        { status: 400 }
      );
    }

    const cleanIdentifier = rawIdentifier.trim().toLowerCase();
    const usersCol = await getUsersCollection();

    // Determine whether input is email or username
    const isEmail = cleanIdentifier.includes("@");
    const query = isEmail
      ? { email: cleanIdentifier }
      : { username: cleanIdentifier };

    const user = await usersCol.findOne(query);

    // Generic error message to prevent account enumeration
    const GENERIC_ERROR = "Unable to sign in with these credentials. Please check your username or email and password.";

    // 1. Check that the account exists
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // 2. Check that the email has been verified
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // 3. Verify the password against the stored password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // 4. Create the normal secure authenticated session
    const safeUser = toSafeUser(user);
    await createSession(safeUser);

    // 5. Return the authenticated user
    return NextResponse.json({
      success: true,
      user: safeUser,
      message: `Welcome back, ${safeUser.name}!`,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sign in. Please try again later." },
      { status: 500 }
    );
  }
}
