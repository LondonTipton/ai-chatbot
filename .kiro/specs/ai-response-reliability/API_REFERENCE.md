# API Reference

## Usage Transaction Manager

### Overview

The Usage Transaction Manager provides transactional control over user request quota consumption. It ensures users are only charged for requests that result in valid AI responses.

**Location**: `lib/db/usage-transaction.ts`

### Core Concepts

- **Transaction**: A temporary state tracking a request attempt before committing usage
- **Begin**: Check if user can make a request without incrementing the counter
- **Commit**: Actually increment the usage counter after successful response
- **Rollback**: Decrement the counter if all retry attempts fail

### Interfaces

#### `UsageTransaction`

Represents an active transaction.

```typescript
interface UsageTransaction {
  userId: string; // User ID associated with the transaction
  transactionId: string; // Unique transaction identifier (UUID)
  startTime: Date; // When the transaction was created
  committed: boolean; // Whether the transaction has been committed
  rolledBack: boolean; // Whether the transaction has been rolled back
}
```

#### `TransactionResult`

Result of beginning a transaction.

```typescript
interface TransactionResult {
  allowed: boolean; // Whether the user can make a request
  transaction?: UsageTransaction; // Transaction object if allowed
  currentUsage: {
    requestsToday: number;
    dailyRequestLimit: number;
    canMakeRequest: boolean;
  };
}
```

### Methods

#### `beginTransaction(userId: string): Promise<TransactionResult>`

Checks if a user can make a request and creates a transaction context.

**Parameters:**

- `userId` (string): The user ID to check

**Returns:** Promise resolving to `TransactionResult`

**Behavior:**

- Checks current usage against daily limit
- Does NOT increment the counter
- Creates in-memory transaction with 5-minute TTL
- Returns transaction ID for later commit/rollback

**Example:**

```typescript
import { usageTransactionManager } from "@/lib/db/usage-transaction";

const result = await usageTransactionManager.beginTransaction(userId);

if (!result.allowed) {
  return new Response("Daily limit reached", { status: 429 });
}

const { transactionId } = result.transaction!;
```

#### `commitTransaction(transactionId: string): Promise<CommitResult>`

Commits a transaction by actually incrementing the usage counter.

**Parameters:**

- `transactionId` (string): The transaction ID from `beginTransaction`

**Returns:** Promise resolving to commit result

**Behavior:**

- Verifies transaction exists and hasn't expired
- Calls `checkAndIncrementUsage` to increment counter
- Marks transaction as committed
- Cleans up transaction after 1 minute

**Example:**

```typescript
const commitResult = await usageTransactionManager.commitTransaction(
  transactionId
);

if (!commitResult.success) {
  console.error("Failed to commit transaction");
}
```

#### `rollbackTransaction(transactionId: string): Promise<RollbackResult>`

Rolls back a transaction by decrementing the usage counter.

**Parameters:**

- `transactionId` (string): The transaction ID from `beginTransaction`

**Returns:** Promise resolving to rollback result

**Behavior:**

- Verifies transaction exists
- If committed, decrements the usage counter
- If not committed, no-op (nothing to rollback)
- Marks transaction as rolled back

**Example:**

```typescript
const rollbackResult = await usageTransactionManager.rollbackTransaction(
  transactionId
);

if (!rollbackResult.success) {
  console.error("Failed to rollback transaction");
}
```

### Transaction Lifecycle

```
User Request
    ↓
beginTransaction() ← Check usage, create transaction
    ↓
[Process Request]
    ↓
    ├─ Success → commitTransaction() ← Increment counter
    └─ Failure → rollbackTransaction() ← Decrement if needed
```

### Error Handling

All methods handle errors gracefully:

- Database errors are logged but don't throw
- Invalid transaction IDs return failure results
- Expired transactions are automatically cleaned up

---

## Retry Manager

### Overview

The Retry Manager orchestrates retry attempts with exponential backoff and validation.

**Location**: `lib/ai/retry-manager.ts`

### Interfaces

#### `RetryConfig`

Configuration for retry behavior.

