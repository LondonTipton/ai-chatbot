# Appwrite Setup Guide

Complete guide for configuring Appwrite authentication in DeepCounsel.

## Quick Setup Checklist

### 1. Create Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) and create a free account
2. Create a new project
3. Copy your Project ID from Settings → General

### 2. Configure Authentication

1. Navigate to **Auth** in your Appwrite project
2. Enable **Email/Password** authentication
3. Enable **Anonymous Sessions** (for guest users)
4. Set session length (default: 365 days)

### 3. Create API Key

1. Go to **Settings → API Keys**
2. Create a new API key with these scopes:
   - `users.read`
   - `users.write`
   - `sessions.write` (optional but recommended)
3. Copy the API key (you won't be able to see it again)

### 4. Add Platform Configuration

Go to **Settings → Platforms** and add:

**Production Platform:**
- Click **Add Platform** → **Web**
- Name: `Production`
- Hostname: `your-domain.com` (NO `https://`, NO trailing `/`)
- Port: Leave empty or `443`

**Development Platform:**
- Click **Add Platform** → **Web**
- Name: `Local Development`
- Hostname: `localhost`
- Port: Leave empty or `3000`

> [!WARNING]
> Common mistakes to avoid:
> - ❌ Don't add `https://your-domain.com`
> - ❌ Don't choose "Next.js" platform type
> - ✅ Do choose "Web" platform type
> - ✅ Do use just the hostname: `your-domain.com`

### 5. Configure SMTP (Email Verification)

Go to **Settings → SMTP**

**Option A: Use Appwrite's Default Service**
- Select "Use Appwrite's email service"
- Note: Limited to development/testing with rate limits

**Option B: Configure Custom SMTP** (Recommended for production)

#### Gmail
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: your-app-specific-password
```
> [!NOTE]
> Create an [App Password](https://support.google.com/accounts/answer/185833) for Gmail

#### SendGrid
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: your-sendgrid-api-key
```

#### Other Providers
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.us-east-1.amazonaws.com:587`
- **Postmark**: `smtp.postmarkapp.com:587`

### 6. Configure Email Templates

Go to **Auth → Settings → Email Templates**

Find "Email Verification" template:
- Enable the template
- Customize subject line
- Ensure body contains `{{url}}` placeholder

Example template:
```
Subject: Verify your DeepCounsel account

Hi {{user}},

Welcome to DeepCounsel! Please verify your email address:

{{url}}

This link will expire in 1 hour.

Best regards,
The DeepCounsel Team
```

### 7. Set Environment Variables

Add to your `.env.local`:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here

# Required for verification links
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Testing Your Setup

### Test SMTP Connection
1. Go to Appwrite Console → Settings → SMTP
2. Click "Test" button
3. Enter your email address
4. Check inbox (and spam folder)

### Test Registration Flow
1. Clear browser cookies
2. Register with a new email address
3. Check server logs for successful email send
4. Check email inbox for verification link

### Test Email Verification
1. Click verification link in email
2. Should redirect to `/verify` page
3. Should show "Email Verified!" message
4. Should automatically log you in

## Authentication Usage

### Server-Side

```typescript
import { auth } from "@/lib/appwrite/server-auth";

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = session.user.id;
  const userType = session.user.type; // "guest" | "regular"
  
  // Your logic here
}
```

### Client-Side

```typescript
"use client";

import { useAuth } from "@/hooks/use-auth";

export function MyComponent() {
  const { user, isLoading, isAnonymous } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return (
    <div>
      <p>Welcome, {user.email || "Guest"}</p>
      {isAnonymous && <p>Register to save your work</p>}
    </div>
  );
}
```

## Troubleshooting

### Session Cookie Not Being Set

**Problem**: User logs in but session doesn't persist

**Solution**:
1. Ensure your domain is added to Appwrite Platforms (see step 4)
2. Wait 2-3 minutes for changes to propagate
3. Clear browser cookies and try again
4. Check Vercel environment variables match Appwrite config

### Emails Not Being Sent

**Problem**: Verification emails never arrive

**Solution**:
1. Test SMTP connection in Appwrite Console
2. Check Appwrite Logs (Console → Logs) for errors
3. Verify SMTP credentials are correct
4. Check rate limits on your SMTP provider
5. Look in spam folder

### Emails Going to Spam

**Problem**: Verification emails delivered to spam

**Solution**:
1. Configure SPF record: `v=spf1 include:_spf.google.com ~all`
2. Set up DKIM signing with your SMTP provider
3. Use a verified sender email from your domain

### Verification Link Not Working

**Problem**: Clicking verification link shows error

**Solution**:
1. Check `NEXT_PUBLIC_APP_URL` is set correctly
2. Ensure platform is configured in Appwrite
3. Verify link hasn't expired (default: 1 hour)
4. Request new verification email

### Platform Configuration Issues

**Problem**: "Failed to create session" error on production

**Solution**:
1. Go to Appwrite Console → Settings → Platforms
2. Verify your production domain is added as a **Web** platform
3. Ensure hostname has NO `https://` prefix
4. Wait 2-3 minutes for changes to propagate
5. Clear browser cache and cookies

## Key Files

- Authentication Service: `lib/appwrite/auth.ts`
- Server Auth Utility: `lib/appwrite/server-auth.ts`
- Session Management: `lib/appwrite/session.ts`
- Error Types: `lib/appwrite/errors.ts`
- Auth Provider: `components/providers/auth-provider.tsx`
- Auth Hook: `hooks/use-auth.ts`
- Server Actions: `app/(auth)/actions.ts`
- Middleware: `middleware.ts`

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Status](https://status.appwrite.io/)
- [Appwrite Discord](https://appwrite.io/discord)
- Project's [Migration Guide](../MIGRATION_GUIDE.md)
