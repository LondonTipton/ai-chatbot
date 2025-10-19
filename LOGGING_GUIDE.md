# Cerebras Key Balancer - Logging Guide

## Overview

The Cerebras key balancer now includes comprehensive logging to help you monitor key rotation, health, and usage patterns.

## Log Symbols

- 🔑 Key usage/selection
- ✅ Success/re-enabled
- ⚠️ Warning/disabled
- ❌ Error
- 🔄 Rotation/switching
- 📊 Statistics/health
- 🔍 Analysis
- 🚦 Queue issues
- 🔧 Server issues
- ⏱️ Rate limit
- 💬 Chat message
- 🤖 Model selection
- 📝 Message content
- 🚀 Starting operation

## Startup Logs

When the app starts, you'll see:

```
[Cerebras Balancer] Loaded 5 API key(s)
[Cerebras Balancer] 🔑 Initialized keys:
[Cerebras Balancer]   Key 1: sk-abc12... ✅
[Cerebras Balancer]   Key 2: sk-def34... ✅
[Cerebras Balancer]   Key 3: sk-ghi56... ✅
[Cerebras Balancer]   Key 4: sk-jkl78... ✅
[Cerebras Balancer]   Key 5: sk-mno90... ✅
[Providers] Using Cerebras key balancer
```

## Normal Request Flow

Each request shows which key is being used:

```
[Main Chat] 💬 Chat ID: abc-123
[Main Chat] 🤖 Selected Model: chat-model
[Main Chat] 📝 Message: What is the legal definition of...
[Main Chat] 🚀 Starting stream with model: chat-model
[Cerebras Balancer] 🔑 Using key sk-abc12... (Request #15, 5/5 keys available)
```

## Key Rotation on Error

When an error occurs and key rotation happens:

```
[Main Chat] ❌ Stream error: [Error: We're experiencing high traffic...]
[Main Chat] 🔄 Attempting automatic key rotation...
[Cerebras Balancer] 🔍 Analyzing error: Status 429, Code: queue_exceeded
[Cerebras Balancer] 🚦 Queue exceeded error detected - using 15s cooldown
[Cerebras Balancer] 🔄 Rotating away from failed key sk-abc12...
[Cerebras Balancer] ⚠️  DISABLED key sk-abc12... for 15s due to: Queue exceeded
[Cerebras Balancer] 📊 Status: 4/5 keys available, 1 total errors on this key
[Main Chat] 📊 Key Health: 4/5 keys available
```

## Key Re-enabling

When a key's cooldown expires:

```
[Cerebras Balancer] ✅ Re-enabled key sk-abc12... after cooldown (5/5 keys now available)
```

## All Keys Disabled (Emergency)

If all keys get disabled simultaneously:

```
[Cerebras Balancer] ⚠️  ALL KEYS DISABLED - forcing re-enable of least recently disabled key
[Cerebras Balancer] 🔄 Force re-enabled key sk-abc12... (was disabled until 2:30:45 PM)
```

## Different Error Types

### Queue Exceeded (429)

```
[Cerebras Balancer] 🚦 Queue exceeded error detected - using 15s cooldown
```

### Server Error (500)

```
[Cerebras Balancer] 🔧 Server error detected - using 30s cooldown
```

### Rate Limit (429)

```
[Cerebras Balancer] ⏱️  Rate limit detected - using 60s cooldown
```

### Non-rotatable Error

```
[Cerebras Balancer] ℹ️  Error not related to rate limits or server issues - no key rotation needed
```

## Health Report

You can manually check key health by calling `logCerebrasHealth()`:

```typescript
import { logCerebrasHealth } from "@/lib/ai/cerebras-key-balancer";
logCerebrasHealth();
```

Output:

```
============================================================
[Cerebras Balancer] 📊 KEY HEALTH REPORT
============================================================
Overall Status: 4/5 keys available

Key: sk-abc12...
  Status: 🔴 DISABLED (until 2:30:45 PM)
  Requests: 45
  Errors: 2
  Last Error: Queue exceeded

Key: sk-def34...
  Status: 🟢 ACTIVE
  Requests: 38
  Errors: 0

Key: sk-ghi56...
  Status: 🟢 ACTIVE
  Requests: 42
  Errors: 1
  Last Error: Server error

Key: sk-jkl78...
  Status: 🟢 ACTIVE
  Requests: 40
  Errors: 0

Key: sk-mno90...
  Status: 🟢 ACTIVE
  Requests: 35
  Errors: 0

============================================================
```

## Monitoring Tips

### 1. Watch for Frequent Rotations

If you see many key rotations in a short time:

```
[Cerebras Balancer] ⚠️  DISABLED key sk-abc12... for 15s
[Cerebras Balancer] ⚠️  DISABLED key sk-def34... for 15s
[Cerebras Balancer] ⚠️  DISABLED key sk-ghi56... for 15s
```

**Action:** You may need more API keys or to reduce request rate.

### 2. Check Key Distribution

Keys should have roughly equal request counts:

```
Key 1: Request #45
Key 2: Request #42
Key 3: Request #48
Key 4: Request #40
Key 5: Request #43
```

If one key has significantly more requests, rotation may not be working properly.

### 3. Monitor Error Rates

High error counts on specific keys may indicate:

- That key has lower quota
- That key is experiencing issues
- Need to replace that key

### 4. All Keys Disabled

If you see this frequently:

```
[Cerebras Balancer] ⚠️  ALL KEYS DISABLED
```

**Action:** Add more API keys or implement request queuing.

## Filtering Logs

### Show Only Key Rotation

```bash
pnpm dev | grep "Cerebras Balancer"
```

### Show Only Errors

```bash
pnpm dev | grep "❌\|⚠️"
```

### Show Only Key Usage

```bash
pnpm dev | grep "🔑 Using key"
```

### Show Health Status

```bash
pnpm dev | grep "📊"
```

## Production Logging

In production, consider:

1. **Reduce verbosity** - Comment out the "Using key" log in `updateStats()`
2. **Keep error logs** - Always log rotations and errors
3. **Add metrics** - Send key health to monitoring service
4. **Alert on issues** - Set up alerts for "ALL KEYS DISABLED"

## Debugging Scenarios

### Scenario 1: Requests Failing

**Look for:**

```
[Cerebras Balancer] 📊 Status: 0/5 keys available
```

**Solution:** All keys exhausted, wait for cooldowns or add more keys.

### Scenario 2: Slow Responses

**Look for:**

```
[Cerebras Balancer] 🔄 Rotating away from failed key
```

**Solution:** Keys are rotating due to errors, may need more capacity.

### Scenario 3: Uneven Load

**Look for:**

```
Key 1: Request #100
Key 2: Request #5
```

**Solution:** Check if some keys are frequently disabled.

## API for Programmatic Access

```typescript
import {
  getCerebrasStats,
  logCerebrasHealth,
  handleCerebrasError,
} from "@/lib/ai/cerebras-key-balancer";

// Get stats programmatically
const stats = getCerebrasStats();
console.log(`Healthy keys: ${stats.filter((s) => !s.isDisabled).length}`);

// Log detailed health report
logCerebrasHealth();

// Manually trigger error handling (usually automatic)
handleCerebrasError(error, apiKey);
```

## Related Files

- `lib/ai/cerebras-key-balancer.ts` - Core balancer with logging
- `app/(chat)/api/chat/route.ts` - Chat route with error logging
- `ERROR_HANDLING_SUMMARY.md` - Error handling overview
