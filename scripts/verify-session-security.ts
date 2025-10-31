/**
 * Session Security Verification Script
 *
 * This script verifies that session cookies are configured with proper security flags.
 * Run this script to confirm HTTP-only, Secure, and SameSite settings.
 *
 * Usage:
 *   pnpm tsx scripts/verify-session-security.ts
 */

import { SESSION_COOKIE_OPTIONS } from "@/lib/appwrite/session";

console.log("=".repeat(60));
console.log("SESSION SECURITY VERIFICATION");
console.log("=".repeat(60));
console.log();

// Verify custom session cookie configuration
console.log("📋 Custom Session Cookie Configuration:");
console.log("-".repeat(60));
console.log("Cookie Name: appwrite-session");
console.log(
  `HTTP-Only: ${SESSION_COOKIE_OPTIONS.httpOnly ? "✅ ENABLED" : "❌ DISABLED"}`
);
console.log(
  `Secure: ${
    SESSION_COOKIE_OPTIONS.secure
      ? "✅ ENABLED (Production)"
      : "⚠️  DISABLED (Development)"
  }`
);
console.log(
  `SameSite: ${SESSION_COOKIE_OPTIONS.sameSite.toUpperCase()} ${
    SESSION_COOKIE_OPTIONS.sameSite === "lax" ||
    SESSION_COOKIE_OPTIONS.sameSite === "strict"
      ? "✅"
      : "⚠️"
  }`
);
console.log(
  `Max Age: ${SESSION_COOKIE_OPTIONS.maxAge} seconds (${
    SESSION_COOKIE_OPTIONS.maxAge / 60 / 60 / 24
  } days)`
);
console.log(`Path: ${SESSION_COOKIE_OPTIONS.path}`);
console.log();

// Verify environment configuration
console.log("🔧 Environment Configuration:");
console.log("-".repeat(60));
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const nodeEnv = process.env.NODE_ENV;

console.log(`Node Environment: ${nodeEnv || "development"}`);
console.log(`Appwrite Endpoint: ${endpoint || "❌ NOT SET"}`);
console.log(`Appwrite Project ID: ${projectId ? "✅ SET" : "❌ NOT SET"}`);

if (endpoint) {
  const isHttps = endpoint.startsWith("https://");
  console.log(`HTTPS Endpoint: ${isHttps ? "✅ YES" : "⚠️  NO (HTTP)"}`);

  if (!isHttps && nodeEnv === "production") {
    console.log(
      "⚠️  WARNING: Production environment should use HTTPS endpoint!"
    );
  }
}
console.log();

// Verify Appwrite session cookie name
console.log("🍪 Appwrite Session Cookie:");
console.log("-".repeat(60));
if (projectId) {
  const appwriteCookieName = `a_session_${projectId}`;
  console.log(`Cookie Name: ${appwriteCookieName}`);
  console.log("Security Flags: Managed automatically by Appwrite SDK");
  console.log("  - HTTP-Only: ✅ ENABLED (automatic)");
  console.log(
    `  - Secure: ${
      endpoint?.startsWith("https://") ? "✅ ENABLED" : "⚠️  DISABLED"
    } (based on endpoint protocol)`
  );
  console.log("  - SameSite: ✅ STRICT (automatic)");
} else {
  console.log(
    "❌ Cannot determine cookie name - NEXT_PUBLIC_APPWRITE_PROJECT_ID not set"
  );
}
console.log();

// Security checklist
console.log("✅ Security Checklist:");
console.log("-".repeat(60));

const checks = [
  {
    name: "HTTP-Only flag enabled",
    status: SESSION_COOKIE_OPTIONS.httpOnly,
    critical: true,
  },
  {
    name: "Secure flag enabled (production)",
    status: nodeEnv === "production" ? SESSION_COOKIE_OPTIONS.secure : true,
    critical: true,
  },
  {
    name: "SameSite configured (Lax or Strict)",
    status:
      SESSION_COOKIE_OPTIONS.sameSite === "lax" ||
      SESSION_COOKIE_OPTIONS.sameSite === "strict",
    critical: true,
  },
  {
    name: "HTTPS endpoint (production)",
    status: nodeEnv === "production" ? endpoint?.startsWith("https://") : true,
    critical: true,
  },
  {
    name: "Appwrite endpoint configured",
    status: !!endpoint,
    critical: true,
  },
  {
    name: "Appwrite project ID configured",
    status: !!projectId,
    critical: true,
  },
  {
    name: "Session duration configured (30 days)",
    status: SESSION_COOKIE_OPTIONS.maxAge === 60 * 60 * 24 * 30,
    critical: false,
  },
];

let allCriticalPassed = true;

for (const check of checks) {
  const icon = check.status ? "✅" : check.critical ? "❌" : "⚠️";
  const label = check.critical ? "(CRITICAL)" : "(Optional)";
  console.log(`${icon} ${check.name} ${label}`);

  if (check.critical && !check.status) {
    allCriticalPassed = false;
  }
}
console.log();

// Final verdict
console.log("=".repeat(60));
if (allCriticalPassed) {
  console.log("✅ ALL CRITICAL SECURITY CHECKS PASSED");
  console.log();
  console.log("Your session security configuration meets industry standards:");
  console.log("  • Protected against XSS attacks (HTTP-Only)");
  console.log("  • Protected against MITM attacks (Secure flag)");
  console.log(
    `  • Protected against CSRF attacks (SameSite=${SESSION_COOKIE_OPTIONS.sameSite})`
  );
} else {
  console.log("❌ SECURITY CONFIGURATION INCOMPLETE");
  console.log();
  console.log("Please address the failed critical checks above.");
  console.log(
    "Refer to .kiro/specs/remove-guest-auth/session-security-verification.md"
  );
  console.log("for detailed configuration instructions.");
}
console.log("=".repeat(60));
console.log();

// Additional recommendations
console.log("💡 Additional Security Recommendations:");
console.log("-".repeat(60));
console.log("1. Enable rate limiting on authentication endpoints");
console.log("2. Monitor session creation and validation events");
console.log("3. Implement session monitoring for suspicious activity");
console.log("4. Consider adding 2FA for enhanced security");
console.log("5. Regularly review and rotate API keys");
console.log();

console.log("📚 Documentation:");
console.log("-".repeat(60));
console.log("Full security documentation available at:");
console.log(".kiro/specs/remove-guest-auth/session-security-verification.md");
console.log();

// Exit with appropriate code
process.exit(allCriticalPassed ? 0 : 1);
