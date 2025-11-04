# Deployment Guide

## Overview

This guide covers deploying the AI Response Reliability feature to production. The feature uses a feature flag for gradual rollout and requires specific environment variable configuration.

## Prerequisites

- Next.js application deployed and running
- PostgreSQL database configured
- Environment variable management system
- Monitoring and logging infrastructure

## Environment Variables

### Required Variables

Add these to your production environment:

```bash
# Feature Flag - Controls whether retry logic is enabled
ENABLE_RETRY_LOGIC=false  # Start with false, enable gradually

# Retry Configuration
RETRY_MAX_ATTEMPTS=3                    # Maximum retry attempts (recommended: 3)
RETRY_BACKOFF_MS=1000,2000,4000        # Backoff delays in milliseconds
RETRY_ENABLE_FALLBACK=true             # Enable fallback attempt

# Transaction Configuration
TRANSACTION_TIMEOUT_MS=300000          # 5 minutes (300000ms)
TRANSACTION_CLEANUP_INTERVAL_MS=60000  # 1 minute (60000ms)
```

### Configuration Details

#### `ENABLE_RETRY_LOGIC`

**Type**: Boolean string ("true" or "false")  
**Default**: "false"  
**Purpose**: Master feature flag to enable/disable retry system

**Recommended Values:**

- Development: "true" (for testing)
- Staging: "true" (for validation)
- Production: Start with "false", enable gradually

#### `RETRY_MAX_ATTEMPTS`

**Type**: Number  
**Default**: 3  
**Range**: 1-5  
**Purpose**: Maximum number of retry attempts before giving up

**Considerations:**

- Higher values = more resilient but slower failures
- Lower values = faster failures but less resilient
- Recommended: 3 (good balance)

#### `RETRY_BACKOFF_MS`

**Type**: Comma-separated numbers  
**Default**: "1000,2000,4000"  
**Purpose**: Delay in milliseconds between retry attempts

**Format**: "delay1,delay2,delay3,..."

**Considerations:**

- Exponential backoff recommended
- Total delay should be reasonable (< 10s)
- Example: "1000,2000,4000" = 1s, 2s, 4s delays

#### `RETRY_ENABLE_FALLBACK`

**Type**: Boolean string ("true" or "false")  
**Default**: "true"  
**Purpose**: Enable fallback attempt with simplified tools

**Considerations:**

- Fallback provides last-resort option
- Uses simplified tool configuration
- Recommended: "true" for production

#### `TRANSACTION_TIMEOUT_MS`

**Type**: Number  
**Default**: 300000 (5 minutes)  
**Purpose**: How long transactions remain in memory before expiring

**Considerations:**

- Should be longer than max request time
- Prevents memory leaks from abandoned transactions
- Recommended: 300000 (5 minutes)

#### `TRANSACTION_CLEANUP_INTERVAL_MS`

**Type**: Number  
**Default**: 60000 (1 minute)  
**Purpose**: How often to clean up expired transactions

**Considerations:**

- More frequent = less memory usage, more CPU
- Less frequent = more memory usage, less CPU
- Recommended: 60000 (1 minute)

## Deployment Strategy

### Phase 1: Deploy with Feature Disabled

**Goal**: Deploy code without activating new behavior

**Steps:**

1. **Set environment variables:**

   ```bash
   ENABLE_RETRY_LOGIC=false
   ```

2. **Deploy application:**

   ```bash
   pnpm build
   # Deploy to production
   ```

3. **Verify deployment:**

   - Check application starts successfully
   - Verify existing chat functionality works
   - Monitor error logs for any issues

4. **Validation:**
   - Test chat requests work as before
   - Verify no new errors in logs
   - Check performance metrics unchanged

**Rollback Plan**: Standard deployment rollback

---

### Phase 2: Enable for Internal Testing

**Goal**: Test with internal users before public rollout

**Steps:**

1. **Enable feature flag:**

   ```bash
   ENABLE_RETRY_LOGIC=true
   ```

