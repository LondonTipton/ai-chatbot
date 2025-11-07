# Email Verification Issue - Diagnosis & Fix

## Problem Summary

The email verification system was not working because:

1. **No verification email sent during registration** - The `register` function never called `createVerification`
2. **Resend verification might fail** - The function exists but may have issues with session handling

## Root Causes

### 1. Missing Verification Email on Registration

In `app/(auth)/actions.ts`, the `register` function:

- ✅ Creates Appwrite account
- ✅ Creates session (auto-login)
- ❌ **Never sends verification email**

### 2. Potential Session Issues

The `resendVerification` function:

- Gets session from cookie
- Dynamically imports `createVerification`
- May fail if session is not properly set

## Fixes Applied

### ✅ Fix 1: Added Verification Email to Registration

Updated `app/(auth)/actions.ts` to send verification email during registration:

```typescript
// Send verification email
try {
  const { createVerification } = await import("@/lib/appwrite/auth");
  const verificationUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/verify`;

  await createVerification(session.$id, verificationUrl);
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

### ✅ Fix 2: Enhanced Logging for Resend Verification

Added detailed logging to help diagnose issues:

```typescript
logger.log("[RESEND_VERIFICATION] Session ID found:", sessionId);
logger.log("[RESEND_VERIFICATION] Verification URL:", verificationUrl);
logger.log(
  "[RESEND_VERIFICATION] Verification email sent successfully, token:",
  token.$id
);
```

## Required Appwrite Configuration

For email verification to work, you need to configure Appwrite properly:

### 1. Enable Email/Password Authentication

In Appwrite Console → Auth → Settings:

- ✅ Enable "Email/Password" authentication
- ✅ Enable "Email Verification"

### 2. Configure Email Service (SMTP)

In Appwrite Console → Settings → SMTP:

**Option A: Use Appwrite's Default Email Service (Recommended for Testing)**

- Appwrite Cloud provides a default email service
- No configuration needed
- Limited to development/testing

**Option B: Configure Custom SMTP (Recommended for Production)**

- SMTP Host: Your email provider's SMTP server
- SMTP Port: Usually 587 (TLS) or 465 (SSL)
- SMTP Username: Your email address
- SMTP Password: Your email password or app-specific password
- Sender Email: The "from" email address
- Sender Name: The "from" name (e.g., "DeepCounsel")

### 3. Set Verification URL Template

In Appwrite Console → Auth → Settings → Email Templates:

- Find "Email Verification" template
- Ensure the URL includes: `{{url}}`
- Example: `Click here to verify: {{url}}`

### 4. Add Your Domain to Platforms

In Appwrite Console → Settings → Platforms:

- Add your production domain (e.g., `jacana.deep-counsel.org`)
- Add localhost for development (`localhost`)
- See `APPWRITE_PLATFORM_SETUP.md` for detailed instructions

## Environment Variables Required

Ensure these are set in your `.env.local` or Vercel:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Application URL (for verification links)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing the Fix

### Test 1: New Registration

1. Register a new account
2. Check server logs for:
   ```
   [REGISTER] Appwrite account created: <user-id>
   [REGISTER] Session created: <session-id>
   [REGISTER] Verification email sent successfully
   ```
3. Check your email inbox for verification email
4. Click the verification link

### Test 2: Resend Verification

1. Go to `/verify-pending` page
2. Click "Resend Verification Email"
3. Check server logs for:
   ```
   [RESEND_VERIFICATION] Session ID found: <session-id>
   [RESEND_VERIFICATION] Verification URL: <url>
   [RESEND_VERIFICATION] Verification email sent successfully, token: <token-id>
   ```
4. Check your email inbox for verification email

## Common Issues & Solutions

### Issue 1: "No active session" Error

**Symptom**: Resend verification fails with "No active session"

**Cause**: Session cookie not set or expired

**Solution**:

1. Check if session cookie exists in browser DevTools
2. Try logging out and logging back in
3. Check middleware is not clearing the session

### Issue 2: Email Not Received

**Symptom**: No verification email in inbox

**Possible Causes**:

1. **SMTP not configured** - Check Appwrite Console → Settings → SMTP
2. **Email in spam folder** - Check spam/junk folder
3. **Invalid email address** - Verify email is correct
4. **Appwrite rate limiting** - Wait a few minutes and try again
5. **Email service down** - Check Appwrite status page

**Solution**:

1. Check Appwrite logs in Console → Logs
2. Verify SMTP configuration
3. Test with a different email address
4. Check Appwrite email quota (if using default service)

### Issue 3: "Invalid or expired verification link"

**Symptom**: Clicking verification link shows error

**Cause**:

- Link expired (default: 1 hour)
- Link already used
- Invalid userId or secret parameters

**Solution**:

1. Request a new verification email
2. Check URL parameters are present: `?userId=...&secret=...`
3. Ensure link hasn't been modified

### Issue 4: Verification Email Sent But Function Throws Error

**Symptom**: Email is sent but resend button shows error

**Cause**: Function returns success but UI shows error due to state management

**Solution**:

1. Check browser console for errors
2. Verify toast notification is working
3. Check if email was actually sent (check inbox)

## Debugging Steps

### 1. Check Server Logs

Look for these log entries:

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[REGISTER] Verification email sent successfully
```

Or for errors:

```
[REGISTER] Failed to send verification email: <error>
```

### 2. Check Appwrite Console Logs

1. Go to Appwrite Console → Logs
2. Filter by "Email" or "Verification"
3. Look for email sending events
4. Check for errors or failures

### 3. Check Browser DevTools

1. Open DevTools (F12)
2. Go to Application → Cookies
3. Look for session cookie: `a_session_<project-id>`
4. Verify it has a valid expiry date

### 4. Test SMTP Configuration

In Appwrite Console:

1. Go to Settings → SMTP
2. Click "Test" button
3. Enter a test email address
4. Check if test email is received

## Next Steps

1. **Deploy the fix** - The code changes are now in place
2. **Configure Appwrite SMTP** - Set up email service in Appwrite Console
3. **Test registration** - Create a new account and verify email is sent
4. **Test resend** - Try the resend verification button
5. **Monitor logs** - Watch for any errors in server logs

## Additional Resources

- [Appwrite Email Verification Docs](https://appwrite.io/docs/products/auth/email-password#email-verification)
- [Appwrite SMTP Configuration](https://appwrite.io/docs/advanced/platform/smtp)
- [Appwrite Email Templates](https://appwrite.io/docs/products/auth/email-templates)
- `APPWRITE_PLATFORM_SETUP.md` - Domain configuration guide
- `EMAIL_VERIFICATION_GUIDE.md` - User-facing verification guide (if exists)
