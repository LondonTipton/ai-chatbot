---
title: Hybrid Agent + Workflow Architecture Implementation
status: draft
created: 2025-01-XX
updated: 2025-01-XX
---

# Hybrid Agent + Workflow Architecture Implementation

## Overview

Implement a production-ready hybrid Agent + Workflow architecture for DeepCounsel that combines intelligent AI agents with structured workflows, featuring three research modes (AUTO, MEDIUM, DEEP) with strict rate limit management and token optimization.

## Goals

1. **Implement three-mode research system** with intelligent routing
2. **Create workflow tools** that agents can invoke
3. **Optimize token usage** by 30-40% across all modes
4. **Implement rate limiting** to respect Cerebras (1M tokens/day) and Tavily (100 req/min) limits
5. **Add caching layer** to increase effective capacity by 25-40%
6. **Achieve production capacity** of 350-400 queries/day

## Success Criteria

- [ ] All three modes (AUTO, MEDIUM, DEEP) working correctly
- [ ] Agent decision accuracy ≥ 90%
- [ ] Token usage reduced by 30-40% per mode
- [ ] Rate limits respected (80% threshold)
- [ ] Daily capacity: 350-400 queries with all optimizations
- [ ] Zero crashes from tool overuse
- [ ] Cache hit rate ≥ 20%

## Reference Documents

- `MASTRA_WORKFLOWS_AGENTS_ANALYSIS.md` - Architecture design
- `TAVILY_TOOLS_CONFIGURATION.md` - Tool configurations
- `RATE_LIMITS_ANALYSIS.md` - Rate limit strategies

---

## Phase 1: Foundation & Tools

### 1.1 Create Missing Tavily Tools

#### Task: Create QnA Direct Tool

**File**: `mastra/tools/tavily-qna-direct.ts`

**Requirements**:

- Use Tavily's `qna_search()` function
- Return only answer string (no metadata)
- Token estimate: 200-500 tokens
- Latency: 1-2s

**Implementation**:

```typescript
import { createTool } from "@mastra/core";
import { z } from "zod";

export const tavilyQnaDirect = createTool({
  id: "tavily-qna-direct",
  description: `Get a direct, concise answer to a factual question.
  Returns only the answer string, no sources or metadata.
  Use for: Quick facts, simple questions, current information.
  Do NOT use for: Research, analysis, or when sources are needed.`,

  inputSchema: z.object({
    query: z.string().describe("The question to answer"),
  }),

  execute: async ({ context }) => {
    const { query } = context;

    // Uses Tavily's qna_search function
    const answer = await tavilyClient.qna_search(query);

    return {
      answer,
      tokenEstimate: Math.ceil(answer.length / 4),
    };
  },
});
```

**Tests**:

- [ ] Returns answer for simple question
- [ ] Token estimate is accurate
- [ ] Handles API errors gracefully

---

#### Task: Create Context Search Tool

**File**: `mastra/tools/tavily-context-search.ts`

**Requirements**:

- Use Tavily's `get_search_context()` function
- Strict token control via `maxTokens` parameter
- Token range: 2K-15K (configurable)
- Latency: 5-10s

**Implementation**:

```typescript
export const tavilyContextSearch = createTool({
  id: "tavily-context-search",
  description: `Get full-text context from search results with strict token control.
  Returns cleaned, formatted content ready for LLM context.
  Use for: Deep research, comprehensive analysis, RAG workflows.`,

  inputSchema: z.object({
    query: z.string(),
    maxTokens: z
      .number()
      .default(8000)
      .describe("Max tokens for context (2K-15K)"),
    jurisdiction: z.string().optional(),
    timeRange: z.enum(["day", "week", "month", "year"]).optional(),
    includeDomains: z.array(z.string()).optional(),
  }),

  execute: async ({ context }) => {
    const { query, maxTokens, jurisdiction, timeRange, includeDomains } =
      context;

    const searchQuery = jurisdiction ? `${query} ${jurisdiction}` : query;

    const contextString = await tavilyClient.get_search_context({
      query: searchQuery,
      max_tokens: maxTokens,
      search_depth: "advanced",
      time_range: timeRange,
      include_domains: includeDomains,
    });

    return {
      context: contextString,
      tokenCount: Math.floor(contextString.length / 4),
      truncated: contextString.includes("[...]"),
    };
  },
});
```

