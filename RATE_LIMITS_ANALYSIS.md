# Rate Limits Analysis & Mitigation Strategy

## Executive Summary

This document analyzes the rate limits for Cerebras (LLM) and Tavily (Search) APIs and provides strategies to stay within limits while maintaining system performance.

---

## RATE LIMITS OVERVIEW

### Cerebras Limits

| Metric                  | Limit | Critical Threshold (80%) |
| ----------------------- | ----- | ------------------------ |
| **Tokens per minute**   | 60K   | 48K                      |
| **Tokens per hour**     | 1M    | 800K                     |
| **Tokens per day**      | 1M    | 800K                     |
| **Requests per minute** | 30    | 24                       |
| **Requests per hour**   | 90    | 72                       |
| **Requests per day**    | 14.4K | 11.5K                    |

**Critical Constraint**: Daily token limit of 1M (same as hourly)

### Tavily Limits

| Metric                  | Limit | Critical Threshold (80%) |
| ----------------------- | ----- | ------------------------ |
| **Requests per minute** | 100   | 80                       |

---

## IMPACT ANALYSIS

### Current Token Budget vs Cerebras Limits

| Mode   | Avg Tokens | Queries/Day @ 1M Limit | % of Daily Capacity |
| ------ | ---------- | ---------------------- | ------------------- |
| AUTO   | 3.5K       | 285 queries            | 0.35% per query     |
| MEDIUM | 12K        | 83 queries             | 1.2% per query      |
| DEEP   | 33K        | 30 queries             | 3.3% per query      |

### Mixed Workload Scenarios

**Scenario 1: Balanced Usage (50% AUTO, 35% MEDIUM, 15% DEEP)**

```
Daily capacity: 1M tokens

AUTO: 50% × 285 = 142 queries × 3.5K = 497K tokens
MEDIUM: 35% × 83 = 29 queries × 12K = 348K tokens
DEEP: 15% × 30 = 4 queries × 33K = 132K tokens

Total: 175 queries, 977K tokens (97.7% utilization)
Status: ⚠️ NEAR LIMIT
```

**Scenario 2: Heavy AUTO Usage (70% AUTO, 25% MEDIUM, 5% DEEP)**

```
AUTO: 70% × 285 = 199 queries × 3.5K = 696K tokens
MEDIUM: 25% × 83 = 20 queries × 12K = 240K tokens
DEEP: 5% × 30 = 1 query × 33K = 33K tokens

Total: 220 queries, 969K tokens (96.9% utilization)
Status: ⚠️ NEAR LIMIT
```

**Scenario 3: Research-Heavy Usage (30% AUTO, 40% MEDIUM, 30% DEEP)**

```
AUTO: 30% × 285 = 85 queries × 3.5K = 297K tokens
MEDIUM: 40% × 83 = 33 queries × 12K = 396K tokens
DEEP: 30% × 30 = 9 queries × 33K = 297K tokens

Total: 127 queries, 990K tokens (99% utilization)
Status: ❌ AT LIMIT
```

### Cerebras Request Limits

**Requests per minute**: 30

- AUTO mode: 1-3 requests per query
- MEDIUM mode: 2-6 requests per query
- DEEP mode: 3-15 requests per query

**Burst scenario** (all DEEP queries):

- 30 requests/min ÷ 10 avg requests per DEEP query = **3 DEEP queries/minute max**
- This is acceptable since DEEP queries take 25-47s each

**Requests per day**: 14.4K

- Mixed workload: ~220 queries × 3 avg requests = 660 requests/day
- Status: ✅ Well under limit (4.6% utilization)

### Tavily Request Limits

**Requests per minute**: 100

**Per-mode Tavily usage**:

- AUTO: 0-1 Tavily calls
- MEDIUM: 1-3 Tavily calls
- DEEP: 1-4 Tavily calls (initial + 3 parallel)

**Burst scenario** (all MEDIUM queries with 3 searches each):

- 100 requests/min ÷ 3 = **33 MEDIUM queries/minute max**
- This is acceptable since MEDIUM queries take 10-20s each

---

## CRITICAL BOTTLENECK: DAILY TOKEN LIMIT

### The Problem

Cerebras has a **1M token daily limit** (same as hourly), which is the primary constraint.

**Current system can handle**:

- ~175-220 queries/day (mixed workload)
- ~285 queries/day (all AUTO)
- ~30 queries/day (all DEEP)

**This is insufficient for production scale.**

### Mitigation Strategies

#### Strategy 1: Aggressive Token Reduction

**Target**: Reduce average tokens by 30-40%

**Actions**:

1. **Reduce DEEP mode tokens** (33K → 20K)

   - Initial research: 8K → 5K
   - Deep dive searches: 15K → 10K (3×5K → 2×5K)
   - Synthesis: 8K → 5K

2. **Reduce MEDIUM mode tokens** (12K → 8K)

   - Limit extraction to 2 URLs instead of 3
   - Reduce maxResults from 10 to 7

