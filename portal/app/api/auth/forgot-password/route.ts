import { NextResponse } from "next/server";
import crypto from "crypto";
import { getUsersCollection, getPasswordResetCollection, normalizeEmail } from "@/lib/models/user";
import { sendPasswordResetEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    // 5 requests per 15 minutes per IP
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many password reset attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);

    // Prevent enumeration: always return the same success message regardless of existence
    const genericSuccess = NextResponse.json({
      success: true,
      message: "If an account exists with this email address, a password reset link has been dispatched.",
    });

    const users = await getUsersCollection();
    const user = await users.findOne({ email: cleanEmail });

    if (!user) {
      return genericSuccess;
    }

    // Generate high-entropy 32-byte token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const resets = await getPasswordResetCollection();
    // Invalidate any older reset tokens for this user
    await resets.deleteMany({ email: cleanEmail });

    await resets.insertOne({
      email: cleanEmail,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });

    // Determine reset link URL
    const origin =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const resetUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

    await sendPasswordResetEmail(cleanEmail, user.name, resetUrl);

    return genericSuccess;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