**Tests**:

- [ ] Respects maxTokens limit
- [ ] Returns formatted context
- [ ] Handles domain filtering
- [ ] Token count is accurate

---

#### Task: Create News Search Tool

**File**: `mastra/tools/tavily-news-search.ts`

**Requirements**:

- Use Tavily's search with `topic: 'news'`
- Time filtering via `days` parameter
- Token estimate: 2K-5K
- Latency: 2-4s

**Implementation**:

```typescript
export const tavilyNewsSearch = createTool({
  id: "tavily-news-search",
  description: `Search recent news and current events.
  Optimized for time-sensitive queries and breaking news.
  Use for: Current events, recent changes, breaking news.`,

  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().default(10),
    days: z.number().default(7).describe("Number of days back (1-30)"),
    jurisdiction: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { query, maxResults, days, jurisdiction } = context;

    const searchQuery = jurisdiction ? `${query} ${jurisdiction}` : query;

    const results = await tavilyClient.search({
      query: searchQuery,
      topic: "news",
      search_depth: "advanced",
      max_results: maxResults,
      days: days,
      include_answer: false,
      include_raw_content: false,
    });

    return {
      results: results.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        publishedDate: r.published_date,
        score: r.score,
      })),
      tokenEstimate: estimateSearchResultTokens(results.results),
    };
  },
});
```

**Tests**:

- [ ] Filters by date range
- [ ] Returns news-specific results
- [ ] Token estimate is accurate

---

### 1.2 Optimize Existing Tools

#### Task: Optimize Basic Search Tool

**File**: `mastra/tools/tavily-search.ts`

**Changes**:

- Reduce default `maxResults` from 5 to 3
- Add token estimation to response
- Add Zimbabwe domain filtering option

**Tests**:

- [ ] Token estimate is accurate
- [ ] Respects maxResults limit
- [ ] Domain filtering works

---

#### Task: Optimize Advanced Search Tool

**File**: `mastra/tools/tavily-search-advanced.ts`

**Changes**:

- Reduce default `maxResults` from 10 to 7
- Add Zimbabwe-specific domain defaults
- Add token estimation to response
- Add `country` parameter support

**Tests**:

- [ ] Token estimate is accurate
- [ ] Zimbabwe domains filter correctly
- [ ] Country parameter works

---

#### Task: Optimize Extract Tool

**File**: `mastra/tools/tavily-extract.ts`

**Changes**:

- Enforce max 3 URLs (reduce from unlimited)
- Add token estimation per URL
- Add total token tracking
- Reduce to 2 URLs for MEDIUM mode

**Tests**:

- [ ] Enforces URL limit
- [ ] Token estimates are accurate
- [ ] Total token tracking works

---

### 1.3 Create Utility Functions

#### Task: Token Estimation Utilities

**File**: `lib/utils/token-estimation.ts`

**Implementation**:

```typescript
export function estimateTokens(text: string | object): number {
  if (typeof text === "object") {
    text = JSON.stringify(text);
  }
  return Math.ceil(text.length / 4);
}

export function estimateSearchResultTokens(results: any[]): number {
  return results.reduce((sum, result) => {
    const titleTokens = estimateTokens(result.title);
    const contentTokens = estimateTokens(result.content);
    const urlTokens = estimateTokens(result.url);
    return sum + titleTokens + contentTokens + urlTokens + 10;
  }, 0);
}
```

**Tests**:

- [ ] Estimates tokens accurately (±10%)
- [ ] Handles objects and strings
- [ ] Handles arrays of results

---

#### Task: Zimbabwe Domain Utilities

**File**: `lib/utils/zimbabwe-domains.ts`

**Implementation**:

