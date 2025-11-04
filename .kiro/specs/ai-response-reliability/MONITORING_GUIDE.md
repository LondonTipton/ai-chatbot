# Monitoring Guide

## Overview

This guide covers monitoring, alerting, and observability for the AI Response Reliability feature. Proper monitoring ensures the system operates correctly and helps identify issues before they impact users.

## Key Metrics

### 1. Retry Rate

**Definition**: Percentage of requests that require retry attempts

**Calculation**: `(requests_with_retries / total_requests) × 100`

**Target**: < 10%

**Significance:**

- High retry rate indicates model reliability issues
- May indicate validation rules too strict
- Affects user experience (slower responses)

**Log Pattern:**

```
[Retry] Attempt 2/4 for chat-abc123
```

**Query Example:**

```typescript
// Count retry attempts in logs
const retryCount = logs.filter((log) =>
  log.message.includes("[Retry] Attempt")
).length;

const retryRate = (retryCount / totalRequests) * 100;
```

---

### 2. Validation Failure Rate

**Definition**: Percentage of responses that fail validation

**Calculation**: `(validation_failures / total_responses) × 100`

**Target**: < 15%

**Significance:**

- Indicates quality of AI responses
- High rate suggests model issues
- Triggers retry logic

**Log Pattern:**

```
[Validation] Invalid response: Empty response (0 chars)
[Validation] Invalid response: Tool calls without text
```

**Breakdown by Reason:**

- Empty response: No text content
- Tool calls only: Tools used but no explanation
- Insufficient text: < 10 characters

---

### 3. Rollback Rate

**Definition**: Percentage of requests that exhaust all retries and rollback usage

**Calculation**: `(rollbacks / total_requests) × 100`

**Target**: < 2%

**Significance:**

- Indicates complete failure rate
- Users don't consume quota for these
- High rate suggests retry strategy ineffective

**Log Pattern:**

```
[Transaction] Rolled back: txn-xyz789 (user: user-123)
```

---

### 4. Transaction Commit Success Rate

**Definition**: Percentage of transactions that commit successfully

**Calculation**: `(successful_commits / total_commits) × 100`

**Target**: > 99.9%

**Significance:**

- Critical for usage tracking accuracy
- Failures indicate database issues
- Should be extremely rare

**Log Pattern:**

```
[Transaction] Committed: txn-abc123 (user: user-456)
[Error] Transaction commit failed: txn-xyz789
```

---

### 5. Average Retry Duration

**Definition**: Average time spent on retry attempts

**Calculation**: `sum(retry_durations) / count(retries)`

**Target**: < 5000ms (5 seconds)

**Significance:**

- Affects user experience
- High duration indicates slow retries
- May need backoff adjustment

**Log Pattern:**

```
[Retry] Complete: success=true, attempts=2, duration=3500ms
```

---

### 6. Fallback Usage Rate

**Definition**: Percentage of successful requests that used fallback

**Calculation**: `(fallback_successes / total_successes) × 100`

**Target**: < 5%

**Significance:**

- Indicates primary strategy failures
- Fallback provides last resort
- High rate suggests need for investigation

**Log Pattern:**

```
[Retry] Fallback attempt for chat-abc123
[Retry] Complete: success=true, usedFallback=true
```

---

### 7. Response Latency (P50, P95, P99)

**Definition**: Response time percentiles

**Target:**

- P50: < 2000ms
- P95: < 5000ms
- P99: < 10000ms

**Significance:**

- Measures user experience
- Includes retry overhead
- Should not significantly increase with retry logic

**Measurement:**

```typescript
const startTime = Date.now();
// ... process request ...
const duration = Date.now() - startTime;
```

---

## Log Patterns and Queries

### Transaction Lifecycle

**Begin Transaction:**

```
[Transaction] Begin: txn-abc123 (user: user-456, allowed: true)
```

**Commit Transaction:**

```
[Transaction] Committed: txn-abc123 (user: user-456, newUsage: 5/50)
```

**Rollback Transaction:**

```
[Transaction] Rolled back: txn-xyz789 (user: user-123, reason: All retries failed)
```

### Retry Attempts

**Retry Started:**

```
[Retry] Attempt 2/4 for chat-abc123 (reason: Empty response)
```

**Retry Complete:**

