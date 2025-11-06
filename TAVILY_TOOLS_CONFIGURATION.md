# Tavily Tools Configuration & Optimization Strategy

## Executive Summary

This document defines the optimal Tavily tool configurations for DeepCounsel's hybrid Agent + Workflow architecture, with strict token budget management (target: <65K tokens, max: 131K).

---

## TOOL CONFIGURATION MATRIX

### Overview of Tavily Modes

| Tool Name                  | Primary Use                   | Token Impact | Credits | Agent/Workflow  |
| -------------------------- | ----------------------------- | ------------ | ------- | --------------- |
| **QnA Direct**             | Quick factual answers         | 200-500      | 1       | AUTO agent      |
| **Basic Search**           | Standard search with snippets | 1K-3K        | 1       | AUTO workflow   |
| **Advanced Search**        | Deep search with extraction   | 3K-8K        | 2       | MEDIUM workflow |
| **Context Search**         | Full RAG with token control   | 2K-15K       | 2       | DEEP workflow   |
| **News Search**            | Time-sensitive queries        | 2K-5K        | 1-2     | All modes       |
| **Domain-Filtered Search** | Authority sources only        | 2K-6K        | 1-2     | MEDIUM/DEEP     |

---

## TOOL DEFINITIONS

### 1. QnA Direct Tool (tavily_qna)

**Status**: ⚠️ NEEDS TO BE CREATED

**Purpose**: Ultra-fast factual answers with minimal token usage

**Configuration**:

```typescript
// mastra/tools/tavily-qna-direct.ts
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
      tokenEstimate: answer.length / 4, // Rough estimate
    };
  },
});
```

**Token Budget**: 200-500 tokens  
**Latency**: 1-2s  
**Credits**: 1  
**Used By**: AUTO agent

**Example**:

```typescript
// Input: "What is the capital of Zimbabwe?"
// Output: { answer: "Harare is the capital of Zimbabwe." }
```

---

### 2. Basic Search Tool (tavily_search_basic)

**Status**: ✅ EXISTS (needs parameter optimization)

**Purpose**: Standard search with snippets for basic research

**Configuration**:

```typescript
// mastra/tools/tavily-search-basic.ts
export const tavilySearchBasic = createTool({
  id: "tavily-search-basic",
  description: `Perform basic web search with short content snippets.
  Returns titles, URLs, and 500-char snippets from top sources.
  Use for: Basic research, finding sources, quick overviews.`,

  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().default(5).describe("Number of results (1-10)"),
    jurisdiction: z
      .string()
      .optional()
      .describe("Add to query for location context"),
  }),

  execute: async ({ context }) => {
    const { query, maxResults, jurisdiction } = context;

    const searchQuery = jurisdiction ? `${query} ${jurisdiction}` : query;

    const results = await tavilyClient.search({
      query: searchQuery,
      search_depth: "basic", // 1 credit
      max_results: maxResults,
      include_answer: false, // We'll synthesize ourselves
      include_raw_content: false, // Just snippets
      chunks_per_source: 3, // Max 3 snippets per source
    });

    return {
      results: results.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content, // Snippet only
        score: r.score,
      })),
      tokenEstimate: estimateTokens(results),
    };
  },
});
```

**Token Budget**: 1K-3K tokens  
**Latency**: 2-3s  
**Credits**: 1  
**Used By**: AUTO workflow (basicSearch)

---

### 3. Advanced Search Tool (tavily_search_advanced)

**Status**: ✅ EXISTS (needs parameter optimization)

**Purpose**: Deep search with domain filtering and quality control

**Configuration**:

```typescript
// mastra/tools/tavily-search-advanced.ts
export const tavilySearchAdvanced = createTool({
  id: "tavily-search-advanced",
  description: `Perform advanced web search with quality filtering.
  Returns comprehensive results with domain filtering and time range.
  Use for: Specific research, current information, authority sources.`,

  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().default(10).describe("Number of results (1-20)"),
    jurisdiction: z.string().optional(),
    timeRange: z.enum(["day", "week", "month", "year"]).optional(),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe("Whitelist domains"),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe("Blacklist domains"),
    country: z.string().optional().describe("2-letter country code (e.g., ZW)"),
  }),

  execute: async ({ context }) => {
    const {
      query,
      maxResults,
      jurisdiction,
      timeRange,
      includeDomains,
      excludeDomains,
      country,
    } = context;

    const searchQuery = jurisdiction ? `${query} ${jurisdiction}` : query;

    const results = await tavilyClient.search({
      query: searchQuery,
      search_depth: "advanced", // 2 credits
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false, // Just snippets for now
      chunks_per_source: 3,
      time_range: timeRange,
      include_domains: includeDomains,
      exclude_domains: excludeDomains,
      country: country,
    });

    return {
      results: results.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: r.published_date,
      })),
      tokenEstimate: estimateTokens(results),
    };
  },
});
```

