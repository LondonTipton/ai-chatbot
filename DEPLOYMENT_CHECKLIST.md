# Deployment Checklist for Vercel

## ✅ Security & Logging

### Production-Safe Logging Implemented

- ✅ Custom logger created (`lib/logger.ts`)
- ✅ All 714 console.log statements replaced across 78 files
- ✅ Logs visible in development, suppressed in production
- ✅ Sensitive data automatically sanitized in production errors

### What's Protected

- User emails
- Session tokens and IDs
- User IDs
- API keys (presence checks only)
- UUIDs and tokens
- Payment transaction details

## Environment Variables

Ensure these are set in Vercel:

### Required

- `POSTGRES_URL` - Database connection
- `BLOB_READ_WRITE_TOKEN` - File storage
- `CEREBRAS_API_KEY` - Primary AI provider
- `GOOGLE_GENERATIVE_AI_API_KEY` - Image generation
- `NEXT_PUBLIC_APPWRITE_ENDPOINT` - Auth endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Auth project
- `APPWRITE_API_KEY` - Auth API key

### Optional

- `REDIS_URL` - For resumable streams
- `TAVILY_API_KEY` - For web search
- `AI_GATEWAY_API_KEY` - For non-Vercel deployments
- `PESEPAY_INTEGRATION_KEY` - Payment gateway
- `PESEPAY_ENCRYPTION_KEY` - Payment gateway
- `NEXT_PUBLIC_APP_URL` - Your production URL

### Load Balancing (Optional)

- `CEREBRAS_API_KEY_85` through `CEREBRAS_API_KEY_89`
- `GOOGLE_GENERATIVE_AI_API_KEY_1` through `GOOGLE_GENERATIVE_AI_API_KEY_5`

## Pre-Deployment Steps

1. **Test locally first:**

   ```bash
   pnpm build
   pnpm start
   ```

2. **Verify environment variables:**

   - Check `.env.example` for required variables
   - Ensure all production values are set in Vercel dashboard

3. **Database migrations:**

   ```bash
   pnpm db:migrate
   ```

4. **Check for TypeScript errors:**
   ```bash
   pnpm lint
   ```

## Post-Deployment Verification

1. **Check logs in Vercel dashboard:**

   - Should see minimal logging
   - No user emails or sensitive data
   - Only sanitized error messages

2. **Test authentication flow:**

   - Register new user
   - Login
   - Verify email
   - Logout

3. **Test chat functionality:**

   - Create new chat
   - Send messages
   - Verify AI responses

4. **Monitor for errors:**
   - Check Vercel logs for any issues
   - Verify error tracking is working

## Logging Behavior

### Development (Local)

```typescript
logger.log("User logged in:", user.email);
// Output: [auth-provider] User logged in: user@example.com
```

### Production (Vercel)

```typescript
logger.log("User logged in:", user.email);
// Output: (nothing - completely silent)

logger.error("Payment failed:", error);
// Output: [payment] Payment failed: [sanitized error]
```

## Rollback Plan

If issues occur:

1. Revert to previous deployment in Vercel dashboard
2. Check logs for specific errors
3. Fix issues locally and redeploy

## Support

- Logger documentation: `lib/logger.README.md`
- Re-run log migration: `pnpm tsx scripts/replace-console-logs.ts`
- Check diagnostics: `pnpm lint`

---

**Ready for deployment!** 🚀

All sensitive data logging has been removed. Your application is now production-safe.