```
[Retry] Complete: chatId=chat-abc123, success=true, attempts=2, duration=3500ms, fallback=false
```

**All Retries Failed:**

```
[Retry] All attempts failed for chat-abc123 after 4 tries
```

### Validation Results

**Valid Response:**

```
[Validation] Valid response: 156 chars, 2 messages
```

**Invalid Response:**

```
[Validation] Invalid response: Empty response (0 chars, 1 messages)
[Validation] Invalid response: Tool calls without text (3 tool calls, 0 chars)
```

### Error Conditions

**Non-Retryable Error:**

```
[Error] Non-retryable error: Authentication required
```

**Transaction Error:**

```
[Error] Transaction commit failed: txn-abc123 (Database connection error)
```

**Retry Error:**

```
[Error] Retry failed after 4 attempts: chat-abc123
```

---

## Monitoring Dashboards

### Dashboard 1: Retry Overview

**Metrics:**

- Retry rate (last 24h)
- Validation failure rate (last 24h)
- Rollback rate (last 24h)
- Average retry duration (last 24h)

**Visualizations:**

- Line chart: Retry rate over time
- Pie chart: Validation failure reasons
- Bar chart: Retries by model
- Histogram: Retry duration distribution

**Example Query (Pseudo-SQL):**

```sql
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) FILTER (WHERE message LIKE '%[Retry] Attempt%') as retry_count,
  COUNT(*) FILTER (WHERE message LIKE '%[Validation] Invalid%') as validation_failures,
  COUNT(*) FILTER (WHERE message LIKE '%[Transaction] Rolled back%') as rollbacks,
  COUNT(*) as total_requests
FROM logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

---

### Dashboard 2: Transaction Health

**Metrics:**

- Active transactions (current)
- Transaction commit rate (last 1h)
- Transaction rollback rate (last 1h)
- Transaction errors (last 1h)

**Visualizations:**

- Gauge: Active transactions
- Line chart: Commit/rollback rate over time
- Table: Recent transaction errors

**Alerts:**

- Active transactions > 1000
- Commit failures > 0
- Rollback rate > 5%

---

### Dashboard 3: Model Performance

**Metrics:**

- Retry rate by model
- Validation failure rate by model
- Average response quality by model
- Fallback usage by model

**Visualizations:**

- Bar chart: Retry rate by model
- Table: Model reliability scores
- Heatmap: Failures by model and time

**Purpose:**

- Identify problematic models
- Compare model reliability
- Guide model selection

---

### Dashboard 4: User Impact

**Metrics:**

- Average response time (with/without retries)
- User requests affected by retries
- Quota saved by rollbacks
- User satisfaction (if available)

**Visualizations:**

- Line chart: Response time P50/P95/P99
- Bar chart: Requests by retry count
- Number: Total quota saved

**Purpose:**

- Measure user experience impact
- Quantify feature value
- Identify user-facing issues

---

## Alerting Rules

### Critical Alerts (Immediate Action)

#### 1. Transaction Commit Failures

**Condition**: Any transaction commit failure

**Severity**: Critical

**Alert Message:**

```
CRITICAL: Transaction commit failed
Transaction ID: {transactionId}
User ID: {userId}
Error: {errorMessage}
```

**Action:**

1. Check database health
2. Review database logs
3. Verify no data corruption
4. Consider disabling feature if widespread

---

#### 2. High Rollback Rate

**Condition**: Rollback rate > 10% for 5 minutes

**Severity**: Critical

**Alert Message:**

```
CRITICAL: High rollback rate detected
Current rate: {rollbackRate}%
Threshold: 10%
Duration: 5 minutes
```

**Action:**

1. Check model health
2. Review validation failures
3. Consider increasing max retries
4. Investigate model issues

---

### Warning Alerts (Investigation Needed)

#### 3. Elevated Retry Rate

**Condition**: Retry rate > 15% for 10 minutes

**Severity**: Warning

**Alert Message:**

```
WARNING: Elevated retry rate
Current rate: {retryRate}%
Threshold: 15%
Duration: 10 minutes
```

**Action:**

1. Review validation failure reasons
2. Check model performance
3. Monitor for escalation
4. Investigate patterns

---

#### 4. Slow Retry Duration

**Condition**: Average retry duration > 8000ms for 10 minutes

**Severity**: Warning

**Alert Message:**

```
WARNING: Slow retry duration
Average duration: {avgDuration}ms
Threshold: 8000ms
Duration: 10 minutes
```

**Action:**

1. Check model response times
2. Review backoff configuration
3. Investigate network issues
4. Consider optimization

---

#### 5. High Fallback Usage

**Condition**: Fallback usage > 10% for 15 minutes

**Severity**: Warning

**Alert Message:**

```
WARNING: High fallback usage
Fallback rate: {fallbackRate}%
Threshold: 10%
Duration: 15 minutes
```

**Action:**

1. Review primary retry failures
2. Check model reliability
3. Investigate validation rules
4. Consider retry strategy adjustment

---

### Info Alerts (Awareness)

#### 6. Feature Enabled/Disabled

**Condition**: Feature flag changed

**Severity**: Info

**Alert Message:**

```
INFO: Retry feature flag changed
Previous: {oldValue}
Current: {newValue}
```

**Action:**

- Monitor metrics after change
- Verify expected behavior

---

## Structured Logging

### Log Format

All retry-related logs use structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "component": "retry-manager",
  "event": "retry_attempt",
  "data": {
    "chatId": "chat-abc123",
    "userId": "user-456",
    "attemptNumber": 2,
    "maxAttempts": 4,
    "reason": "Empty response",
    "modelId": "grok-beta",
    "complexity": "medium"
  }
}
```

