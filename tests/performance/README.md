# Performance and Load Tests

This directory contains performance and load tests for the Hybrid Agent + Workflow Architecture.

## Overview

The performance tests validate production capacity targets including:

- **Sustained Load**: 350 queries over simulated 24-hour period
- **Burst Load**: 50+ concurrent queries
- **Cache Effectiveness**: ≥20% cache hit rate
- **Success Rate**: ≥95% query success rate
- **Rate Limit Compliance**: Zero rate limit violations
- **Latency Targets**: Mode-specific latency requirements
- **Error Handling**: Graceful degradation under stress

## Requirements

Before running performance tests, ensure:

1. **Development server is running**: `pnpm dev`
2. **Redis is configured**: Upstash Redis credentials in `.env.local`
3. **API keys are set**: Cerebras and Tavily API keys in `.env.local`
4. **Research API is functional**: `/api/research` endpoint is working

## Running Tests

### Run All Performance Tests

```bash
pnpm test --project=performance
```

### Run Specific Test

```bash
# Sustained load test
pnpm test tests/performance/load-test.ts -g "Sustained load"

# Burst load test
pnpm test tests/performance/load-test.ts -g "Burst load"

# Cache effectiveness test
pnpm test tests/performance/load-test.ts -g "Cache effectiveness"

# Latency targets test
pnpm test tests/performance/load-test.ts -g "Latency targets"

# Rate limit compliance test
pnpm test tests/performance/load-test.ts -g "Rate limit compliance"

# Error handling test
pnpm test tests/performance/load-test.ts -g "Error handling"
```

## Test Configuration

The tests use the following configuration (defined in `load-test.ts`):

```typescript
const CONFIG = {
  apiUrl: "http://localhost:3000/api/research",
  totalQueries: 350, // Target daily capacity
  simulatedHours: 24, // Simulate 24-hour period
  burstSize: 50, // Concurrent queries for burst test

  targets: {
    cacheHitRate: 0.2, // ≥20%
    successRate: 0.95, // ≥95%
    crashCount: 0, // Zero crashes

    latency: {
      auto: { max: 15000 }, // 15s max
      medium: { max: 30000 }, // 30s max
      deep: { max: 60000 }, // 60s max
    },
  },

  modeDistribution: {
    auto: 0.5, // 50% AUTO queries
    medium: 0.3, // 30% MEDIUM queries
    deep: 0.2, // 20% DEEP queries
  },
};
```

## Test Queries

The tests use realistic query patterns:

### AUTO Mode Queries (Simple)

- "What is a contract in Zimbabwe law?"
- "Define tort in legal terms"
- "What is the legal age of majority in Zimbabwe?"
- And more...

### MEDIUM Mode Queries (Moderate)

- "Compare contract law in Zimbabwe and South Africa"
- "What are the key provisions of Zimbabwe's Labour Act?"
- "Explain the process of company incorporation in Zimbabwe"
- And more...

### DEEP Mode Queries (Complex)

- "Provide a comprehensive analysis of intellectual property protection in Zimbabwe"
- "Analyze the constitutional framework for property rights including recent case law"
- "Comprehensive overview of Zimbabwe's legal system and court structure"
- And more...

## Performance Metrics

The tests track and report:

### Success Metrics

- **Total Queries**: Number of queries executed
- **Success Rate**: Percentage of successful queries (target: ≥95%)
- **Cache Hit Rate**: Percentage of queries served from cache (target: ≥20%)
- **Rate Limit Violations**: Number of rate limit errors (target: 0)
- **Crashes**: Number of system crashes (target: 0)

### Latency Metrics (per mode)

- **Min**: Minimum latency
- **Max**: Maximum latency
- **Avg**: Average latency
- **P50**: 50th percentile (median)
- **P95**: 95th percentile
- **P99**: 99th percentile

## Expected Results

### Sustained Load Test (350 queries)

- ✅ Success rate ≥95%
- ✅ Cache hit rate ≥20%
- ✅ Zero rate limit violations
- ✅ Zero crashes
- ✅ All latency targets met

### Burst Load Test (50 concurrent queries)

- ✅ Success rate ≥95%
- ✅ Zero rate limit violations
- ✅ Zero crashes
- ✅ Queue handles burst gracefully

### Cache Effectiveness Test

- ✅ First query: cache miss
- ✅ Subsequent queries: cache hits
- ✅ Cache hit rate ≥80% for repeated queries

### Latency Targets Test

- ✅ AUTO mode P95 < 15s
- ✅ MEDIUM mode P95 < 30s
- ✅ DEEP mode P95 < 60s

### Rate Limit Compliance Test

- ✅ Zero rate limit violations under sustained load
- ✅ Requests properly throttled

### Error Handling Test

- ✅ Graceful handling of edge cases
- ✅ Zero crashes from invalid inputs

## Troubleshooting

### Tests Failing Due to Rate Limits

If tests fail with rate limit errors:

1. **Check Redis configuration**: Ensure Upstash Redis is properly configured
2. **Verify rate limiter settings**: Check `lib/rate-limiter.ts` configuration
3. **Reduce test load**: Temporarily reduce `totalQueries` or `burstSize` in config
4. **Wait for rate limit reset**: Rate limits reset after the time window expires

### Tests Failing Due to Latency

If tests fail latency targets:

1. **Check network conditions**: Ensure stable internet connection
2. **Verify API performance**: Check Cerebras and Tavily API response times
3. **Review agent configurations**: Ensure agents are properly optimized
4. **Check system resources**: Ensure sufficient CPU/memory available

### Tests Failing Due to Cache

If cache hit rate is below target:

1. **Verify Redis connection**: Check Redis is accessible
2. **Check cache TTL**: Ensure cache entries aren't expiring too quickly
3. **Review cache key generation**: Verify cache keys are consistent
4. **Check query patterns**: Ensure queries are being repeated

## Performance Optimization Tips

1. **Increase cache TTL**: Longer TTL = higher cache hit rate
2. **Optimize token budgets**: Reduce token usage per query
3. **Improve agent routing**: Better routing = fewer unnecessary tool calls
4. **Use queue system**: Queue smooths burst traffic and respects rate limits
5. **Monitor metrics**: Track performance over time to identify trends

## CI/CD Integration

To run performance tests in CI/CD:

```bash
# Run with timeout and retries
pnpm test --project=performance --timeout=600000 --retries=1
```

**Note**: Performance tests take longer than unit/integration tests. Consider:

- Running on a schedule (nightly) rather than on every commit
- Using dedicated test infrastructure with consistent resources
- Setting appropriate timeouts (10+ minutes for full suite)

## Related Documentation

- [Requirements Document](../../.kiro/specs/hybrid-agent-workflow/requirements.md)
- [Design Document](../../.kiro/specs/hybrid-agent-workflow/design.md)
- [Implementation Tasks](../../.kiro/specs/hybrid-agent-workflow/tasks.md)
- [E2E Tests](../e2e/research-modes.test.ts)

## Requirements Coverage

These tests validate the following requirements:

- **4.1**: Rate limit management (Cerebras tokens/day)
- **4.2**: Rate limit management (Cerebras tokens/minute)
- **4.3**: Rate limit management (Tavily requests/minute)
- **5.4**: Cache hit rate ≥20%
- **8.1**: Queue system with priority handling
- **8.2**: Queue concurrency and retry logic
- **12.1**: Production capacity (350-400 queries/day)
- **12.2**: Cache effectiveness (25-40% capacity increase)
- **12.3**: Query success rate ≥95%
- **12.4**: Latency targets for all modes
- **12.5**: Zero crashes from tool overuse or rate limits
