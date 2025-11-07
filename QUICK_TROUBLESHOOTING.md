# Quick Troubleshooting: Email Verification Not Working

## What to Check Right Now

### 1. Check Your Server Logs

After registering, look for these logs:

**✅ Good (Email sent):**

```
[REGISTER] Starting registration process
[REGISTER] Appwrite account created: <user-id>
[REGISTER] Session created: <session-id>
[REGISTER] Session details: { hasSecret: true, secretLength: 200+ }
[REGISTER] Session cookie set
[REGISTER] Attempting to send verification email...
[REGISTER] Session secret available: true
[REGISTER] Verification URL: http://localhost:3000/verify
[REGISTER] Verification email sent successfully!
[REGISTER] Verification token ID: <token-id>
```

**❌ Bad (Email failed):**

```
[REGISTER] Failed to send verification email: <error>
[REGISTER] Error details: { message: "...", code: ..., type: "..." }
```

### 2. Check Browser Cookies

1. Open DevTools (F12)
2. Go to: Application → Cookies → http://localhost:3000
3. Look for: `a_session_<your-project-id>`

**If cookie exists:**

- ✅ Session is set correctly
- Problem is likely Appwrite SMTP configuration

**If cookie is missing:**

- ❌ Session not being set
- Check server logs for session creation errors

### 3. Most Likely Issue: Appwrite SMTP Not Configured

**Quick Fix:**

1. Go to: https://cloud.appwrite.io/console
2. Select your project
3. Go to: **Settings → SMTP**
4. Select: **"Use Appwrite's email service"** (easiest for testing)
5. Click **Save**
6. Try registering again

**For Production (Custom SMTP):**

Use Gmail as an example:

- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587`
- SMTP Username: `your-email@gmail.com`
- SMTP Password: [Create App Password](https://support.google.com/accounts/answer/185833)
- Sender Email: `your-email@gmail.com`
- Sender Name: `DeepCounsel`

Click **Test** to verify it works.

## Common Error Messages

### "No active session. Please log in again."

**Cause:** Session cookie not found

**Fix:**

1. Check if `a_session_<project-id>` cookie exists in browser
2. If missing, check server logs for session creation errors
3. Verify `NEXT_PUBLIC_APPWRITE_PROJECT_ID` is set correctly

### "Failed to send verification email"

**Cause:** Appwrite SMTP not configured or API error

**Fix:**

1. Configure SMTP in Appwrite Console (see above)
2. Check Appwrite Console → Logs for email errors
3. Verify API key has `users.write` permission

### Email sent but not received

**Cause:** Email in spam or SMTP configuration issue

**Fix:**

1. Check spam/junk folder
2. Test SMTP in Appwrite Console
3. Try a different email address
4. Check Appwrite Console → Logs for delivery status

## Environment Variables Checklist

Ensure these are set in `.env.local`:

```bash
# Required
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your-api-key-here

# Required for verification links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**How to verify:**

```bash
# In your terminal
echo $NEXT_PUBLIC_APPWRITE_PROJECT_ID
echo $NEXT_PUBLIC_APP_URL
```

If empty, add them to `.env.local` and restart your dev server.

## Quick Test: Manual Verification

If you need to test the app without email verification:

### Option 1: Manually Verify in Appwrite Console

1. Go to Appwrite Console → Auth → Users
2. Find your user
3. Click on the user
4. Toggle "Email Verification" to ON
5. Try logging in again

### Option 2: Check Appwrite Logs

1. Go to Appwrite Console → Logs
2. Filter by "Email" or "Verification"
3. Look for:
   - ✅ "Email sent successfully"
   - ❌ "Failed to send email" (with error details)

## What the Code Does

1. **Registration:**

   - Creates Appwrite account
   - Creates session (auto-login)
   - Sets session cookie
   - Sends verification email using session secret

2. **Resend Verification:**
   - Gets session secret from cookie
   - Calls Appwrite to send verification email
   - Returns success/error

## If Still Not Working

Provide these details:

1. **Server logs** from registration (copy the entire log output)
2. **Browser cookies** (screenshot of Application → Cookies)
3. **Appwrite SMTP config** (screenshot, hide sensitive data)
4. **Error message** from Appwrite Console → Logs

## Expected Timeline

After configuring SMTP:

- Registration: Instant
- Email delivery: 1-2 minutes
- Verification: Instant after clicking link

If email doesn't arrive within 5 minutes:

- Check spam folder
- Check Appwrite Console → Logs
- Verify SMTP test works in Appwrite Console
