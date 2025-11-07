# CHECK THIS FIRST - Email Verification Debug

## What to Do Right Now

### 1. Run the Test Script

This will test if Appwrite email verification works at all:

```bash
pnpm tsx scripts/test-email-verification.ts
```

**Expected output:**

```
✅ User created: <user-id>
✅ Session created: <session-id>
  Session secret length: 200+
  Session has secret: true
✅ Verification email sent successfully!
  Token ID: <token-id>
✅ Test user deleted
✅ Test completed successfully!
```

**If it fails, you'll see the exact error.**

### 2. Check Your Server Logs

When you register, look for these EXACT lines:

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[REGISTER] Session details: { hasSecret: true, secretLength: <number> }
[REGISTER] Session cookie set
[REGISTER] Attempting to send verification email...
[REGISTER] Session secret available: true
[REGISTER] Verification URL: http://localhost:3000/verify
```

**Then either:**

✅ **Success:**

```
[REGISTER] Verification email sent successfully!
[REGISTER] Verification token ID: <token-id>
```

❌ **Failure:**

```
[REGISTER] Failed to send verification email: <error>
[REGISTER] Error details: { message: "...", code: ..., type: "..." }
```

### 3. Check Browser Cookies

1. Open DevTools (F12)
2. Go to: **Application** → **Cookies** → **http://localhost:3000**
3. Look for: `a_session_<your-project-id>`

**Example:** If your project ID is `68faa1c7002b9382b526`, look for:

```
a_session_68faa1c7002b9382b526
```

**Take a screenshot and share it.**

### 4. Check Appwrite Console Logs

1. Go to: https://cloud.appwrite.io/console
2. Select your project
3. Go to: **Logs** (in the left sidebar)
4. Filter by: "Email" or "Verification"
5. Look for recent entries

**What to look for:**

- ✅ "Email sent successfully"
- ❌ "Failed to send email" (with error details)

## Most Likely Issues

### Issue 1: Session Secret Not Available

**Symptom:** Server logs show `hasSecret: false` or `secretLength: 0`

**Cause:** Appwrite is not returning the session secret

**Fix:** This is a bug in Appwrite or the SDK version. Update packages:

```bash
pnpm update appwrite node-appwrite
```

### Issue 2: Cookie Not Being Set

**Symptom:** Cookie `a_session_<project-id>` doesn't exist in browser

**Cause:** Cookie is being cleared or not saved

**Possible fixes:**

1. Check if `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is correct
2. Check if middleware is clearing cookies
3. Try in incognito mode

### Issue 3: Appwrite API Error

**Symptom:** Server logs show error with code/type

**Common errors:**

- `401 Unauthorized` - Session is invalid
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Appwrite issue

**Fix:** Check Appwrite Console → Logs for details

## Quick Fixes to Try

### Fix 1: Verify Environment Variables

Check `.env.local`:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-actual-project-id
APPWRITE_API_KEY=your-actual-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Restart dev server after changing:**

```bash
# Stop server (Ctrl+C)
pnpm dev
```

### Fix 2: Clear All Cookies

1. Open DevTools (F12)
2. Application → Cookies
3. Right-click → Clear all
4. Try registering again

### Fix 3: Check Appwrite Project Settings

In Appwrite Console:

1. **Auth → Settings**

   - ✅ Email/Password enabled
   - ✅ Email Verification enabled

2. **Settings → SMTP**

   - ✅ SMTP configured
   - ✅ Test email works

3. **Settings → Platforms**
   - ✅ Web platform added for `localhost`

## What to Share

If still not working, share:

1. **Test script output** (from step 1)
2. **Server logs** (from step 2) - Copy the entire `[REGISTER]` section
3. **Browser cookies screenshot** (from step 3)
4. **Appwrite Console logs** (from step 4)
5. **Environment variables** (hide sensitive values):
   ```
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://...
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=abc123...
   APPWRITE_API_KEY=<hidden>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Expected Flow

**Normal registration flow:**

1. User fills form → Submits
2. Server creates Appwrite account
3. Server creates session (gets session secret)
4. Server sets cookie with session secret
5. Server sends verification email using session secret
6. User receives email
7. User clicks link → Email verified

**Your current flow (broken):**

1. User fills form → Submits
2. Server creates Appwrite account ✅
3. Server creates session ✅
4. Server sets cookie ❓ (might not work)
5. Server sends verification email ❓ (might fail)
6. User doesn't receive email ❌
7. Resend button fails because no cookie ❌

## Next Steps

1. **Run the test script** - This will tell us if Appwrite works at all
2. **Share the output** - Copy everything from the terminal
3. **Check server logs** - Look for the exact error message
4. **Share browser cookies** - Screenshot of DevTools → Cookies

Once I see these, I can tell you exactly what's wrong!