```typescript
interface RetryConfig {
  maxRetries: number; // Maximum retry attempts (default: 3)
  backoffDelays: number[]; // Delay in ms between retries (default: [1000, 2000, 4000])
  enableFallback: boolean; // Enable fallback attempt (default: true)
  fallbackToolConfig?: {
    // Simplified tools for fallback
    tools: Record<string, any>;
    maxSteps: number;
  };
}
```

#### `RetryContext`

Context passed to retry attempts.

```typescript
interface RetryContext {
  attemptNumber: number; // Current attempt (1-based)
  totalAttempts: number; // Total attempts including fallback
  isFallback: boolean; // Whether this is the fallback attempt
  lastError?: string; // Error from previous attempt
  lastValidation?: ValidationResult; // Validation result from previous attempt
}
```

#### `RetryResult`

Result of retry execution.

```typescript
interface RetryResult<T> {
  success: boolean; // Whether any attempt succeeded
  result?: T; // Result from successful attempt
  validation?: ValidationResult; // Final validation result
  attemptsUsed: number; // Number of attempts made
  usedFallback: boolean; // Whether fallback was used
  totalDuration: number; // Total time in milliseconds
  errors: string[]; // All errors encountered
}
```

### Methods

#### `executeWithRetry<T>(fn, validator, metadata): Promise<RetryResult<T>>`

Executes a function with retry logic and validation.

**Parameters:**

- `fn` (function): Async function to execute, receives `RetryContext`
- `validator` (function): Validation function, receives result and returns `ValidationResult`
- `metadata` (object): Optional metadata for logging

**Returns:** Promise resolving to `RetryResult`

**Behavior:**

1. Executes function with attempt context
2. Validates result
3. If invalid and retries remain, waits and retries
4. If all retries fail, attempts fallback (if enabled)
5. Returns result with metrics

**Example:**

```typescript
import { RetryManager } from "@/lib/ai/retry-manager";
import { validateResponseEnhanced } from "@/lib/utils/validate-response";

const retryManager = new RetryManager({
  maxRetries: 3,
  backoffDelays: [1000, 2000, 4000],
  enableFallback: true,
});

const result = await retryManager.executeWithRetry(
  async (context) => {
    // Your async operation
    return await generateAIResponse(context);
  },
  (result) => validateResponseEnhanced(result.messages),
  {
    chatId: "chat-123",
    userId: "user-456",
    modelId: "grok-beta",
  }
);

if (result.success) {
  console.log(`Success after ${result.attemptsUsed} attempts`);
} else {
  console.error("All retries failed");
}
```

### Retry Strategy

1. **Attempt 1**: Original request (already executed before retry manager)
2. **Attempt 2**: Retry after 1s delay
3. **Attempt 3**: Retry after 2s delay
4. **Attempt 4**: Retry after 4s delay
5. **Attempt 5 (Fallback)**: Retry with simplified tool configuration

### Backoff Calculation

Exponential backoff with configurable delays:

```typescript
const delay =
  backoffDelays[attemptNumber - 2] || backoffDelays[backoffDelays.length - 1];
await new Promise((resolve) => setTimeout(resolve, delay));
```

---

## Response Validator

### Overview

Enhanced response validation with detailed reasoning and metrics.

**Location**: `lib/utils/validate-response.ts`

### Interfaces

#### `ValidationResult`

Detailed validation result.

```typescript
interface ValidationResult {
  isValid: boolean; // Whether response is valid
  reason: string; // Human-readable reason
  metrics: {
    assistantMessageCount: number; // Number of assistant messages
    totalTextLength: number; // Total text content length
    hasToolOutputs: boolean; // Whether response has tool outputs
    emptyMessages: number; // Number of empty messages
    toolCallsWithoutText: number; // Tool calls without follow-up text
  };
}
```

### Methods

#### `validateResponseEnhanced(messages: any[]): ValidationResult`

Validates AI response messages with detailed analysis.

**Parameters:**

- `messages` (array): Array of message objects from AI SDK

**Returns:** `ValidationResult` object

**Validation Rules:**

1. **Valid if**: Total text length ≥ 10 characters
2. **Valid if**: Has tool outputs AND follow-up text ≥ 10 characters
3. **Invalid if**: Only tool calls, no text
4. **Invalid if**: All assistant messages are empty
5. **Invalid if**: Only whitespace or formatting characters