**Token Budget**: 3K-8K tokens  
**Latency**: 3-5s  
**Credits**: 2  
**Used By**: MEDIUM workflow (advancedSearch), DEEP workflow

**Zimbabwe-Specific Defaults**:

```typescript
// For Zimbabwe legal queries
includeDomains: [
  "zw", // Zimbabwe TLD
  "zimlii.org", // Zimbabwe Legal Information Institute
  "parlzim.gov.zw", // Parliament of Zimbabwe
  "justice.gov.zw", // Ministry of Justice
  "veritaszim.net", // Veritas Zimbabwe
];
```

---

### 4. Context Search Tool (tavily_context_search)

**Status**: ⚠️ NEEDS TO BE CREATED

**Purpose**: Full RAG mode with token-controlled context extraction

**Configuration**:

```typescript
// mastra/tools/tavily-context-search.ts
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

    // Uses Tavily's get_search_context function
    const contextString = await tavilyClient.get_search_context({
      query: searchQuery,
      max_tokens: maxTokens,
      search_depth: "advanced",
      time_range: timeRange,
      include_domains: includeDomains,
    });

    return {
      context: contextString,
      tokenCount: Math.floor(contextString.length / 4), // Estimate
      truncated: contextString.includes("[...]"), // Indicates if content was cut
    };
  },
});
```

**Token Budget**: 2K-15K tokens (configurable)  
**Latency**: 5-10s  
**Credits**: 2  
**Used By**: DEEP workflow (comprehensiveAnalysis)

**Token Management Strategy**:

- Initial research: 8K tokens max
- Deep dive searches: 5K tokens max each
- Total for DEEP mode: ~23K tokens (8K + 3×5K)
- Leaves 42K tokens for agent processing and synthesis

---

### 5. Extract Tool (tavily_extract)

**Status**: ✅ EXISTS (needs optimization)

**Purpose**: Extract full content from specific URLs

**Configuration**:

```typescript
// mastra/tools/tavily-extract.ts
export const tavilyExtract = createTool({
  id: "tavily-extract",
  description: `Extract full cleaned content from specific URLs.
  Returns markdown or plain text of web pages.
  Use for: Following up on search results, getting full articles.`,

  inputSchema: z.object({
    urls: z.array(z.string()).max(3).describe("URLs to extract (max 3)"),
    format: z.enum(["markdown", "text"]).default("markdown"),
  }),

  execute: async ({ context }) => {
    const { urls, format } = context;

    const extractions = await tavilyClient.extract({
      urls: urls,
      include_raw_content: format, // 'markdown' or 'text'
    });

    return {
      extractions: extractions.results.map((r) => ({
        url: r.url,
        title: r.title,
        content: r.raw_content,
        tokenEstimate: Math.floor(r.raw_content.length / 4),
      })),
      totalTokens: extractions.results.reduce(
        (sum, r) => sum + Math.floor(r.raw_content.length / 4),
        0
      ),
    };
  },
});
```

**Token Budget**: 2K-10K tokens per URL  
**Latency**: 2-4s per URL  
**Credits**: Included in search  
**Used By**: MEDIUM workflow, DEEP workflow

**Token Control**:

- Limit to 3 URLs max
- Prefer markdown format (better structure)
- Monitor totalTokens in response

---

### 6. News Search Tool (tavily_news_search)

**Status**: ⚠️ NEEDS TO BE CREATED

**Purpose**: Time-sensitive queries with news focus

**Configuration**:

```typescript
// mastra/tools/tavily-news-search.ts
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
      topic: "news", // News-specific index
      search_depth: "advanced",
      max_results: maxResults,
      days: days, // Time filter for news
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
      tokenEstimate: estimateTokens(results),
    };
  },
});
```

**Token Budget**: 2K-5K tokens  
**Latency**: 2-4s  
**Credits**: 1-2  
**Used By**: All modes (when current events detected)

---

## AGENT-TOOL BINDING STRATEGY

### AUTO Agent Tool Configuration

```typescript
export const autoAgent = new Agent({
  name: "auto-legal-agent",
  model: cerebras("gpt-oss-120b"),
  maxSteps: 3,

  tools: {
    // Direct answer tool (200-500 tokens)
    qnaDirect: tavilyQnaDirect, // ⚠️ NEEDS TO BE CREATED

    // Workflow tool (1K-3K tokens)
    basicSearch: basicSearchWorkflow.asTool(),
  },
});
```

**Token Budget**: 500-6K tokens total

- Direct answer: 0 tokens (model knowledge)
- QnA direct: 200-500 tokens
- Basic search workflow: 1K-3K tokens

---

### MEDIUM Agent Tool Configuration

```typescript
export const mediumAgent = new Agent({
  name: "medium-legal-agent",
  model: cerebras("gpt-oss-120b"),
  maxSteps: 6,

  tools: {
    // Quick tools
    qnaDirect: tavilyQnaDirect, // ⚠️ NEEDS TO BE CREATED

    // Workflow tools (3K-8K tokens each)
    advancedSearch: advancedSearchWorkflow.asTool(),

    // News for current events (2K-5K tokens)
    newsSearch: tavilyNewsSearch, // ⚠️ NEEDS TO BE CREATED

    // Utility
    summarize: summarizeContent,
  },
});
```

