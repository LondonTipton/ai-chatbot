# Stream Error Troubleshooting Guide

## Quick Diagnosis

### Symptoms

- Users report incomplete or empty AI responses
- Logs show `[Stream] ❌ Stream error: [TypeError: terminated]`
- Validation fails with "Text content too short (0 chars)"
- Message: "Validation failed but stream already returned"

### Root Cause

Socket/connection errors occurring mid-stream, after the response has already started being sent to the client.

## Log Patterns to Watch For

### Healthy Stream (No Issues)

```
[StreamRetry] Warming up stream for 500ms to detect early errors...
[StreamRetry] ✅ Stream warmup successful
[RetryOrchestration] ✅ Success after 1 attempt(s)
[StreamRetry] ✅ Response validated successfully
```

### Stream Error Detected During Warmup (Good - Will Retry)

```
[StreamRetry] Warming up stream for 500ms to detect early errors...
[Stream] ❌ Stream error: [TypeError: terminated]
[StreamRetry] 🔄 Early stream error detected, triggering retry
[RetryOrchestration] 🔄 Attempt 2/5
```

### Stream Error After Warmup (Bad - Can't Retry)

```
[StreamRetry] ✅ Stream warmup successful
[Stream] ❌ Stream error: [TypeError: terminated]
[Validation] INVALID: Text length 0 chars is below minimum 10 chars
[StreamRetry] ⚠️  Validation failed but stream already returned
```

## Common Error Types

### 1. Socket Closed / Connection Terminated

```
[Stream] ❌ Stream error: [TypeError: terminated] {
  [cause]: [Error [SocketError]: other side closed]
}
```

**Cause**: Network connection dropped mid-stream
**Solution**: Warmup period should catch this within 500ms
**Action**: If occurring frequently, increase warmup time

### 2. Rate Limit / Queue Exceeded

```
[Stream] ❌ Stream error: queue_exceeded
```

**Cause**: AI provider rate limit reached
**Solution**: Automatic key rotation via Cerebras balancer
**Action**: Monitor key health status

### 3. Timeout

```
[Stream] ❌ Stream error: Request timeout
```

**Cause**: AI provider taking too long to respond
**Solution**: Retry with exponential backoff
**Action**: Check provider status page

## Troubleshooting Steps

### Step 1: Check Warmup Period

```bash
# Search logs for warmup messages
grep "Warming up stream" logs.txt

# Check if errors detected during warmup
grep "Early stream error detected" logs.txt
```

**Expected**: Most errors should be caught during warmup
**If not**: Consider increasing warmup time from 500ms

### Step 2: Check Retry Success Rate

```bash
# Count retry attempts
grep "Attempt [2-9]" logs.txt | wc -l

# Count successful retries
grep "Success after [2-9] attempt" logs.txt | wc -l
```

**Expected**: >80% of retries should succeed
**If not**: Investigate underlying provider issues

### Step 3: Check Key Health

```bash
# Check Cerebras key rotation
grep "Key Health:" logs.txt | tail -5
```

**Expected**: At least 3/5 keys available
**If not**: Keys may be rate limited, wait for cooldown

### Step 4: Check Validation Failures

```bash
# Find validation failures
grep "Response validation failed" logs.txt

# Check reasons
grep "StreamRetry] Reason:" logs.txt
```

**Common reasons**:

- "Text content too short" - Stream error
- "Only tool calls without text" - Model issue
- "All assistant messages are empty" - Stream error

## Configuration Tuning

### Increase Warmup Time

If errors frequently occur after warmup:

```typescript
// In app/(chat)/api/chat/route.ts
const warmupTimeMs = 1000; // Increase from 500ms to 1000ms
```

**Trade-off**: Increases latency by 500ms
**Benefit**: Catches more errors before returning stream

### Adjust Retry Configuration

If retries not succeeding:

```env
# In .env.local
RETRY_MAX_ATTEMPTS=5  # Increase from 3
RETRY_BACKOFF_DELAYS=1000,2000,4000,8000,16000  # Add more delays
```

**Trade-off**: Longer wait time for users
**Benefit**: More chances to recover from transient errors

### Enable Fallback Earlier

If specific tools causing issues:

```typescript
// In lib/ai/retry-config.ts
export const retryConfig = {
  maxAttempts: 3,
  enableFallback: true,
  fallbackAfterAttempts: 2, // Use fallback after 2 attempts instead of 3
};
```

## Monitoring Queries

### Stream Error Rate

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN error_type = 'stream_error' THEN 1 ELSE 0 END) as stream_errors,
  (SUM(CASE WHEN error_type = 'stream_error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_rate
FROM request_logs
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Retry Success Rate

```sql
SELECT
  model_id,
  COUNT(*) as total_retries,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_retries,
  (SUM(CASE WHEN success = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM retry_metrics
WHERE attempts_used > 1
GROUP BY model_id;
```

### Warmup Effectiveness

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as total_errors,
  SUM(CASE WHEN detected_during_warmup = true THEN 1 ELSE 0 END) as caught_during_warmup,
  (SUM(CASE WHEN detected_during_warmup = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as warmup_effectiveness
FROM stream_errors
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## Emergency Procedures

### High Error Rate (>10%)

1. Check AI provider status page
2. Verify network connectivity
3. Check Cerebras key health
4. Consider temporarily disabling problematic models
5. Increase warmup time to 1000ms

### All Keys Rate Limited

1. Wait 60 seconds for cooldown
2. Check if rate limits increased
3. Consider adding more API keys
4. Temporarily reduce concurrent requests

### Validation Always Failing

1. Check if model changed behavior
2. Review validation rules in `validate-response.ts`
3. Check for model-specific issues
4. Consider adjusting minimum text length

## Prevention

### Best Practices

1. Monitor stream error rate daily
2. Keep at least 5 Cerebras API keys active
3. Set up alerts for error rate >5%
4. Regularly review retry success rates
5. Test warmup period effectiveness monthly

### Proactive Monitoring

```bash
# Daily health check script
#!/bin/bash

# Check error rate
ERROR_RATE=$(grep "Stream error" logs.txt | wc -l)
TOTAL_REQUESTS=$(grep "Starting stream" logs.txt | wc -l)
RATE=$((ERROR_RATE * 100 / TOTAL_REQUESTS))

if [ $RATE -gt 5 ]; then
  echo "⚠️  High error rate: $RATE%"
  # Send alert
fi

# Check key health
HEALTHY_KEYS=$(grep "Key Health:" logs.txt | tail -1 | cut -d' ' -f3 | cut -d'/' -f1)

if [ $HEALTHY_KEYS -lt 3 ]; then
  echo "⚠️  Low key health: $HEALTHY_KEYS/5"
  # Send alert
fi
```

## Related Documentation

- [STREAM_ERROR_FIX.md](./STREAM_ERROR_FIX.md) - Technical implementation details
- [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) - Comprehensive monitoring setup
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment procedures
- [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) - Emergency rollback procedures
