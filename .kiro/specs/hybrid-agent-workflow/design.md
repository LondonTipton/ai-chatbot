# Design Document

## Overview

This design document outlines the technical architecture for implementing a Hybrid Agent + Workflow system for DeepCounsel. The architecture combines intelligent AI agents with structured workflows to provide three research modes (AUTO, MEDIUM, DEEP) while optimizing token usage and respecting API rate limits.

### Key Design Principles

1. **Hybrid Intelligence**: Agents provide semantic understanding and intelligent routing; workflows provide structured, optimal execution paths
2. **Token Efficiency**: 30-40% reduction through optimized tool configurations, intelligent caching, and direct answers
3. **Rate Limit Safety**: 80% threshold enforcement with queue-based smoothing and daily tracking
4. **Zimbabwe Focus**: All components prioritize Zimbabwe legal context and authoritative sources
5. **Graceful Degradation**: Error handling at every layer ensures partial results over complete failures

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   AUTO   │  │  MEDIUM  │  │   DEEP   │  Mode Selection  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  • Rate Limit Check  • Cache Check  • Queue Management      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Layer (Mastra)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  AUTO Agent  │  │ MEDIUM Agent │  │  DEEP Agent  │     │
│  │  (3 steps)   │  │  (6 steps)   │  │  (3 steps)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Workflow Layer (Mastra)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │basicSearch   │  │advancedSearch│  │comprehensive │     │
│  │(1K-2.5K tok) │  │(4K-8K tok)   │  │Analysis      │     │
│  │              │  │              │  │(18K-20K tok) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Tool Layer (Mastra)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │qnaDirect │  │contextSrch│  │newsSearch│  │extract   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External APIs                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │   Cerebras   │              │    Tavily    │            │
│  │  (LLM API)   │              │ (Search API) │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Layers

#### 1. User Interface Layer

- Three-button mode selection (AUTO, MEDIUM, DEEP)
- Query input with textarea
- Results display with streaming support for DEEP mode
- Loading states and error messages

#### 2. API Layer (Next.js Route Handlers)

- `/api/research` - Unified research endpoint
- Rate limit checking before execution
- Cache lookup before agent invocation
- Request queueing for burst traffic
- Token usage tracking and logging

#### 3. Agent Layer (Mastra Agents)

- **AUTO Agent**: Fast responses, 3-step budget, direct answers preferred
- **MEDIUM Agent**: Balanced research, 6-step budget, multi-source capability
- **DEEP Agent**: Comprehensive analysis, 3-step budget, workflow-heavy
- **Supporting Agents**: Synthesizer (formatting), Analysis (deep synthesis)

#### 4. Workflow Layer (Mastra Workflows)

- **basicSearch**: search → synthesize (1K-2.5K tokens)
- **advancedSearch**: search → extract → synthesize (4K-8K tokens)
- **comprehensiveAnalysis**: research → gaps → deep-dive → synthesis → document (18K-20K tokens)

#### 5. Tool Layer (Mastra Tools)

- **qnaDirect**: Quick factual answers (200-500 tokens)
- **contextSearch**: Token-controlled RAG (2K-15K tokens)
- **newsSearch**: Time-sensitive queries (2K-5K tokens)
- **basicSearch**: Standard search (1K-3K tokens)
- **advancedSearch**: Deep search with filtering (3K-8K tokens)
- **extract**: URL content extraction (2K-10K tokens per URL)

#### 6. External APIs

- **Cerebras**: LLM provider (1M tokens/day limit)
- **Tavily**: Search provider (100 requests/minute limit)

---

## Components and Interfaces

### Component Structure

