# Email Verification Troubleshooting Guide

## Current Status

- ✅ Registration: Working (account created)
- ✅ Session: Working (user authenticated)
- ✅ Redirect: Working (shows verify-pending page)
- ❌ Verification Email: **NOT ARRIVING**

## Root Cause Analysis

Based on your logs:

```
POST http://localhost:3000/verify-pending [HTTP/1.1 200 OK]
[providers/auth-provider] [Auth] User authenticated: groqtemporary@gmail.com
```

The session is working perfectly. The issue is **Appwrite cannot send emails** because SMTP is not configured.

## Solution: Configure Appwrite SMTP

### Step 1: Access Appwrite Console

1. Go to: https://cloud.appwrite.io/
2. Select your project: **Jacana** (ID: `68faa1c7002b9382b526`)
3. Click on **Settings** in left sidebar
4. Click on **SMTP** tab

### Step 2: Configure SMTP Settings

You have 3 options:

#### Option A: Use Gmail (Easiest for Testing)

1. **SMTP Host**: `smtp.gmail.com`
2. **SMTP Port**: `587` (or `465` for SSL)
3. **SMTP Username**: Your Gmail address (e.g., `groqtemporary@gmail.com`)
4. **SMTP Password**: **App Password** (NOT your Gmail password)
   - Go to: https://myaccount.google.com/apppasswords
   - Create an app password named "Appwrite"
   - Use that 16-character password
5. **SMTP Secure**: Enable TLS
6. **Sender Name**: `Jacana`
7. **Sender Email**: Your Gmail address

#### Option B: Use Resend (Production-Ready)

1. Sign up at: https://resend.com/ (Free: 3,000 emails/month)
2. Get your API key
3. Configure SMTP:
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `587`
   - **SMTP Username**: `resend`
   - **SMTP Password**: Your Resend API key
   - **SMTP Secure**: Enable TLS
   - **Sender Name**: `Jacana`
   - **Sender Email**: Must be verified domain or `onboarding@resend.dev`

#### Option C: Use SendGrid

1. Sign up at: https://sendgrid.com/ (Free: 100 emails/day)
2. Create API key with "Mail Send" permission
3. Configure SMTP:
   - **SMTP Host**: `smtp.sendgrid.net`
   - **SMTP Port**: `587`
   - **SMTP Username**: `apikey`
   - **SMTP Password**: Your SendGrid API key
   - **SMTP Secure**: Enable TLS
   - **Sender Name**: `Jacana`
   - **Sender Email**: Must be verified in SendGrid

### Step 3: Test Email Sending

After configuring SMTP:

1. **Send Test Email** from Appwrite Console:

   - In SMTP settings, click "Send Test Email"
   - Enter your email address
   - Check if it arrives

2. **Try Registration Again**:
   - Clear browser cookies
   - Register with a **new email** (Appwrite won't resend to already verified users)
   - Check your inbox (and spam folder!)

### Step 4: Verify in Server Logs

When you register, check your terminal for these logs:

```
[REGISTER] Attempting to send verification email...
[REGISTER] Session secret available: true
[REGISTER] Verification URL: http://localhost:3000/verify
[REGISTER] Verification email sent successfully!
[REGISTER] Verification token ID: <token-id>
```

If you see an error instead:

```
[REGISTER] Failed to send verification email: <error details>
```

This confirms SMTP is not configured.

## Alternative: Skip Email Verification (Development Only)

If you want to test without email verification:

1. Go to Appwrite Console → Auth → Settings
2. Scroll to **Email Verification**
3. Toggle OFF "Email Verification Required"
4. Users can now use the app without verifying

**⚠️ WARNING**: Only do this for development. Always require verification in production!

## Debugging Checklist

- [ ] SMTP configured in Appwrite Console
- [ ] Test email sent successfully from Appwrite
- [ ] Browser cookies enabled
- [ ] Using a **new email** (not previously registered)
- [ ] Checked spam/junk folder
- [ ] Server logs show "Verification email sent successfully"
- [ ] `NEXT_PUBLIC_APPWRITE_PROJECT_ID` matches your project
- [ ] `NEXT_PUBLIC_APP_URL` is correct for your environment

## Common Issues

### 1. "No active session" on Resend

**Cause**: Session cookie not found (but we confirmed this works now!)

**Fix**: Already working - session is valid ✅

### 2. Email Goes to Spam

**Solution**:

- Check spam folder
- Add sender to contacts
- Use a verified domain with Resend/SendGrid

### 3. Gmail Blocks Sign-In

**Solution**:

- Enable 2FA on Gmail
- Use App Password (not regular password)
- Allow less secure apps if needed

### 4. Rate Limited

If you tried multiple times:

- Wait 5-10 minutes
- Or configure a higher rate limit in Appwrite Console → Settings → Security

## Next Steps

1. **Configure SMTP** (choose Option A, B, or C above)
2. **Test** with Appwrite's built-in test email feature
3. **Register** with a new email address
4. **Check logs** in your terminal
5. **Verify** the email arrives

## Need Help?

If emails still don't arrive after configuring SMTP:

1. Share the server logs from registration
2. Check Appwrite Console → Logs for email delivery status
3. Verify SMTP credentials are correct
4. Try sending a test email from Appwrite Console

---

**Status**: Awaiting SMTP configuration ⏳