2. **Restart application** to pick up new environment variable

3. **Test with internal accounts:**

   - Send various chat requests
   - Trigger retry scenarios (if possible)
   - Monitor logs for retry activity
   - Verify usage counters accurate

4. **Monitor metrics:**

   - Retry rate
   - Validation failure rate
   - Transaction commit/rollback rates
   - Response latency

5. **Validation checklist:**
   - [ ] Normal requests work correctly
   - [ ] Retry logic activates when needed
   - [ ] Usage counters accurate
   - [ ] No performance degradation
   - [ ] Logs show expected behavior

**Rollback Plan**: Set `ENABLE_RETRY_LOGIC=false` and restart

---

### Phase 3: Gradual Rollout (A/B Testing)

**Goal**: Enable for subset of users to validate at scale

**Option A: User-Based Rollout**

Modify `lib/ai/retry-config.ts` to enable for specific users:

```typescript
export function isRetryEnabled(userId?: string): boolean {
  const globalFlag = process.env.ENABLE_RETRY_LOGIC === "true";

  if (!globalFlag) return false;

  // Enable for specific user IDs during testing
  const testUsers = process.env.RETRY_TEST_USERS?.split(",") || [];
  if (userId && testUsers.includes(userId)) {
    return true;
  }

  // Enable for percentage of users
  const rolloutPercent = parseInt(process.env.RETRY_ROLLOUT_PERCENT || "0", 10);
  if (userId && rolloutPercent > 0) {
    const hash = hashUserId(userId);
    return hash % 100 < rolloutPercent;
  }

  return false;
}
```

**Environment variables:**

```bash
ENABLE_RETRY_LOGIC=true
RETRY_ROLLOUT_PERCENT=10  # Enable for 10% of users
```

**Option B: Time-Based Rollout**

Enable during specific hours:

```typescript
export function isRetryEnabled(): boolean {
  const globalFlag = process.env.ENABLE_RETRY_LOGIC === "true";
  if (!globalFlag) return false;

  // Enable only during off-peak hours initially
  const hour = new Date().getHours();
  const offPeakHours = [0, 1, 2, 3, 4, 5, 22, 23];
  return offPeakHours.includes(hour);
}
```

**Monitoring during rollout:**

- Compare metrics between enabled/disabled users
- Watch for increased error rates
- Monitor database load
- Track user feedback

**Rollout schedule:**

- Day 1-3: 10% of users
- Day 4-7: 25% of users
- Day 8-14: 50% of users
- Day 15+: 100% of users

**Rollback Plan**: Reduce percentage or disable entirely

---

### Phase 4: Full Production Rollout

**Goal**: Enable for all users

**Steps:**

1. **Enable for all users:**

   ```bash
   ENABLE_RETRY_LOGIC=true
   RETRY_ROLLOUT_PERCENT=100  # If using percentage-based rollout
   ```

2. **Monitor closely for 24-48 hours:**

   - Retry rates
   - Error rates
   - Database performance
   - User feedback

3. **Validate success criteria:**
   - [ ] Retry rate < 10%
   - [ ] Rollback rate < 2%
   - [ ] No increase in error rates
   - [ ] No performance degradation
   - [ ] Positive user feedback

**Rollback Plan**: Set `ENABLE_RETRY_LOGIC=false`

---

### Phase 5: Remove Feature Flag

**Goal**: Make retry logic permanent

**Steps:**

1. **Wait 30 days** after full rollout to ensure stability

2. **Remove feature flag code:**

   - Remove `isRetryEnabled()` checks
   - Remove legacy code paths
   - Simplify conditional logic

3. **Update documentation** to reflect retry as standard behavior

4. **Deploy cleaned-up code**

## Database Considerations

### No Schema Changes Required

The retry system uses existing database schema. No migrations needed.

### Database Load

**Expected impact:**

- No increase in write operations (same number of increments)
- Slight increase in read operations (transaction checks)
- Overall impact: Negligible

**Monitoring:**

- Query performance
- Connection pool usage
- Lock contention (should be none)