### Log Levels

**ERROR**: System errors, failures

- Transaction commit failures
- Unexpected errors
- Critical issues

**WARN**: Potential issues, degraded performance

- High retry rates
- Validation failures
- Slow operations

**INFO**: Normal operations, important events

- Transaction lifecycle
- Retry attempts
- Validation results

**DEBUG**: Detailed information for troubleshooting

- Validation metrics
- Configuration values
- Internal state

### Log Aggregation

**Recommended tools:**

- Datadog
- New Relic
- Splunk
- CloudWatch Logs (AWS)
- Google Cloud Logging

**Key queries to save:**

1. **Retry rate by hour:**

```
source:app component:retry-manager event:retry_attempt
| stats count by hour
```

2. **Validation failures by reason:**

```
source:app component:validator level:warn
| stats count by data.reason
```

3. **Transaction errors:**

```
source:app component:transaction level:error
| table timestamp, data.transactionId, data.userId, message
```

4. **Slow retries:**

```
source:app component:retry-manager event:retry_complete
| where data.duration > 5000
| table timestamp, data.chatId, data.duration, data.attempts
```

---

## Performance Monitoring

### Latency Tracking

**Measure these durations:**

1. **Transaction Begin**: Time to check usage and create transaction
2. **Validation**: Time to validate response
3. **Retry Delay**: Time spent waiting between retries
4. **Transaction Commit**: Time to commit transaction
5. **Total Request**: End-to-end request time

**Implementation:**

```typescript
const metrics = {
  transactionBegin: 0,
  validation: 0,
  retryDelay: 0,
  transactionCommit: 0,
  totalRequest: 0,
};

// Measure each phase
const start = Date.now();
await beginTransaction();
metrics.transactionBegin = Date.now() - start;

// ... log metrics at end
console.log("[Metrics]", JSON.stringify(metrics));
```

### Memory Monitoring

**Track:**

- Active transaction count
- Memory usage of transaction store
- Memory growth over time

**Implementation:**

```typescript
// In usage-transaction.ts
export function getTransactionStats() {
  return {
    activeCount: activeTransactions.size,
    oldestTransaction: Math.min(
      ...Array.from(activeTransactions.values()).map((t) =>
        t.startTime.getTime()
      )
    ),
    memoryEstimate: activeTransactions.size * 500, // bytes
  };
}
```

**Alert if:**

- Active transactions > 1000
- Memory estimate > 1MB
- Oldest transaction > 10 minutes

### Database Monitoring

**Track:**

- Query duration for usage checks
- Query duration for usage increments
- Connection pool usage
- Lock contention

**Queries to monitor:**

```sql
-- Usage check query
SELECT "requestsToday", "dailyRequestLimit"
FROM "User"
WHERE id = $1;

-- Usage increment query
UPDATE "User"
SET "requestsToday" = CAST("requestsToday" AS INTEGER) + 1
WHERE id = $1;
```

