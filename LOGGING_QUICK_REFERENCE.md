# Logging Quick Reference

## What You'll See in Your Console

### ✅ Normal Operation

```
[Cerebras Balancer] 🔑 Using key sk-abc12... (Request #15, 5/5 keys available)
```

**Meaning:** Request is using key #1, this is its 15th request, all 5 keys are healthy.

---

### ⚠️ Key Disabled (Automatic Recovery)

```
[Cerebras Balancer] ⚠️  DISABLED key sk-abc12... for 15s due to: Queue exceeded
[Cerebras Balancer] 📊 Status: 4/5 keys available, 1 total errors on this key
```

**Meaning:** Key temporarily disabled, will auto-recover in 15 seconds. 4 other keys still working.

---

### 🔄 Key Rotation

```
[Main Chat] 🔄 Attempting automatic key rotation...
[Cerebras Balancer] 🔄 Rotating away from failed key sk-abc12...
```

**Meaning:** System detected an error and is switching to a different key.

---

### ✅ Key Re-enabled

```
[Cerebras Balancer] ✅ Re-enabled key sk-abc12... after cooldown (5/5 keys now available)
```

**Meaning:** Key cooldown expired, back in rotation. All keys healthy again.

---

### 🚨 All Keys Disabled (Rare)

```
[Cerebras Balancer] ⚠️  ALL KEYS DISABLED - forcing re-enable of least recently disabled key
```

**Meaning:** All keys hit rate limits. System forcing earliest one back online. **Action needed: Add more keys or reduce request rate.**

---

## Error Type Indicators

| Symbol | Error Type     | Cooldown | Meaning                 |
| ------ | -------------- | -------- | ----------------------- |
| 🚦     | Queue Exceeded | 15s      | Temporary traffic spike |
| 🔧     | Server Error   | 30s      | Cerebras server issue   |
| ⏱️     | Rate Limit     | 60s      | API quota exceeded      |

---

## Quick Health Check

Run this in your code to see detailed status:

```typescript
import { logCerebrasHealth } from "@/lib/ai/cerebras-key-balancer";
logCerebrasHealth();
```

---

## When to Take Action

### 🟢 Everything Normal

```
📊 Status: 5/5 keys available
```

**Action:** None needed.

### 🟡 Some Keys Disabled

```
📊 Status: 3/5 keys available
```

**Action:** Monitor. System handling it automatically.

### 🔴 Most/All Keys Disabled

```
📊 Status: 1/5 keys available
```

**Action:** Consider adding more API keys or reducing request rate.

---

## Filter Logs in Terminal

```bash
# Show only key rotation events
pnpm dev | grep "🔄\|⚠️"

# Show only errors
pnpm dev | grep "❌"

# Show key health
pnpm dev | grep "📊"

# Show everything from balancer
pnpm dev | grep "Cerebras Balancer"
```