```typescript
export function getZimbabweLegalDomains(): string[] {
  return [
    "gov.zw",
    "parlzim.gov.zw",
    "justice.gov.zw",
    "zimlii.org",
    "veritaszim.net",
    "zlhr.org.zw",
    "supremecourt.gov.zw",
    "highcourt.gov.zw",
    "lawsociety.org.zw",
    "saflii.org",
    "africanlii.org",
  ];
}
```

**Tests**:

- [ ] Returns correct domain list
- [ ] List is up to date

---

#### Task: Research Helper Functions

**File**: `lib/utils/research-helpers.ts`

**Implementation**:

```typescript
export function identifyResearchGaps(response: string): string[] {
  const gaps: string[] = [];

  if (response.includes("generally") || response.includes("typically")) {
    gaps.push("lacks specific legal references");
  }

  const citationCount = (response.match(/\[.*?\]\(.*?\)/g) || []).length;
  if (citationCount < 3) {
    gaps.push("insufficient source citations");
  }

  const zimbabweRefs = (response.match(/zimbabwe/gi) || []).length;
  if (zimbabweRefs < 3) {
    gaps.push("needs more Zimbabwe-specific analysis");
  }

  if (!response.toLowerCase().includes("case")) {
    gaps.push("missing case law analysis");
  }

  if (!response.toLowerCase().includes("practical")) {
    gaps.push("lacks practical guidance");
  }

  if (response.length < 1000) {
    gaps.push("response too brief for comprehensive analysis");
  }

  return gaps;
}
```

**Tests**:

- [ ] Identifies missing citations
- [ ] Detects vague language
- [ ] Checks for Zimbabwe context
- [ ] Validates response length

---

## Phase 2: Workflow Implementation

### 2.1 Basic Search Workflow

#### Task: Implement Basic Search Workflow

**File**: `mastra/workflows/basic-search-workflow.ts`

**Requirements**:

- Token budget: 1K-2.5K (optimized)
- Steps: search → synthesize
- Latency: 3-5s

**Implementation**:

```typescript
import { Workflow } from "@mastra/core";
import { z } from "zod";

export const basicSearchWorkflow = new Workflow({
  name: "basic-search",
  triggerSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
  }),

  steps: {
    search: {
      action: async ({ context }) => {
        const { query, jurisdiction } = context.machineContext?.triggerData;

        const results = await tavilySearchBasic.execute({
          query: `${query} ${jurisdiction} law`,
          maxResults: 3, // Optimized from 5
          searchDepth: "basic",
        });

        return { results };
      },
      onSuccess: "synthesize",
    },

    synthesize: {
      action: async ({ context }) => {
        const { results } = context.machineContext?.stepResults["search"];
        const { query } = context.machineContext?.triggerData;

        const synthesized = await synthesizerAgent.generate(
          `Synthesize these search results for Zimbabwe legal query: "${query}"
           
           Results: ${JSON.stringify(results, null, 2)}
           
           Provide clear answer with citations.`,
          { maxSteps: 1, maxTokens: 1500 }
        );

        return {
          response: synthesized.text,
          sources: results.results?.map((r) => ({
            title: r.title,
            url: r.url,
          })),
        };
      },
    },
  },
});
```

**Tests**:

- [ ] Executes both steps successfully
- [ ] Token usage within budget (1K-2.5K)
- [ ] Returns formatted response with sources
- [ ] Handles search failures gracefully

---

### 2.2 Advanced Search Workflow

#### Task: Implement Advanced Search Workflow

**File**: `mastra/workflows/advanced-search-workflow.ts`

**Requirements**:

- Token budget: 4K-8K (optimized)
- Steps: advanced-search → extract-top-sources → synthesize
- Latency: 5-10s

**Implementation**:

