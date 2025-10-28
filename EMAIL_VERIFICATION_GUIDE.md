# Email Verification Implementation Guide

## Overview

This application now requires users to verify their email addresses before accessing protected routes. The implementation uses Appwrite's built-in email verification system.

## How It Works

### Registration Flow

1. **User Registers** (`/register`)

   - User creates account with email and password
   - Account is created in Appwrite
   - User is automatically logged in
   - Verification email is sent automatically
   - User is redirected to `/verify-pending`

2. **Verification Pending** (`/verify-pending`)

   - User sees a message to check their email
   - Can resend verification email if needed
   - Can sign out if needed
   - Cannot access protected routes until verified

3. **Email Verification** (`/verify`)

   - User clicks link in email
   - Link contains `userId` and `secret` query parameters
   - Page automatically verifies the email
   - On success: redirects to home page
   - On failure: shows error and option to resend

4. **Access Granted**
   - Once verified, user can access all protected routes
   - Middleware checks `user.emailVerification` status
   - Unverified users are redirected to `/verify-pending`

### Login Flow

1. **Existing User Logs In** (`/login`)
   - If email is verified: redirected to home
   - If email is not verified: redirected to `/verify-pending`

## Implementation Details

### Files Modified

1. **`components/providers/auth-provider.tsx`**

   - Added `resendVerification()` method
   - Modified `register()` to send verification email
   - Updated context value to include new method

2. **`hooks/use-auth.ts`**

   - Added `resendVerification` to `AuthContextValue` type

3. **`middleware.ts`**

   - Added `/verify` and `/verify-pending` to public routes
   - Added email verification check for authenticated users
   - Redirects unverified users to `/verify-pending`
   - Prevents verified users from accessing verification pages

4. **`app/(auth)/register/page.tsx`**
   - Changed redirect from `/` to `/verify-pending` after registration

### Files Created

1. **`app/(auth)/verify/page.tsx`**

   - Handles email verification callback
   - Extracts `userId` and `secret` from URL
   - Calls Appwrite's `updateVerification()` API
   - Shows success/error states with appropriate UI

2. **`app/(auth)/verify-pending/page.tsx`**
   - Shows verification pending message
   - Displays user's email address
   - Provides "Resend Verification Email" button
   - Provides "Sign Out" button
   - Shows helpful tips about verification

## Configuration

### Environment Variables

Ensure `NEXT_PUBLIC_APP_URL` is set in your `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set it to your actual domain:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Appwrite Configuration

1. **Email Service Setup**

   - Go to Appwrite Console → Settings → SMTP
   - Configure your SMTP settings or use Appwrite's default email service
   - Test email delivery

2. **Email Templates** (Optional)

   - Customize verification email template in Appwrite Console
   - Go to Auth → Templates → Email Verification

3. **Platform Configuration**
   - Add your domain to Platforms in Appwrite Console
   - This allows redirect URLs to work properly

## Security Features

### Server-Side Enforcement

- Middleware validates email verification status on every request
- Cannot be bypassed by client-side manipulation
- Session validation includes verification check

### Token Expiration

- Verification links expire after 1 hour (Appwrite default)
- Users can request new verification emails
- Old tokens are invalidated when new ones are generated

### Rate Limiting

Consider adding rate limiting to prevent abuse:

- Limit verification email requests per user
- Implement cooldown period between requests

## User Experience

### Success States

- ✅ Clear success message after verification
- ✅ Automatic redirect to home page
- ✅ Toast notification for feedback

### Error Handling

- ❌ Invalid or expired links show clear error messages
- ❌ Option to request new verification email
- ❌ Helpful tips in verification pending page

### Edge Cases

- **Already Verified**: Redirected to home if accessing verification pages
- **Not Logged In**: Redirected to login if accessing protected routes
- **Session Expired**: Redirected to login with proper cleanup

## Testing

### Manual Testing Checklist

1. **Registration**

   - [ ] Register new account
   - [ ] Verify email is sent
   - [ ] Redirected to `/verify-pending`
   - [ ] Cannot access home page

2. **Verification**

   - [ ] Click link in email
   - [ ] Redirected to `/verify` with correct parameters
   - [ ] Success message shown
   - [ ] Redirected to home page
   - [ ] Can now access protected routes

3. **Resend Email**

   - [ ] Click "Resend Verification Email"
   - [ ] New email received
   - [ ] New link works
   - [ ] Old link is invalidated

4. **Login (Unverified)**

   - [ ] Login with unverified account
   - [ ] Redirected to `/verify-pending`
   - [ ] Cannot access protected routes

5. **Login (Verified)**
   - [ ] Login with verified account
   - [ ] Redirected to home page
   - [ ] Can access all routes

### Development Testing

For development, you can:

1. **Check Appwrite Console**

   - View user verification status in Users section
   - Manually verify users if needed

2. **Test Email Delivery**
   - Use a test email service like Mailtrap
   - Configure SMTP in Appwrite for testing

## Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in Appwrite Console
2. Verify email service is enabled
3. Check spam folder
4. Review Appwrite logs for errors

### Verification Link Not Working

1. Ensure `NEXT_PUBLIC_APP_URL` is correct
2. Check that domain is added to Platforms in Appwrite
3. Verify link hasn't expired (1 hour limit)
4. Check browser console for errors

### Redirect Loops

1. Clear browser cookies
2. Check middleware logic
3. Verify user verification status in Appwrite Console
4. Review middleware logs

### User Stuck on Verify Pending

1. Check if email was sent (Appwrite logs)
2. Verify SMTP configuration
3. Try resending verification email
4. Manually verify user in Appwrite Console if needed

## Future Enhancements

### Optional Features to Consider

1. **Grace Period**

   - Allow 24-48 hours of access before requiring verification
   - Show banner reminder to verify email

2. **Email Change**

   - Require re-verification when user changes email
   - Send notification to old email about change

3. **Admin Override**

   - Allow admins to manually verify users
   - Useful for support cases

4. **Verification Reminder**

   - Send reminder emails after 24 hours
   - Show in-app banner for unverified users

5. **Rate Limiting**

   - Limit verification email requests
   - Prevent spam and abuse

6. **Analytics**
   - Track verification completion rate
   - Monitor time to verification
   - Identify email delivery issues

## API Reference

### AuthContext Methods

```typescript
// Resend verification email to current user
await resendVerification();
```

### Appwrite SDK Methods Used

```typescript
// Send verification email
await account.createVerification(url);

// Verify email with token
await account.updateVerification(userId, secret);
```

## Support

For issues or questions:

1. Check Appwrite documentation: https://appwrite.io/docs/products/auth/email-password
2. Review middleware logs for debugging
3. Check Appwrite Console for user status
4. Verify environment variables are set correctly
