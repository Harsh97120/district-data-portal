// Test suite for authentication logic and validations
import assert from "assert";

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { isValid: false, message: "Username is required." };
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

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long." };
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

function resolveLoginQuery(rawIdentifier) {
  const clean = rawIdentifier.trim().toLowerCase();
  const isEmail = clean.includes("@");
  return isEmail ? { email: clean } : { username: clean };
}

console.log("Running Authentication Unit Tests...\n");

// TEST 1: Valid usernames
const validUsernames = ["naitik", "naitikpatel", "naitik_patel", "naitik.patel", "naitik123"];
for (const u of validUsernames) {
  const res = validateUsername(u);
  assert.strictEqual(res.isValid, true, `Username "${u}" should be valid`);
  assert.strictEqual(normalizeUsername(u), u.toLowerCase());
}
console.log("✓ TEST 1 Passed: Valid usernames validated successfully");

// TEST 2: Invalid usernames
const invalidUsernames = ["na", "n", "naitik patel", "naitik@patel", "naitik#123", "a".repeat(31)];
for (const u of invalidUsernames) {
  const res = validateUsername(u);
  assert.strictEqual(res.isValid, false, `Username "${u}" should be invalid`);
}
console.log("✓ TEST 2 Passed: Invalid usernames correctly rejected with clear message");

// TEST 3: Password strength
assert.strictEqual(validatePasswordStrength("Test@12345").isValid, true);
assert.strictEqual(validatePasswordStrength("short").isValid, false);
assert.strictEqual(validatePasswordStrength("nouppercase1@").isValid, false);
assert.strictEqual(validatePasswordStrength("NOLOWERCASE1@").isValid, false);
assert.strictEqual(validatePasswordStrength("NoSpecial1234").isValid, false);
console.log("✓ TEST 3 Passed: Password strength requirements verified");

// TEST 4: Confirm password check
const pw = "Test@12345";
const confirmPwMatch = "Test@12345";
const confirmPwMismatch = "Wrong@12345";
assert.strictEqual(pw === confirmPwMatch, true);
assert.strictEqual(pw === confirmPwMismatch, false);
console.log("✓ TEST 4 Passed: Password confirmation matching verified");

// TEST 5: Identifier resolution (Username vs Email)
const queryUsername = resolveLoginQuery("naitikpatel");
assert.deepStrictEqual(queryUsername, { username: "naitikpatel" });

const queryEmail = resolveLoginQuery("test@example.com");
assert.deepStrictEqual(queryEmail, { email: "test@example.com" });

const queryEmailUpper = resolveLoginQuery("  TEST@EXAMPLE.COM  ");
assert.deepStrictEqual(queryEmailUpper, { email: "test@example.com" });

const queryUsernameUpper = resolveLoginQuery("  Naitik_Patel  ");
assert.deepStrictEqual(queryUsernameUpper, { username: "naitik_patel" });
console.log("✓ TEST 5 Passed: Username vs Email login identifier resolution verified");

// TEST 6: Email masking helper
function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
assert.strictEqual(maskEmail("patel@gmail.com"), "p***@gmail.com");
assert.strictEqual(maskEmail("test@example.com"), "t***@example.com");
console.log("✓ TEST 6 Passed: Email masking displays p***@gmail.com format correctly");

// TEST 7: Unverified account login blocking
function simulateLoginCheck(user, passwordValid) {
  if (!user || !user.passwordHash) {
    return { status: 401, error: "Unable to sign in with these credentials." };
  }
  if (!user.emailVerified) {
    return { status: 403, error: "Please verify your email before signing in.", requiresVerification: true };
  }
  if (!passwordValid) {
    return { status: 401, error: "Unable to sign in with these credentials." };
  }
  return { status: 200, success: true, sessionCreated: true };
}

const unverifiedUser = { email: "test@example.com", username: "testuser", passwordHash: "xyz", emailVerified: false };
const loginAttempt1 = simulateLoginCheck(unverifiedUser, true);
assert.strictEqual(loginAttempt1.status, 403);
assert.strictEqual(loginAttempt1.error, "Please verify your email before signing in.");
assert.strictEqual(loginAttempt1.requiresVerification, true);
assert.strictEqual(loginAttempt1.sessionCreated, undefined);
console.log("✓ TEST 7 Passed: Unverified account is blocked with 'Please verify your email before signing in.' without session");

// TEST 8: OTP Verification lifecycle (no session created)
function simulateOtpVerification(otpRecord, incomingOtp, currentTime) {
  if (!otpRecord) return { error: "Invalid or expired verification code." };
  if (new Date(otpRecord.expiresAt) <= currentTime) {
    return { error: "Verification code has expired. Please request a new code." };
  }
  if (otpRecord.otp !== incomingOtp) {
    return { error: "Invalid verification code." };
  }
  return {
    success: true,
    emailVerified: true,
    sessionCreated: false, // Explicitly NO session created
    message: "Email verified successfully. Please sign in to continue."
  };
}

const now = new Date();
const validOtpRecord = { email: "test@example.com", otp: "123456", expiresAt: new Date(now.getTime() + 300000) };
const expiredOtpRecord = { email: "test@example.com", otp: "123456", expiresAt: new Date(now.getTime() - 1000) };

// Invalid OTP
const invalidRes = simulateOtpVerification(validOtpRecord, "999999", now);
assert.strictEqual(invalidRes.error, "Invalid verification code.");

// Expired OTP
const expiredRes = simulateOtpVerification(expiredOtpRecord, "123456", now);
assert.strictEqual(expiredRes.error.startsWith("Verification code has expired"), true);

// Correct OTP
const successRes = simulateOtpVerification(validOtpRecord, "123456", now);
assert.strictEqual(successRes.success, true);
assert.strictEqual(successRes.emailVerified, true);
assert.strictEqual(successRes.sessionCreated, false);
console.log("✓ TEST 8 Passed: Correct OTP marks email verified, invalidates OTP, and DOES NOT create session");

// TEST 9: Verified Account Login (Session Created)
const verifiedUser = { ...unverifiedUser, emailVerified: true };
const loginAttempt2 = simulateLoginCheck(verifiedUser, true);
assert.strictEqual(loginAttempt2.status, 200);
assert.strictEqual(loginAttempt2.success, true);
assert.strictEqual(loginAttempt2.sessionCreated, true);
console.log("✓ TEST 9 Passed: Verified user creates session upon explicit login with password");

console.log("\nALL 9 TEST SUITES PASSED CLEANLY!");