**Token Budget**: 1K-15K tokens total

- Direct answer: 0 tokens (model knowledge)
- QnA direct: 200-500 tokens
- Advanced search workflow (1x): 3K-8K tokens
- Advanced search workflow (2-3x): 9K-24K tokens (risk of exceeding budget)
- News search: 2K-5K tokens

**Token Management**:

- If using 2+ advanced searches, reduce maxResults
- Monitor cumulative token usage
- Prefer direct answers when possible

---

### DEEP Agent Tool Configuration

```typescript
export const deepAgent = new Agent({
  name: "deep-legal-agent",
  model: cerebras("gpt-oss-120b"),
  maxSteps: 3,

  tools: {
    // Comprehensive workflow (20K-35K tokens)
    comprehensiveAnalysis: comprehensiveAnalysisWorkflow.asTool(),
  },
});
```

**Token Budget**: 2K-35K tokens total

- Direct answer: 0 tokens (model knowledge)
- Comprehensive workflow: 20K-35K tokens
  - Initial research: 8K tokens
  - Deep dive (3x): 15K tokens (3×5K)
  - Synthesis: 5K-10K tokens
  - Document creation: 2K tokens

---

## WORKFLOW-TOOL BINDING STRATEGY

### Basic Search Workflow

```typescript
export const basicSearchWorkflow = new Workflow({
  name: 'basic-search',

  steps: {
    'search': {
      action: async ({ context }) => {
        // Uses tavilySearchBasic (1K-3K tokens)
        return await tavilySearchBasic.execute({
          query: context.query,
          maxResults: 5, // Keep low for token control
          jurisdiction: context.jurisdiction
        });
      }
    },

    'synthesize': {
      action: async ({ context }) => {
        // Synthesizer adds ~500-1K tokens
        return await synthesizerAgent.generate(...);
      }
    }
  }
});
```

**Total Token Budget**: 1.5K-4K tokens → **Optimized: 1K-2.5K tokens**

**Optimizations**:

- Reduce maxResults from 5 to 3
- Tighter synthesis (maxTokens: 1500)

---

### Advanced Search Workflow

```typescript
export const advancedSearchWorkflow = new Workflow({
  name: 'advanced-search',

  steps: {
    'advanced-search': {
      action: async ({ context }) => {
        // Uses tavilySearchAdvanced (3K-8K tokens)
        return await tavilySearchAdvanced.execute({
          query: context.query,
          maxResults: 10,
          jurisdiction: context.jurisdiction,
          timeRange: 'year', // Last year only
          includeDomains: getZimbabweLegalDomains(), // Authority sources
          country: 'ZW' // Zimbabwe focus
        });
      }
    },

    'extract-top-sources': {
      action: async ({ context }) => {
        const topUrls = context.results.slice(0, 3); // Max 3 URLs

        // Uses tavilyExtract (2K-10K tokens per URL, 6K-30K total)
        return await tavilyExtract.execute({
          urls: topUrls,
          format: 'markdown'
        });
      }
    },

    'synthesize': {
      action: async ({ context }) => {
        // Synthesizer adds ~1K-2K tokens
        return await synthesizerAgent.generate(...);
      }
    }
  }
});
```

**Total Token Budget**: 6K-40K tokens → **Optimized: 4K-8K tokens**

**Optimizations**:

- Reduce maxResults from 10 to 7
- Extract max 2 URLs (down from 3)
- Tighter synthesis (maxTokens: 1500)

**Token Breakdown (Optimized)**:

- Search: 2K-5K (reduced from 3K-8K)
- Extract (2 URLs): 2K-6K (reduced from 6K-30K)
- Synthesize: 1K-1.5K (reduced from 1K-2K)

**⚠️ Token Risk**: Still possible to exceed budget
**Mitigation**:

- Monitor tokenEstimate in extract response
- Skip extraction if search snippets are sufficient
- Enforce 2 URL maximum strictly

---

### Comprehensive Analysis Workflow

```typescript
export const comprehensiveAnalysisWorkflow = new Workflow({
  name: 'comprehensive-analysis',

  steps: {
    'initial-research': {
      action: async ({ context }) => {
        // Uses tavilyContextSearch (8K tokens max)
        return await tavilyContextSearch.execute({
          query: context.query,
          maxTokens: 8000, // Strict limit
          jurisdiction: context.jurisdiction,
          timeRange: 'year',
          includeDomains: getZimbabweLegalDomains()
        });
      }
    },

    'analyze-gaps': {
      action: async ({ context }) => {
        // No tools, just analysis (~500 tokens)
        return identifyResearchGaps(context.initialFindings);
      }
    },

    'parallel-deep-search': {
      action: async ({ context }) => {
        // 3x tavilyContextSearch (5K tokens each = 15K total)
        const searches = context.targetedQueries.map(query =>
          tavilyContextSearch.execute({
            query,
            maxTokens: 5000, // Reduced for parallel execution
            jurisdiction: context.jurisdiction,
            includeDomains: getZimbabweLegalDomains()
          })
        );

        return await Promise.allSettled(searches);
      }
    },

    'comprehensive-synthesis': {
      action: async ({ context }) => {
        // Analysis agent with summarize tool if needed
        // Adds ~5K-10K tokens
        return await analysisAgent.generate(...);
      }
    },

    'create-document': {
      action: async ({ context }) => {
        // Document creation (~2K tokens)
        return await createDocumentTool.execute(...);
      }
    }
  }
});
```

