# Design Document

## Overview

This design implements a transactional usage tracking system with automatic retry logic for AI chat responses. The solution wraps the existing streaming response flow with validation checkpoints and retry orchestration, ensuring users only consume quota for valid responses while maintaining backward compatibility with the current architecture.

The design follows a layered approach:

1. **Transaction Layer**: Manages usage counter state transitions
2. **Validation Layer**: Determines response quality and validity
3. **Retry Orchestration Layer**: Coordinates retry attempts with backoff
4. **Fallback Strategy Layer**: Provides graceful degradation options

## Architecture

### High-Level Flow

```
User Request
    ↓
[Auth & Rate Limit Check] ← Creates transaction context (no DB increment yet)
    ↓
[Save User Message]
    ↓
[Stream AI Response]
    ↓
[Validate Response] ← Check if response is meaningful
    ↓
    ├─ Valid? → [Commit Usage] → Return Response
    ↓
    └─ Invalid? → [Retry Manager]
                      ↓
                      ├─ Retry 1 (1s delay)
                      ├─ Retry 2 (2s delay)
                      ├─ Retry 3 (4s delay)
                      ├─ Fallback Attempt (simplified tools)
                      ↓
                      ├─ Success? → [Commit Usage] → Return Response
                      └─ All Failed? → [Rollback Usage] → Return Error
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat API Route                          │
│  (app/(chat)/api/chat/route.ts)                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ Usage Transaction│   │  Retry Manager   │
│     Manager      │   │                  │
│                  │   │ - Orchestrates   │
│ - beginTx()      │   │   retry attempts │
│ - commitTx()     │   │ - Backoff logic  │
│ - rollbackTx()   │   │ - Fallback       │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         │              ┌───────┴────────┐
         │              │                │
         ▼              ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │  Response    │  │   Stream     │
│   (usage)    │  │  Validator   │  │   Handler    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Components and Interfaces

### 1. Usage Transaction Manager

**Location**: `lib/db/usage-transaction.ts`

**Purpose**: Manages transactional usage tracking with commit/rollback capabilities.

**Interface**:

```typescript
export interface UsageTransaction {
  userId: string;
  transactionId: string;
  startTime: Date;
  committed: boolean;
  rolledBack: boolean;
}

export interface UsageTransactionManager {
  /**
   * Begin a transaction - checks if user can make request
   * Does NOT increment counter yet
   */
  beginTransaction(userId: string): Promise<{
    allowed: boolean;
    transaction?: UsageTransaction;
    currentUsage: UsageCheckResult;
  }>;

  /**
   * Commit transaction - actually increments the counter
   */
  commitTransaction(transactionId: string): Promise<{
    success: boolean;
    newUsage: UsageCheckResult;
  }>;

  /**
   * Rollback transaction - no-op since we never incremented
   * But if we need to decrement due to prior increment, this handles it
   */
  rollbackTransaction(transactionId: string): Promise<{
    success: boolean;
    currentUsage: UsageCheckResult;
  }>;
}
```

**Implementation Strategy**:

- Store active transactions in-memory Map (cleared after 5 minutes)
- On `beginTransaction`: Check current usage, return allowed/denied without DB write
- On `commitTransaction`: Perform the actual `checkAndIncrementUsage` call
- On `rollbackTransaction`: If already committed, decrement counter; otherwise no-op

**Why In-Memory?**

- Transactions are short-lived (seconds to ~60s max)
- No need for Redis/persistent storage
- Simpler implementation, fewer dependencies
- Automatic cleanup via TTL

### 2. Enhanced Response Validator

**Location**: `lib/utils/validate-response.ts` (extend existing)

**Purpose**: Comprehensive validation with detailed reasoning.

**Interface**:

```typescript
export interface ValidationResult {
  isValid: boolean;
  reason: string;
  metrics: {
    assistantMessageCount: number;
    totalTextLength: number;
    hasToolOutputs: boolean;
    emptyMessages: number;
    toolCallsWithoutText: number;
  };
}

