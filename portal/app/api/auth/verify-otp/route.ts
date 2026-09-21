import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  getUsersCollection,
  getOtpCollection,
  normalizeEmail,
} from "@/lib/models/user";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_VERIFY_ATTEMPTS = 5;

function hashOtp(otp: string): string {
  const secret = process.env.AUTH_SECRET || "district_portal_otp_salt_secret";
  return crypto.createHash("sha256").update(otp + secret).digest("hex");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`verify:${ip}`, 15, 10 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many verification attempts. Please wait ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return NextResponse.json(
        { error: "Please enter the complete 6-digit verification code." },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);
    const otpCol = await getOtpCollection();
    const record = await otpCol.findOne({ email: normalized });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Check expiration
    if (new Date(record.expiresAt) <= now) {
      await otpCol.deleteOne({ _id: record._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check attempt limits
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await otpCol.deleteOne({ _id: record._id });
      return NextResponse.json(
        { error: "Too many incorrect attempts. For security, this code was invalidated. Please request a new one." },
        { status: 429 }
      );
    }

    // Verify OTP using constant-time hash comparison
    const incomingHash = hashOtp(otp.trim());
    const incomingBuffer = Buffer.from(incomingHash, "hex");
    const storedBuffer = Buffer.from(record.otpHash, "hex");

    const isMatch =
      incomingBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(incomingBuffer, storedBuffer);

    if (!isMatch) {
      const remainingAttempts = MAX_VERIFY_ATTEMPTS - (record.attempts + 1);
      if (remainingAttempts <= 0) {
        await otpCol.deleteOne({ _id: record._id });
        return NextResponse.json(
          { error: "Too many incorrect attempts. This code was invalidated. Please request a new code." },
          { status: 400 }
        );
      } else {
        await otpCol.updateOne(
          { _id: record._id },
          { $inc: { attempts: 1 } }
        );
        return NextResponse.json(
          { error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts > 1 ? "s" : ""} remaining.` },
          { status: 400 }
        );
      }
    }

    // Single-use: delete OTP record upon success
    await otpCol.deleteOne({ _id: record._id });

    // Mark user email as verified
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOneAndUpdate(
      { email: normalized },
      {
        $set: {
          emailVerified: true,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User account not found. Please register again." },
        { status: 404 }
      );
    }

    // NOTE: DO NOT create a login session or issue session cookies here.
    // The account is verified, but user must explicitly sign in.
    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Please sign in to continue.",
    });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
