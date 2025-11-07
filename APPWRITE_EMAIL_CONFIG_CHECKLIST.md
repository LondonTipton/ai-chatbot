# Appwrite Email Configuration Checklist

## Quick Checklist

Use this to verify your Appwrite email configuration is correct.

### ✅ 1. Authentication Settings

Go to: **Appwrite Console → Auth → Settings**

- [ ] Email/Password authentication is **enabled**
- [ ] Email verification is **enabled**
- [ ] Session length is appropriate (default: 365 days)

### ✅ 2. SMTP Configuration

Go to: **Appwrite Console → Settings → SMTP**

**If using Appwrite's default email service:**

- [ ] "Use Appwrite's email service" is selected
- [ ] Note: Limited to development/testing, may have rate limits

**If using custom SMTP:**

- [ ] SMTP Host is configured (e.g., `smtp.gmail.com`)
- [ ] SMTP Port is set (587 for TLS, 465 for SSL)
- [ ] SMTP Username is set
- [ ] SMTP Password is set
- [ ] Sender Email is set (e.g., `noreply@deep-counsel.org`)
- [ ] Sender Name is set (e.g., `DeepCounsel`)
- [ ] Test email button works

### ✅ 3. Email Templates

Go to: **Appwrite Console → Auth → Settings → Email Templates**

Find "Email Verification" template and verify:

- [ ] Template is enabled
- [ ] Subject line is set
- [ ] Body contains `{{url}}` placeholder
- [ ] Body contains `{{user}}` or `{{email}}` if needed

Example template:

```
Subject: Verify your DeepCounsel account

Hi {{user}},

Welcome to DeepCounsel! Please verify your email address by clicking the link below:

{{url}}

This link will expire in 1 hour.

If you didn't create this account, you can safely ignore this email.

Best regards,
The DeepCounsel Team
```

### ✅ 4. Platform Configuration

Go to: **Appwrite Console → Settings → Platforms**

- [ ] Web platform added for production domain (e.g., `jacana.deep-counsel.org`)
- [ ] Web platform added for localhost (`localhost`)
- [ ] No `https://` prefix in hostname
- [ ] No trailing slash in hostname

### ✅ 5. Environment Variables

In your `.env.local` or Vercel environment:

```bash
# Required
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your-api-key-here

# Required for verification links
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

- [ ] All variables are set
- [ ] Project ID matches Appwrite Console
- [ ] API key has correct permissions (users.read, users.write)
- [ ] APP_URL matches your production domain

### ✅ 6. API Key Permissions

Go to: **Appwrite Console → Settings → API Keys**

Your API key should have these scopes:

- [ ] `users.read` - Read user data
- [ ] `users.write` - Create and update users
- [ ] `sessions.write` - Create sessions (optional but recommended)

## Testing Steps

### Test 1: SMTP Connection

1. Go to Appwrite Console → Settings → SMTP
2. Click "Test" button
3. Enter your email address
4. Click "Send Test Email"
5. Check your inbox (and spam folder)

**Expected**: You receive a test email within 1-2 minutes

### Test 2: Registration Flow

1. Clear browser cookies
2. Go to your app's registration page
3. Register with a new email address
4. Check server logs for:
   ```
   [REGISTER] Verification email sent successfully
   ```
5. Check your email inbox

**Expected**: You receive a verification email within 1-2 minutes

### Test 3: Resend Verification

1. After registering, go to `/verify-pending`
2. Click "Resend Verification Email"
3. Check server logs for:
   ```
   [RESEND_VERIFICATION] Verification email sent successfully
   ```
4. Check your email inbox

**Expected**: You receive another verification email

### Test 4: Email Verification

1. Open the verification email
2. Click the verification link
3. Should redirect to `/verify` page
4. Should show "Email Verified!" message
5. Should redirect to home page after 2 seconds

**Expected**: Email is verified and you're logged in

## Common SMTP Providers

### Gmail

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: your-app-specific-password
```

**Note**: You need to create an [App Password](https://support.google.com/accounts/answer/185833) for Gmail

### SendGrid

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: your-sendgrid-api-key
```

### Mailgun

```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP Username: postmaster@your-domain.mailgun.org
SMTP Password: your-mailgun-smtp-password
```

### AWS SES

```
SMTP Host: email-smtp.us-east-1.amazonaws.com
SMTP Port: 587
SMTP Username: your-ses-smtp-username
SMTP Password: your-ses-smtp-password
```

### Postmark

```
SMTP Host: smtp.postmarkapp.com
SMTP Port: 587
SMTP Username: your-postmark-server-token
SMTP Password: your-postmark-server-token
```

## Troubleshooting

### Emails Not Being Sent

1. **Check Appwrite Logs**

   - Go to Console → Logs
   - Filter by "Email"
   - Look for errors

2. **Verify SMTP Credentials**

   - Test SMTP connection in Appwrite Console
   - Ensure credentials are correct
   - Check if SMTP provider requires app-specific passwords

3. **Check Rate Limits**
   - Appwrite default service has rate limits
   - Custom SMTP providers have their own limits
   - Wait a few minutes and try again

### Emails Going to Spam

1. **Configure SPF Record**

   - Add SPF record to your domain's DNS
   - Example: `v=spf1 include:_spf.google.com ~all`

2. **Configure DKIM**

   - Set up DKIM signing with your SMTP provider
   - Add DKIM records to your domain's DNS

3. **Use Verified Sender Email**
   - Use an email address from your domain
   - Verify the sender email with your SMTP provider

### Verification Link Not Working

1. **Check URL Format**

   - Should be: `https://your-domain.com/verify?userId=...&secret=...`
   - Ensure `NEXT_PUBLIC_APP_URL` is set correctly

2. **Check Link Expiry**

   - Default expiry: 1 hour
   - Request a new verification email if expired

3. **Check Platform Configuration**
   - Ensure your domain is added to Appwrite Platforms
   - See `APPWRITE_PLATFORM_SETUP.md` for details

## Need Help?

If you're still having issues:

1. Check Appwrite status: https://status.appwrite.io/
2. Review Appwrite docs: https://appwrite.io/docs/products/auth/email-password
3. Check Appwrite Discord: https://appwrite.io/discord
4. Review server logs for detailed error messages
