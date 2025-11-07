# Email Verification Fix - Complete Solution

## Problem Summary

The email verification system had **two critical issues**:

1. ❌ **No verification email sent during registration** - The `register` function never called `createVerification`
2. ❌ **Resend verification using wrong parameter** - Used session ID instead of session SECRET

## Root Cause Analysis

### Issue 1: Missing Verification Email on Registration

In `app/(auth)/actions.ts`, the `register` function:

- ✅ Creates Appwrite account
- ✅ Creates session (auto-login)
- ❌ **Never sends verification email**

### Issue 2: Wrong Session Parameter

The `createVerification` function requires the **session SECRET** (the actual authentication token), but the code was passing the **session ID** (just an identifier).

**Why this matters:**

- Session ID: Just an identifier (e.g., `"5f8a3b2c1d9e0f1a2b3c4d5e"`)
- Session SECRET: The actual authentication token (e.g., `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`)
- Appwrite needs the SECRET to authenticate the request

## Complete Fix Applied

### ✅ Fix 1: Added Verification Email to Registration

Updated `app/(auth)/actions.ts` to send verification email during registration:

```typescript
// Send verification email
try {
  const { createVerification } = await import("@/lib/appwrite/auth");
  const verificationUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/verify`;

  // CRITICAL: Use session.secret (the actual session token), not session.$id
  await createVerification(session.secret, verificationUrl);
  logger.log("[REGISTER] Verification email sent successfully");
} catch (verificationError) {
  // Log the error but don't fail registration
  logger.error(
    "[REGISTER] Failed to send verification email:",
    verificationError
  );
  // User can still resend verification email later
}
```

### ✅ Fix 2: Fixed Resend Verification to Use Session Secret

**The critical fix** - Get the session SECRET from the Appwrite cookie:

```typescript
export const resendVerification =
  async (): Promise<ResendVerificationActionState> => {
    try {
      logger.log("[RESEND_VERIFICATION] Starting resend verification process");

      // Get the Appwrite session secret from cookie
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

      if (!projectId) {
        logger.error("[RESEND_VERIFICATION] Missing project ID");
        return {
          status: "failed",
          error: "Configuration error. Please contact support.",
        };
      }

      // CRITICAL: Get the Appwrite session cookie (contains the SECRET)
      const appwriteSessionCookieName = `a_session_${projectId}`;
      const sessionSecret =
        cookieStore.get(appwriteSessionCookieName)?.value || null;

      if (!sessionSecret) {
        logger.error("[RESEND_VERIFICATION] No Appwrite session cookie found");
        return {
          status: "failed",
          error: "No active session. Please log in again.",
        };
      }

      logger.log(
        "[RESEND_VERIFICATION] Appwrite session cookie found, length:",
        sessionSecret.length
      );

      // Import the createVerification function
      const { createVerification } = await import("@/lib/appwrite/auth");

      // Create verification email
      const verificationUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/verify`;

      logger.log("[RESEND_VERIFICATION] Verification URL:", verificationUrl);

      // CRITICAL: Use sessionSecret (the actual token), not sessionId
      const token = await createVerification(sessionSecret, verificationUrl);

      logger.log(
        "[RESEND_VERIFICATION] Verification email sent successfully, token:",
        token.$id
      );

      return { status: "success" };
    } catch (error) {
      logger.error("[RESEND_VERIFICATION] Error:", error);

      const authError = error as AuthError;

      if (authError.code === AuthErrorCode.SESSION_EXPIRED) {
        return {
          status: "failed",
          error: "Your session has expired. Please log in again.",
        };
      }

      if (authError.code === AuthErrorCode.RATE_LIMITED) {
        return {
          status: "failed",
          error: "Too many requests. Please wait a few minutes and try again.",
        };
      }

      return {
        status: "failed",
        error:
          authError.message ||
          "Failed to send verification email. Please try again.",
      };
    }
  };
```

### ✅ Fix 3: Enhanced Logging for Debugging

Added comprehensive logging to track the verification flow:

**Registration:**

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[REGISTER] Verification email sent successfully
```

**Resend Verification:**

```
[RESEND_VERIFICATION] Starting resend verification process
[RESEND_VERIFICATION] Appwrite session cookie found, length: <length>
[RESEND_VERIFICATION] Verification URL: <url>
[RESEND_VERIFICATION] Verification email sent successfully, token: <token-id>
```

## Why the Original Code Failed

### Before (Broken):

```typescript
// ❌ WRONG: Using session ID
const sessionId = await getSessionCookie(); // Returns session ID
await createVerification(sessionId, verificationUrl); // Fails - needs SECRET
```

### After (Fixed):

```typescript
// ✅ CORRECT: Using session SECRET
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const appwriteSessionCookieName = `a_session_${projectId}`;
const sessionSecret = cookieStore.get(appwriteSessionCookieName)?.value; // Returns SECRET
await createVerification(sessionSecret, verificationUrl); // Works!
```

## Required Appwrite Configuration

For email verification to work, you still need to configure Appwrite:

### 1. Enable Email/Password Authentication

In Appwrite Console → Auth → Settings:

- ✅ Enable "Email/Password" authentication
- ✅ Enable "Email Verification"

### 2. Configure Email Service (SMTP)

In Appwrite Console → Settings → SMTP:

**Option A: Use Appwrite's Default Email Service (Testing)**

- No configuration needed
- Limited to development/testing
- May have rate limits

**Option B: Configure Custom SMTP (Production)**

- SMTP Host: Your email provider's SMTP server
- SMTP Port: Usually 587 (TLS) or 465 (SSL)
- SMTP Username: Your email address
- SMTP Password: Your email password or app-specific password
- Sender Email: The "from" email address
- Sender Name: "DeepCounsel"

### 3. Set Verification URL Template

In Appwrite Console → Auth → Settings → Email Templates:

- Find "Email Verification" template
- Ensure the URL includes: `{{url}}`

### 4. Environment Variables

Ensure these are set:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing the Complete Fix

### Test 1: New Registration

1. Register a new account
2. Check server logs for:
   ```
   [REGISTER] Verification email sent successfully
   ```
3. Check your email inbox
4. Click the verification link

**Expected Result:** ✅ Email received and verification works

### Test 2: Resend Verification

1. Go to `/verify-pending` page
2. Click "Resend Verification Email"
3. Check server logs for:
   ```
   [RESEND_VERIFICATION] Verification email sent successfully, token: <token-id>
   ```
4. Check your email inbox

**Expected Result:** ✅ Email received

### Test 3: Verify Email

1. Click the verification link in email
2. Should redirect to `/verify` page
3. Should show "Email Verified!" message
4. Should redirect to home page after 2 seconds

**Expected Result:** ✅ Email verified and logged in

## Common Issues & Solutions

### Issue: "No active session" Error

**Symptom:** Resend verification fails with "No active session"

**Cause:** Appwrite session cookie not set or expired

**Solution:**

1. Check browser DevTools → Application → Cookies
2. Look for cookie: `a_session_<project-id>`
3. If missing, log out and log back in
4. Verify `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is correct

### Issue: Email Not Received

**Symptom:** No verification email in inbox

**Possible Causes:**

1. SMTP not configured in Appwrite
2. Email in spam folder
3. Invalid email address
4. Appwrite rate limiting
5. Email service down

**Solution:**

1. Check Appwrite Console → Logs for email events
2. Test SMTP connection in Appwrite Console
3. Check spam/junk folder
4. Try with a different email address
5. Wait a few minutes and try again

### Issue: "Configuration error" Message

**Symptom:** Resend verification shows "Configuration error"

**Cause:** `NEXT_PUBLIC_APPWRITE_PROJECT_ID` environment variable not set

**Solution:**

1. Check `.env.local` file
2. Verify environment variable is set in Vercel
3. Restart development server

### Issue: Verification Link Invalid

**Symptom:** Clicking link shows "Invalid or expired verification link"

**Cause:**

- Link expired (default: 1 hour)
- Link already used
- Invalid parameters

**Solution:**

1. Request a new verification email
2. Use the link within 1 hour
3. Don't click the link multiple times

## Debugging Steps

### 1. Check Server Logs

Look for these log entries:

**Registration:**

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[REGISTER] Verification email sent successfully
```

**Resend:**

```
[RESEND_VERIFICATION] Starting resend verification process
[RESEND_VERIFICATION] Appwrite session cookie found, length: <length>
[RESEND_VERIFICATION] Verification email sent successfully, token: <token-id>
```

### 2. Check Appwrite Console Logs

1. Go to Appwrite Console → Logs
2. Filter by "Email" or "Verification"
3. Look for email sending events
4. Check for errors

### 3. Check Browser Cookies

1. Open DevTools (F12)
2. Go to Application → Cookies
3. Look for: `a_session_<project-id>`
4. Verify it has a value and valid expiry

### 4. Test SMTP Configuration

1. Go to Appwrite Console → Settings → SMTP
2. Click "Test" button
3. Enter test email address
4. Check if test email is received

## Summary

**What was fixed:**

1. ✅ Added verification email sending to registration
2. ✅ Fixed resend verification to use session SECRET instead of session ID
3. ✅ Added comprehensive logging for debugging

**What you need to do:**

1. Configure Appwrite SMTP (see checklist)
2. Verify environment variables are set
3. Test registration and resend verification
4. Monitor logs for any errors

**Files changed:**

- `app/(auth)/actions.ts` - Added verification email logic and fixed session handling

The fix is now complete and should work once Appwrite SMTP is configured!
