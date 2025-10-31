# Cookie SameSite Fix for Cross-Domain Appwrite Setup

## Problem

Chat history was not loading on the production server (`jacana.deep-counsel.org`) even though users were successfully logged in. The issue was caused by `sameSite: "strict"` cookie settings preventing cookies from working in a cross-domain setup where:

- Frontend: `jacana.deep-counsel.org`
- Appwrite Backend: `fra.cloud.appwrite.io`

## Root Cause

The `sameSite: "strict"` setting blocks cookies from being sent in cross-site contexts. Since the app and Appwrite are on different domains, the browser was blocking the session cookies, preventing the client-side auth provider from accessing user session data.

## Solution

Changed `sameSite` from `"strict"` to `"lax"` in all cookie configurations. This allows cookies to be sent on top-level navigations while still providing good CSRF protection.

## Files Changed

### 1. `lib/appwrite/session.ts`

- Updated `SESSION_COOKIE_OPTIONS.sameSite` from `"strict"` to `"lax"`
- Updated Appwrite session cookie `sameSite` from `"strict"` to `"lax"`

### 2. `scripts/verify-session-security.ts`

- Updated security verification script to accept both `"lax"` and `"strict"` as valid
- Updated security checklist to reflect that `"lax"` is appropriate for cross-domain setups

### 3. `app/api/auth/session/route.ts` (NEW)

- Created new API endpoint that reads httpOnly cookies server-side
- Returns user session data to client-side auth provider
- Solves the issue where JavaScript couldn't read httpOnly cookies

### 4. `components/providers/auth-provider.tsx`

- Simplified to call `/api/auth/session` endpoint instead of trying to read cookies client-side
- Removed cookie parsing logic since httpOnly cookies can't be read by JavaScript

## Important Notes

### httpOnly vs HTTP/HTTPS

- `httpOnly`: Security flag that prevents JavaScript from reading cookies (protects against XSS)
- `secure`: Flag that ensures cookies are only sent over HTTPS
- These are **different** from the HTTP/HTTPS protocol

### sameSite Options

- `strict`: Blocks cookies in all cross-site contexts (breaks cross-domain setups)
- `lax`: Allows cookies on top-level navigations (good for cross-domain while maintaining security)
- `none`: Allows cookies in all contexts (requires `secure: true`)

## Security Impact

Changing from `strict` to `lax` maintains strong security:

- ✅ Still protected against XSS attacks (httpOnly)
- ✅ Still protected against MITM attacks (secure flag in production)
- ✅ Still protected against most CSRF attacks (lax blocks POST requests from other sites)
- ✅ Allows legitimate cross-domain authentication flows

## Deployment

After deploying these changes:

1. Users will need to log in again to get new cookies with correct `sameSite` setting
2. Chat history should load properly on production
3. Authentication flow will work seamlessly across app and Appwrite domains

## Testing

To verify the fix works:

1. Deploy to production
2. Log in with a test account
3. Check browser DevTools > Application > Cookies
4. Verify cookies have `SameSite=Lax`
5. Verify chat history loads correctly
6. Verify authentication persists across page refreshes