```typescript
export const advancedSearchWorkflow = new Workflow({
  name: "advanced-search",
  triggerSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
  }),

  steps: {
    "advanced-search": {
      action: async ({ context }) => {
        const { query, jurisdiction } = context.machineContext?.triggerData;

        const results = await tavilySearchAdvanced.execute({
          query: `${query} ${jurisdiction}`,
          maxResults: 7, // Optimized from 10
          searchDepth: "advanced",
          includeDomains: getZimbabweLegalDomains(),
          timeRange: "year",
          country: "ZW",
        });

        return { results };
      },
      onSuccess: "extract-top-sources",
    },

    "extract-top-sources": {
      action: async ({ context }) => {
        const { results } =
          context.machineContext?.stepResults["advanced-search"];

        const topUrls = results.results
          ?.slice(0, 2) // Optimized from 3
          .map((r) => r.url)
          .filter(Boolean);

        if (!topUrls || topUrls.length === 0) {
          return { extractions: [], skipped: true };
        }

        const extractions = await tavilyExtract.execute({
          urls: topUrls,
          format: "markdown",
        });

        return { extractions };
      },
      onSuccess: "synthesize",
    },

    synthesize: {
      action: async ({ context }) => {
        const steps = context.machineContext?.stepResults;
        const { query } = context.machineContext?.triggerData;

        const searchResults = steps["advanced-search"].results;
        const extractions = steps["extract-top-sources"].extractions;

        const synthesized = await synthesizerAgent.generate(
          `Create comprehensive answer for Zimbabwe legal query: "${query}"
           
           Search Results: ${JSON.stringify(searchResults, null, 2)}
           Extracted Content: ${JSON.stringify(extractions, null, 2)}
           
           Provide detailed answer with proper citations and Zimbabwe legal context.`,
          { maxSteps: 1, maxTokens: 1500 }
        );

        return {
          response: synthesized.text,
          sources: searchResults.results?.map((r) => ({
            title: r.title,
            url: r.url,
          })),
        };
      },
    },
  },
});
```

**Tests**:

- [ ] All steps execute successfully
- [ ] Token usage within budget (4K-8K)
- [ ] Extraction is optional (skips if no URLs)
- [ ] Returns formatted response with sources
- [ ] Handles failures gracefully

---

### 2.3 Comprehensive Analysis Workflow

#### Task: Implement Comprehensive Analysis Workflow

**File**: `mastra/workflows/comprehensive-analysis-workflow.ts`

**Requirements**:

- Token budget: 18K-20K (optimized)
- Steps: initial-research → analyze-gaps → [enhance-findings OR plan-deep-dive → parallel-deep-search → comprehensive-synthesis] → create-document
- Latency: 25-47s

**Implementation**: See reference document for full implementation

**Key Optimizations**:

- Use `tavilyContextSearch` instead of `advancedSearchWorkflow`
- Initial research: 5K tokens (reduced from 8K)
- Parallel searches: 2 instead of 3 (10K total instead of 15K)
- Synthesis: 3K-5K tokens (reduced from 5K-10K)

**Tests**:

- [ ] All steps execute successfully
- [ ] Token usage within budget (18K-20K)
- [ ] Gap analysis works correctly
- [ ] Parallel searches execute correctly
- [ ] Document creation works
- [ ] Streaming works (if enabled)
- [ ] Handles failures gracefully

---

## Phase 3: Agent Implementation

### 3.1 AUTO Agent

#### Task: Implement AUTO Agent

**File**: `mastra/agents/auto-agent.ts`

**Requirements**:

- Budget: 3 steps max
- Tools: qnaDirect, basicSearch workflow
- Can answer directly from knowledge
- Token budget: 500-2.5K

**Implementation**: See reference document

**Tests**:

- [ ] Answers simple questions directly (0 tools)
- [ ] Uses qnaDirect for current info (1 tool)
- [ ] Uses basicSearch workflow for research (1 workflow)
- [ ] Respects maxSteps budget (≤3)
- [ ] Token usage within budget

---

### 3.2 MEDIUM Agent

#### Task: Implement MEDIUM Agent

**File**: `mastra/agents/medium-agent.ts`

**Requirements**:

- Budget: 6 steps max
- Tools: qnaDirect, advancedSearch workflow, newsSearch, summarize
- Can answer directly from knowledge
- Token budget: 1K-8K

**Implementation**: See reference document

**Tests**:

- [ ] Answers general concepts directly (0 tools)
- [ ] Uses qnaDirect for quick facts (1 tool)
- [ ] Uses advancedSearch workflow for research (1-3 workflows)
- [ ] Uses newsSearch for current events
- [ ] Respects maxSteps budget (≤6)
- [ ] Token usage within budget

