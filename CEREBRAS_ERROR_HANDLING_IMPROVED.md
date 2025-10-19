# Cerebras Error Handling - Improved System

## Overview

This document describes the improved error handling system for Cerebras API rate limits and queue exceeded errors.

## Error Types

### 1. Queue Exceeded (429 - queue_exceeded)

**Cause:** Cerebras servers are experiencing high traffic
**Response:** `"We're experiencing high traffic right now! Please try again soon."`
**Handling:**

- Automatically rotates to next available API key
- 15-second cooldown (shorter than quota errors)
- Retries up to 5 times across different keys
- User-friendly message explaining automatic server switching

### 2. Rate Limit (429 - rate_limit)

**Cause:** API key quota exhausted
**Response:** Various rate limit messages
**Handling:**

- 60-second cooldown for the affected key
- Automatic rotation to next key
- Retries with exponential backoff

### 3. Server Error (500)

**Cause:** Cerebras server issues
**Handling:**

- 30-second cooldown
- Automatic key rotation
- Fallback to alternative keys

## Key Improvements

### 1. Automatic Error Detection & Key Rotation

```typescript
// In chat route onError handler
handleCerebrasError(error);
```

- Detects error type from nested error structure
- Extracts `lastError`, `statusCode`, `errorCode`, `errorData`
- Automatically marks failed keys and rotates to healthy ones

### 2. Smart Cooldown Periods

- **Queue exceeded:** 15 seconds (temporary traffic issue)
- **Server error:** 30 seconds (medium recovery time)
- **Quota exceeded:** 60 seconds (longer recovery needed)

### 3. Increased Retry Attempts

- Changed from `maxRetries: 2` to `maxRetries: 5`
- With 5 API keys, this allows trying all keys before failing
- Each retry uses a different key via round-robin rotation

### 4. Better User Messaging

```typescript
// Queue exceeded
"Our AI service is experiencing high demand. We're automatically switching to another server. Please try again.";

// Rate limit
"Too many requests. Our system is automatically rotating to available servers. Please wait 10-15 seconds and try again.";

// All keys exhausted
"All available AI servers are currently busy. Please wait 30-60 seconds before trying again.";
```

### 5. Most Recently Used Key Tracking

```typescript
getMostRecentlyUsedKey(): string | undefined
```

- When error doesn't specify which key failed
- Automatically identifies and disables the most recently used key
- Prevents repeated failures on the same key

## Architecture

### Error Flow

```
1. User sends message
2. Chat route calls streamText with Cerebras model
3. Cerebras API returns 429 queue_exceeded
4. AI SDK retries (attempt 1 of 5)
5. onError handler calls handleCerebrasError()
6. Balancer marks key as failed (15s cooldown)
7. Next retry uses different key (round-robin)
8. Process repeats until success or all retries exhausted
```

### Key Balancer States

```typescript
interface KeyUsageStats {
  key: string;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  isDisabled: boolean;
  disabledUntil?: number;
}
```

## Configuration

### API Keys

Set up multiple keys in `.env.local`:

```bash
CEREBRAS_API_KEY_85=your_key_1
CEREBRAS_API_KEY_86=your_key_2
CEREBRAS_API_KEY_87=your_key_3
CEREBRAS_API_KEY_88=your_key_4
CEREBRAS_API_KEY_89=your_key_5
```

### Retry Configuration

In `app/(chat)/api/chat/route.ts`:

```typescript
streamText({
  maxRetries: 5, // Try up to 5 times
  // ... other config
});
```

## Monitoring

### Check Key Health

```typescript
import { getCerebrasStats } from "@/lib/ai/cerebras-key-balancer";

const stats = getCerebrasStats();
console.log(stats);
// Output:
// [
//   {
//     key: "sk-abc12...",
//     lastUsed: 1729300431000,
//     requestCount: 45,
//     errorCount: 2,
//     lastError: "Queue exceeded",
//     isDisabled: false
//   },
//   // ... more keys
// ]
```

### Console Logs

The system logs key rotation events:

```
[Cerebras Balancer] Queue exceeded error detected - using 15s cooldown
[Cerebras Balancer] Disabled key sk-abc12... for 15s due to: Queue exceeded
[Cerebras Balancer] Re-enabled key sk-abc12... after cooldown
```

## Best Practices

### 1. Use Multiple Keys

- Minimum 3 keys recommended
- 5 keys provides best resilience
- Each key gets independent rate limits

### 2. Monitor Error Rates

- Check `errorCount` in key stats
- If all keys frequently disabled, consider:
  - Adding more keys
  - Implementing request queuing
  - Rate limiting on your end

### 3. Handle Exhaustion Gracefully

- When all retries fail, show clear message
- Suggest waiting 30-60 seconds
- Consider implementing client-side retry with exponential backoff

### 4. Fallback Strategy

For critical applications, consider:

```typescript
// In providers.ts
"chat-model": (() => {
  try {
    return cerebrasProvider("gpt-oss-120b");
  } catch (error) {
    console.warn("Cerebras unavailable, falling back to Gemini");
    return googleProvider("gemini-2.5-flash");
  }
})()
```

## Testing

### Simulate Queue Exceeded Error

1. Make rapid requests to exhaust a key
2. Observe automatic rotation in logs
3. Verify cooldown and re-enabling

### Verify Key Rotation

```bash
# Watch logs while making requests
pnpm dev

# In another terminal, make multiple requests
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

## Troubleshooting

### All Keys Disabled

**Symptom:** "All available AI servers are currently busy"
**Solution:**

1. Wait 60 seconds for cooldowns to expire
2. Check if keys are valid
3. Verify Cerebras API status
4. Consider adding more keys

### Frequent Queue Exceeded

**Symptom:** Many 429 errors in logs
**Solution:**

1. Add more API keys
2. Implement request queuing
3. Add client-side rate limiting
4. Consider upgrading Cerebras plan

### Keys Not Rotating

**Symptom:** Same key fails repeatedly
**Solution:**

1. Check balancer initialization logs
2. Verify multiple keys in `.env.local`
3. Ensure server-side execution (not client)
4. Check `handleCerebrasError()` is being called

## Future Enhancements

### Potential Improvements

1. **Exponential Backoff:** Increase delay between retries
2. **Request Queuing:** Queue requests when all keys busy
3. **Health Checks:** Proactively test key health
4. **Metrics Dashboard:** Real-time key usage visualization
5. **Smart Routing:** Route to least-used healthy key
6. **Circuit Breaker:** Temporarily disable balancer if all keys consistently fail

## Related Files

- `lib/ai/cerebras-key-balancer.ts` - Core balancer logic
- `app/(chat)/api/chat/route.ts` - Error handling integration
- `lib/ai/providers.ts` - Provider configuration
- `lib/errors.ts` - Error type definitions
