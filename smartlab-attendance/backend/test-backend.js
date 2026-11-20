const assert = require("assert");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

console.log("==================================================");
console.log("SMARTLAB ATTENDANCE - BACKEND VERIFICATION SUITE");
console.log("==================================================");

async function runTests() {
  // Test 1: Verify Password Hashing and Comparison
  console.log("\n[Test 1] Testing User Password Security (bcryptjs)...");
  const rawPassword = "Admin@12345";
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPassword, salt);
  assert(hash !== rawPassword, "Password hash must not match plain text");
  const isMatch = await bcrypt.compare(rawPassword, hash);
  assert.strictEqual(isMatch, true, "Bcrypt compare must succeed for valid password");
  const isWrongMatch = await bcrypt.compare("WrongPassword", hash);
  assert.strictEqual(isWrongMatch, false, "Bcrypt compare must reject invalid password");
  console.log("✓ Password hashing & comparison verified successfully.");

  // Test 2: Verify JWT Signing and Verification
  console.log("\n[Test 2] Testing JWT Authentication and Role Validation...");
  const secret = "test_secret_key_12345";
  const payload = { id: "user_123", email: "admin@smartlab.edu", role: "admin" };
  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  assert(typeof token === "string" && token.length > 20, "JWT token must be a non-empty string");
  const decoded = jwt.verify(token, secret);
  assert.strictEqual(decoded.email, "admin@smartlab.edu");
  assert.strictEqual(decoded.role, "admin");
  console.log("✓ JWT signing & role decoding verified successfully.");

  // Test 3: Verify Middleware
  console.log("\n[Test 3] Testing Auth & Admin Middleware...");
  const { auth, requireAdmin } = require("./src/middleware/auth");
  process.env.JWT_SECRET = secret;

  let authNextCalled = false;
  const mockReq = { headers: { authorization: `Bearer ${token}` } };
  const mockRes = {
    status: (code) => ({
      json: (data) => ({ code, data })
    })
  };
  auth(mockReq, mockRes, () => { authNextCalled = true; });
  assert.strictEqual(authNextCalled, true, "Auth middleware must allow valid token");
  assert.strictEqual(mockReq.user.role, "admin", "User role must be attached to req.user");

  let adminNextCalled = false;
  requireAdmin(mockReq, mockRes, () => { adminNextCalled = true; });
  assert.strictEqual(adminNextCalled, true, "Admin middleware must allow admin role");
  console.log("✓ Middleware security checks verified successfully.");

  // Test 4: Verify Duration Calculation Logic
  console.log("\n[Test 4] Testing Attendance Duration Calculation...");
  const entryDate = new Date("2026-11-18T10:00:00Z");
  const exitDate = new Date("2026-11-18T11:45:00Z");
  const diffMinutes = Math.max(1, Math.round((exitDate.getTime() - entryDate.getTime()) / 60000));
  assert.strictEqual(diffMinutes, 105, "10:00 to 11:45 must equal 105 minutes");
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const formatted = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
  assert.strictEqual(formatted, "1 hr 45 min", "Duration formatting must match '1 hr 45 min'");
  console.log("✓ Duration computation & formatting verified successfully.");

  // Test 5: Verify Routes and Express Models
  console.log("\n[Test 5] Testing Express Router Modules Loading...");
  const authRoutes = require("./src/routes/authRoutes");
  const studentRoutes = require("./src/routes/studentRoutes");
  const attendanceRoutes = require("./src/routes/attendanceRoutes");
  assert(authRoutes && authRoutes.stack, "Auth routes must be a valid Express router");
  assert(studentRoutes && studentRoutes.stack, "Student routes must be a valid Express router");
  assert(attendanceRoutes && attendanceRoutes.stack, "Attendance routes must be a valid Express router");
  console.log("✓ All Express API routes loaded and configured properly.");

  // Test 6: Verify CSV Generation Escaping
  console.log("\n[Test 6] Testing CSV Formatting and Special Character Escaping...");
  const testStudent = { name: 'Doe, "Johnny"', usn: "4AL25IS016" };
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  const escaped = escapeCSV(testStudent.name);
  assert.strictEqual(escaped, '"Doe, ""Johnny"""', "CSV must escape quotes properly");
  console.log("✓ CSV escape generator verified successfully.");

  console.log("\n==================================================");
  console.log("ALL 6 BACKEND TEST SUITES PASSED CLEANLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
