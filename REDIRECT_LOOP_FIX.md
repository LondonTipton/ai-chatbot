# Redirect Loop Fix - Critical Issue

## Problem

The application is stuck in an infinite redirect loop creating multiple guest users. The middleware keeps redirecting to `/api/auth/guest` because it can't detect the session cookie that was just set.

## Root Cause

The session cookie name mismatch:

- **Middleware expects:** `a_session_{projectId}` (Appwrite's native cookie)
- **Guest route was setting:** `appwrite-session` (custom cookie name)

Additionally, the cookie needs to use the session `secret` value, not the session `$id`.

## Solution Applied

1. **Updated `app/api/auth/guest/route.ts`:**

   - Now sets cookie with Appwrite's native cookie name format: `a_session_{projectId}`
   - Uses `session.secret` instead of `session.$id` for the cookie value
   - Sets proper cookie options matching Appwrite's defaults

2. **Updated `middleware.ts`:**
   - Added referer check to prevent redirect loop
   - If coming from guest route and still no session, lets request through instead of redirecting again

## Files Modified

1. `app/api/auth/guest/route.ts` - Fixed cookie setting
2. `middleware.ts` - Added loop prevention

## Testing

To test the fix:

1. Clear all browser cookies for localhost:3000
2. Restart the dev server: `pnpm dev`
3. Navigate to `http://localhost:3000`
4. Should create ONE guest session and load the app

## If Still Having Issues

If the redirect loop persists:

### Option 1: Temporarily Disable Guest Auto-Creation

Comment out the redirect in middleware.ts (line ~175):

```typescript
// If no valid session, redirect to guest session creation
if (!validationResult) {
  const referer = request.headers.get("referer");
  const isFromGuestRoute = referer?.includes("/api/auth/guest");

  if (isFromGuestRoute) {
    console.error(
      "[middleware] No session after guest route - possible cookie issue"
    );
    return NextResponse.next();
  }

  // TEMPORARILY COMMENT THIS OUT:
  // const redirectUrl = encodeURIComponent(request.url);
  // return NextResponse.redirect(
  //   new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
  // );

  // TEMPORARILY ADD THIS:
  return NextResponse.next();
}
```

This will allow the app to load without authentication while we debug.

### Option 2: Check Environment Variables

Ensure these are set in `.env.local`:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
```

### Option 3: Clear Appwrite Sessions

Go to your Appwrite console and delete all anonymous sessions to start fresh.

## Next Steps

Once the redirect loop is fixed:

1. Test guest user creation (should create only ONE)
2. Test user registration
3. Test user login
4. Run the test suite: `pnpm test`

## Status

- ✅ Database migrations applied
- ✅ Appwrite integration working (users being created)
- ⚠️ Cookie/session handling needs verification
- ⚠️ Redirect loop needs to be resolved

The core authentication logic is working (Appwrite is creating users successfully). The issue is purely in the cookie/session detection between the guest route and middleware.
