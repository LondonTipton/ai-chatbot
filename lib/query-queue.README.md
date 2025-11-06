# Query Queue System

BullMQ-based request queue for managing research queries with priority handling, concurrency control, and retry logic.

## Features

- **Priority Handling**: AUTO (priority 1) > MEDIUM (priority 2) > DEEP (priority 3)
- **Concurrency Control**: Max 5 concurrent queries
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Rate Limit Integration**: Checks rate limits before execution
- **Cache Integration**: Checks cache before agent invocation
- **Job Status Tracking**: Monitor job progress and status
- **Error Handling**: Graceful error handling with detailed logging

## Usage

### Queue a Query

```typescript
import { queueQuery } from "@/lib/query-queue";

const jobId = await queueQuery(
  "What are the requirements for company registration in Zimbabwe?",
  "medium",
  "Zimbabwe",
  "user-123"
);

console.log(`Job queued: ${jobId}`);
```

### Check Job Status

```typescript
import { getJobStatus } from "@/lib/query-queue";

const status = await getJobStatus(jobId);

if (status.status === "completed") {
  console.log("Result:", status.result);
} else if (status.status === "failed") {
  console.error("Error:", status.error);
} else {
  console.log(`Status: ${status.status}, Progress: ${status.progress}%`);
}
```

### Get Queue Metrics

```typescript
import { getQueueMetrics } from "@/lib/query-queue";

const metrics = await getQueueMetrics();
console.log(`Queue: ${metrics.waiting} waiting, ${metrics.active} active`);
```

## Architecture

### Queue Configuration

- **Queue Name**: `legal-research`
- **Redis Connection**: Uses `REDIS_URL` environment variable
- **Job Options**:
  - Attempts: 3
  - Backoff: Exponential (2s initial delay)
  - Remove on complete: Keep last 100 for 1 hour
  - Remove on fail: Keep last 500 for 24 hours

### Worker Configuration

- **Concurrency**: 5 (max 5 concurrent queries)
- **Rate Limiter**: Max 10 jobs per second
- **Progress Tracking**:
  - 10%: Rate limit check
  - 20%: Cache check
  - 30%: Agent execution started
  - 80%: Processing results
  - 100%: Complete

### Priority System

Lower number = higher priority:

- **AUTO (1)**: Fast queries, highest priority
- **MEDIUM (2)**: Balanced queries, medium priority
- **DEEP (3)**: Comprehensive queries, lowest priority

This ensures fast queries are processed first, improving overall user experience.

## Job Processing Flow

1. **Rate Limit Check**: Verify rate limits before execution
2. **Cache Check**: Check if response is cached
3. **Agent Execution**: Execute appropriate agent (auto/medium/deep)
4. **Cache Response**: Store successful response in cache
5. **Track Usage**: Increment daily token usage
6. **Return Result**: Return response with metadata

## Error Handling

### Rate Limit Errors

- Don't retry immediately
- Return error with retry-after time
- Job will be retried after backoff period

### Agent Errors

- Retry up to 3 times with exponential backoff
- Log detailed error information
- Return error result after final attempt

### Cache Errors

- Log error but continue execution
- Don't block job processing

## Monitoring

### Worker Events

```typescript
import { queryWorker } from "@/lib/query-queue";

queryWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

queryWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

queryWorker.on("error", (err) => {
  console.error("Worker error:", err.message);
});
```

### Queue Events

```typescript
import { queueEvents } from "@/lib/query-queue";

queueEvents.on("completed", ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});
```

## Environment Variables

```bash
# Redis connection URL (required)
REDIS_URL=redis://localhost:6379
```

## Integration with Research API

The queue system can be integrated into the research API endpoint:

```typescript
// app/(chat)/api/research/route.ts
import { queueQuery, getJobStatus } from "@/lib/query-queue";

export async function POST(request: Request) {
  const { query, mode, jurisdiction } = await request.json();

  // Queue the query
  const jobId = await queueQuery(query, mode, jurisdiction);

  // Return job ID for polling
  return Response.json({
    success: true,
    jobId,
    message: "Query queued for processing",
  });
}

// Separate endpoint for checking status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "Job ID required" }, { status: 400 });
  }

  const status = await getJobStatus(jobId);
  return Response.json(status);
}
```

## Testing

See `tests/unit/query-queue.test.ts` for unit tests covering:

- Queue operations
- Priority handling
- Job status tracking
- Error handling
- Retry logic

## Requirements

Implements requirements:

- **8.1**: Priority handling (AUTO=1, MEDIUM=2, DEEP=3)
- **8.2**: Concurrency control (max 5 concurrent queries)
- **8.3**: Retry logic (3 attempts with exponential backoff)