export function validateResponseEnhanced(messages: any[]): ValidationResult;
```

**Validation Rules**:

1. **Valid if**: Total text length >= 10 characters
2. **Valid if**: Has tool outputs AND follow-up text >= 10 characters
3. **Invalid if**: Only tool calls, no text
4. **Invalid if**: All assistant messages are empty
5. **Invalid if**: Only whitespace or formatting characters

**Enhancement over existing**:

- Current `validateResponse` only returns boolean + metrics
- New version adds detailed `reason` field for logging
- Adds `toolCallsWithoutText` metric to detect Cerebras issue

### 3. Retry Manager

**Location**: `lib/ai/retry-manager.ts`

**Purpose**: Orchestrates retry attempts with exponential backoff and fallback strategies.

**Interface**:

```typescript
export interface RetryConfig {
  maxRetries: number; // Default: 3
  backoffDelays: number[]; // Default: [1000, 2000, 4000] ms
  enableFallback: boolean; // Default: true
  fallbackModel?: string; // Optional fallback model
}

export interface RetryContext {
  attemptNumber: number;
  totalAttempts: number;
  lastError?: string;
  lastValidation?: ValidationResult;
}

export interface RetryResult {
  success: boolean;
  messages?: any[];
  validation?: ValidationResult;
  attemptsUsed: number;
  usedFallback: boolean;
  totalDuration: number;
}

export class RetryManager {
  constructor(config: RetryConfig);

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: (context: RetryContext) => Promise<T>,
    validator: (result: T) => ValidationResult
  ): Promise<RetryResult>;
}
```

**Retry Strategy**:

1. **Attempt 1**: Original request (already executed)
2. **Attempt 2**: Retry after 1s with same config
3. **Attempt 3**: Retry after 2s with same config
4. **Attempt 4**: Retry after 4s with same config
5. **Attempt 5 (Fallback)**: Retry with simplified tools

**Backoff Implementation**:

```typescript
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Fallback Configuration**:

