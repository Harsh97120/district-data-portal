import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  getUsersCollection,
  getPasswordResetCollection,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/models/user";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`reset-pw:${ip}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return NextResponse.json(
        { success: false, error: strength.message },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resets = await getPasswordResetCollection();
    const resetRecord = await resets.findOne({
      email: cleanEmail,
      tokenHash,
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired password reset link. Please request a new one." },
        { status: 400 }
      );
    }

    if (resetRecord.expiresAt < new Date()) {
      await resets.deleteOne({ _id: resetRecord._id });
      return NextResponse.json(
        { success: false, error: "The password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    const users = await getUsersCollection();
    await users.updateOne(
      { email: cleanEmail },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      }
    );

    // Consume the token
    await resets.deleteMany({ email: cleanEmail });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now sign in with your new credentials.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
