# Rate Limit Handling Implementation

**Date:** November 6, 2025  
**Status:** ✅ Complete

## Overview

Implemented a comprehensive rate limit handling system to gracefully handle Cerebras API 429 errors (`queue_exceeded`) with exponential backoff, automatic key rotation, and user-friendly retry logic.

---

## Problem

The application was experiencing 429 rate limit errors from Cerebras API:

```
statusCode: 429
"We're experiencing high traffic right now! Please try again soon."
code: "queue_exceeded"
```

When this occurred:

- ❌ Streams failed immediately without retry
- ❌ Users saw generic error messages
- ❌ Failed API keys continued to be used
- ❌ Transactions were rolled back without recovery

---

## Solution Architecture

### 1. **Retry Handler with Exponential Backoff**

**File:** `lib/ai/cerebras-retry-handler.ts`

**Features:**

- ✅ Exponential backoff (2s → 4s → 8s → 15s max)
- ✅ Random jitter to prevent thundering herd
- ✅ Configurable retry attempts (default: 3)
- ✅ Rate limit detection for 429/queue_exceeded errors
- ✅ Callback hooks for retry events

**Usage:**

```typescript
const result = await withCerebrasRetry(
  async () => await agent.stream(input, options),
  {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15_000,
    onRetry: (attempt, delay, error) => {
      logger.warn(`Retry ${attempt} after ${delay}ms`);
    },
  }
);
```

**Key Functions:**

- `isCerebrasRateLimitError(error)` - Detects 429/queue_exceeded
- `isCerebrasRetryableError(error)` - Checks if error is retryable
- `withCerebrasRetry(fn, options)` - Wraps async function with retry logic

---

### 2. **Enhanced Key Balancer**

**File:** `lib/ai/cerebras-key-balancer.ts`

**Improvements:**

- ✅ Integrated with standardized rate limit detection
- ✅ Automatic 15-second cooldown for rate-limited keys
- ✅ Round-robin rotation to healthy keys
- ✅ Force re-enable when all keys are exhausted
- ✅ Detailed logging for monitoring

**Key Changes:**

```typescript
// Now uses standardized rate limit check
import { isCerebrasRateLimitError } from "./cerebras-retry-handler";

export function handleCerebrasError(error: any, apiKey?: string): void {
  const isRateLimitError = isCerebrasRateLimitError(error);

  if (isRateLimitError) {
    retryDelay = 15; // Short cooldown for temporary traffic
    balancer.markKeyAsFailed(keyToMark, "Rate limit exceeded", retryDelay);
  }
}
```

**Cooldown Strategy:**

- Rate limit errors: **15 seconds** (temporary traffic)
- Server errors (5xx): **30 seconds** (service issues)
- Default errors: **60 seconds** (quota/unknown)

---

### 3. **Mastra SDK Integration**

**File:** `lib/ai/mastra-sdk-integration.ts`

**Changes:**

- ✅ All agent streams wrapped with retry handler
- ✅ Automatic key rotation on retry
- ✅ Detailed retry logging
- ✅ Error propagation with context

**Before:**

```typescript
const stream = await agent.stream(messages, options);
```

**After:**

```typescript
try {
  const stream = await withCerebrasRetry(
    async () => await agent.stream(messages, options),
    {
      maxRetries: 3,
      initialDelay: 2000,
      onRetry: (attempt, delay, error) => {
        logger.warn(`Retry ${attempt} after ${delay}ms`);
        handleCerebrasError(error); // Rotate key
      },
    }
  );
  return stream;
} catch (error) {
  logger.error("Failed after retries:", error);
  handleCerebrasError(error);
  throw error;
}
```

---

### 4. **API Route Error Responses**

**File:** `app/(chat)/api/chat/route.ts`

**Changes:**

- ✅ Proper 429 HTTP responses
- ✅ `Retry-After` header
- ✅ User-friendly error messages
- ✅ Client guidance for retry

**New Response Format:**

```typescript
if (isCerebrasRateLimitError(error)) {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message:
        "Our AI service is experiencing high demand. Your request will be retried automatically.",
      retryAfter: 15, // seconds
      type: "rate_limit",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "15",
      },
    }
  );
}
```

---

### 5. **Client-Side Retry and UX**

**File:** `components/chat.tsx`

**Changes:**

- ✅ Automatic retry on 429 errors
- ✅ User-friendly toast notifications
- ✅ Countdown feedback
- ✅ Distinction between API rate limits and usage quotas

**Flow:**

