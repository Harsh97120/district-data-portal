import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SafeUser } from "@/lib/models/user";

const AUTH_COOKIE_NAME = "auth_session";
const SESSION_EXPIRY = "7d"; // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "district_portal_default_development_secret_32_characters_minimum";
  return new TextEncoder().encode(secret);
}

/**
 * Encrypt a user session into a signed JWT string.
 */
export async function signSessionToken(payload: SafeUser): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(key);
}

/**
 * Verify a JWT string and extract the user payload.
 */
export async function verifySessionToken(token: string): Promise<SafeUser | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key);
    return {
      id: (payload.id as string) || (payload.sub as string) || "",
      firstName: (payload.firstName as string) || undefined,
      lastName: (payload.lastName as string) || undefined,
      username: (payload.username as string) || null,
      name: (payload.name as string) || "",
      email: (payload.email as string) || "",
      emailVerified: Boolean(payload.emailVerified),
      image: (payload.image as string) || null,
      provider: (payload.provider as "credentials" | "google") || "credentials",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Create a session and set the HttpOnly cookie.
 */
export async function createSession(user: SafeUser): Promise<string> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return token;
}

/**
 * Retrieve the current active session user from cookies, if valid.
 */
export async function getSession(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Destroy the current session cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
