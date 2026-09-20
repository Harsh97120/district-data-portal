import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  getUsersCollection,
  getOtpCollection,
  normalizeEmail,
  toSafeUser,
} from "@/lib/models/user";
import { createSession } from "@/lib/session";
import { sendVerificationOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const OTP_EXPIRY_MS = 5 * 60 * 1000;

function hashOtp(otp: string): string {
  const secret = process.env.AUTH_SECRET || "district_portal_otp_salt_secret";
  return crypto.createHash("sha256").update(otp + secret).digest("hex");
}

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

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Compare password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Check email verification status
    if (!user.emailVerified) {
      // User entered correct password, but email is unverified.
      // Generate and send a fresh OTP so user can verify immediately.
      const rawOtp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashOtp(rawOtp);
      const now = new Date();
      const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

      const otpCol = await getOtpCollection();
      await otpCol.updateOne(
        { email: user.email },
        {
          $set: {
            otpHash,
            expiresAt: otpExpiresAt,
            attempts: 0,
            lastSentAt: now,
            createdAt: now,
          },
        },
        { upsert: true }
      );

      await sendVerificationOtpEmail(user.email, user.name, rawOtp);

      return NextResponse.json({
        requiresVerification: true,
        email: user.email,
        message: "Your email is not verified yet. We have sent a 6-digit verification code to your inbox.",
      });
    }

    // Create session and set HttpOnly cookie
    const safeUser = toSafeUser(user);
    await createSession(safeUser);

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
