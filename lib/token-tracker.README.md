# Daily Token Tracker

Redis-based daily token tracking system for monitoring and limiting token usage.

## Features

- **Daily Token Tracking**: Tracks token usage per day with automatic reset
- **Automatic TTL**: Redis keys expire after 2 days for automatic cleanup
- **Milestone Logging**: Warns at 80% and 95% usage thresholds
- **Usage Statistics**: Provides detailed usage stats including percentage used and remaining tokens

## Configuration

Requires Upstash Redis environment variables:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Usage

### Basic Usage

```typescript
import {
  getDailyTokenUsage,
  incrementDailyTokenUsage,
  checkDailyLimit,
} from "@/lib/token-tracker";

// Get current daily usage
const usage = await getDailyTokenUsage();
console.log(`Current usage: ${usage} tokens`);

// Check if we can add tokens
const canAdd = await checkDailyLimit(2500);
if (!canAdd) {
  throw new Error("Would exceed daily token limit");
}

// Increment usage
const newTotal = await incrementDailyTokenUsage(2500);
console.log(`New total: ${newTotal} tokens`);
```

### Advanced Usage with Custom Tracker

```typescript
import { DailyTokenTracker } from "@/lib/token-tracker";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const tracker = new DailyTokenTracker(redis, 1_000_000); // Custom limit

// Get detailed statistics
const stats = await tracker.getUsageStats();
console.log(stats);
// {
//   date: "2025-11-04",
//   usage: 250000,
//   limit: 1000000,
//   remaining: 750000,
//   percentUsed: 25,
//   withinLimit: true
// }
```

## API Reference

### Functions

#### `getDailyTokenUsage(): Promise<number>`

Returns the current token usage for today.

#### `incrementDailyTokenUsage(tokens: number): Promise<number>`

Increments the daily token usage and returns the new total. Logs milestone warnings at 80% and 95%.

#### `checkDailyLimit(estimatedTokens: number, limit?: number): Promise<boolean>`

Checks if adding the estimated tokens would exceed the daily limit. Returns `true` if within limit.

### Class: DailyTokenTracker

#### Constructor

```typescript
new DailyTokenTracker(redis: Redis, dailyLimit: number = 800_000)
```

#### Methods

- `getDailyTokenUsage(): Promise<number>` - Get current usage
- `incrementDailyTokenUsage(tokens: number): Promise<number>` - Increment usage
- `checkDailyLimit(estimatedTokens: number, limit?: number): Promise<boolean>` - Check limit
- `getUsageStats(): Promise<UsageStats>` - Get detailed statistics

## Default Configuration

The default `dailyTokenTracker` instance uses:

- **Daily Limit**: 800,000 tokens (80% of Cerebras 1M limit)
- **TTL**: 2 days (automatic cleanup)
- **Milestones**: Warnings at 80% and 95%

## Integration with Rate Limiter

The token tracker works alongside the rate limiter for comprehensive API usage management:

```typescript
import { checkRateLimits } from "@/lib/rate-limiter";
import { checkDailyLimit, incrementDailyTokenUsage } from "@/lib/token-tracker";

// Check both rate limits and daily limit
await checkRateLimits(estimatedTokens);
const withinDailyLimit = await checkDailyLimit(estimatedTokens);

if (!withinDailyLimit) {
  throw new Error("Daily token limit would be exceeded");
}

// Execute operation...

// Track usage
await incrementDailyTokenUsage(actualTokens);
```

## Logging

The tracker logs the following events:

- **Daily Usage**: Every time usage is retrieved
- **Token Increment**: Every time tokens are added
- **Milestone Warnings**: At 80% and 95% thresholds
- **Limit Checks**: When checking if tokens can be added
- **Errors**: Any Redis or tracking errors

## Error Handling

The tracker is designed to fail gracefully:

- Returns `0` usage on Redis errors (doesn't block operations)
- Returns `true` for limit checks on errors (doesn't block operations)
- Logs all errors for debugging

## Testing

Test the tracker using the test API endpoint:

```bash
# Get current usage
curl http://localhost:3000/api/test-token-tracker

# Add tokens
curl -X POST http://localhost:3000/api/test-token-tracker \
  -H "Content-Type: application/json" \
  -d '{"tokens": 2500}'
```