```typescript
// Handle API rate limit errors (429)
if (
  (error as any).status === 429 ||
  (error as any).error === "rate_limit_exceeded"
) {
  const retryAfter = (error as any).retryAfter || 15;

  // Show info toast
  toast({
    type: "info",
    description: `High traffic detected. Retrying in ${retryAfter} seconds...`,
  });

  // Auto-retry after delay
  setTimeout(() => {
    const lastUserMessage = messages.at(-1);
    if (lastUserMessage) {
      sendMessage(lastUserMessage);
    }
  }, retryAfter * 1000);
}
```

**Error Distinction:**

1. **API Rate Limits (429 - Temporary)** → Auto-retry with toast
2. **Usage Quotas (Plan Limits)** → Show upgrade modal
3. **Connection Errors** → Manual retry prompt

---

## Complete Error Flow

### Server-Side (Backend)

```
1. User sends message
   ↓
2. Mastra SDK attempts stream creation
   ↓
3. Cerebras API returns 429
   ↓
4. Retry handler catches error
   ↓
5. Key balancer rotates to next key
   ↓
6. Retry #1 with 2s delay
   ↓
7. Still 429? Retry #2 with 4s delay
   ↓
8. Still 429? Retry #3 with 8s delay
   ↓
9. Success ✅ OR Final failure after 3 retries
   ↓
10. If final failure: Return 429 to client
```

### Client-Side (Frontend)

```
1. Receives 429 response from API
   ↓
2. Shows toast: "High traffic. Retrying in 15s..."
   ↓
3. Waits 15 seconds
   ↓
4. Automatically re-submits last message
   ↓
5. Success ✅ (backend has rotated keys)
```

---

## Configuration

### Retry Settings

```typescript
// lib/ai/cerebras-retry-handler.ts
const DEFAULT_OPTIONS = {
  maxRetries: 3, // 3 retry attempts
  initialDelay: 2000, // Start with 2 seconds
  maxDelay: 15_000, // Cap at 15 seconds
  backoffMultiplier: 2, // Double each time
};
```

### Key Cooldown Periods

```typescript
// lib/ai/cerebras-key-balancer.ts
if (isRateLimitError) {
  retryDelay = 15; // 15 seconds for temporary traffic
} else if (isServerError) {
  retryDelay = 30; // 30 seconds for server issues
} else {
  retryDelay = 60; // 60 seconds for quota/unknown
}
```

### Client Retry Delay

```typescript
// components/chat.tsx
const retryAfter = (error as any).retryAfter || 15; // Default 15 seconds
```

---

## Benefits

### ✅ Resilience

- Automatic recovery from temporary rate limits
- Multiple API keys with intelligent rotation
- Exponential backoff prevents API hammering

### ✅ User Experience