### Backup and Recovery

No special backup considerations. Standard database backup procedures apply.

## Performance Considerations

### Latency Impact

**Successful requests (no retry):**

- Added latency: ~27ms
  - Transaction begin: ~5ms
  - Validation: ~2ms
  - Transaction commit: ~20ms

**Failed requests (with retries):**

- Added latency: ~7s + original request time
  - Retry 1: 1s delay + request time
  - Retry 2: 2s delay + request time
  - Retry 3: 4s delay + request time

### Memory Usage

**In-memory transaction store:**

- ~500 bytes per transaction
- Max concurrent: ~1000 users
- Total memory: ~500KB (negligible)

**Cleanup:**

- Automatic cleanup every 60 seconds
- Expired transactions removed
- No memory leaks

### Scaling Considerations

**Single instance:**

- In-memory transactions work fine
- No external dependencies

**Multiple instances:**

- Each instance has own transaction store
- Transactions not shared between instances
- This is acceptable because:
  - Transactions are short-lived
  - User requests typically hit same instance (sticky sessions)
  - Worst case: Transaction expires, user retries

**Future enhancement:**

- Use Redis for shared transaction store
- Enables true multi-instance support
- Not required for initial deployment

## Monitoring Setup

### Required Metrics

Set up monitoring for these key metrics:

1. **Retry Rate**

   - Metric: `retry_attempts_total / total_requests`
   - Alert: > 10%
   - Action: Investigate model issues

2. **Validation Failure Rate**

   - Metric: `validation_failures_total / total_requests`
   - Alert: > 15%
   - Action: Review validation rules

3. **Rollback Rate**

   - Metric: `rollbacks_total / total_requests`
   - Alert: > 2%
   - Action: Investigate retry effectiveness

4. **Transaction Commit Failures**

   - Metric: `commit_failures_total`
   - Alert: > 0
   - Action: Investigate database issues

5. **Average Retry Duration**
   - Metric: `avg(retry_duration_ms)`
   - Alert: > 10000ms (10s)
   - Action: Review backoff configuration

### Log Monitoring

Search logs for these patterns:

**Retry attempts:**

```
[Retry] Attempt 2/4 for chat-xxx
```

**Validation failures:**

```
[Validation] Invalid response: Empty response
```

**Transaction operations:**

```
[Transaction] Committed: txn-xxx
[Transaction] Rolled back: txn-xxx
```

**Errors:**

```
[Error] Retry failed after 4 attempts
[Error] Transaction commit failed
```

### Alerting Rules

Configure alerts for:

1. **High retry rate** (> 10% for 5 minutes)
2. **High rollback rate** (> 2% for 5 minutes)
3. **Transaction commit failures** (any occurrence)
4. **Slow retry duration** (> 10s average for 5 minutes)

## Troubleshooting

### Issue: High Retry Rate

**Symptoms:**

- Retry rate > 10%
- Many validation failures in logs

**Possible causes:**

- Model producing empty responses
- Validation rules too strict
- Network issues

**Actions:**

1. Check model status/health
2. Review validation failure reasons in logs
3. Consider adjusting validation rules
4. Check for patterns (specific models, times, users)

### Issue: Transaction Commit Failures

**Symptoms:**

- Errors in logs: "Transaction commit failed"
- Usage counters inaccurate

**Possible causes:**

- Database connectivity issues
- Database performance problems
- Race conditions

**Actions:**

1. Check database health
2. Review database logs
3. Check connection pool settings
4. Verify no database locks

### Issue: Memory Growth

**Symptoms:**

- Application memory usage increasing
- Out of memory errors

**Possible causes:**

- Transaction cleanup not running
- Too many concurrent transactions
- Memory leak

**Actions:**

1. Check transaction cleanup logs
2. Review active transaction count
3. Verify cleanup interval setting
4. Restart application if needed

### Issue: Slow Response Times

**Symptoms:**

- Increased latency
- User complaints about slow responses

**Possible causes:**

