import { ObjectId, Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

export interface UserDocument {
  _id?: ObjectId;
  firstName?: string;
  lastName?: string;
  username?: string | null;
  name: string;
  email: string;
  passwordHash?: string | null;
  emailVerified: boolean;
  image?: string | null;
  provider: "credentials" | "google";
  providerAccountId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpVerificationDocument {
  _id?: ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  createdAt: Date;
}

export interface PasswordResetDocument {
  _id?: ObjectId;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SafeUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  provider: "credentials" | "google";
  createdAt?: string;
}

export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id?.toString() || "",
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username || null,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image || null,
    provider: user.provider,
    createdAt: user.createdAt?.toISOString(),
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates username format:
 * - 3 to 30 characters
 * - Allowed characters: letters, numbers, underscore, dot
 * - No spaces
 */
export function validateUsername(username: string): {
  isValid: boolean;
  message?: string;
} {
  if (!username || typeof username !== "string") {
    return {
      isValid: false,
      message: "Username is required.",
    };
  }

  const clean = username.trim();
  if (clean.length < 3 || clean.length > 30) {
    return {
      isValid: false,
      message: "Username must be 3–30 characters and can contain letters, numbers, _ and .",
    };
  }

  const validRegex = /^[a-zA-Z0-9_.]{3,30}$/;
  if (!validRegex.test(clean)) {
    return {
      isValid: false,
      message: "Username must be 3–30 characters and can contain letters, numbers, _ and .",
    };
  }

  return { isValid: true };
}

/**
 * Validates password strength:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      isValid: false,
      message: "Password must include uppercase, lowercase letters, and at least one number.",
    };
  }

  if (!hasSpecial) {
    return {
      isValid: false,
      message: "Password must include at least one special character (!@#$%^&*...).",
    };
  }

  return { isValid: true };
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function getOtpCollection(): Promise<Collection<OtpVerificationDocument>> {
  const db = await getDb();
  return db.collection<OtpVerificationDocument>("otp_verifications");
}

export async function getPasswordResetCollection(): Promise<Collection<PasswordResetDocument>> {
  const db = await getDb();
  return db.collection<PasswordResetDocument>("password_resets");
}
