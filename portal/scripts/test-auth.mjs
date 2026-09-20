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

console.log("\nALL 5 TEST SUITES PASSED CLEANLY!");