3. **Optimize AUTO mode** (3.5K → 2.5K)
   - Reduce maxResults from 5 to 3
   - Tighter synthesis

**New capacity**:

```
AUTO: 2.5K → 400 queries/day
MEDIUM: 8K → 125 queries/day
DEEP: 20K → 50 queries/day

Mixed (50/35/15): ~250 queries/day (43% improvement)
```

#### Strategy 2: Implement Caching

**Cache search results** for common queries:

- Cache TTL: 24 hours for general queries, 1 hour for news
- Expected cache hit rate: 20-30%
- Token savings: 20-30% on cached queries

**Implementation**:

```typescript
// Cache key: hash(query + mode + jurisdiction)
const cacheKey = hashQuery(query, mode, jurisdiction);
const cached = await redis.get(cacheKey);

if (cached && !isStale(cached)) {
  return cached.response; // 0 tokens used
}

// Execute query and cache
const response = await agent.generate(query);
await redis.set(cacheKey, response, { ttl: 3600 });
```

**New capacity with 25% cache hit rate**:

```
Effective queries/day: 250 ÷ 0.75 = 333 queries/day
```

#### Strategy 3: Rate Limiting & Queueing

**Implement request queue** to smooth out bursts:

```typescript
// Queue configuration
const queue = new Queue({
  maxConcurrent: 5, // Max 5 concurrent queries
  tokensPerMinute: 48000, // 80% of limit
  tokensPerDay: 800000, // 80% of limit
});

// Queue request
await queue.add({
  query,
  mode,
  priority: mode === "auto" ? 1 : mode === "medium" ? 2 : 3,
});
```

**Benefits**:

- Prevents burst overload
- Prioritizes fast queries (AUTO)
- Smooth token consumption

#### Strategy 4: Multi-Provider Fallback

**Add alternative LLM providers** for overflow:

```typescript
const providers = [
  { name: "cerebras", limit: 1000000, current: 0 },
  { name: "openai", limit: 10000000, current: 0 }, // Fallback
  { name: "anthropic", limit: 5000000, current: 0 }, // Fallback
];

async function selectProvider(estimatedTokens: number) {
  for (const provider of providers) {
    if (provider.current + estimatedTokens < provider.limit * 0.8) {
      return provider;
    }
  }
  throw new Error("All providers at capacity");
}
```

#### Strategy 5: User Tier System

**Implement usage tiers**:

```typescript
const tiers = {
  free: {
    queriesPerDay: 10,
    modesAllowed: ["auto"],
    priority: 3,
  },
  basic: {
    queriesPerDay: 50,
    modesAllowed: ["auto", "medium"],
    priority: 2,
  },
  premium: {
    queriesPerDay: 200,
    modesAllowed: ["auto", "medium", "deep"],
    priority: 1,
  },
};
```

---

## RECOMMENDED CONFIGURATION

### Token Budget Adjustments

| Mode   | Current | Optimized | Reduction |
| ------ | ------- | --------- | --------- |
| AUTO   | 3.5K    | 2.5K      | 29%       |
| MEDIUM | 12K     | 8K        | 33%       |
| DEEP   | 33K     | 20K       | 39%       |

### Updated Tool Configurations

#### AUTO Mode

```typescript
// basicSearchWorkflow
tavilySearchBasic.execute({
  maxResults: 3, // Reduced from 5
  searchDepth: "basic",
});

// Synthesis
synthesizerAgent.generate(prompt, {
  maxTokens: 1500, // Reduced from 2000
});
```

#### MEDIUM Mode

```typescript
// advancedSearchWorkflow
tavilySearchAdvanced.execute({
  maxResults: 7, // Reduced from 10
  searchDepth: "advanced",
});

// Extract
tavilyExtract.execute({
  urls: topUrls.slice(0, 2), // Reduced from 3
});
```

#### DEEP Mode

```typescript
// comprehensiveAnalysisWorkflow
tavilyContextSearch.execute({
  maxTokens: 5000, // Reduced from 8000
});

// Parallel searches
targetedQueries.slice(0, 2).map(
  (
    query // Reduced from 3
  ) =>
    tavilyContextSearch.execute({
      maxTokens: 5000,
    })
);
```

### Rate Limiting Implementation

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Cerebras limits
export const cerebrasLimiter = {
  tokensPerMinute: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(48000, "1 m"), // 80% of 60K
    analytics: true,
  }),

  tokensPerDay: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(800000, "24 h"), // 80% of 1M
    analytics: true,
  }),

  requestsPerMinute: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(24, "1 m"), // 80% of 30
    analytics: true,
  }),
};

// Tavily limits
export const tavilyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, "1 m"), // 80% of 100
  analytics: true,
});