- Too many retries
- Long backoff delays
- Database slow queries

**Actions:**

1. Review retry configuration
2. Check database query performance
3. Consider reducing max retries
4. Adjust backoff delays

## Rollback Procedures

### Emergency Rollback

**If critical issues arise:**

1. **Disable feature immediately:**

   ```bash
   ENABLE_RETRY_LOGIC=false
   ```

2. **Restart application** (or wait for auto-reload)

3. **Verify rollback:**

   - Check logs show feature disabled
   - Test chat functionality
   - Monitor error rates

4. **Investigate issue:**
   - Review logs from incident
   - Identify root cause
   - Plan fix

### Partial Rollback

**If issues affect specific users/scenarios:**

1. **Reduce rollout percentage:**

   ```bash
   RETRY_ROLLOUT_PERCENT=10  # Reduce from higher value
   ```

2. **Or disable for specific users:**

   ```bash
   RETRY_DISABLED_USERS=user1,user2,user3
   ```

3. **Monitor affected users**

4. **Fix issue and re-enable**

### Data Integrity Check

**After rollback, verify usage counters:**

```sql
-- Check for users with negative request counts
SELECT id, email, "requestsToday"
FROM "User"
WHERE CAST("requestsToday" AS INTEGER) < 0;

-- Check for users with unusually high counts
SELECT id, email, "requestsToday", "dailyRequestLimit"
FROM "User"
WHERE CAST("requestsToday" AS INTEGER) > CAST("dailyRequestLimit" AS INTEGER) + 10;
```

**If issues found, run correction script:**

```typescript
// scripts/fix-usage-counters.ts
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

async function fixUsageCounters() {
  // Reset negative counts to 0
  await db
    .update(user)
    .set({ requestsToday: "0" })
    .where(sql`CAST(${user.requestsToday} AS INTEGER) < 0`);

  // Cap counts at daily limit
  await db
    .update(user)
    .set({ requestsToday: user.dailyRequestLimit })
    .where(
      sql`CAST(${user.requestsToday} AS INTEGER) > CAST(${user.dailyRequestLimit} AS INTEGER)`
    );
}
```

## Post-Deployment Validation

### Validation Checklist

After each deployment phase:

- [ ] Application starts successfully
- [ ] No errors in startup logs
- [ ] Chat functionality works
- [ ] Retry logic activates (if enabled)
- [ ] Usage counters accurate
- [ ] No performance degradation
- [ ] Monitoring dashboards show expected metrics
- [ ] Alerts configured and working

### Success Criteria

**Phase 1 (Disabled):**

- No change in behavior
- No new errors

**Phase 2 (Internal):**

- Retry logic works as expected
- Usage counters accurate
- No performance issues

**Phase 3 (Gradual):**

- Metrics stable across rollout
- No increase in errors
- Positive user feedback

**Phase 4 (Full):**

- Retry rate < 10%
- Rollback rate < 2%
- No performance degradation
- User satisfaction maintained

## Support and Maintenance

### Regular Maintenance

**Weekly:**

- Review retry rate trends
- Check for unusual patterns
- Verify usage counter accuracy

**Monthly:**

- Analyze retry effectiveness
- Review validation rules
- Optimize configuration if needed

### Configuration Tuning

Based on observed metrics, consider adjusting:

**If retry rate > 15%:**

- Investigate model issues
- Consider adjusting validation rules
- Review backoff delays

**If rollback rate > 5%:**

- Increase max retries
- Enable fallback if disabled
- Review validation criteria

**If latency increased:**

- Reduce max retries
- Shorten backoff delays
- Optimize validation logic

## Additional Resources

- [API Reference](./API_REFERENCE.md) - Detailed API documentation
- [Monitoring Guide](./MONITORING_GUIDE.md) - Monitoring and alerting setup
- [Feature Flag Guide](./FEATURE_FLAG_GUIDE.md) - Feature flag usage
- [Requirements](./requirements.md) - Feature requirements
- [Design](./design.md) - Technical design document
