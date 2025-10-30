# Session Persistence Fix - Action Checklist

## ✅ Completed (Local)

- [x] Fixed duplicate Appwrite configuration in `.env` file
- [x] Removed quotes from environment variable values
- [x] Fixed chat history 404 issue (user ID mismatch)
- [x] Fixed guest auth redirect to use login page instead

## 🔧 To Do (Production Server)

### 1. Update Production Environment Variables

Go to your deployment platform (Vercel/Netlify/etc.) and update these variables:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68faa1c7002b9382b526
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=Jacana
APPWRITE_API_KEY=standard_f98fb335a212059631fe65aa2e19dae36de75a7ab7f0ac500e159b7a9bb1bbdf9068495cb3c84c773c19d37e1b10300bd60833fbed21e43838e99b6400d0a7d1d302bb12ac41b056565f52eacc801a5530f634a583f7bb2c92707934815dd3d6f9dd35260d1c3e860c93bf14088390001d181db3755e9696e709867ecfa127b5
```

**Important**: Make sure there are NO quotes around the values!

### 2. Configure Appwrite Platform Settings

1. Go to: https://fra.cloud.appwrite.io/console
2. Select project "Jacana" (ID: 68faa1c7002b9382b526)
3. Navigate to **Settings** → **Platforms**
4. Click **Add Platform** → **Web App**
5. Enter:
   - **Name**: Production
   - **Hostname**: `jacana.deep-counsel.org`
   - Leave port empty
6. Click **Next** and **Create**

### 3. Verify Auth Settings

In the same Appwrite project:

1. Go to **Auth** → **Security**
2. Check **Session Length**: Should be at least 365 days for persistent sessions
3. Ensure **Email/Password** authentication is enabled

### 4. Deploy Changes

1. Commit and push your code changes:

   ```bash
   git add .
   git commit -m "Fix session persistence and chat history issues"
   git push
   ```

2. If using Vercel, it will auto-deploy. Otherwise, trigger a manual deployment.

### 5. Test on Live Server

After deployment:

1. **Clear browser cookies** for jacana.deep-counsel.org
2. **Visit**: https://jacana.deep-counsel.org
3. **Log in** with your account
4. **Open DevTools** (F12) → Application → Cookies
5. **Verify** you see cookie: `a_session_68faa1c7002b9382b526`
6. **Close browser completely**
7. **Reopen browser** and visit https://jacana.deep-counsel.org
8. **Expected**: You should be automatically logged in
9. **Click on a chat history** in the sidebar
10. **Expected**: Chat should open without redirect to login

## 🐛 If Issues Persist

### Check Browser Console

Look for these logs:

```
[middleware] Found session cookie for /chat/...
[middleware] Validating session token for /chat/...
[middleware] Session valid for user: ...
```

If you see:

```
[middleware] No session cookie found for /chat/...
```

Then the cookie isn't being set or read properly.

### Check Server Logs

In your deployment platform's logs, look for:

- Appwrite connection errors
- Session validation failures
- Missing environment variables warnings

### Verify Cookie in Browser

The session cookie should have these properties:

- **Name**: `a_session_68faa1c7002b9382b526`
- **Domain**: `.jacana.deep-counsel.org` or `jacana.deep-counsel.org`
- **Path**: `/`
- **Secure**: `true`
- **HttpOnly**: `true`
- **Expires**: Far in the future (not "Session")

If the cookie has **Expires: Session**, it will be deleted when the browser closes!

## 📝 Summary

The main issues were:

1. **Duplicate Appwrite config** with different endpoints causing confusion
2. **Quotes in environment variables** potentially breaking cookie names
3. **Missing platform configuration** in Appwrite for your production domain
4. **User ID mismatch** in chat history ownership check (already fixed)

Once you update the production environment variables and configure the Appwrite platform, sessions should persist correctly and users will stay logged in across browser sessions.