**Total Token Budget**: 30K-35K tokens → **Optimized: 18K-20K tokens**

**Optimizations**:

- Initial research: 8K → 5K
- Parallel deep search: 15K → 10K (3×5K → 2×5K, only 2 parallel searches)
- Synthesis: 5K-10K → 3K-5K

**Token Breakdown (Optimized)**:

- Initial research: 5K (contextSearch with maxTokens: 5000)
- Gap analysis: 0.5K
- Parallel deep search: 10K (2× contextSearch @ 5K each)
- Synthesis: 3K-5K (reduced complexity)
- Document: 2K

**Token Safety**: Well under 65K limit, 39% reduction from original

---

## RATE LIMITS & CONSTRAINTS

### Cerebras Rate Limits

| Metric          | Limit  | Critical Threshold (80%) | Impact                 |
| --------------- | ------ | ------------------------ | ---------------------- |
| Tokens/minute   | 60K    | 48K                      | Burst queries          |
| Tokens/hour     | 1M     | 800K                     | Sustained load         |
| **Tokens/day**  | **1M** | **800K**                 | **PRIMARY CONSTRAINT** |
| Requests/minute | 30     | 24                       | Concurrent queries     |
| Requests/hour   | 90     | 72                       | Hourly capacity        |
| Requests/day    | 14.4K  | 11.5K                    | Daily capacity         |

### Tavily Rate Limits

| Metric          | Limit | Critical Threshold (80%) |
| --------------- | ----- | ------------------------ |
| Requests/minute | 100   | 80                       |

### Daily Capacity Analysis

**Critical Finding**: Cerebras 1M daily token limit is the primary bottleneck.

| Mode                   | Tokens/Query | Max Queries/Day | % of Capacity |
| ---------------------- | ------------ | --------------- | ------------- |
| AUTO (current)         | 3.5K         | 285             | 0.35%         |
| MEDIUM (current)       | 12K          | 83              | 1.2%          |
| DEEP (current)         | 33K          | 30              | 3.3%          |
| **AUTO (optimized)**   | **2.5K**     | **400**         | **0.25%**     |
| **MEDIUM (optimized)** | **8K**       | **125**         | **0.8%**      |
| **DEEP (optimized)**   | **20K**      | **50**          | **2%**        |

**Mixed workload capacity** (50% AUTO, 35% MEDIUM, 15% DEEP):

- Current: ~175 queries/day (977K tokens)
- Optimized: ~250 queries/day (700K tokens)
- With caching (25% hit rate): ~333 queries/day

---

## TOKEN MANAGEMENT STRATEGY

### Optimized Token Budget Allocation

| Mode   | Agent | Workflows | Tools | Synthesis | Total           | Reduction | Safety Margin |
| ------ | ----- | --------- | ----- | --------- | --------------- | --------- | ------------- |
| AUTO   | 1K    | 1.5K      | 0.3K  | 0.7K      | 3.5K → **2.5K** | **29%**   | 62.5K         |
| MEDIUM | 1.5K  | 5K        | 1K    | 1.5K      | 12K → **8K**    | **33%**   | 57K           |
| DEEP   | 2K    | 15K       | 0     | 3K        | 33K → **20K**   | **39%**   | 45K           |

### Rate Limit Tracking

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Cerebras rate limiters
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

// Tavily rate limiter
export const tavilyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, "1 m"), // 80% of 100
  analytics: true,
});

// Check limits before execution
export async function checkRateLimits(estimatedTokens: number) {
  const [tokensOk, requestsOk] = await Promise.all([
    cerebrasLimiter.tokensPerMinute.limit(`cerebras-tokens`, {
      rate: estimatedTokens,
    }),
    cerebrasLimiter.requestsPerMinute.limit("cerebras-requests"),
  ]);

  if (!tokensOk.success) {
    throw new Error(`Rate limit: tokens (${tokensOk.remaining} remaining)`);
  }

  if (!requestsOk.success) {
    throw new Error(`Rate limit: requests (${requestsOk.remaining} remaining)`);
  }

  return { tokensOk, requestsOk };
}
```

### Token Monitoring

```typescript
// Add to all tool executions
interface ToolResponse {
  result: any;
  tokenEstimate: number;
  tokenBreakdown?: {
    search?: number;
    extract?: number;
    synthesis?: number;
  };
}

