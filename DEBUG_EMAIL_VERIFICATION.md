# Debug: Email Verification Not Working

## Current Issues

1. ✅ Registration succeeds and shows success toast
2. ❌ No verification email received
3. ❌ Resend verification shows "No active session" error

## Root Cause Analysis

### Issue 1: Session Cookie Not Being Set Properly

The problem is that the Appwrite session cookie (`a_session_<project-id>`) is not being set or is being cleared immediately.

**Possible causes:**

1. Cookie is set but middleware clears it
2. Cookie is set but browser doesn't accept it
3. Cookie is set but redirect happens before it's saved
4. Appwrite is not returning a valid session secret

### Issue 2: Verification Email Requires Session

The `createVerification` function requires an authenticated session to send the email. If the session cookie isn't set, the resend function can't find it.

## Debugging Steps

### Step 1: Check Server Logs

Look for these log entries after registration:

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[session] Setting Appwrite session cookie: a_session_<project-id>
[session] Session secret length: <length>
[REGISTER] Verification email sent successfully
```

**OR** look for errors:

```
[REGISTER] Failed to send verification email: <error>
[session] No session secret provided, Appwrite cookie not set
```

### Step 2: Check Browser Cookies

1. Open DevTools (F12)
2. Go to Application → Cookies
3. Look for these cookies:
   - `a_session_<project-id>` - Appwrite session (MOST IMPORTANT)
   - `appwrite-session` - Our custom session ID
   - `appwrite_user_id` - User ID

**If `a_session_<project-id>` is missing:**

- The session secret wasn't provided
- The cookie was cleared by middleware
- The browser rejected the cookie

### Step 3: Check Appwrite Configuration

Go to Appwrite Console and verify:

1. **Email Service Configured**

   - Settings → SMTP
   - Either use Appwrite's default or configure custom SMTP
   - Test the SMTP connection

2. **Email Verification Enabled**

   - Auth → Settings
   - "Email Verification" should be enabled

3. **Email Template Configured**
   - Auth → Settings → Email Templates
   - "Email Verification" template should be enabled
   - Template should contain `{{url}}` placeholder

## Quick Fixes to Try

### Fix 1: Check if Session Secret is Being Passed

Add this logging to `app/(auth)/actions.ts` in the register function:

```typescript
logger.log("[REGISTER] Session object:", {
  id: session.$id,
  hasSecret: !!session.secret,
  secretLength: session.secret?.length || 0,
  userId: session.userId,
});
```

### Fix 2: Check Environment Variables

Ensure these are set:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-api-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### Fix 3: Test Appwrite Connection Directly

Create a test script to verify Appwrite is working:

```typescript
// test-appwrite-email.ts
import { Account, Client } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Test with a session token
const sessionToken = "paste-your-session-token-here";
client.setSession(sessionToken);

const account = new Account(client);

async function testVerification() {
  try {
    const token = await account.createVerification(
      "http://localhost:3000/verify"
    );
    console.log("✅ Verification email sent successfully!");
    console.log("Token ID:", token.$id);
  } catch (error) {
    console.error("❌ Failed to send verification email:", error);
  }
}

testVerification();
```

## Likely Root Cause

Based on the symptoms, the most likely issue is:

**Appwrite SMTP is not configured**

Even if the code is correct and the session is valid, Appwrite won't send emails if SMTP isn't configured.

### How to Fix:

1. Go to Appwrite Console: https://cloud.appwrite.io/
2. Select your project
3. Go to Settings → SMTP
4. Choose one of:

   - **Use Appwrite's email service** (easiest for testing)
   - **Configure custom SMTP** (recommended for production)

5. If using custom SMTP, configure:

   - SMTP Host (e.g., `smtp.gmail.com`)
   - SMTP Port (e.g., `587`)
   - SMTP Username (your email)
   - SMTP Password (app-specific password)
   - Sender Email (e.g., `noreply@deep-counsel.org`)
   - Sender Name (e.g., `DeepCounsel`)

6. Click "Test" to verify SMTP works

7. Try registering again

## Alternative Approach: Manual Email Verification

If SMTP configuration is complex, you can temporarily disable email verification:

### Option 1: Auto-Verify Users (Development Only)

Add this to the register function after creating the account:

```typescript
// DEVELOPMENT ONLY: Auto-verify email
if (process.env.NODE_ENV === "development") {
  try {
    const { users } = createAdminClient();
    await users.updateEmailVerification(appwriteUser.$id, true);
    logger.log("[REGISTER] Email auto-verified (development mode)");
  } catch (error) {
    logger.error("[REGISTER] Failed to auto-verify email:", error);
  }
}
```

### Option 2: Disable Email Verification Requirement

Modify middleware to allow unverified users:

```typescript
// In middleware.ts, comment out this check:
// if (!user.emailVerification && !isPublicRoute && !isWellKnown) {
//   return NextResponse.redirect(new URL("/verify-pending", request.url));
// }
```

**⚠️ WARNING:** These are temporary solutions for development only!

## Next Steps

1. **Check server logs** - Look for the log entries mentioned above
2. **Check browser cookies** - Verify `a_session_<project-id>` exists
3. **Configure Appwrite SMTP** - This is likely the main issue
4. **Test SMTP connection** - Use Appwrite Console's test button
5. **Try registering again** - After SMTP is configured

## Expected Behavior After Fix

1. User registers
2. Server logs show:
   ```
   [REGISTER] Verification email sent successfully
   ```
3. User receives email within 1-2 minutes
4. User clicks verification link
5. Email is verified
6. User is redirected to home page

## If Still Not Working

If you've configured SMTP and it's still not working:

1. **Check Appwrite Logs**

   - Go to Appwrite Console → Logs
   - Filter by "Email"
   - Look for errors

2. **Check Spam Folder**

   - Verification emails might be marked as spam

3. **Try Different Email**

   - Some email providers block automated emails

4. **Check Rate Limits**

   - Appwrite has rate limits on email sending
   - Wait a few minutes and try again

5. **Verify API Key Permissions**
   - Go to Appwrite Console → Settings → API Keys
   - Ensure your API key has `users.write` permission

## Contact Points

If you need more help, provide:

1. Server logs from registration attempt
2. Browser cookies screenshot
3. Appwrite Console SMTP configuration screenshot
4. Any error messages from Appwrite Console logs
