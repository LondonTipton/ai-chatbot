# Stream Error Fix Verification Checklist

## Pre-Deployment Verification

### Code Review

- [x] Stream state tracking variables added (`streamError`, `streamCompleted`)
- [x] Warmup period implemented (500ms delay)
- [x] Error capture in `onError` callback
- [x] Error throwing in warmup period
- [x] Early validation check added
- [x] `onFinish` updated to throw on stream errors
- [x] Unused imports removed

### Test Coverage

- [x] Unit tests for validation logic
- [x] Integration tests for retry flow
- [x] Stream error detection tests
- [x] Warmup period timing tests
- [x] Transaction rollback tests

### Documentation

- [x] Technical implementation documented
- [x] Troubleshooting guide created
- [x] Monitoring queries provided
- [x] Configuration options documented

## Post-Deployment Verification

### Immediate Checks (First 5 Minutes)

#### 1. Application Starts Successfully

```bash
# Check application logs
pnpm dev

# Look for startup errors
# Should see no errors related to retry system
```

- [ ] Application starts without errors
- [ ] No TypeScript compilation errors
- [ ] No runtime initialization errors

#### 2. Basic Chat Functionality Works

```bash
# Test a simple chat request
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

- [ ] Chat request completes successfully
- [ ] Response contains text content
- [ ] No errors in console

#### 3. Warmup Period Logs Appear

```bash
# Check for warmup messages
grep "Warming up stream" logs.txt
```

- [ ] Warmup messages appear in logs
- [ ] Warmup completes successfully
- [ ] No errors during warmup

### Short-Term Checks (First Hour)

#### 4. Monitor Error Rate

```bash
# Count stream errors
ERRORS=$(grep "Stream error" logs.txt | wc -l)
REQUESTS=$(grep "Starting stream" logs.txt | wc -l)
echo "Error rate: $((ERRORS * 100 / REQUESTS))%"
```

- [ ] Error rate < 5%
- [ ] No increase in error rate vs baseline
- [ ] Errors caught during warmup

#### 5. Verify Retry Behavior

```bash
# Check retry attempts
grep "Attempt [2-9]" logs.txt

# Check retry success
grep "Success after [2-9] attempt" logs.txt
```

- [ ] Retries triggered when errors occur
- [ ] Retry success rate > 80%
- [ ] Transaction committed after successful retry

#### 6. Check Latency Impact

```bash
# Measure average response time
grep "Total duration:" logs.txt | awk '{sum+=$4; count++} END {print sum/count}'
```

- [ ] Average latency increased by ~500ms (expected)
- [ ] No excessive latency (>2s)
- [ ] User experience acceptable

### Medium-Term Checks (First Day)

#### 7. Monitor Key Health

```bash
# Check Cerebras key status
grep "Key Health:" logs.txt | tail -10
```

- [ ] At least 3/5 keys healthy
- [ ] Key rotation working correctly
- [ ] No keys permanently disabled

#### 8. Verify Transaction Accuracy

```bash
# Check transaction commits
grep "Transaction.*committed" logs.txt | wc -l

# Check transaction rollbacks
grep "Transaction.*rolled back" logs.txt | wc -l
```

- [ ] Commits match successful requests
- [ ] Rollbacks match failed requests
- [ ] No orphaned transactions

#### 9. Check Usage Counter Accuracy

```sql
-- Verify usage counters match transaction logs
SELECT
  user_id,
  requests_today,
  (SELECT COUNT(*) FROM transactions WHERE user_id = users.id AND committed = true) as committed_count