// Track cumulative tokens per query
let cumulativeTokens = 0;

async function executeToolWithTracking(tool, context) {
  // Check rate limits before execution
  await checkRateLimits(context.estimatedTokens || 1000);

  const response = await tool.execute(context);
  cumulativeTokens += response.tokenEstimate;

  console.log("[Token Tracking]", {
    tool: tool.id,
    tokens: response.tokenEstimate,
    cumulative: cumulativeTokens,
    remaining: 65000 - cumulativeTokens,
    dailyUsed: await getDailyTokenUsage(),
    dailyRemaining: 800000 - (await getDailyTokenUsage()),
  });

  if (cumulativeTokens > 65000) {
    console.warn("[Query Token Budget Exceeded]", {
      cumulative: cumulativeTokens,
      limit: 65000,
      overage: cumulativeTokens - 65000,
    });
  }

  const dailyUsage = await getDailyTokenUsage();
  if (dailyUsage > 800000) {
    console.error("[Daily Token Limit Exceeded]", {
      dailyUsage,
      limit: 800000,
      overage: dailyUsage - 800000,
    });
    throw new Error("Daily token limit exceeded");
  }

  return response;
}

// Track daily usage in Redis
async function getDailyTokenUsage(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const usage = await redis.get(`tokens:daily:${today}`);
  return parseInt(usage || "0");
}