**Example:**

```typescript
import { validateResponseEnhanced } from "@/lib/utils/validate-response";

const validation = validateResponseEnhanced(messages);

if (!validation.isValid) {
  console.log(`Invalid response: ${validation.reason}`);
  console.log("Metrics:", validation.metrics);
}
```

### Validation Metrics

The validator provides detailed metrics for debugging:

- `assistantMessageCount`: Total assistant messages in response
- `totalTextLength`: Combined length of all text content
- `hasToolOutputs`: Whether any tool outputs are present
- `emptyMessages`: Count of messages with no content
- `toolCallsWithoutText`: Tool calls that lack explanatory text

---

## Retry Configuration

### Overview

Centralized configuration management for retry behavior.

**Location**: `lib/ai/retry-config.ts`

### Methods

#### `getRetryConfig(): RetryConfig`

Returns the current retry configuration from environment variables.

**Environment Variables:**

- `RETRY_MAX_ATTEMPTS`: Maximum retry attempts (default: 3)
- `RETRY_BACKOFF_MS`: Comma-separated backoff delays (default: "1000,2000,4000")
- `RETRY_ENABLE_FALLBACK`: Enable fallback attempt (default: "true")

**Example:**

```typescript
import { getRetryConfig } from "@/lib/ai/retry-config";

const config = getRetryConfig();
console.log(`Max retries: ${config.maxRetries}`);
```

#### `isRetryEnabled(): boolean`

Checks if retry logic is enabled via feature flag.

**Environment Variable:**

- `ENABLE_RETRY_LOGIC`: Enable retry system (default: "false")

**Example:**

```typescript
import { isRetryEnabled } from "@/lib/ai/retry-config";

if (isRetryEnabled()) {
  // Use retry flow
} else {
  // Use legacy flow
}
```

---

## Error Types

### Overview

Custom error types for retry logic.

**Location**: `lib/ai/retry-errors.ts`

### Classes

#### `RetryableError`

Error that should trigger retry logic.

```typescript
class RetryableError extends Error {
  constructor(message: string, public validation: ValidationResult);
}
```

**Usage:**

```typescript
import { RetryableError } from "@/lib/ai/retry-errors";

if (!validation.isValid) {
  throw new RetryableError(validation.reason, validation);
}
```

#### `NonRetryableError`

Error that should fail immediately without retry.

```typescript
class NonRetryableError extends Error {
  constructor(message: string);
}
```

**Usage:**

```typescript
import { NonRetryableError } from "@/lib/ai/retry-errors";

if (!user) {
  throw new NonRetryableError("Authentication required");
}
```

### Error Handling Strategy

- **RetryableError**: Triggers retry logic, logged for monitoring
- **NonRetryableError**: Returns immediately, no retry attempted
- **Other errors**: Treated as non-retryable by default

---

## Retry Metrics

### Overview

Structured logging and metrics collection for retry operations.

**Location**: `lib/ai/retry-metrics.ts`

### Methods

#### `logRetryAttempt(metadata)`

Logs a retry attempt with context.

**Parameters:**

- `metadata`: Object containing retry context and metrics

**Example:**

```typescript
import { logRetryAttempt } from "@/lib/ai/retry-metrics";

logRetryAttempt({
  chatId: "chat-123",
  userId: "user-456",
  attemptNumber: 2,
  maxAttempts: 4,
  reason: "Empty response",
  modelId: "grok-beta",
});
```

#### `logRetryComplete(metadata)`

Logs completion of retry sequence.

**Example:**

```typescript
import { logRetryComplete } from "@/lib/ai/retry-metrics";

logRetryComplete({
  chatId: "chat-123",
  userId: "user-456",
  success: true,
  attemptsUsed: 2,
  totalDuration: 3500,
  usedFallback: false,
});
```

### Metric Fields

All log entries include:

- `timestamp`: ISO 8601 timestamp
- `chatId`: Chat session identifier
- `userId`: User identifier
- `modelId`: AI model used
- `attemptNumber`: Current attempt number
- `reason`: Validation failure reason
- `duration`: Time spent in milliseconds
