# Usage Limit Flow

## What Happens When a User Exceeds Their Daily Limit

### Backend (API Route)

**File:** `app/(chat)/api/chat/route.ts`

When a user sends a message, the API:

1. **Checks Usage Before Processing:**
   ```typescript
   const txResult = await beginTransaction(dbUser.id);
   
   if (!txResult.allowed) {
     return Response.json({
       code: "rate_limit:chat",
       message: `You've reached your daily limit of ${dailyLimit} requests. Upgrade to continue.`,
       cause: "daily_limit_reached",
       requestsToday: txResult.currentUsage.requestsToday,
       dailyLimit: txResult.currentUsage.dailyLimit,
       plan: txResult.currentUsage.plan,
     }, { status: 429 });
   }
   ```

2. **Returns 429 Status Code** with detailed error information
3. **No AI processing occurs** - saves costs and prevents abuse

### Frontend (Chat Component)

**File:** `components/chat.tsx`

The chat component handles the error:

1. **Detects Rate Limit Error:**