- Transparent auto-retry (user doesn't need to act)
- Clear feedback with countdown
- Distinguishes temporary issues from quota limits

### ✅ Observability

- Detailed logging at every layer
- Key health tracking
- Retry attempt visibility

### ✅ Scalability

- Supports multiple API keys (CEREBRAS_API_KEY_85-89)
- Automatic load balancing
- Cooldown prevents cascading failures

---

## Monitoring

### Key Health Check

```typescript
import { logCerebrasHealth } from "@/lib/ai/cerebras-key-balancer";

// Logs detailed status of all keys
logCerebrasHealth();
```

**Output:**

```
============================================================
[Cerebras Balancer] 📊 KEY HEALTH REPORT
============================================================
Overall Status: 4/5 keys available

Key: csk-v6f9...
  Status: 🔴 DISABLED (until 5:15:32 PM)
  Requests: 127
  Errors: 3
  Last Error: Rate limit exceeded

Key: csk-a2b3...
  Status: 🟢 ACTIVE
  Requests: 98
  Errors: 0
============================================================
```

### Logs to Watch

1. **Retry Attempts:**

   ```
   [Cerebras Retry] ⏳ Rate limit hit, waiting 2000ms before retry (attempt 1/3)
   ```

2. **Key Rotation:**

   ```
   [Cerebras Balancer] 🔄 Rotating away from failed key csk-v6f9...
   [Cerebras Balancer] ⏸️  Key csk-v6f9... in cooldown for 15s
   ```

3. **Auto-Recovery:**

   ```
   [Cerebras Balancer] ✅ Re-enabled key csk-v6f9... after cooldown
   ```

4. **Client Retry:**
   ```
   [Client] Auto-retrying after 15s rate limit
   ```

---

## Testing

### Simulate Rate Limit

To test the rate limit handling:

1. **Trigger 429 Error:**

   - Send multiple rapid requests
   - Use a single API key to exhaust queue faster

2. **Expected Behavior:**

   - Backend retries 3 times with exponential backoff
   - Failed key gets 15s cooldown
   - Next request uses different key
   - If all retries fail, client shows toast and auto-retries after 15s

3. **Verify Logs:**
   ```
   [Mastra SDK] Retry attempt 1 after 2000ms
   [Cerebras Balancer] 🚦 Rate limit error detected - using 15s cooldown
   [Client] Auto-retrying after 15s rate limit
   ```

---

## Files Changed

### New Files

- ✅ `lib/ai/cerebras-retry-handler.ts` - Retry logic with exponential backoff

### Modified Files

- ✅ `lib/ai/cerebras-key-balancer.ts` - Enhanced with retry handler integration
- ✅ `lib/ai/mastra-sdk-integration.ts` - Wrapped streams with retry logic
- ✅ `app/(chat)/api/chat/route.ts` - Added proper 429 responses
- ✅ `components/chat.tsx` - Added auto-retry and user feedback

---

## Edge Cases Handled

### 1. All Keys Rate Limited

```typescript
// Force re-enable least recently disabled key
if (all keys disabled) {
  const leastRecentlyDisabled = findOldestDisabled();
  forceReEnable(leastRecentlyDisabled);
  logger.warn("All keys disabled - forcing re-enable");
}
```

### 2. Nested Error Structures

```typescript
// Handle AI SDK retry errors with nested lastError
const actualError = error?.lastError || error;
const statusCode = actualError?.statusCode || error?.statusCode;
```

### 3. Concurrent Requests

```typescript
// Per-key cooldown with independent timers
stats.disabledUntil = Date.now() + cooldownMs;

// Round-robin continues with available keys
const nextKey = getNextAvailableKey();
```

### 4. User Cancellation

```typescript
// Don't retry if user stopped the stream
if (userStopped) {
  return;
}
```

---

## Comparison: Before vs After

| Scenario             | Before                     | After                               |
| -------------------- | -------------------------- | ----------------------------------- |
| **Single 429 Error** | ❌ Immediate failure       | ✅ Auto-retry 3x with backoff       |
| **All Keys Limited** | ❌ Complete service outage | ✅ Cooldown + force re-enable       |
| **User Experience**  | ❌ "An error occurred"     | ✅ "Retrying in 15s..."             |
| **Key Management**   | ❌ No rotation             | ✅ Automatic rotation with cooldown |
| **Recovery Time**    | ❌ Manual intervention     | ✅ 15-30 seconds automatic          |
| **Observability**    | ❌ Generic errors          | ✅ Detailed logging per layer       |

---

## Future Enhancements

### Potential Improvements

1. **Request Queuing**

   - Queue requests when all keys are limited
   - Process queue as keys become available

2. **Adaptive Delays**

   - Learn optimal cooldown from error responses
   - Adjust delays based on queue depth

3. **Circuit Breaker**

   - Temporarily disable failing keys after threshold
   - Prevent cascading failures

4. **Metrics Dashboard**

   - Real-time key health visualization
   - Rate limit frequency tracking
   - Success/failure rates

5. **Smart Retry Decision**
   - Skip retry for non-idempotent operations
   - Exponential backoff with circuit breaker

---

## Maintenance

### Regular Checks

1. **Monitor Key Health**

   ```bash
   # Add to logging dashboard
   grep "KEY HEALTH REPORT" logs.txt
   ```

2. **Track Retry Rates**

   ```bash
   # Count retry attempts
   grep "Retry attempt" logs.txt | wc -l
   ```

3. **Identify Patterns**
   ```bash
   # Check which keys fail most
   grep "DISABLED key" logs.txt | sort | uniq -c
   ```

### When to Add More Keys

- ⚠️ All keys consistently rate-limited
- ⚠️ Retry success rate < 50%
- ⚠️ Average response time > 30 seconds

---

## Success Metrics

✅ **Resilience:** Streams succeed after 1-2 retries instead of failing  
✅ **UX:** Users see progress instead of errors  
✅ **Recovery:** Automatic within 15-30 seconds  
✅ **Visibility:** Clear logging at every layer  
✅ **Scalability:** Load distributed across 5 API keys

---

## Summary

The implementation provides a **multi-layered defense** against rate limits:

1. **Backend Retry Layer** - 3 attempts with exponential backoff
2. **Key Rotation Layer** - Automatic cooldown and failover
3. **Client Retry Layer** - User-friendly auto-retry
4. **Monitoring Layer** - Comprehensive logging

This ensures that **temporary rate limits don't break the user experience**, and the system **automatically recovers** without manual intervention.

---

**Implementation Complete:** November 6, 2025 ✅