// Usage
export async function checkCerebrasLimit(estimatedTokens: number) {
  const [tokensOk, requestsOk] = await Promise.all([
    cerebrasLimiter.tokensPerMinute.limit(`cerebras-tokens-${Date.now()}`, {
      rate: estimatedTokens,
    }),
    cerebrasLimiter.requestsPerMinute.limit("cerebras-requests"),
  ]);

  if (!tokensOk.success || !requestsOk.success) {
    throw new Error("Rate limit exceeded");
  }
}
```

### Queue Implementation

```typescript
// lib/query-queue.ts
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const queryQueue = new Queue("legal-research", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Add query to queue
export async function queueQuery(query: string, mode: string, userId: string) {
  const estimatedTokens = {
    auto: 2500,
    medium: 8000,
    deep: 20000,
  }[mode];

  const priority = {
    auto: 1,
    medium: 2,
    deep: 3,
  }[mode];

  return await queryQueue.add(
    "research",
    {
      query,
      mode,
      userId,
      estimatedTokens,
    },
    {
      priority,
    }
  );
}

// Process queue
queryQueue.process("research", async (job) => {
  const { query, mode, estimatedTokens } = job.data;

  // Check rate limits
  await checkCerebrasLimit(estimatedTokens);

  // Execute query
  const agent = agents[mode];
  const response = await agent.generate(query);

  return response;
});
```

---

## MONITORING & ALERTS

### Metrics to Track

```typescript
interface RateLimitMetrics {
  // Cerebras
  cerebrasTokensUsedToday: number;
  cerebrasTokensRemainingToday: number;
  cerebrasRequestsPerMinute: number;

  // Tavily
  tavilyRequestsPerMinute: number;

  // Queue
  queueLength: number;
  avgWaitTime: number;

  // Usage
  queriesPerMode: {
    auto: number;
    medium: number;
    deep: number;
  };
}
```

### Alert Thresholds

```typescript
const alerts = {
  cerebrasTokens: {
    warning: 0.8, // 80% of daily limit
    critical: 0.95, // 95% of daily limit
  },

  queueLength: {
    warning: 50,
    critical: 100,
  },

  avgWaitTime: {
    warning: 30000, // 30 seconds
    critical: 60000, // 60 seconds
  },
};

// Check and alert
if (metrics.cerebrasTokensUsedToday > 800000) {
  console.warn("[ALERT] Cerebras tokens at 80% of daily limit");
  // Throttle DEEP mode queries
  // Increase cache TTL
  // Send notification to admins
}
```

---

## CAPACITY PLANNING

### With All Optimizations

**Token reduction**: 30-35%  
**Caching**: 25% hit rate  
**Effective capacity**:

```
Base capacity: 250 queries/day (optimized tokens)
With caching: 250 ÷ 0.75 = 333 queries/day
With queue smoothing: +10% = 366 queries/day

Final capacity: ~350-400 queries/day
```

### Growth Strategy

**Phase 1** (Current): Single Cerebras account

- Capacity: 350-400 queries/day
- Cost: Included in Cerebras free tier

**Phase 2** (3-6 months): Add fallback providers

- Capacity: 1000+ queries/day
- Cost: $50-100/month (OpenAI/Anthropic overflow)

**Phase 3** (6-12 months): Multiple Cerebras accounts

- Capacity: 1000-1500 queries/day
- Cost: Negotiate enterprise pricing

**Phase 4** (12+ months): Dedicated infrastructure

- Capacity: Unlimited
- Cost: Self-hosted LLM + API costs

---

## IMPLEMENTATION PRIORITY

### Week 1: Critical Optimizations

- [ ] Reduce token budgets (30-35% reduction)
- [ ] Implement rate limiting
- [ ] Add token tracking and alerts

### Week 2: Caching Layer

- [ ] Implement Redis caching
- [ ] Add cache hit/miss tracking
- [ ] Optimize cache keys and TTL

### Week 3: Queue System

- [ ] Implement BullMQ queue
- [ ] Add priority handling
- [ ] Add queue monitoring

### Week 4: Monitoring & Alerts

- [ ] Dashboard for rate limit tracking
- [ ] Alert system for threshold breaches
- [ ] Usage analytics and reporting

---

## SUMMARY

### Critical Constraints

1. **Cerebras daily token limit**: 1M tokens
2. **Current capacity**: 175-220 queries/day (unoptimized)
3. **Optimized capacity**: 350-400 queries/day (with all mitigations)

### Key Mitigations

1. **Token reduction**: 30-35% across all modes
2. **Caching**: 25% hit rate = 33% capacity increase
3. **Rate limiting**: Prevents burst overload
4. **Queue system**: Smooths traffic, prioritizes fast queries
5. **Monitoring**: Early warning for limit breaches

### Recommended Actions

1. ✅ **Immediate**: Reduce token budgets
2. ✅ **Week 1**: Implement rate limiting
3. ✅ **Week 2**: Add caching layer
4. ⚠️ **Week 3**: Implement queue system
5. ⚠️ **Future**: Add fallback providers

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Critical for Production Deployment