---

### 3.3 DEEP Agent

#### Task: Implement DEEP Agent

**File**: `mastra/agents/deep-agent.ts`

**Requirements**:

- Budget: 3 steps max
- Tools: comprehensiveAnalysis workflow
- Can answer directly from knowledge
- Token budget: 2K-20K

**Implementation**: See reference document

**Tests**:

- [ ] Answers well-established topics directly (0 tools)
- [ ] Uses comprehensiveAnalysis workflow for research (1 workflow)
- [ ] Respects maxSteps budget (≤3)
- [ ] Token usage within budget
- [ ] Document creation works

---

### 3.4 Supporting Agents

#### Task: Implement Synthesizer Agent

**File**: `mastra/agents/synthesizer-agent.ts`

**Requirements**:

- No tools (formatting only)
- Temperature: 0.6
- MaxTokens: 6000

**Tests**:

- [ ] Formats responses correctly
- [ ] Maintains all citations
- [ ] Does not add new information
- [ ] Uses proper markdown

---

#### Task: Implement Analysis Agent

**File**: `mastra/agents/analysis-agent.ts`

**Requirements**:

- Tools: summarize
- Temperature: 0.5
- MaxTokens: 10000

**Tests**:

- [ ] Analyzes content comprehensively
- [ ] Uses summarize tool when needed
- [ ] Provides proper citations
- [ ] Zimbabwe legal context maintained

---

## Phase 4: Rate Limiting & Caching

### 4.1 Rate Limiting

#### Task: Implement Rate Limiter

**File**: `lib/rate-limiter.ts`

**Requirements**:

- Use Upstash Ratelimit
- Track Cerebras tokens/minute, tokens/day, requests/minute
- Track Tavily requests/minute
- 80% threshold for all limits

**Implementation**: See reference document

**Tests**:

- [ ] Blocks requests when limit exceeded
- [ ] Tracks tokens accurately
- [ ] Tracks requests accurately
- [ ] Resets correctly after time window

---

#### Task: Implement Daily Token Tracking

**File**: `lib/token-tracker.ts`

**Requirements**:

- Track daily token usage in Redis
- Increment on each query
- Reset daily
- Alert at 80% and 95% thresholds

**Implementation**:

```typescript
export async function getDailyTokenUsage(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const usage = await redis.get(`tokens:daily:${today}`);
  return parseInt(usage || "0");
}

export async function incrementDailyTokenUsage(tokens: number) {
  const today = new Date().toISOString().split("T")[0];
  await redis.incrby(`tokens:daily:${today}`, tokens);
  await redis.expire(`tokens:daily:${today}`, 86400 * 2);
}

export async function checkDailyLimit(
  estimatedTokens: number
): Promise<boolean> {
  const usage = await getDailyTokenUsage();
  const limit = 800000; // 80% of 1M

  if (usage + estimatedTokens > limit) {
    console.error("[Daily Token Limit]", {
      usage,
      limit,
      estimated: estimatedTokens,
    });
    return false;
  }

  return true;
}
```

**Tests**:

- [ ] Tracks daily usage correctly
- [ ] Increments accurately
- [ ] Resets daily
- [ ] Checks limit correctly

---

### 4.2 Caching Layer

#### Task: Implement Query Cache

**File**: `lib/cache.ts`

**Requirements**:

- Use Redis for caching
- Cache key: hash(query + mode + jurisdiction)
- TTL: 1 hour for general, 15 min for news
- Expected hit rate: 20-30%

**Implementation**: See reference document

**Tests**:

- [ ] Caches responses correctly
- [ ] Returns cached responses
- [ ] Respects TTL
- [ ] Cache key is unique
- [ ] Hit rate tracking works

---

### 4.3 Request Queue

#### Task: Implement Query Queue

**File**: `lib/query-queue.ts`

**Requirements**:

- Use BullMQ for queueing
- Priority: AUTO (1), MEDIUM (2), DEEP (3)
- Max concurrency: 5
- Retry logic: 3 attempts with exponential backoff

