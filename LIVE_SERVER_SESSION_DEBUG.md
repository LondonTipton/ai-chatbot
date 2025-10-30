# Live Server Session Debugging Guide

## Problem

Chat history works on localhost but fails on live server (jacana.deep-counsel.org).

## Most Likely Causes

### 1. Domain Not Added to Appwrite Platforms ⚠️ MOST COMMON

**Check**: Go to your Appwrite console and verify your domain is added.

**Steps**:

1. Go to: https://cloud.appwrite.io/console/project-fra-68faa1c7002b9382b526/settings
2. Click on **Platforms** tab
3. Look for a Web platform with hostname: `jacana.deep-counsel.org`

**If it's NOT there**:

1. Click **Add Platform** → **Web App**
2. Enter:
   - **Name**: Production
   - **Hostname**: `jacana.deep-counsel.org` (NO http://, NO trailing slash)
3. Click **Next** and **Create**
4. Wait 2-3 minutes for changes to propagate
5. Try accessing your live site again

**Why this matters**: Appwrite will reject session cookies from domains not in the platform list for security reasons.

### 2. Environment Variables Not Updated on Vercel

**Check**: Verify your Vercel environment variables match your local setup.

**Required Variables**:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68faa1c7002b9382b526
APPWRITE_API_KEY=standard_f98fb335a212059631fe65aa2e19dae36de75a7ab7f0ac500e159b7a9bb1bbdf9068495cb3c84c773c19d37e1b10300bd60833fbed21e43838e99b6400d0a7d1d302bb12ac41b056565f52eacc801a5530f634a583f7bb2c92707934815dd3d6f9dd35260d1c3e860c93bf14088390001d181db3755e9696e709867ecfa127b5
```

**Steps**:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify each variable is set correctly
3. Make sure there are NO quotes around the values
4. If you made changes, redeploy: `git push` or click "Redeploy" in Vercel

### 3. Session Cookie Not Being Set

**Check**: Use browser DevTools to inspect cookies on the live site.

**Steps**:

1. Open https://jacana.deep-counsel.org
2. Log in
3. Press F12 → Application tab → Cookies → https://jacana.deep-counsel.org
4. Look for cookie named: `a_session_68faa1c7002b9382b526`

**If cookie is NOT there**:

- The session is not being created properly
- Check browser console for errors
- Check Vercel deployment logs for errors

**If cookie IS there but has "Session" expiry**:

- Cookie will be deleted when browser closes
- This is wrong - it should have a far future expiry date

**Cookie should have these properties**:

- **Name**: `a_session_68faa1c7002b9382b526`
- **Domain**: `.jacana.deep-counsel.org` or `jacana.deep-counsel.org`
- **Path**: `/`
- **Secure**: `true` (HTTPS only)
- **HttpOnly**: `true`
- **SameSite**: `Lax` or `None`
- **Expires**: Far in the future (not "Session")

### 4. CORS or Mixed Content Issues

**Check**: Browser console for CORS errors.

**Steps**:

1. Open https://jacana.deep-counsel.org
2. Press F12 → Console tab
3. Look for errors like:
   - "CORS policy blocked..."
   - "Mixed Content..."
   - "Failed to fetch..."

**If you see CORS errors**:

- Your domain might not be in Appwrite's allowed origins
- Go to Appwrite Console → Settings → Platforms and add your domain

### 5. Middleware Not Running or Failing

**Check**: Vercel deployment logs for middleware errors.

**Steps**:

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click on "Functions" tab
4. Look for middleware logs
5. Look for errors like:
   - "Missing Appwrite configuration"
   - "Session validation failed"
   - "No session cookie found"

## Quick Diagnostic Test

### Test 1: Can you log in on live server?

1. Go to https://jacana.deep-counsel.org/login
2. Try to log in
3. **If login fails**: Environment variables or Appwrite config is wrong
4. **If login succeeds but redirects to login again**: Session cookie not being set

### Test 2: Check session cookie after login

1. Log in successfully
2. Open DevTools → Application → Cookies
3. **If no `a_session_*` cookie**: Session creation failed
4. **If cookie exists**: Session is being created

### Test 3: Try to access home page

1. After logging in, go to https://jacana.deep-counsel.org
2. **If you see the chat interface**: Session is working
3. **If redirected to login**: Middleware can't validate session

### Test 4: Try to access a chat directly

1. Copy a chat URL like: https://jacana.deep-counsel.org/chat/[some-id]
2. Paste in browser and press Enter
3. **If chat opens**: Everything is working!
4. **If redirected to login**: Session validation failing for that route

## Most Likely Solution

Based on the symptoms (works locally, fails on live), the issue is almost certainly:

**🎯 Your domain is not added to Appwrite platforms**

**Fix**:

1. Go to Appwrite Console → Settings → Platforms
2. Add `jacana.deep-counsel.org` as a Web platform
3. Wait 2-3 minutes
4. Try again

## If Still Not Working

### Enable Debug Logging

Add this to your middleware to see what's happening:

1. Check if session cookie is being found
2. Check if session validation is succeeding
3. Check if user is being redirected

The middleware already has console.log statements, so check your Vercel logs:

- Go to Vercel Dashboard → Your Project → Deployments → Latest → Functions
- Look for logs starting with `[middleware]`

### Common Log Messages

**Good signs**:

```
[middleware] Found session cookie for /chat/...
[middleware] Validating session token for /chat/...
[middleware] Session valid for user: ...
```

**Bad signs**:

```
[middleware] No session cookie found for /chat/...
[middleware] Session validation failed for /chat/...
[middleware] No valid session, redirecting to login
```

## After Fixing

Once you've added your domain to Appwrite platforms:

1. **Clear browser cookies** for jacana.deep-counsel.org
2. **Log in again** on the live site
3. **Check that session cookie is set** (DevTools → Application → Cookies)
4. **Try accessing a chat** from the sidebar
5. **Should work!** ✅

## Still Having Issues?

If you've done all of the above and it still doesn't work:

1. Share the browser console errors
2. Share the Vercel deployment logs (especially middleware logs)
3. Confirm your domain is in Appwrite platforms
4. Confirm environment variables are correct in Vercel
5. Try in an incognito window (to rule out browser cache issues)