```
lib/
├── ai/
│   └── models.ts                    # Cerebras model configuration
├── utils/
│   ├── token-estimation.ts          # Token counting utilities
│   ├── zimbabwe-domains.ts          # Legal domain whitelist
│   └── research-helpers.ts          # Gap analysis functions
├── rate-limiter.ts                  # Upstash rate limiting
├── token-tracker.ts                 # Daily token usage tracking
└── cache.ts                         # Redis caching layer

mastra/
├── tools/
│   ├── tavily-qna-direct.ts         # NEW: Quick Q&A tool
│   ├── tavily-context-search.ts     # NEW: Token-controlled search
│   ├── tavily-news-search.ts        # NEW: News-specific search
│   ├── tavily-search.ts             # OPTIMIZE: Basic search
│   ├── tavily-search-advanced.ts    # OPTIMIZE: Advanced search
│   └── tavily-extract.ts            # OPTIMIZE: Content extraction
├── workflows/
│   ├── basic-search-workflow.ts     # NEW: Simple search pattern
│   ├── advanced-search-workflow.ts  # NEW: Multi-source pattern
│   └── comprehensive-analysis.ts    # NEW: Deep research pattern
└── agents/
    ├── auto-agent.ts                # NEW: Fast mode agent
    ├── medium-agent.ts              # NEW: Balanced mode agent
    ├── deep-agent.ts                # NEW: Comprehensive mode agent
    ├── synthesizer-agent.ts         # NEW: Response formatting
    └── analysis-agent.ts            # NEW: Deep synthesis

app/
└── (chat)/
    └── api/
        └── research/
            └── route.ts             # NEW: Unified research endpoint

components/
└── research-interface.tsx           # NEW: Three-mode UI

lib/
└── query-queue.ts                   # NEW: BullMQ request queue
```

### Key Interfaces

#### Agent Configuration Interface

```typescript
interface AgentConfig {
  name: string;
  instructions: string;
  model: LanguageModel;
  temperature: number;
  maxSteps: number;
  maxTokens?: number;
  tools: Record<string, Tool | Workflow>;
}
```

#### Workflow Configuration Interface

```typescript
interface WorkflowConfig {
  name: string;
  triggerSchema: ZodSchema;
  steps: Record<string, WorkflowStep>;
  options?: {
    maxConcurrency?: number;
    timeout?: number;
  };
}

interface WorkflowStep {
  action: (context: WorkflowContext) => Promise<any>;
  onSuccess?: string | ConditionalTransition;
  onError?: string;
}
```

#### Tool Configuration Interface

```typescript
interface ToolConfig {
  id: string;
  description: string;
  inputSchema: ZodSchema;
  execute: (context: ToolContext) => Promise<ToolResponse>;
}

interface ToolResponse {
  [key: string]: any;
  tokenEstimate?: number;
  tokenBreakdown?: {
    search?: number;
    extract?: number;
    synthesis?: number;
  };
}
```

#### Research Request Interface

```typescript
interface ResearchRequest {
  query: string;
  mode: "auto" | "medium" | "deep";
  jurisdiction?: string;
  userId?: string;
}

interface ResearchResponse {
  success: boolean;
  response: string;
  metadata: {
    mode: string;
    stepsUsed: number;
    toolsCalled: string[];
    tokenEstimate: number;
    cached: boolean;
  };
  sources?: Array<{
    title: string;
    url: string;
  }>;
  error?: string;
}
```

#### Rate Limit Interface

```typescript
interface RateLimitConfig {
  tokensPerMinute: number;
  tokensPerDay: number;
  requestsPerMinute: number;
  threshold: number; // 0.8 for 80%
}

interface RateLimitStatus {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}
```

#### Cache Interface

```typescript
interface CacheConfig {
  ttl: number; // seconds
  keyPrefix: string;
}

interface CacheEntry {
  response: string;
  metadata: ResearchResponse["metadata"];
  timestamp: number;
}
```

---

## Data Models

### Token Budget Model

```typescript
interface TokenBudget {
  mode: "auto" | "medium" | "deep";
  maxTokens: number;
  breakdown: {
    agent: number;
    workflows: number;
    tools: number;
    synthesis: number;
  };
}

const TOKEN_BUDGETS: Record<string, TokenBudget> = {
  auto: {
    mode: "auto",
    maxTokens: 2500,
    breakdown: {
      agent: 1000,
      workflows: 1500,
      tools: 300,
      synthesis: 700,
    },
  },
  medium: {
    mode: "medium",
    maxTokens: 8000,
    breakdown: {
      agent: 1500,
      workflows: 5000,
      tools: 1000,
      synthesis: 1500,
    },
  },
  deep: {
    mode: "deep",
    maxTokens: 20000,
    breakdown: {
      agent: 2000,
      workflows: 15000,
      tools: 0,
      synthesis: 3000,
    },
  },
};
```

### Zimbabwe Legal Domains Model

```typescript
interface ZimbabweDomains {
  government: string[];
  legal: string[];
  courts: string[];
  professional: string[];
  regional: string[];
}

const ZIMBABWE_LEGAL_DOMAINS: ZimbabweDomains = {
  government: ["gov.zw", "parlzim.gov.zw", "justice.gov.zw"],
  legal: ["zimlii.org", "veritaszim.net", "zlhr.org.zw"],
  courts: ["supremecourt.gov.zw", "highcourt.gov.zw"],
  professional: ["lawsociety.org.zw"],
  regional: ["saflii.org", "africanlii.org"],
};
```