FROM users
WHERE requests_today != committed_count;
```

- [ ] Usage counters accurate
- [ ] No discrepancies between counters and transactions
- [ ] Rollbacks properly decremented counters

### Long-Term Checks (First Week)

#### 10. Analyze Error Patterns

```bash
# Group errors by type
grep "Stream error:" logs.txt | cut -d':' -f3 | sort | uniq -c | sort -rn
```

- [ ] Identify most common error types
- [ ] Verify warmup catches majority of errors
- [ ] No new error types introduced

#### 11. Monitor User Feedback

- [ ] No increase in user complaints
- [ ] No reports of incomplete responses
- [ ] Acceptable latency for users

#### 12. Review Metrics Dashboard

- [ ] Stream error rate trending down
- [ ] Retry success rate stable or improving
- [ ] Transaction accuracy maintained
- [ ] No memory leaks in transaction store

## Performance Benchmarks

### Baseline (Before Fix)

- Average response time: ~1.5s
- Stream error rate: ~8%
- Incomplete response rate: ~5%
- Retry success rate: N/A (no retries)

### Target (After Fix)

- Average response time: ~2.0s (+500ms for warmup)
- Stream error rate: <3% (errors caught and retried)
- Incomplete response rate: <1%
- Retry success rate: >80%

### Actual Results

- [ ] Average response time: **\_** ms
- [ ] Stream error rate: **\_** %
- [ ] Incomplete response rate: **\_** %
- [ ] Retry success rate: **\_** %

## Test Scenarios

### Scenario 1: Normal Request (No Errors)

```bash
# Send normal chat request
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the capital of France?"}'
```

**Expected**:

- [x] Warmup period completes
- [x] Stream returns successfully
- [x] Response contains valid text
- [x] Transaction committed
- [x] Usage counter incremented

### Scenario 2: Simulated Stream Error

```bash
# This would require injecting an error in development
# Check logs for retry behavior
```

**Expected**:

- [ ] Error detected during warmup
- [ ] Retry triggered automatically
- [ ] Second attempt succeeds
- [ ] Transaction committed once
- [ ] User receives complete response

### Scenario 3: Multiple Concurrent Requests

```bash
# Send 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Test '$i'"}' &
done
wait
```

**Expected**:

- [ ] All requests complete successfully
- [ ] No race conditions in transaction manager
- [ ] Usage counters accurate for all users
- [ ] No memory leaks

### Scenario 4: Rate Limit Scenario

```bash
# Send requests until rate limit hit
# (Requires test user with low limit)
```

**Expected**:

- [ ] Rate limit enforced correctly
- [ ] No transaction created when limit reached
- [ ] Appropriate error message returned
- [ ] No retry attempted for rate limit

## Rollback Criteria

Rollback the fix if any of the following occur:

### Critical Issues (Immediate Rollback)

- [ ] Application crashes or fails to start
- [ ] Database corruption or data loss
- [ ] Usage counters severely inaccurate (>10% error)
- [ ] Complete service outage

### Major Issues (Rollback Within 1 Hour)

- [ ] Error rate increases >20%
- [ ] Average latency >5s
- [ ] Retry success rate <50%
- [ ] Memory leak detected

### Minor Issues (Monitor and Fix)

- [ ] Error rate increases 5-10%
- [ ] Average latency 2-3s
- [ ] Retry success rate 50-80%
- [ ] Occasional transaction inconsistencies

## Rollback Procedure

If rollback needed:

1. **Disable Feature Flag**

   ```env
   ENABLE_RETRY_LOGIC=false
   ```

2. **Restart Application**

   ```bash
   pnpm build
   pnpm start
   ```

3. **Verify Rollback**

   ```bash
   # Check logs for legacy flow
   grep "Using legacy flow" logs.txt
   ```

4. **Monitor Recovery**
   - Check error rate returns to baseline
   - Verify latency returns to normal
   - Confirm user experience restored

## Sign-Off

### Development Team

- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Documentation complete

### QA Team

- [ ] Manual testing complete
- [ ] Performance testing complete
- [ ] Edge cases verified

### DevOps Team

- [ ] Deployment plan reviewed
- [ ] Monitoring configured
- [ ] Rollback plan tested

### Product Team

- [ ] User impact assessed
- [ ] Latency increase acceptable
- [ ] Success criteria defined

## Notes

Add any observations or issues encountered during verification:

```
[Date] [Time] - [Observer Name]
- Observation 1
- Observation 2
- etc.
```

## Conclusion

- [ ] All verification checks passed
- [ ] No critical or major issues found
- [ ] Performance within acceptable range
- [ ] Ready for production deployment

**Verified by**: ******\_\_\_******
**Date**: ******\_\_\_******
**Signature**: ******\_\_\_******