**Alert if:**

- Query duration > 100ms
- Connection pool > 80% utilized
- Lock wait time > 0

---

## Troubleshooting Runbook

### Issue: High Retry Rate

**Symptoms:**

- Retry rate > 15%
- Many validation failures

**Investigation:**

1. **Check validation failure reasons:**

```
grep "[Validation] Invalid" logs.txt | cut -d: -f2 | sort | uniq -c
```

2. **Check retry rate by model:**

```
grep "[Retry] Attempt" logs.txt | grep -o "modelId=[^,]*" | sort | uniq -c
```

3. **Check recent changes:**

- Model updates?
- Validation rule changes?
- Configuration changes?

**Resolution:**

- If model issue: Switch to different model
- If validation too strict: Adjust rules
- If temporary: Monitor and wait

---

### Issue: Transaction Commit Failures

**Symptoms:**

- Errors: "Transaction commit failed"
- Usage counters inaccurate

**Investigation:**

1. **Check database health:**

```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

2. **Check for locks:**

```sql
SELECT * FROM pg_locks WHERE NOT granted;
```

3. **Review error logs:**

```
grep "Transaction commit failed" logs.txt
```

**Resolution:**

- If database down: Restore database
- If locks: Identify and resolve
- If connection pool: Increase pool size

---

### Issue: Memory Growth

**Symptoms:**

- Increasing memory usage
- Out of memory errors

**Investigation:**

1. **Check active transactions:**

```typescript
console.log(getTransactionStats());
```

2. **Check cleanup running:**

```
grep "Transaction cleanup" logs.txt
```

3. **Check for leaks:**

- Review transaction lifecycle
- Verify cleanup logic

**Resolution:**

- If cleanup not running: Restart app
- If too many transactions: Investigate load
- If leak: Fix code and deploy

---

### Issue: Slow Response Times

**Symptoms:**

- Increased latency
- User complaints

**Investigation:**

1. **Check retry duration:**

```
grep "[Retry] Complete" logs.txt | grep -o "duration=[0-9]*" | sort -n
```

2. **Check retry count distribution:**

```
grep "[Retry] Attempt" logs.txt | grep -o "Attempt [0-9]" | sort | uniq -c
```

3. **Check model response times:**

- Review AI provider status
- Check network latency

**Resolution:**

- If retries slow: Reduce backoff delays
- If model slow: Switch models
- If network: Investigate connectivity

---

## Success Metrics

### Feature Health Score

Calculate overall health score (0-100):

```typescript
function calculateHealthScore() {
  const retryRate = getRetryRate(); // 0-100
  const rollbackRate = getRollbackRate(); // 0-100
  const commitSuccessRate = getCommitSuccessRate(); // 0-100

  const score =
    (100 - retryRate * 5) * 0.3 + // 30% weight
    (100 - rollbackRate * 20) * 0.3 + // 30% weight
    commitSuccessRate * 0.4; // 40% weight

  return Math.max(0, Math.min(100, score));
}
```

**Score interpretation:**

- 90-100: Excellent
- 80-89: Good
- 70-79: Fair
- < 70: Poor (investigate)

### User Impact Metrics

**Quota saved:**

```typescript
const quotaSaved = rollbackCount; // Each rollback saves 1 request
```

**User experience improvement:**

```typescript
const successRate = (totalRequests - rollbackCount) / totalRequests;
// Compare to baseline without retry logic
```

---

## Reporting

### Daily Report

**Contents:**

- Retry rate (24h average)
- Rollback rate (24h average)
- Validation failure breakdown
- Top issues
- Health score

**Distribution:** Email to engineering team

---

### Weekly Report

**Contents:**

- Trend analysis (week over week)
- Model performance comparison
- Feature effectiveness metrics
- Recommendations

**Distribution:** Email to engineering and product teams

---

### Monthly Report

**Contents:**

- Monthly trends
- Cost/benefit analysis
- User impact assessment
- Optimization opportunities

**Distribution:** Email to leadership

---

## Additional Resources

- [API Reference](./API_REFERENCE.md) - Detailed API documentation
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Deployment procedures
- [Validation Rules](./VALIDATION_RULES.md) - Validation criteria
- [Requirements](./requirements.md) - Feature requirements