async function incrementDailyTokenUsage(tokens: number) {
  const today = new Date().toISOString().split("T")[0];
  await redis.incrby(`tokens:daily:${today}`, tokens);
  await redis.expire(`tokens:daily:${today}`, 86400 * 2); // 2 days TTL
}
```

### Token Estimation Function

```typescript
// utils/token-estimation.ts
export function estimateTokens(text: string | object): number {
  if (typeof text === "object") {
    text = JSON.stringify(text);
  }

  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function estimateSearchResultTokens(results: any[]): number {
  return results.reduce((sum, result) => {
    const titleTokens = estimateTokens(result.title);
    const contentTokens = estimateTokens(result.content);
    const urlTokens = estimateTokens(result.url);
    return sum + titleTokens + contentTokens + urlTokens + 10; // +10 for structure
  }, 0);
}
```

---

## ZIMBABWE-SPECIFIC OPTIMIZATIONS

### Domain Whitelist

```typescript
// utils/zimbabwe-domains.ts
export function getZimbabweLegalDomains(): string[] {
  return [
    // Government
    "gov.zw",
    "parlzim.gov.zw",
    "justice.gov.zw",

    // Legal Resources
    "zimlii.org", // Zimbabwe Legal Information Institute
    "veritaszim.net", // Veritas Zimbabwe
    "zlhr.org.zw", // Zimbabwe Lawyers for Human Rights

    // Courts
    "supremecourt.gov.zw",
    "highcourt.gov.zw",

    // Professional Bodies
    "lawsociety.org.zw",

    // Regional Context (for comparative analysis)
    "saflii.org", // Southern African Legal Information Institute
    "africanlii.org", // African Legal Information Institute
  ];
}
```

### Query Enhancement

```typescript
// utils/query-enhancement.ts
export function enhanceZimbabweQuery(
  query: string,
  jurisdiction: string
): string {
  if (jurisdiction.toLowerCase() === "zimbabwe") {
    // Add Zimbabwe-specific context
    return `${query} Zimbabwe law legal framework`;
  }
  return query;
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Create Missing Tools

- [ ] **tavilyQnaDirect** - Ultra-fast Q&A tool

  - File: `mastra/tools/tavily-qna-direct.ts`
  - Uses: `tavilyClient.qna_search()`
  - Bind to: AUTO agent, MEDIUM agent

- [ ] **tavilyContextSearch** - Token-controlled RAG tool

  - File: `mastra/tools/tavily-context-search.ts`
  - Uses: `tavilyClient.get_search_context()`
  - Bind to: DEEP workflow

- [ ] **tavilyNewsSearch** - Time-sensitive news tool
  - File: `mastra/tools/tavily-news-search.ts`
  - Uses: `tavilyClient.search()` with `topic: 'news'`
  - Bind to: All agents (optional)

### Phase 2: Optimize Existing Tools

- [ ] **tavilySearchBasic** - Add token estimation

  - File: `mastra/tools/tavily-search.ts`
  - Add: `tokenEstimate` to response
  - Optimize: `maxResults` default to 5

- [ ] **tavilySearchAdvanced** - Add Zimbabwe defaults

  - File: `mastra/tools/tavily-search-advanced.ts`
  - Add: `includeDomains` parameter
  - Add: `country` parameter
  - Add: `timeRange` parameter
  - Add: Token estimation

- [ ] **tavilyExtract** - Add token limits
  - File: `mastra/tools/tavily-extract.ts`
  - Add: Max 3 URLs enforcement
  - Add: Token estimation per URL
  - Add: Total token tracking

### Phase 3: Update Workflows

- [ ] **basicSearchWorkflow** - Bind tavilySearchBasic

  - Verify token budget: 1.5K-4K
  - Add token tracking

- [ ] **advancedSearchWorkflow** - Bind tavilySearchAdvanced + tavilyExtract

  - Verify token budget: 6K-40K
  - Add extraction skip logic if budget exceeded
  - Add token tracking

- [ ] **comprehensiveAnalysisWorkflow** - Bind tavilyContextSearch
  - Replace advancedSearch with contextSearch
  - Set maxTokens: 8K for initial, 5K for deep dives
  - Verify total budget: 30K-35K
  - Add token tracking

### Phase 4: Update Agents

- [ ] **autoAgent** - Add tavilyQnaDirect

  - Current tools: basicSearch workflow
  - Add: tavilyQnaDirect
  - Update instructions to prefer direct answers

- [ ] **mediumAgent** - Add tavilyQnaDirect and tavilyNewsSearch

  - Current tools: advancedSearch workflow, summarize
  - Add: tavilyQnaDirect, tavilyNewsSearch
  - Update instructions to prefer direct answers

- [ ] **deepAgent** - No changes needed
  - Already uses comprehensiveAnalysis workflow
  - Workflow will be updated internally

### Phase 5: Add Token Monitoring

- [ ] Create token estimation utilities

  - File: `utils/token-estimation.ts`
  - Functions: `estimateTokens()`, `estimateSearchResultTokens()`

- [ ] Add token tracking to workflows

  - Track cumulative tokens
  - Log token usage per step
  - Warn if approaching 65K limit

- [ ] Add token tracking to API
  - Return token usage in metadata
  - Log token usage per request

---

## RECOMMENDED WORKFLOW CHANGES

### Change 1: Use Context Search in DEEP Mode

**Current**: DEEP workflow uses advancedSearch + extract (unpredictable tokens)

**Proposed**: DEEP workflow uses contextSearch (controlled tokens)

**Benefits**:

- Predictable token usage (8K + 3×5K = 23K)
- Single API call per search (faster)
- Pre-formatted for LLM context
- Automatic truncation to token limit

**Implementation**:

```typescript
// OLD: advancedSearchWorkflow.execute() → 6K-40K tokens
const result = await advancedSearchWorkflow.execute({ query });

// NEW: tavilyContextSearch.execute() → 8K tokens (controlled)
const result = await tavilyContextSearch.execute({
  query,
  maxTokens: 8000,
});
```

### Change 2: Add QnA Direct to All Agents

**Current**: Agents use workflows even for simple questions

**Proposed**: Agents have qnaDirect tool for quick facts

**Benefits**:

- 200-500 tokens vs 1K-3K tokens (80% savings)
- 1-2s latency vs 3-5s (60% faster)
- Better user experience for simple questions

**Implementation**:

```typescript
// All agents get qnaDirect
tools: {
  qnaDirect: tavilyQnaDirect, // NEW
  // ... other tools
}
```

### Change 3: Add News Search for Current Events

**Current**: No special handling for time-sensitive queries

**Proposed**: Add newsSearch tool to MEDIUM and DEEP agents

**Benefits**:

- Better results for "recent", "current", "latest" queries
- News-specific index (higher quality for current events)
- Time filtering (days parameter)

**Implementation**:

```typescript
// MEDIUM and DEEP agents
tools: {
  newsSearch: tavilyNewsSearch, // NEW
  // ... other tools
}

// Agent instructions updated
"For queries about recent events or current information, use newsSearch tool."
```

---

## TOKEN BUDGET SCENARIOS

### Scenario 1: AUTO Mode - Direct Answer

```
Query: "What is habeas corpus?"
Path: Direct answer (model knowledge)
Tokens: 0 (model) + 500 (response) = 500 tokens
Status: ✅ Well under budget
```

### Scenario 2: AUTO Mode - QnA Direct

```
Query: "How to register a company in Zimbabwe?"
Path: qnaDirect tool
Tokens: 300 (tool) + 500 (response) = 800 tokens
Status: ✅ Well under budget
```

### Scenario 3: AUTO Mode - Basic Search

```
Query: "Requirements for divorce in Zimbabwe?"
Path: basicSearch workflow
Tokens: 2K (search) + 1K (synthesis) + 500 (response) = 3.5K tokens
Status: ✅ Well under budget
```

### Scenario 4: MEDIUM Mode - Single Advanced Search

```
Query: "Overview of employment law in Zimbabwe"
Path: advancedSearch workflow (1x)
Tokens: 5K (search) + 8K (extract 3 URLs) + 2K (synthesis) = 15K tokens
Status: ✅ Under budget
```

### Scenario 5: MEDIUM Mode - Comparative Analysis

```
Query: "Compare Zimbabwe and South African contract law"
Path: advancedSearch workflow (2x)
Tokens: 10K (2 searches) + 16K (extract 6 URLs) + 3K (synthesis) = 29K tokens
Status: ✅ Under budget
```

### Scenario 6: MEDIUM Mode - Triple Search (RISK)

```
Query: "Compare Zimbabwe, South Africa, and Botswana labor law"
Path: advancedSearch workflow (3x)
Tokens: 15K (3 searches) + 24K (extract 9 URLs) + 4K (synthesis) = 43K tokens
Status: ⚠️ Approaching limit (43K/65K = 66%)
Mitigation: Reduce extraction to 2 URLs per search
```

### Scenario 7: DEEP Mode - No Deep Dive

```
Query: "Comprehensive analysis of contract law"
Path: Direct answer (model knowledge)
Tokens: 0 (model) + 3K (comprehensive response) = 3K tokens
Status: ✅ Excellent efficiency
```

### Scenario 8: DEEP Mode - With Deep Dive

```
Query: "Comprehensive analysis of Zimbabwe property law"
Path: comprehensiveAnalysis workflow
Tokens:
  - Initial research: 8K (contextSearch)
  - Gap analysis: 0.5K
  - Deep dive: 15K (3× contextSearch @ 5K each)
  - Synthesis: 8K
  - Document: 2K
  Total: 33.5K tokens
Status: ✅ Well under budget (33.5K/65K = 52%)
```

### Scenario 9: DEEP Mode - Maximum Load

```
Query: "Complete guide to Zimbabwe legal system with all branches"
Path: comprehensiveAnalysis workflow (max extraction)
Tokens:
  - Initial research: 8K
  - Deep dive: 15K (3× contextSearch)
  - Synthesis: 10K (complex)
  - Document: 3K
  Total: 36K tokens
Status: ✅ Under budget (36K/65K = 55%)
```

---

## OPTIMIZATION RECOMMENDATIONS

### 1. Prefer Direct Answers

- All agents should attempt direct answers first
- Only use tools when necessary
- Saves 80-95% tokens on simple queries

### 2. Use QnA Direct for Quick Facts

- Replace basic search for simple questions
- 200-500 tokens vs 1K-3K tokens
- 1-2s vs 3-5s latency

### 3. Use Context Search for DEEP Mode

- Replace advancedSearch + extract pattern
- Predictable token usage (8K controlled)
- Single API call (faster)

### 4. Limit Extraction URLs

- Max 3 URLs per search
- Monitor token estimates
- Skip extraction if search snippets sufficient

### 5. Use Domain Filtering

- Zimbabwe-specific domains for legal queries
- Improves result quality
- Reduces noise and irrelevant content

### 6. Use Time Filtering

- `timeRange: 'year'` for most queries
- `topic: 'news'` for current events
- Improves relevance and reduces token waste

### 7. Monitor Token Usage

- Log tokens per tool call
- Track cumulative tokens
- Warn at 80% of budget (52K tokens)

---

## SUMMARY

### Tools to Create

1. ⚠️ **tavilyQnaDirect** - Quick factual answers (200-500 tokens)
2. ⚠️ **tavilyContextSearch** - Token-controlled RAG (2K-15K tokens)
3. ⚠️ **tavilyNewsSearch** - Time-sensitive queries (2K-5K tokens)

### Tools to Optimize

1. ✅ **tavilySearchBasic** - Add token estimation
2. ✅ **tavilySearchAdvanced** - Add Zimbabwe defaults, token estimation
3. ✅ **tavilyExtract** - Add token limits, estimation

### Key Changes

1. Use contextSearch in DEEP workflow (predictable tokens)
2. Add qnaDirect to all agents (80% token savings on simple queries)
3. Add newsSearch for current events (better quality)
4. Implement token tracking (prevent budget overruns)

### Token Budget Safety

- AUTO: 5.5K avg (92% under budget)
- MEDIUM: 18K avg (72% under budget)
- DEEP: 36K max (45% under budget)
- All modes: Well under 65K limit ✅

---

## RATE LIMIT MITIGATION STRATEGIES

### 1. Caching Layer

**Implementation**:

```typescript
// lib/cache.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getCachedResponse(
  query: string,
  mode: string,
  jurisdiction: string
): Promise<string | null> {
  const cacheKey = `query:${mode}:${jurisdiction}:${hashQuery(query)}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log("[Cache Hit]", { query, mode });
    return cached as string;
  }

  return null;
}

