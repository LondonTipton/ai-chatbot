# How to Add Your Domain to Appwrite Platforms

## ✅ Appwrite Connection Test Passed!

Your local machine can connect to Appwrite successfully. Now you need to add your production domain to Appwrite's platform list.

## The Issue

You selected "Next.js" as the platform type, but that's not correct for this use case. You need to add a **"Web App"** platform instead.

## Step-by-Step Instructions

### 1. Go to Appwrite Console

Open this URL in your browser:

```
https://cloud.appwrite.io/console/project-fra-68faa1c7002b9382b526/settings
```

### 2. Navigate to Platforms

- Click on the **"Platforms"** tab in the left sidebar
- You should see a list of platforms (might be empty or have localhost)

### 3. Remove the Next.js Platform (if you added one)

If you see a "Next.js" platform:

- Click the **three dots** (⋮) on the right side
- Click **"Delete"**
- Confirm deletion

### 4. Add a New Web App Platform

Click the **"Add Platform"** button at the top right.

You'll see several options:

- ❌ Flutter
- ❌ Apple
- ❌ Android
- ✅ **Web** ← Choose this one!

### 5. Configure the Web Platform

After clicking "Web", you'll see a form:

**Name**: `Production` (or any name you like)

**Hostname**: `jacana.deep-counsel.org`

- ⚠️ **IMPORTANT**:
  - NO `https://` prefix
  - NO `http://` prefix
  - NO trailing slash `/`
  - Just the domain: `jacana.deep-counsel.org`

**Port**: Leave empty (or enter `443` for HTTPS)

Click **"Next"** → Click **"Create"**

### 6. Add Localhost for Development (Optional but Recommended)

Repeat steps 4-5 with these values:

**Name**: `Local Development`
**Hostname**: `localhost`
**Port**: Leave empty (or enter `3000`)

### 7. Verify Your Platforms

You should now see two platforms in the list:

1. ✅ Production - `jacana.deep-counsel.org`
2. ✅ Local Development - `localhost`

## What This Does

Adding your domain to Appwrite platforms tells Appwrite:

- "Accept session cookies from this domain"
- "Allow CORS requests from this domain"
- "Trust authentication requests from this domain"

Without this, Appwrite will **reject** all session cookies and authentication requests from your live site for security reasons.

## After Adding the Platform

### Wait 2-3 Minutes

Appwrite needs a moment to propagate the changes across its servers.

### Test on Live Site

1. **Clear browser cookies** for `jacana.deep-counsel.org`

   - Open DevTools (F12)
   - Application → Cookies → Right-click → Clear

2. **Visit your live site**: https://jacana.deep-counsel.org

3. **Log in** with your account

4. **Check for session cookie**:

   - DevTools → Application → Cookies
   - Look for: `a_session_68faa1c7002b9382b526`
   - Should have a far-future expiry date

5. **Try accessing a chat** from the sidebar
   - Should open successfully! ✅

## Troubleshooting

### "Platform already exists" Error

If you get this error when adding the platform:

- You might have already added it
- Check the platforms list carefully
- The hostname might be slightly different (check for typos)

### Still Getting Redirected to Login

If you're still being redirected after adding the platform:

1. **Wait longer**: Sometimes it takes 5-10 minutes for changes to propagate
2. **Clear browser cache**: Try in an incognito window
3. **Check Vercel logs**: Look for middleware errors
4. **Verify environment variables**: Make sure Vercel has the correct endpoint

### Session Cookie Not Being Set

If the cookie isn't appearing after login:

1. **Check browser console** for errors
2. **Verify the endpoint** in Vercel matches: `https://fra.cloud.appwrite.io/v1`
3. **Check Appwrite project ID** matches: `68faa1c7002b9382b526`
4. **Try logging out and back in**

## Visual Guide

When you're in the Appwrite Console, the flow looks like this:

```
Settings → Platforms → Add Platform → Web
                                       ↓
                            Enter hostname: jacana.deep-counsel.org
                                       ↓
                                  Next → Create
                                       ↓
                                   ✅ Done!
```

## Common Mistakes to Avoid

❌ **Don't** add `https://jacana.deep-counsel.org`
✅ **Do** add `jacana.deep-counsel.org`

❌ **Don't** add `jacana.deep-counsel.org/`
✅ **Do** add `jacana.deep-counsel.org`

❌ **Don't** choose "Next.js" platform type
✅ **Do** choose "Web" platform type

❌ **Don't** add the port for HTTPS (443 is default)
✅ **Do** leave port empty or add `443`

## Need More Help?

If you're still having issues after following these steps:

1. Take a screenshot of your Platforms page in Appwrite
2. Share any error messages from browser console
3. Share Vercel deployment logs
4. Confirm the platform shows as "Active" in Appwrite

The most common issue is simply waiting for the changes to propagate. Give it 5 minutes after adding the platform, then try again!