**Implementation**: See reference document

**Tests**:

- [ ] Queues requests correctly
- [ ] Respects priority
- [ ] Processes concurrently (max 5)
- [ ] Retries on failure
- [ ] Integrates with rate limiter

---

## Phase 5: API & UI

### 5.1 API Implementation

#### Task: Implement Unified Research Endpoint

**File**: `app/api/research/route.ts`

**Requirements**:

- Accept query and mode parameters
- Route to appropriate agent
- Check rate limits before execution
- Check cache before execution
- Track token usage
- Return metadata

**Implementation**: See reference document

**Tests**:

- [ ] Routes to correct agent
- [ ] Checks rate limits
- [ ] Checks cache
- [ ] Tracks tokens
- [ ] Returns correct response format
- [ ] Handles errors gracefully
- [ ] Streaming works for DEEP mode

---

### 5.2 UI Implementation

#### Task: Implement Research Interface

**File**: `components/research-interface.tsx`

**Requirements**:

- Three-button mode selection
- Query input textarea
- Submit button
- Results display
- Streaming support for DEEP mode
- Loading states
- Error handling

**Implementation**: See reference document

**Tests**:

- [ ] Mode selection works
- [ ] Query submission works
- [ ] Results display correctly
- [ ] Streaming works for DEEP mode
- [ ] Loading states show correctly
- [ ] Errors display correctly

---

## Phase 6: Monitoring & Testing

### 6.1 Monitoring Dashboard

#### Task: Create Monitoring Dashboard

**File**: `app/dashboard/page.tsx`

**Requirements**:

- Real-time token usage
- Rate limit status
- Cache hit rate
- Queue length
- Query distribution by mode
- Alerts for thresholds

**Tests**:

- [ ] Displays real-time metrics
- [ ] Updates automatically
- [ ] Shows alerts correctly
- [ ] Historical data works

---

### 6.2 Integration Tests

#### Task: Create E2E Tests

**File**: `tests/e2e/research.spec.ts`

**Requirements**:

- Test all three modes
- Test rate limiting
- Test caching
- Test error handling
- Test streaming

**Tests**:

- [ ] AUTO mode completes successfully
- [ ] MEDIUM mode completes successfully
- [ ] DEEP mode completes successfully
- [ ] Rate limiting works
- [ ] Caching works
- [ ] Errors handled correctly

---

## Implementation Order

### Week 1: Foundation

1. Create missing Tavily tools (QnA, Context Search, News Search)
2. Optimize existing tools
3. Create utility functions
4. Implement rate limiting
5. Implement token tracking

### Week 2: Workflows & Agents

1. Implement Basic Search Workflow
2. Implement Advanced Search Workflow
3. Implement Comprehensive Analysis Workflow
4. Implement AUTO Agent
5. Implement MEDIUM Agent
6. Implement DEEP Agent
7. Implement supporting agents

### Week 3: Caching & Queue

1. Implement caching layer
2. Implement request queue
3. Integrate with API
4. Add monitoring

### Week 4: UI & Testing

1. Implement research interface
2. Implement monitoring dashboard
3. Create integration tests
4. Load testing
5. Performance optimization

---

## Acceptance Criteria

- [ ] All three modes (AUTO, MEDIUM, DEEP) working correctly
- [ ] Agent decision accuracy ≥ 90%
- [ ] Token usage reduced by 30-40% per mode
- [ ] Rate limits respected (80% threshold)
- [ ] Daily capacity: 350-400 queries
- [ ] Cache hit rate ≥ 20%
- [ ] Zero crashes from tool overuse
- [ ] All tests passing
- [ ] Documentation complete

---

## Notes

- Prioritize rate limiting and token tracking (Week 1)
- Test each component independently before integration
- Monitor token usage closely during development
- Use staging environment for load testing
- Document any deviations from spec

---

## References

- MASTRA_WORKFLOWS_AGENTS_ANALYSIS.md
- TAVILY_TOOLS_CONFIGURATION.md
- RATE_LIMITS_ANALYSIS.md