export async function cacheResponse(
  query: string,
  mode: string,
  jurisdiction: string,
  response: string,
  ttl: number = 3600 // 1 hour default
) {
  const cacheKey = `query:${mode}:${jurisdiction}:${hashQuery(query)}`;
  await redis.set(cacheKey, response, { ex: ttl });
}

function hashQuery(query: string): string {
  return crypto.createHash("md5").update(query.toLowerCase()).digest("hex");
}
```

**Expected Impact**:

- Cache hit rate: 20-30%
- Token savings: 20-30% on cached queries
- Effective capacity increase: 25-40%

### 2. Request Queue

**Implementation**:

```typescript
// lib/query-queue.ts
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const queryQueue = new Queue("legal-research", {
  connection: redis,
});

// Add query to queue
export async function queueQuery(
  query: string,
  mode: "auto" | "medium" | "deep",
  userId: string
) {
  const estimatedTokens = {
    auto: 2500,
    medium: 8000,
    deep: 20000,
  }[mode];

  const priority = {
    auto: 1, // Highest priority (fastest)
    medium: 2,
    deep: 3, // Lowest priority (slowest)
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
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );
}

// Process queue with rate limiting
const worker = new Worker(
  "legal-research",
  async (job) => {
    const { query, mode, estimatedTokens } = job.data;

    // Check rate limits
    await checkRateLimits(estimatedTokens);

    // Check cache first
    const cached = await getCachedResponse(query, mode, "Zimbabwe");
    if (cached) {
      return { response: cached, cached: true };
    }

    // Execute query
    const agent = agents[mode];
    const response = await agent.generate(query);

    // Cache response
    await cacheResponse(query, mode, "Zimbabwe", response.text);

    // Track token usage
    await incrementDailyTokenUsage(estimatedTokens);

    return { response: response.text, cached: false };
  },
  {
    connection: redis,
    concurrency: 5, // Max 5 concurrent queries
  }
);
```

**Expected Impact**:

- Smooth token consumption
- Prevent burst overload
- Prioritize fast queries
- Better user experience

### 3. Usage Monitoring Dashboard

**Metrics to Display**:

```typescript
interface DashboardMetrics {
  // Real-time
  tokensUsedToday: number;
  tokensRemainingToday: number;
  percentageUsed: number;