- Remove all tools except `createDocument`, `updateDocument`
- Use same model (don't switch models to avoid confusion)
- Add system prompt hint: "Provide a direct answer without using external tools"

### 4. Stream Handler with Retry Integration

**Location**: `app/(chat)/api/chat/route.ts` (modify existing)

**Purpose**: Integrate retry logic into existing streaming flow.

**Modified Flow**:

```typescript
// Current flow (simplified)
const stream = createUIMessageStream({
  execute: ({ writer }) => {
    const result = streamText({ ... });
    writer.merge(result.toUIMessageStream());
  },
  onFinish: async ({ messages }) => {
    await saveMessages({ messages });
  }
});

// New flow with retry
const stream = await executeStreamWithRetry({
  transaction,
  config: retryConfig,
  streamFactory: ({ writer, retryContext }) => {
    return createUIMessageStream({
      execute: ({ writer }) => {
        // Send retry status if not first attempt
        if (retryContext.attemptNumber > 1) {
          writer.write({
            type: 'retry-status',
            data: {
              attempt: retryContext.attemptNumber,
              maxAttempts: retryContext.totalAttempts
            }
          });
        }

        const result = streamText({ ... });
        writer.merge(result.toUIMessageStream());
      },
      onFinish: async ({ messages }) => {
        // Validate before saving
        const validation = validateResponseEnhanced(messages);

        if (!validation.isValid) {
          throw new RetryableError(validation.reason);
        }

        await saveMessages({ messages });
        return { messages, validation };
      }
    });
  }
});
```

**Key Changes**:

1. Wrap `createUIMessageStream` in retry orchestration
2. Validate in `onFinish` before saving
3. Throw `RetryableError` to trigger retry
4. Commit transaction only after successful validation

## Data Models

### Transaction State (In-Memory)

```typescript
interface TransactionState {
  transactionId: string;
  userId: string;
  startTime: Date;
  expiresAt: Date; // startTime + 5 minutes
  committed: boolean;
  rolledBack: boolean;
  attemptCount: number;
  lastAttemptTime?: Date;
}

// Global in-memory store
const activeTransactions = new Map<string, TransactionState>();
```

### Usage Tracking (Database - No Schema Changes)

Existing schema in `lib/db/schema.ts` already supports our needs:

- `requestsToday`: Current daily count
- `dailyRequestLimit`: Max allowed
- `lastRequestReset`: Last reset timestamp

**No database migrations required** - we're just changing when we increment.

### Retry Metrics (Logging Only)

```typescript
interface RetryMetrics {
  chatId: string;
  userId: string;
  modelId: string;
  complexity: string;
  totalAttempts: number;
  successfulAttempt?: number;
  usedFallback: boolean;
  totalDuration: number;
  validationFailures: string[];
  timestamp: Date;
}
```

Logged to console in structured format for monitoring.

## Error Handling

### Error Types

```typescript
// Retryable errors - trigger retry logic
export class RetryableError extends Error {
  constructor(message: string, public validation: ValidationResult) {
    super(message);
    this.name = "RetryableError";
  }
}

// Non-retryable errors - fail immediately
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}
```

### Error Handling Strategy

1. **Authentication Errors**: Non-retryable, return immediately
2. **Rate Limit Errors**: Non-retryable, return 429
3. **Empty Response**: Retryable, trigger retry logic
4. **Network Errors**: Already handled by AI SDK `maxRetries: 5`
5. **Validation Errors**: Retryable, trigger retry logic
6. **Database Errors**: Log and continue (don't block user)

### Rollback Scenarios

**When to rollback**:

1. All retry attempts exhausted
2. Fallback attempt also failed
3. User receives error message

**When NOT to rollback**:

1. Any attempt succeeded (even fallback)
2. Non-retryable error occurred (auth, rate limit)
3. Transaction never committed (nothing to rollback)

**Rollback Implementation**:

```typescript
async function rollbackUsage(userId: string): Promise<void> {
  try {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!userRecord) return;

    const currentCount = parseInt(userRecord.requestsToday || "0", 10);
    const newCount = Math.max(0, currentCount - 1);

    await db
      .update(user)
      .set({
        requestsToday: newCount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log(`[Rollback] User ${userId}: ${currentCount} → ${newCount}`);
  } catch (error) {
    console.error(`[Rollback] CRITICAL: Failed for user ${userId}:`, error);
    // Don't throw - we've already failed the request
  }
}
```

## Testing Strategy

### Unit Tests

1. **Usage Transaction Manager**

   - Test transaction lifecycle (begin → commit)
   - Test transaction lifecycle (begin → rollback)
   - Test concurrent transactions for same user
   - Test transaction expiration/cleanup

2. **Enhanced Validator**

   - Test valid responses (text only)
   - Test valid responses (tools + text)
   - Test invalid responses (tools only)
   - Test invalid responses (empty)
   - Test edge cases (whitespace, special chars)

3. **Retry Manager**
   - Test successful first attempt (no retry)
   - Test retry with eventual success
   - Test all retries exhausted
   - Test backoff timing
   - Test fallback activation

### Integration Tests

1. **End-to-End Flow**

   - Send message → receive valid response → usage incremented
   - Send message → empty response → retry → success → usage incremented once
   - Send message → all retries fail → usage not incremented

2. **Error Scenarios**

   - Rate limit hit → no retry attempted
   - Auth failure → no retry attempted
   - Network error → AI SDK retries, then our retry if needed

3. **Concurrent Requests**
   - Multiple requests from same user
   - Verify usage counter accuracy
   - Verify transaction isolation

### Manual Testing Checklist

- [ ] Normal chat flow works unchanged
- [ ] Empty response triggers retry (check logs)
- [ ] Retry status shows in UI
- [ ] Usage counter accurate after retries
- [ ] Rollback works when all retries fail
- [ ] Fallback mode activates correctly
- [ ] Error messages user-friendly
- [ ] Performance acceptable (< 100ms overhead)

## Performance Considerations

### Latency Impact

**Added Latency**:

- Transaction begin: ~5ms (in-memory check)
- Validation: ~2ms (iterate messages)
- Retry delay: 1s, 2s, 4s (only on failure)
- Transaction commit: ~20ms (DB write)

**Total overhead for successful request**: ~27ms (negligible)

**Total time for failed request with retries**: ~7s + original request time

### Memory Usage

**In-Memory Transaction Store**:

- ~500 bytes per transaction
- Max concurrent: ~1000 users (assuming 1 req/user)
- Total memory: ~500KB (negligible)

**Cleanup Strategy**:

- Run cleanup every 60 seconds
- Remove transactions older than 5 minutes
- Remove committed/rolled-back transactions after 1 minute

### Database Load

**Current**: 1 write per request (increment counter)
**New**: 1 write per request (still just increment, but delayed)

**No increase in database load** - we're just changing timing.

### Monitoring Metrics

Track these metrics for performance monitoring:

1. Average retry rate (target: < 5%)
2. Average validation time (target: < 5ms)
3. Transaction commit success rate (target: > 99.9%)
4. Rollback frequency (target: < 1%)

## Security Considerations

### Abuse Prevention

**Concern**: Users might exploit retry logic to get "free" requests.

**Mitigation**:

1. Retries use same transaction - no extra quota
2. Max 3 retries + 1 fallback = 5 total attempts
3. Exponential backoff prevents rapid-fire retries
4. Transaction expires after 5 minutes
5. Logging tracks all retry patterns for abuse detection

### Data Privacy

**Concern**: Retry logs might expose sensitive user data.

**Mitigation**:

1. Log only metadata (user ID, model, timing)
2. Don't log message content
3. Don't log API keys or tokens
4. Validation reasons are generic (e.g., "empty response")

### Race Conditions

**Concern**: Concurrent requests might cause counter inconsistencies.

**Mitigation**:

1. Database-level atomic operations (existing)
2. Transaction IDs prevent collision
3. Each transaction independent
4. Rollback uses atomic decrement

## Backward Compatibility

### API Contract

**No breaking changes**:

- POST `/api/chat` request/response unchanged
- Error codes unchanged
- Status codes unchanged
- Streaming format unchanged

### Feature Flag

Add environment variable for gradual rollout:

```typescript
const ENABLE_RETRY_LOGIC = process.env.ENABLE_RETRY_LOGIC === "true";

if (ENABLE_RETRY_LOGIC) {
  // Use new retry flow
} else {
  // Use existing flow
}
```

### Migration Path

1. **Phase 1**: Deploy with feature flag OFF
2. **Phase 2**: Enable for internal testing (specific user IDs)
3. **Phase 3**: Enable for 10% of users (A/B test)
4. **Phase 4**: Enable for all users
5. **Phase 5**: Remove feature flag, make permanent

## Deployment Considerations

### Environment Variables

```bash
# Feature flag
ENABLE_RETRY_LOGIC=true

# Retry configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=1000,2000,4000
RETRY_ENABLE_FALLBACK=true

# Transaction configuration
TRANSACTION_TIMEOUT_MS=300000  # 5 minutes
TRANSACTION_CLEANUP_INTERVAL_MS=60000  # 1 minute
```

### Monitoring & Alerts

**Metrics to track**:

1. Retry rate by model
2. Validation failure rate
3. Rollback frequency
4. Average retry duration
5. Fallback usage rate

**Alerts to configure**:

1. Retry rate > 20% for any model
2. Rollback rate > 5%
3. Transaction commit failure > 0.1%
4. Average retry duration > 10s

### Rollback Plan

If issues arise after deployment:

1. **Immediate**: Set `ENABLE_RETRY_LOGIC=false`
2. **Verify**: Check usage counters for inconsistencies
3. **Fix**: Run manual script to correct any counter issues
4. **Investigate**: Review logs to identify root cause
5. **Redeploy**: Fix issues and redeploy with feature flag

## Future Enhancements

### Phase 2 Improvements

1. **Adaptive Retry**: Adjust retry count based on model reliability
2. **Smart Fallback**: Choose fallback model based on query complexity
3. **Persistent Transactions**: Use Redis for multi-instance support
4. **Retry Budget**: Limit total retry time per user per day
5. **Client-Side Retry**: Allow users to manually retry failed requests

### Metrics Dashboard

Build admin dashboard showing:

- Real-time retry rates
- Model reliability scores
- Usage counter accuracy
- Rollback frequency trends
- User impact metrics
