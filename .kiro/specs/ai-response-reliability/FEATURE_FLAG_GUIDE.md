# Feature Flag Configuration Guide

## Quick Start

### Enable Retry Logic

Add to your `.env.local` file:

```bash
ENABLE_RETRY_LOGIC=true
```

### Disable Retry Logic (Default)

```bash
ENABLE_RETRY_LOGIC=false
```

Or simply omit the variable - it defaults to `false`.

## Full Configuration Options

```bash
# Master Feature Flag
ENABLE_RETRY_LOGIC=true

# Retry Parameters
RETRY_MAX_ATTEMPTS=3                    # Number of retry attempts (1-10)
RETRY_BACKOFF_MS=1000,2000,4000        # Delays between retries in milliseconds
RETRY_ENABLE_FALLBACK=true             # Enable simplified fallback attempt

# Transaction Management
TRANSACTION_TIMEOUT_MS=300000          # 5 minutes - how long transactions live
TRANSACTION_CLEANUP_INTERVAL_MS=60000  # 1 minute - how often to clean up expired transactions
```

## Configuration Presets

### Conservative (Fewer Retries, Faster Failure)

```bash
ENABLE_RETRY_LOGIC=true
RETRY_MAX_ATTEMPTS=2
RETRY_BACKOFF_MS=500,1000
RETRY_ENABLE_FALLBACK=false
```

### Aggressive (More Retries, Higher Success Rate)

```bash
ENABLE_RETRY_LOGIC=true
RETRY_MAX_ATTEMPTS=5
RETRY_BACKOFF_MS=1000,2000,4000,8000,16000
RETRY_ENABLE_FALLBACK=true
```

### Production Recommended

```bash
ENABLE_RETRY_LOGIC=true
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=1000,2000,4000
RETRY_ENABLE_FALLBACK=true
TRANSACTION_TIMEOUT_MS=300000
TRANSACTION_CLEANUP_INTERVAL_MS=60000
```

## Validation Rules

The system validates configuration on startup:

### Max Attempts

- **Valid Range**: 1-10
- **Default**: 3
- **Warning**: Values outside range will log a warning but still work

### Backoff Delays

- **Format**: Comma-separated milliseconds
- **Default**: 1000,2000,4000
- **Warning**: Length should match `RETRY_MAX_ATTEMPTS`
- **Example**: For 5 attempts, use `500,1000,2000,4000,8000`

### Transaction Timeout

- **Minimum**: 60000ms (1 minute)
- **Default**: 300000ms (5 minutes)
- **Warning**: Values below minimum will log a warning

### Cleanup Interval

- **Minimum**: 10000ms (10 seconds)
- **Default**: 60000ms (1 minute)
- **Warning**: Should be less than transaction timeout

## Checking Configuration

When your application starts, look for these log messages:

### Retry Enabled

```
[RetryConfig] Retry logic enabled with configuration: {
  maxAttempts: 3,
  backoffDelays: [ 1000, 2000, 4000 ],
  enableFallback: true,
  transactionTimeout: '300000ms',
  transactionCleanupInterval: '60000ms'
}
```

### Retry Disabled

```
[RetryConfig] Retry logic disabled
```

### Configuration Warnings

```
[RetryConfig] Configuration validation warnings:
  - maxAttempts should be between 1 and 10, got 15
  - backoffDelays length (3) doesn't match maxAttempts (5)
```

## Runtime Behavior

### When Enabled (`ENABLE_RETRY_LOGIC=true`)

1. User sends message
2. System checks usage quota (doesn't increment yet)
3. AI generates response
4. System validates response quality
5. If valid → commit usage increment, return response
6. If invalid → retry with backoff delays
7. If all retries fail → rollback usage, return error

### When Disabled (`ENABLE_RETRY_LOGIC=false`)

1. User sends message
2. System increments usage quota immediately
3. AI generates response
4. Return response (no validation or retry)

## Monitoring

### Key Metrics to Track

- Retry rate (% of requests that needed retry)
- Rollback rate (% of requests that failed all retries)
- Average retry duration
- Validation failure reasons

### Log Patterns to Watch

**Successful Retry:**

```
[RetryOrchestration] ✅ Retry succeeded on attempt 2/4
[RetryOrchestration] 📝 Committing transaction...
```

**Failed Retry (Rollback):**

```
[RetryOrchestration] ❌ All 4 attempts failed
[RetryOrchestration] 🔄 Initiating rollback...
[RetryOrchestration] ✅ Transaction rolled back successfully
```

**Legacy Flow:**

```
[RetryConfig] ⚠️  Retry logic disabled - using legacy flow
[Usage] User xyz usage: 5/50 (free plan)
```

## Troubleshooting

### Issue: Configuration not taking effect

**Solution**: Restart your application after changing environment variables

### Issue: Too many retries causing slow responses

**Solution**: Reduce `RETRY_MAX_ATTEMPTS` or shorten `RETRY_BACKOFF_MS` delays

### Issue: High rollback rate

**Solution**:

- Check AI model performance
- Review validation rules
- Consider increasing `RETRY_MAX_ATTEMPTS`
- Enable `RETRY_ENABLE_FALLBACK` if disabled

### Issue: Memory usage increasing

**Solution**:

- Reduce `TRANSACTION_TIMEOUT_MS`
- Reduce `TRANSACTION_CLEANUP_INTERVAL_MS`
- Check for transaction leaks in logs

## Rollback Plan

If issues arise in production:

1. **Immediate**: Set `ENABLE_RETRY_LOGIC=false`
2. **Restart**: Application will use legacy flow
3. **Verify**: Check that requests work normally
4. **Investigate**: Review logs for root cause
5. **Fix**: Address issues and re-enable

## Testing

### Test Configuration Loading

```bash
pnpm exec playwright test tests/unit/retry-config.test.ts
```

### Test with Different Configurations

1. Set environment variables in `.env.local`
2. Start development server: `pnpm dev`
3. Check startup logs for configuration
4. Send test messages
5. Monitor retry behavior in logs

## Best Practices

1. **Start Disabled**: Deploy with `ENABLE_RETRY_LOGIC=false` first
2. **Enable Gradually**: Test with internal users before full rollout
3. **Monitor Closely**: Watch retry rates and user experience
4. **Tune Parameters**: Adjust based on observed behavior
5. **Document Changes**: Keep track of configuration changes in production

## Support

For issues or questions about retry configuration:

1. Check startup logs for configuration warnings
2. Review this guide for common issues
3. Check application logs for retry behavior
4. Contact development team with log excerpts
