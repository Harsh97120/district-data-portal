import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  getUsersCollection,
  getOtpCollection,
  normalizeEmail,
  normalizeUsername,
  validateUsername,
  validatePasswordStrength,
} from "@/lib/models/user";
import { sendVerificationOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function hashOtp(otp: string): string {
  const secret = process.env.AUTH_SECRET || "district_portal_otp_salt_secret";
  return crypto.createHash("sha256").update(otp + secret).digest("hex");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000); // 10 attempts per 15 min
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, username, email, password, confirmPassword } = body;

    // 1. Validate fields
    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 1) {
      return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
    }

    if (!lastName || typeof lastName !== "string" || lastName.trim().length < 1) {
      return NextResponse.json({ error: "Please enter your last name." }, { status: 400 });
    }

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.isValid) {
      return NextResponse.json({ error: usernameCheck.message }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    // 2. Validate password strength
    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.isValid) {
      return NextResponse.json({ error: strengthCheck.message }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const usersCol = await getUsersCollection();

    // 3. Check whether username is already taken by another account
    const existingUserByUsername = await usersCol.findOne({ username: normalizedUsername });
    if (existingUserByUsername && existingUserByUsername.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 409 }
      );
    }

    // 4. Check whether email already exists and is verified
    const existingUserByEmail = await usersCol.findOne({ email: normalizedEmail });
    if (existingUserByEmail && existingUserByEmail.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 5. Hash password securely using bcrypt (12 rounds)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const now = new Date();

    // Create or update unverified user
    if (existingUserByEmail) {
      await usersCol.updateOne(
        { _id: existingUserByEmail._id },
        {
          $set: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: fullName,
            username: normalizedUsername,
            passwordHash,
            updatedAt: now,
          },
        }
      );
    } else {
      await usersCol.insertOne({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: fullName,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        emailVerified: false,
        provider: "credentials",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Generate cryptographically secure random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 6 & 7. NEVER store plaintext OTP; store only SHA-256 hash in MongoDB
    const otpHash = hashOtp(rawOtp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // 7. Store OTP in database
    const otpCol = await getOtpCollection();
    await otpCol.updateOne(
      { email: normalizedEmail },
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

    // 8. Send the OTP to user's email
    await sendVerificationOtpEmail(normalizedEmail, fullName, rawOtp);

    // Never return the OTP in the API response
    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: `A verification code has been sent to ${normalizedEmail}. Please check your inbox.`,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process registration. Please try again later." },
      { status: 500 }
    );
  }
}
