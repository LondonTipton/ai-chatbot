# Session Persistence Issue - Live Server

## Problem

Users on the live server (https://jacana.deep-counsel.org) are not staying logged in when they return to the site. The session cookie should persist, but it's not being recognized, causing redirects to login.

## Root Causes Identified

### 1. Duplicate Appwrite Endpoint Configuration

In your `.env` file, you have conflicting Appwrite endpoints:

```env
# Line 30
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

# Line 35 (OVERRIDES the above)
NEXT_PUBLIC_APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1"
```

**Issue**: The second declaration overrides the first, but it has quotes around the value, which might cause issues. Also, using different endpoints (cloud.appwrite.io vs fra.cloud.appwrite.io) can cause session validation to fail.

### 2. Duplicate Project ID Configuration

```env
# Line 31
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68faa1c7002b9382b526

# Line 34 (with quotes)
NEXT_PUBLIC_APPWRITE_PROJECT_ID = "68faa1c7002b9382b526"
```

**Issue**: The quotes around the second declaration might cause the cookie name to be incorrect.

## Solutions

### Fix 1: Clean Up Environment Variables

Update your `.env` file to have only ONE set of Appwrite configuration:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68faa1c7002b9382b526
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=Jacana
APPWRITE_API_KEY=standard_f98fb335a212059631fe65aa2e19dae36de75a7ab7f0ac500e159b7a9bb1bbdf9068495cb3c84c773c19d37e1b10300bd60833fbed21e43838e99b6400d0a7d1d302bb12ac41b056565f52eacc801a5530f634a583f7bb2c92707934815dd3d6f9dd35260d1c3e860c93bf14088390001d181db3755e9696e709867ecfa127b5
```

**Important**:

- Remove the duplicate lines
- Remove quotes around values
- Use consistent endpoint (choose one: either `cloud.appwrite.io` or `fra.cloud.appwrite.io`)

### Fix 2: Verify Appwrite Project Settings

In your Appwrite console (https://fra.cloud.appwrite.io/console):

1. Go to your project "Jacana" (ID: 68faa1c7002b9382b526)
2. Navigate to **Settings** → **Platforms**
3. Add your live domain as a Web platform:

   - **Name**: Production
   - **Hostname**: `jacana.deep-counsel.org`
   - **Port**: Leave empty (uses default 443 for HTTPS)

4. Navigate to **Auth** → **Security**
5. Ensure these settings:
   - **Session Length**: Set to a reasonable duration (e.g., 365 days for "remember me" behavior)
   - **Session Alerts**: Enabled (optional)

### Fix 3: Check Cookie Settings

The session cookie name should be: `a_session_68faa1c7002b9382b526`

To verify on your live server:

1. Open DevTools (F12)
2. Go to **Application** → **Cookies** → `https://jacana.deep-counsel.org`
3. Look for a cookie named `a_session_68faa1c7002b9382b526`
4. Check its properties:
   - **Domain**: Should be `.jacana.deep-counsel.org` or `jacana.deep-counsel.org`
   - **Path**: Should be `/`
   - **Secure**: Should be `true` (HTTPS only)
   - **HttpOnly**: Should be `true`
   - **SameSite**: Should be `Lax` or `None`

### Fix 4: Update Production Environment Variables

If you're deploying to Vercel or another platform:

1. Go to your deployment platform's dashboard
2. Navigate to Environment Variables
3. Ensure these are set correctly (without quotes):
   ```
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=68faa1c7002b9382b526
   APPWRITE_API_KEY=standard_f98fb335a212059631fe65aa2e19dae36de75a7ab7f0ac500e159b7a9bb1bbdf9068495cb3c84c773c19d37e1b10300bd60833fbed21e43838e99b6400d0a7d1d302bb12ac41b056565f52eacc801a5530f634a583f7bb2c92707934815dd3d6f9dd35260d1c3e860c93bf14088390001d181db3755e9696e709867ecfa127b5
   ```
4. Redeploy your application

## Testing Session Persistence

After applying the fixes:

1. **Clear all cookies** for jacana.deep-counsel.org
2. **Log in** to your account
3. **Check DevTools** → Application → Cookies to verify the session cookie is set
4. **Close the browser completely**
5. **Reopen the browser** and navigate to https://jacana.deep-counsel.org
6. **You should be automatically logged in** without seeing the login page
7. **Click on a chat history** - it should open without redirecting to login

## Expected Behavior

✅ User logs in → Session cookie is set
✅ User closes browser → Cookie persists (not deleted)
✅ User returns to site → Middleware validates cookie → User is logged in
✅ User clicks chat history → Chat opens immediately
✅ Session auto-refreshes when it's about to expire (< 24 hours remaining)

## Debugging Steps

If the issue persists after the fixes:

1. **Check server logs** for middleware errors:

   ```
   [middleware] Found session cookie for /chat/...
   [middleware] Validating session token for /chat/...
   [middleware] Session valid for user: ...
   ```

2. **Check for cookie blocking**:

   - Browser privacy settings might block third-party cookies
   - Ad blockers might interfere with cookies
   - Incognito/Private mode has stricter cookie policies

3. **Verify HTTPS**:

   - Session cookies require HTTPS in production
   - Mixed content (HTTP/HTTPS) can cause cookie issues

4. **Check CORS settings** in Appwrite:
   - Ensure your domain is in the allowed origins list

## Files to Update

1. `.env` - Remove duplicate Appwrite configuration
2. Production environment variables (Vercel/deployment platform)
3. Appwrite console - Add production domain to platforms

## Additional Notes

- Appwrite sessions last for the duration configured in your project settings (default is usually 365 days)
- The middleware caches valid sessions for 5 minutes to improve performance
- Sessions are automatically refreshed when they have less than 24 hours remaining
- If a session is invalid or expired, the middleware will redirect to login
