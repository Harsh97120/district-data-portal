import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  getUsersCollection,
  getOtpCollection,
  normalizeEmail,
} from "@/lib/models/user";
import { sendVerificationOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

function hashOtp(otp: string): string {
  const secret = process.env.AUTH_SECRET || "district_portal_otp_salt_secret";
  return crypto.createHash("sha256").update(otp + secret).digest("hex");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`resend:${ip}`, 5, 15 * 60 * 1000); // 5 resends per 15 min
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many code requests. Please wait ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalized = normalizeEmail(email);
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({ email: normalized });

    if (!user) {
      // Do not reveal whether user exists
      return NextResponse.json({
        success: true,
        message: "If your account is pending verification, a new code has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email address is already verified. Please sign in." },
        { status: 400 }
      );
    }

    const otpCol = await getOtpCollection();
    const existing = await otpCol.findOne({ email: normalized });
    const now = new Date();

    // Check resend cooldown
    if (existing && existing.lastSentAt) {
      const elapsed = now.getTime() - new Date(existing.lastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} second${waitSeconds > 1 ? "s" : ""} before requesting another code.` },
          { status: 429 }
        );
      }
    }

    // Invalidate previous OTP and generate new cryptographically secure random 6-digit code
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    await otpCol.updateOne(
      { email: normalized },
      {
        $set: {
          otpHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Send email
    await sendVerificationOtpEmail(normalized, user.name, rawOtp);

    return NextResponse.json({
      success: true,
      message: `A fresh verification code was sent to ${normalized}.`,
    });
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resend verification code. Please try again." },
      { status: 500 }
    );
  }
}
