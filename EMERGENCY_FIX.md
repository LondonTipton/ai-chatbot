# Emergency Fix - Can't Log In

## Quick Fix: Manually Verify Your Email in Appwrite

1. Go to: https://cloud.appwrite.io/console
2. Select your project
3. Go to: **Auth** → **Users**
4. Find your user (search by email)
5. Click on the user
6. Toggle **"Email Verification"** to **ON**
7. Go back to your app and try logging in

This will immediately fix the login issue.

## Alternative: Temporarily Disable Email Verification Check

If you need to test without email verification, edit `middleware.ts`:

Find this section (around line 450):

```typescript
// Check if user's email is verified for protected routes
if (!user.emailVerification && !isPublicRoute && !isWellKnown) {
  logger.log(
    "[middleware] Unverified user attempting to access protected route, redirecting to verify-pending"
  );
  return NextResponse.redirect(new URL("/verify-pending", request.url));
}
```

Comment it out temporarily:

```typescript
// TEMPORARY: Disable email verification check
// if (!user.emailVerification && !isPublicRoute && !isWellKnown) {
//   logger.log(
//     "[middleware] Unverified user attempting to access protected route, redirecting to verify-pending"
//   );
//   return NextResponse.redirect(new URL("/verify-pending", request.url));
// }
```

Save and try logging in again.

## What Went Wrong

The email verification code is working, but:

1. Your account was created without email verification
2. The middleware is now enforcing email verification
3. You can't log in because your email isn't verified
4. You can't verify because the email wasn't sent

## Permanent Fix

Once you can log in again:

1. Make sure SMTP is configured in Appwrite
2. Test the email verification flow with a new account
3. Re-enable the middleware check

## Clear Browser Data

Also try:

1. Open DevTools (F12)
2. Application → Storage → Clear site data
3. Close and reopen browser
4. Try logging in again