### Queue Job Model

```typescript
interface QueueJob {
  id: string;
  query: string;
  mode: "auto" | "medium" | "deep";
  userId: string;
  estimatedTokens: number;
  priority: number; // 1=AUTO, 2=MEDIUM, 3=DEEP
  attempts: number;
  createdAt: number;
  status: "pending" | "processing" | "completed" | "failed";
}
```

---

## Error Handling

### Error Hierarchy

```typescript
class ResearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean,
    public context?: any
  ) {
    super(message);
    this.name = "ResearchError";
  }
}

class RateLimitError extends ResearchError {
  constructor(message: string, public retryAfter: number) {
    super(message, "RATE_LIMIT_EXCEEDED", true, { retryAfter });
  }
}

class TokenBudgetError extends ResearchError {
  constructor(message: string, public used: number, public limit: number) {
    super(message, "TOKEN_BUDGET_EXCEEDED", false, { used, limit });
  }
}

class APIError extends ResearchError {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number
  ) {
    super(message, "API_ERROR", true, { provider, statusCode });
  }
}
```

### Error Handling Strategy

1. **API Errors**: Retry once with exponential backoff, then fail gracefully
2. **Rate Limit Errors**: Queue request or return wait time to user
3. **Token Budget Errors**: Log warning, return best available response
4. **Workflow Step Errors**: Skip to next step or return partial results
5. **Cache Errors**: Log and continue without cache (don't block execution)

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    retryAfter?: number;
    context?: any;
  };
}
```

---

## Testing Strategy

### Unit Testing

**Tools** (`mastra/tools/*.test.ts`):

- Test token estimation accuracy (±10%)
- Test input validation
- Test error handling
- Mock external API calls

**Workflows** (`mastra/workflows/*.test.ts`):

- Test step execution order
- Test conditional branching
- Test error recovery
- Test token budget compliance

**Agents** (`mastra/agents/*.test.ts`):

- Test routing decisions
- Test maxSteps enforcement
- Test tool selection
- Test direct answer capability

**Utilities** (`lib/utils/*.test.ts`):

- Test token estimation functions
- Test domain filtering
- Test gap analysis logic

### Integration Testing

**Workflow Integration**:

- Test complete workflow execution
- Test workflow-as-tool invocation
- Test parallel execution
- Test timeout handling

**Agent-Workflow Integration**:

- Test agent invoking workflows
- Test workflow results processing
- Test error propagation

**API Integration**:

- Test rate limit checking
- Test cache integration
- Test queue integration
- Test streaming responses

### End-to-End Testing

**Mode Testing**:

- Test AUTO mode with simple query
- Test MEDIUM mode with comparative query
- Test DEEP mode with comprehensive query
- Verify token budgets respected
- Verify latency targets met

**Error Scenarios**:

- Test rate limit exceeded
- Test API failures
- Test invalid inputs
- Test timeout scenarios

**Performance Testing**:

- Load test with 100 concurrent queries
- Verify queue handling
- Verify cache hit rates
- Verify no crashes under load

---

## Token Management Design

### Token Estimation Strategy

```typescript
// Rough estimation: 1 token ≈ 4 characters
function estimateTokens(text: string | object): number {
  if (typeof text === "object") {
    text = JSON.stringify(text);
  }
  return Math.ceil(text.length / 4);
}

// Track cumulative tokens per query
class TokenTracker {
  private cumulative: number = 0;
  private breakdown: Record<string, number> = {};

  add(component: string, tokens: number): void {
    this.cumulative += tokens;
    this.breakdown[component] = (this.breakdown[component] || 0) + tokens;
  }

  getTotal(): number {
    return this.cumulative;
  }

  getBreakdown(): Record<string, number> {
    return { ...this.breakdown };
  }

  exceedsBudget(budget: number): boolean {
    return this.cumulative > budget;
  }
}
```

### Token Budget Enforcement

```typescript
// Check before tool/workflow execution
async function executeWithBudget<T>(
  fn: () => Promise<T>,
  estimatedTokens: number,
  tracker: TokenTracker,
  budget: number
): Promise<T> {
  // Check if execution would exceed budget
  if (tracker.getTotal() + estimatedTokens > budget) {
    console.warn("[Token Budget]", {
      current: tracker.getTotal(),
      estimated: estimatedTokens,
      budget,
      wouldExceed: true,
    });
    throw new TokenBudgetError(
      "Execution would exceed token budget",
      tracker.getTotal() + estimatedTokens,
      budget
    );
  }

  // Execute and track actual usage
  const result = await fn();
  const actualTokens = result.tokenEstimate || estimatedTokens;
  tracker.add("execution", actualTokens);

  return result;
}
```

### Daily Token Tracking

```typescript
// Redis-based daily tracking
class DailyTokenTracker {
  constructor(private redis: Redis) {}

  async getUsage(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const usage = await this.redis.get(`tokens:daily:${today}`);
    return parseInt(usage || "0");
  }

  async increment(tokens: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await this.redis.incrby(`tokens:daily:${today}`, tokens);
    await this.redis.expire(`tokens:daily:${today}`, 86400 * 2); // 2 days TTL
  }

  async checkLimit(
    estimatedTokens: number,
    limit: number = 800000
  ): Promise<boolean> {
    const usage = await this.getUsage();
    return usage + estimatedTokens <= limit;
  }
}
```

---

## Rate Limiting Design

### Upstash Ratelimit Configuration

```typescript
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
```

### Rate Limit Checking

```typescript
async function checkRateLimits(estimatedTokens: number): Promise<void> {
  // Check Cerebras limits
  const [tokensOk, requestsOk, dailyOk] = await Promise.all([
    cerebrasLimiter.tokensPerMinute.limit("cerebras-tokens", {
      rate: estimatedTokens,
    }),
    cerebrasLimiter.requestsPerMinute.limit("cerebras-requests"),
    cerebrasLimiter.tokensPerDay.limit("cerebras-daily", {
      rate: estimatedTokens,
    }),
  ]);

  if (!tokensOk.success) {
    throw new RateLimitError(
      "Cerebras token rate limit exceeded",
      tokensOk.reset
    );
  }

  if (!requestsOk.success) {
    throw new RateLimitError(
      "Cerebras request rate limit exceeded",
      requestsOk.reset
    );
  }

  if (!dailyOk.success) {
    throw new RateLimitError(
      "Cerebras daily token limit exceeded",
      dailyOk.reset
    );
  }
}
```

---

## Caching Design

### Cache Key Generation

```typescript
import crypto from "crypto";

function generateCacheKey(
  query: string,
  mode: string,
  jurisdiction: string
): string {
  const normalized = query.toLowerCase().trim();
  const hash = crypto
    .createHash("md5")
    .update(`${normalized}:${mode}:${jurisdiction}`)
    .digest("hex");
  return `query:${mode}:${jurisdiction}:${hash}`;
}
```

### Cache Operations

```typescript
class QueryCache {
  constructor(private redis: Redis) {}

  async get(
    query: string,
    mode: string,
    jurisdiction: string
  ): Promise<CacheEntry | null> {
    const key = generateCacheKey(query, mode, jurisdiction);
    const cached = await this.redis.get(key);

    if (cached) {
      console.log("[Cache Hit]", { query, mode });
      return JSON.parse(cached as string);
    }

    console.log("[Cache Miss]", { query, mode });
    return null;
  }

  async set(
    query: string,
    mode: string,
    jurisdiction: string,
    response: string,
    metadata: any,
    ttl: number = 3600
  ): Promise<void> {
    const key = generateCacheKey(query, mode, jurisdiction);
    const entry: CacheEntry = {
      response,
      metadata,
      timestamp: Date.now(),
    };

    await this.redis.set(key, JSON.stringify(entry), { ex: ttl });
  }

  async invalidate(
    query: string,
    mode: string,
    jurisdiction: string
  ): Promise<void> {
    const key = generateCacheKey(query, mode, jurisdiction);
    await this.redis.del(key);
  }
}
```

### Cache TTL Strategy

```typescript
function getCacheTTL(mode: string, hasNews: boolean): number {
  if (hasNews) {
    return 900; // 15 minutes for news queries
  }

  switch (mode) {
    case "auto":
      return 3600; // 1 hour
    case "medium":
      return 3600; // 1 hour
    case "deep":
      return 7200; // 2 hours (more expensive to regenerate)
    default:
      return 3600;
  }
}
```

---

## Queue Design

### BullMQ Configuration

```typescript
import { Queue, Worker } from "bullmq";
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
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});
```

### Queue Job Processing

```typescript
async function queueQuery(
  query: string,
  mode: "auto" | "medium" | "deep",
  userId: string
): Promise<string> {
  const estimatedTokens = {
    auto: 2500,
    medium: 8000,
    deep: 20000,
  }[mode];

  const priority = {
    auto: 1, // Highest priority
    medium: 2,
    deep: 3, // Lowest priority
  }[mode];

  const job = await queryQueue.add(
    "research",
    {
      query,
      mode,
      userId,
      estimatedTokens,
    },
    {
      priority,
      jobId: `${userId}-${Date.now()}`,
    }
  );

  return job.id!;
}

// Worker to process queue
const worker = new Worker(
  "legal-research",
  async (job) => {
    const { query, mode, estimatedTokens } = job.data;

    // Check rate limits
    await checkRateLimits(estimatedTokens);

    // Check cache
    const cached = await queryCache.get(query, mode, "Zimbabwe");
    if (cached) {
      return { response: cached.response, cached: true };
    }

    // Execute query
    const agent = agents[mode];
    const response = await agent.generate(query);

    // Cache response
    await queryCache.set(query, mode, "Zimbabwe", response.text, {
      stepsUsed: response.steps?.length,
      toolsCalled: response.toolCalls?.map((t) => t.toolName),
    });

    // Track token usage
    await dailyTokenTracker.increment(estimatedTokens);

    return { response: response.text, cached: false };
  },
  {
    connection: redis,
    concurrency: 5, // Max 5 concurrent queries
  }
);
```

---

## Agent Design Details

### AUTO Agent Configuration

```typescript
export const autoAgent = new Agent({
  name: "auto-legal-agent",

  instructions: `You are a fast Zimbabwe legal assistant.
  
  DECISION GUIDE:
  - For simple definitions or concepts you know well → Answer directly (no tools)
  - For general legal principles you're confident about → Answer directly (no tools)
  - For questions needing current/specific Zimbabwe info → Use qna tool
  - For queries needing basic research → Use basicSearch workflow
  
  IMPORTANT: Prefer direct answers when you're confident in your knowledge.
  Only use tools when you need current information or research.
  Always include Zimbabwe legal context when relevant.`,

  model: cerebras("llama-3.3-70b"),
  temperature: 0.7,
  maxSteps: 3,

  tools: {
    qna: tavilyQnaDirect,
    basicSearch: basicSearchWorkflow.asTool(),
  },
});
```

### MEDIUM Agent Configuration

```typescript
export const mediumAgent = new Agent({
  name: "medium-legal-agent",

  instructions: `You are a balanced Zimbabwe legal researcher.
  
  DECISION GUIDE:
  - For general legal concepts or principles → Answer directly (no tools)
  - For well-known legal frameworks → Answer directly (no tools)
  - For standard research needing current info → Use advancedSearch workflow (once)
  - For comparative analysis → Use advancedSearch workflow (2-3 times for different angles)
  - For quick fact-checking → Use qna tool
  
  IMPORTANT: Use your knowledge base for general legal concepts.
  Only use tools when you need current information, specific research, or multiple sources.
  Always emphasize Zimbabwe legal context.`,

  model: cerebras("llama-3.3-70b"),
  temperature: 0.7,
  maxSteps: 6,

  tools: {
    qna: tavilyQnaDirect,
    advancedSearch: advancedSearchWorkflow.asTool(),
    newsSearch: tavilyNewsSearch,
  },
});
```

### DEEP Agent Configuration

```typescript
export const deepAgent = new Agent({
  name: "deep-legal-agent",

  instructions: `You are a comprehensive Zimbabwe legal analyst.
  
  DECISION GUIDE:
  - For well-established legal topics you can cover comprehensively → Answer directly (no tools)
  - For topics requiring current research, multiple sources, or verification → Use comprehensiveAnalysis workflow
  
  IMPORTANT: You can provide comprehensive direct answers for well-established legal topics.
  Use the workflow when you need current information, multiple sources, or verification.
  Always ensure publication-quality output with proper Zimbabwe legal context.`,

  model: cerebras("llama-3.3-70b"),
  temperature: 0.5,
  maxSteps: 3,

  tools: {
    comprehensiveAnalysis: comprehensiveAnalysisWorkflow.asTool(),
  },
});
```

---

## Workflow Design Details

### Basic Search Workflow

**Token Budget**: 1K-2.5K tokens  
**Steps**: search → synthesize  
**Latency**: 3-5s

```typescript
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
          maxResults: 3,
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

### Advanced Search Workflow

**Token Budget**: 4K-8K tokens  
**Steps**: advanced-search → extract-top-sources → synthesize  
**Latency**: 5-10s

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
          maxResults: 7,
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
          ?.slice(0, 2)
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

### Comprehensive Analysis Workflow

**Token Budget**: 18K-20K tokens  
**Steps**: initial-research → analyze-gaps → [enhance OR deep-dive] → document  
**Latency**: 25-47s

Key optimizations:

- Use `tavilyContextSearch` instead of `advancedSearchWorkflow`
- Initial research: 5K tokens (reduced from 8K)
- Parallel searches: 2 instead of 3 (10K total instead of 15K)
- Synthesis: 3K-5K tokens (reduced from 5K-10K)

---

## API Endpoint Design

### Unified Research Endpoint

```typescript
// app/(chat)/api/research/route.ts
export async function POST(req: Request) {
  const { query, mode = "auto", jurisdiction = "Zimbabwe" } = await req.json();

  // Validate input
  if (!query || typeof query !== "string") {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  if (!["auto", "medium", "deep"].includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  try {
    // Estimate tokens for rate limit check
    const estimatedTokens = {
      auto: 2500,
      medium: 8000,
      deep: 20000,
    }[mode];

    // Check rate limits
    await checkRateLimits(estimatedTokens);

    // Check cache
    const cached = await queryCache.get(query, mode, jurisdiction);
    if (cached) {
      return Response.json({
        success: true,
        response: cached.response,
        metadata: {
          ...cached.metadata,
          cached: true,
        },
      });
    }

    // Select agent based on mode
    const agent = {
      auto: autoAgent,
      medium: mediumAgent,
      deep: deepAgent,
    }[mode];

    // Execute query
    const response = await agent.generate(`Zimbabwe Legal Query: ${query}`);

    // Cache response
    await queryCache.set(query, mode, jurisdiction, response.text, {
      mode,
      stepsUsed: response.steps?.length,
      toolsCalled: response.toolCalls?.map((t) => t.toolName),
    });

    // Track token usage
    await dailyTokenTracker.increment(estimatedTokens);

    return Response.json({
      success: true,
      response: response.text,
      metadata: {
        mode,
        stepsUsed: response.steps?.length,
        toolsCalled: response.toolCalls?.map((t) => t.toolName),
        cached: false,
      },
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: error.message,
            retryAfter: error.retryAfter,
          },
        },
        { status: 429 }
      );
    }

    console.error("[Research Error]", { mode, error });
    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Research failed. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
```

---

## UI Component Design

### Research Interface Component

```typescript
// components/research-interface.tsx
"use client";

import { useState } from "react";

export function ResearchInterface() {
  const [mode, setMode] = useState<"auto" | "medium" | "deep">("auto");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleResearch = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Research failed:", error);
      setResult({ error: "Research failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Mode Selection */}
      <div className="flex gap-4">
        <ModeButton
          mode="auto"
          selected={mode === "auto"}
          onClick={() => setMode("auto")}
          icon="⚡"
          label="AUTO"
          description="Fast • 1-10s"
        />
        <ModeButton
          mode="medium"
          selected={mode === "medium"}
          onClick={() => setMode("medium")}
          icon="⚖️"
          label="MEDIUM"
          description="Balanced • 10-20s"
        />
        <ModeButton
          mode="deep"
          selected={mode === "deep"}
          onClick={() => setMode("deep")}
          icon="🔬"
          label="DEEP"
          description="Comprehensive • 25-47s"
        />
      </div>

      {/* Query Input */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter your Zimbabwe legal research question..."
        className="w-full h-32 p-4 border rounded-lg resize-none"
      />

      {/* Submit Button */}
      <button
        onClick={handleResearch}
        disabled={!query.trim() || loading}
        className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold"
      >
        {loading ? "Researching..." : `Start ${mode.toUpperCase()} Research`}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 p-6 bg-white border rounded-lg">
          {result.error ? (
            <div className="text-red-600">{result.error}</div>
          ) : (
            <div className="prose max-w-none">{result.response}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Design Decisions and Rationale

### 1. Hybrid Architecture Choice

**Decision**: Use agents to decide which workflows to invoke, rather than upfront classification.

**Rationale**:

- Agents provide 90-95% routing accuracy vs 70-75% for regex classification
- Handles edge cases naturally without brittle rules
- Lower maintenance burden
- Adapts to query variations automatically

### 2. Three-Mode System

**Decision**: Provide three distinct modes (AUTO, MEDIUM, DEEP) rather than automatic mode selection.

**Rationale**:

- Users know their needs better than automatic classification
- Clear expectations for latency and depth
- Simpler implementation and testing
- Easier to optimize each mode independently

### 3. Token Budget Optimization

**Decision**: Reduce token budgets by 30-40% through multiple strategies.

**Rationale**:

- Cerebras 1M daily token limit is the primary bottleneck
- Optimizations increase capacity from 175 to 350-400 queries/day
- Maintains quality while reducing costs
- Enables production scale

### 4. Caching Strategy

**Decision**: Cache responses for 1 hour with Redis.

**Rationale**:

- 20-30% expected hit rate provides 25-40% capacity increase
- Legal information changes slowly (1 hour is reasonable)
- Zero token cost for cache hits
- Simple invalidation strategy

### 5. Queue-Based Rate Limiting

**Decision**: Use BullMQ for request queueing with priority handling.

**Rationale**:

- Smooths burst traffic to respect rate limits
- Prioritizes fast queries (AUTO > MEDIUM > DEEP)
- Provides retry logic and error recovery
- Better user experience than hard rejections

### 6. Zimbabwe Domain Filtering

**Decision**: Maintain curated list of Zimbabwe legal domains for search filtering.

**Rationale**:

- Improves result quality and relevance
- Reduces noise from irrelevant sources
- Focuses on authoritative legal sources
- Easy to maintain and update

---

## Performance Targets

### Latency Targets

| Mode   | Target Latency | Max Acceptable |
| ------ | -------------- | -------------- |
| AUTO   | 1-10s          | 15s            |
| MEDIUM | 10-20s         | 30s            |
| DEEP   | 25-47s         | 60s            |

### Token Usage Targets

| Mode   | Target Tokens | Max Budget |
| ------ | ------------- | ---------- |
| AUTO   | 2.5K          | 3K         |
| MEDIUM | 8K            | 10K        |
| DEEP   | 20K           | 25K        |

### Capacity Targets

- **Daily Queries**: 350-400 (with all optimizations)
- **Cache Hit Rate**: ≥20%
- **Agent Routing Accuracy**: ≥90%
- **Query Success Rate**: ≥95%
- **Zero Crashes**: From tool overuse or rate limits

---

## Security Considerations

1. **Input Validation**: Sanitize all user inputs to prevent injection attacks
2. **Rate Limiting**: Per-user rate limits to prevent abuse
3. **API Key Protection**: Store Cerebras and Tavily keys in environment variables
4. **Redis Security**: Use authentication and encryption for Redis connections
5. **Error Messages**: Don't expose internal details in error responses
6. **Logging**: Log security events and suspicious patterns

---

## Deployment Considerations

1. **Environment Variables**: Required env vars documented in `.env.example`
2. **Redis Setup**: Upstash Redis or self-hosted Redis required
3. **Mastra Configuration**: Proper Mastra setup with Cerebras provider
4. **Tavily API**: Valid Tavily API key with sufficient quota
5. **Next.js Deployment**: Vercel or similar platform with edge functions support
6. **Monitoring**: Basic logging to console (no dashboard required)

---

## Future Enhancements

1. **Multi-Provider Fallback**: Add OpenAI/Anthropic as backup providers
2. **User Tiers**: Implement usage limits per user tier
3. **Advanced Caching**: Semantic similarity-based cache matching
4. **Streaming Support**: Add streaming for DEEP mode responses
5. **Document Generation**: Enhanced document artifacts with formatting
6. **Analytics**: Track query patterns and optimize based on usage

---

## Conclusion

This design provides a production-ready Hybrid Agent + Workflow Architecture that:

- ✅ Reduces token usage by 30-40%
- ✅ Respects rate limits at 80% threshold
- ✅ Achieves 350-400 queries/day capacity
- ✅ Maintains high-quality Zimbabwe legal research
- ✅ Provides three clear modes for different use cases
- ✅ Implements robust error handling and caching
- ✅ Follows best practices for scalability and maintainability

The architecture is ready for implementation following the task list in `tasks.md`.
