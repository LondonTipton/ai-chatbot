# Retry Configuration

## Overview

The application uses a **two-layer retry system** with intelligent key rotation to handle failures gracefully.

## Retry Layers

### Layer 1: Cerebras SDK Retries (Per Key)

**Status:** ✅ **DISABLED** (set to 0)

```typescript
createCerebras({
  apiKey: key,
  maxRetries: 0, // Disabled - we handle retries ourselves
});
```

**Why disabled:**

- We have our own key rotation logic
- Prevents redundant attempts on the same failing key
- Faster failure detection and key switching
- More predictable retry behavior

### Layer 2: AI SDK Retries (Across Keys)

**Status:** ✅ **ENABLED** (set to 5)

```typescript
streamText({
  maxRetries: 5, // Try up to 5 different keys
  // ...
});
```

**Why enabled:**

- Rotates through all 5 API keys
- Each retry uses a different key
- Handles rate limits and temporary failures
- Maximizes success rate

## How It Works

### Before (With Cerebras SDK Retries)

```
Attempt 1: Key 1 → Fail → Retry Key 1 → Fail (2 calls to same key)
Attempt 2: Key 2 → Fail → Retry Key 2 → Fail (2 calls to same key)
Attempt 3: Key 3 → Success

Total: 5 API calls, 2 keys wasted on redundant retries
```

### After (Without Cerebras SDK Retries)

```
Attempt 1: Key 1 → Fail (1 call, immediate rotation)
Attempt 2: Key 2 → Fail (1 call, immediate rotation)
Attempt 3: Key 3 → Success

Total: 3 API calls, faster failure detection
```

## Configuration Summary

| Setting                     | Value  | Purpose                       |
| --------------------------- | ------ | ----------------------------- |
| **Cerebras SDK maxRetries** | 0      | Disabled - we handle retries  |
| **AI SDK maxRetries**       | 5      | Try all 5 keys before failing |
| **Total Keys**              | 5      | Round-robin rotation          |
| **Route Timeout**           | 60s    | Overall request timeout       |
| **Key Cooldowns**           | 15-60s | Temporary key disabling       |

## Retry Flow

### Successful Request

```
User Request
    ↓
AI SDK: Attempt 1 with Key 1
    ↓
Cerebras SDK: Single attempt (maxRetries=0)
    ↓
Success ✅
Time: 1-5 seconds
```

### Failed Request with Recovery

```
User Request
    ↓
AI SDK: Attempt 1 with Key 1
    ↓
Cerebras SDK: Single attempt → 429 Error
    ↓
Key Balancer: Disable Key 1 for 15s
    ↓
AI SDK: Attempt 2 with Key 2
    ↓
Cerebras SDK: Single attempt → Success ✅
Time: 2-10 seconds
```

### Multiple Failures

```
User Request
    ↓
Attempt 1: Key 1 → 429 → Disabled 15s
Attempt 2: Key 2 → 429 → Disabled 15s
Attempt 3: Key 3 → 429 → Disabled 15s
Attempt 4: Key 4 → 429 → Disabled 15s
Attempt 5: Key 5 → 429 → Disabled 15s
Attempt 6: Force re-enable oldest key → Success ✅
Time: 30-60 seconds
```

## Benefits of This Approach

### 1. Faster Failure Detection

- No redundant retries on failing keys
- Immediate rotation to healthy keys
- Reduced latency on failures

### 2. Better Resource Utilization

- Each key gets one chance per retry cycle
- No wasted API calls on known-bad keys
- More efficient use of rate limits

### 3. Predictable Behavior

- Clear retry count (5 attempts = 5 keys)
- Easy to reason about retry logic
- Simpler debugging

### 4. Optimal for Multiple Keys

- Designed for key rotation
- Maximizes availability
- Handles rate limits gracefully

## Comparison with Default Settings

### Default Cerebras SDK (maxRetries=2)

```
5 AI SDK retries × 2 Cerebras retries = 10 total API calls
- More redundant attempts
- Slower failure detection
- Wastes rate limit quota
```

### Our Configuration (maxRetries=0)

```
5 AI SDK retries × 1 Cerebras attempt = 5 total API calls
- Faster key rotation
- Efficient rate limit usage
- Clearer retry logic
```

## When to Adjust

### Increase AI SDK Retries

If you have more than 5 keys:

```typescript
maxRetries: 10, // For 10 keys
```

### Decrease AI SDK Retries

If you want faster failures:

```typescript
maxRetries: 2, // Only try 2 keys
```

### Enable Cerebras SDK Retries

If you have only 1 key (not recommended):

```typescript
createCerebras({
  apiKey: key,
  maxRetries: 2, // Retry same key
});
```

## Monitoring

Watch for these patterns in logs:

### Good Pattern (Fast Rotation)

```
[Cerebras Balancer] 🔑 Using key sk-abc12...
[Cerebras Balancer] ⚠️  DISABLED key sk-abc12... for 15s
[Cerebras Balancer] 🔑 Using key sk-def34...
✅ Success
```

### Bad Pattern (Redundant Retries)

```
[Cerebras Balancer] 🔑 Using key sk-abc12...
[Cerebras Balancer] 🔑 Using key sk-abc12... (retry 1)
[Cerebras Balancer] 🔑 Using key sk-abc12... (retry 2)
⚠️  Still failing - should have rotated!
```

## Related Configuration

- `app/(chat)/api/chat/route.ts` - AI SDK retry configuration
- `lib/ai/cerebras-key-balancer.ts` - Key rotation logic
- `lib/ai/providers.ts` - Provider initialization
- `ERROR_HANDLING_SUMMARY.md` - Error handling overview
- `LOGGING_GUIDE.md` - Monitoring and debugging

## Testing

To verify the configuration:

1. **Check logs on startup:**

```
[Cerebras Balancer] Loaded 5 API key(s)
[Providers] Using Cerebras key balancer
```

2. **Trigger a rate limit:**
   Make rapid requests and watch for immediate key rotation without redundant retries.

3. **Monitor retry count:**
   Each key should only be tried once per retry cycle.

## Summary

✅ **AI SDK retries: 5** (up to 6 total attempts)  
✅ **Key rotation: AUTOMATIC** (round-robin with health tracking)  
✅ **Cooldown: 15-60 seconds** (based on error type)  
✅ **Total timeout: 60 seconds** (Vercel function limit)  
✅ **Retry mechanism: Single layer** (AI SDK only, no nested retries)

This configuration provides optimal performance for multi-key setups with intelligent failure handling.

## Key Takeaway

Unlike the native Cerebras Python SDK which has its own `max_retries` parameter, the `@ai-sdk/cerebras` package delegates all retry logic to the AI SDK level. This is actually **beneficial** because it integrates seamlessly with our key rotation system and provides cleaner, more predictable retry behavior.