  // Rates
  tokensPerMinute: number;
  requestsPerMinute: number;

  // Queue
  queueLength: number;
  avgWaitTime: number;

  // Cache
  cacheHitRate: number;

  // Queries
  queriesPerMode: {
    auto: number;
    medium: number;
    deep: number;
  };

  // Projections
  projectedDailyUsage: number;
  estimatedCapacityRemaining: number;
}
```

### 4. Throttling Strategy

**When approaching limits**:

```typescript
async function shouldThrottle(): Promise<boolean> {
  const dailyUsage = await getDailyTokenUsage();
  const percentUsed = dailyUsage / 800000; // 80% of 1M limit

  if (percentUsed > 0.9) {
    // At 90% capacity
    return true;
  }

  return false;
}

// In API route
if (await shouldThrottle()) {
  // Only allow AUTO mode
  if (mode !== "auto") {
    return Response.json(
      {
        error: "System at capacity. Only AUTO mode available.",
        suggestedMode: "auto",
      },
      { status: 429 }
    );
  }
}
```

### 5. User Tier System

**Implement usage limits per user**:

```typescript
const userTiers = {
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

async function checkUserLimit(userId: string, mode: string) {
  const user = await getUser(userId);
  const tier = userTiers[user.tier];

  const todayQueries = await getUserQueriesToday(userId);

  if (todayQueries >= tier.queriesPerDay) {
    throw new Error("Daily query limit reached");
  }

  if (!tier.modesAllowed.includes(mode)) {
    throw new Error(`Mode ${mode} not available in ${user.tier} tier`);
  }
}
```

---

## PRODUCTION READINESS CHECKLIST

### Critical (Must Have)

- [ ] Implement token budget reductions (29-39% per mode)
- [ ] Add rate limiting with Upstash Ratelimit
- [ ] Track daily token usage in Redis
- [ ] Add alerts for 80% and 95% thresholds
- [ ] Implement basic caching (1 hour TTL)

### Important (Should Have)

- [ ] Implement request queue with BullMQ
- [ ] Add monitoring dashboard
- [ ] Implement throttling at 90% capacity
- [ ] Add user tier system
- [ ] Cache hit/miss tracking

### Nice to Have

- [ ] Multi-provider fallback (OpenAI, Anthropic)
- [ ] Advanced cache strategies (vary TTL by query type)
- [ ] Predictive throttling (ML-based)
- [ ] Auto-scaling queue workers

---

## CAPACITY SUMMARY

### Current System (Unoptimized)

- Daily capacity: 175-220 queries
- Token usage: 977K/day (97.7% of limit)
- Status: ❌ At capacity

### Optimized System (With Token Reduction)

- Daily capacity: 250 queries
- Token usage: 700K/day (70% of limit)
- Status: ⚠️ Acceptable but tight

### Optimized + Caching (25% hit rate)

- Daily capacity: 333 queries
- Token usage: 525K/day (52.5% of limit)
- Status: ✅ Good headroom

### Optimized + Caching + Queue

- Daily capacity: 350-400 queries
- Token usage: 550-600K/day (55-60% of limit)
- Status: ✅ Production ready

---

**Document Version**: 2.0 (Rate Limit Optimized)  
**Last Updated**: 2025-01-XX  
**Status**: Ready for Implementation with Rate Limit Mitigations
