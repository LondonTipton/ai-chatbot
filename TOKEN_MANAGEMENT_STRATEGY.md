# Token Management Strategy & Expansion Plan

## Current State Analysis

### Token Limits in the Codebase

#### 1. **Model Context Windows**

- **Cerebras gpt-oss-120b**: ~128K tokens context window
- Used across all agents (chat, search, synthesizer, analysis)
- No explicit context window limits configured in code

#### 2. **Workflow Token Budgets**

**Comprehensive Analysis Workflow** (`comprehensive-analysis-workflow.ts`)

- **Total Budget**: 18K-20K tokens
- **Breakdown**:
  - Initial research: 5K tokens (maxTokens: 5000)
  - Gap analysis: minimal (local processing)
  - Conditional branching:
    - **Enhance path** (gaps ≤ 2): +5K tokens (single search)
    - **Deep-dive path** (gaps > 2): +10K tokens (2 parallel searches @ 5K each)
  - Synthesis: 3K-5K tokens
- **Latency**: 25-47 seconds

**Advanced Search Workflow** (`advanced-search-workflow.ts`)

- **Total Budget**: 4K-8K tokens
- **Breakdown**:
  - Advanced search: 2K-4K tokens
  - Extract top sources: 1K-3K tokens
  - Synthesis: 1K-1.5K tokens
- **Latency**: 5-10 seconds

**Basic Search Workflow** (`basic-search-workflow.ts`)

- **Total Budget**: 2K-4K tokens
- **Breakdown**:
  - Basic search: 1K-2K tokens
  - Synthesis: 1K-2K tokens
- **Latency**: 3-5 seconds

#### 3. **Tool-Level Token Controls**

**Tavily Context Search Tool** (`tavily-context-search.ts`)

- Configurable: 2K-15K tokens (default: 8K)
- Hard truncation at maxTokens limit
- Truncation indicator: `[...content truncated to meet token limit...]`

**Tavily Search Advanced Tool**

- Returns structured results with token estimates
- No hard token limit (controlled by maxResults parameter)

**Tavily Extract Tool**

- Extracts raw content from URLs
- Token estimation but no hard limits

### Current Token Management Approach

#### ✅ **Strengths**

1. **Predictable budgets**: Each workflow has defined token budgets
2. **Hard truncation**: Tavily context search enforces limits
3. **Token estimation**: Uses `estimateTokens()` utility (4 chars ≈ 1 token)
4. **Conditional branching**: Comprehensive workflow adapts based on gaps
5. **Error handling**: Workflows continue with partial results on failures

#### ⚠️ **Weaknesses & Risks**

1. **No summarization agents**: When content is truncated, information is lost
2. **No overflow handling**: If context exceeds limits, it's simply cut off
3. **No token monitoring**: No tracking of actual token usage vs. budget
4. **No adaptive strategies**: Workflows don't adjust based on token pressure
5. **Synthesis bottleneck**: Final synthesis step receives potentially truncated context
6. **No context compression**: Long documents aren't intelligently compressed

---

## Problem Scenarios

### Scenario 1: Information Loss from Truncation

**Current Behavior**:

```typescript
// In tavily-context-search.ts
if (estimatedTokens > maxTokens) {
  const maxChars = maxTokens * 4;
  contextString =
    contextString.substring(0, maxChars) +
    "\n\n[...content truncated to meet token limit...]";
}
```

**Problem**: Critical information in the truncated portion is lost forever. The synthesis agent never sees it.

**Impact**:

- Incomplete legal analysis
- Missing case law or statutory references
- Gaps in reasoning or conclusions

### Scenario 2: Workflow Token Overflow

**Current Behavior**: Comprehensive workflow uses 3 separate searches (5K + 5K + 5K = 15K) plus synthesis (3K-5K) = 18K-20K total.

**Problem**: If any search returns more content than expected, the synthesis step receives truncated context from multiple sources.

**Impact**:

- Synthesis agent can't see full picture
- May miss connections between sources
- Reduced quality of final output

### Scenario 3: No Decision-Making Context

**Current Behavior**: Gap analysis uses truncated initial research to identify gaps.

**Problem**: If critical information was truncated, gap analysis may identify wrong gaps or miss important ones.

**Impact**:

- Wrong conditional branch taken
- Wasted tokens on irrelevant follow-up searches
- Suboptimal research path

---

## Proposed Solutions

### Solution 1: Intelligent Summarization Agents

#### **Architecture**

Add summarization agents at key workflow stages to compress information while preserving critical details.

#### **Implementation**

**A. Create Summarization Agent**

```typescript
// mastra/agents/summarizer-agent.ts
export const summarizerAgent = new Agent({
  name: "summarizer-agent",
  instructions: `You are a legal research summarizer. Your job is to:
  
1. Extract KEY FACTS, LEGAL PRINCIPLES, and CITATIONS
2. Preserve CRITICAL DETAILS (dates, amounts, case names, statutory references)
3. Remove REDUNDANCY and FILLER
4. Maintain LOGICAL STRUCTURE
5. Target 50-70% token reduction while keeping 100% of critical information

Output format:
## Key Legal Principles
[Bullet points of core legal concepts]

## Critical Facts & Citations
[Essential details with sources]

## Statutory/Case Law References
[Specific references with URLs]

## Conclusions
[Key takeaways]`,

  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {},
});
```

**B. Add Summarization Steps to Workflows**

**Modified Comprehensive Analysis Workflow**:

```typescript
// After initial research, before gap analysis
const summarizeInitialResearchStep = createStep({
  id: "summarize-initial-research",
  description: "Summarize initial research to preserve critical info",
  inputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
  }),
  outputSchema: z.object({
    summarizedContext: z.string(),
    originalTokens: z.number(),
    summarizedTokens: z.number(),
    compressionRatio: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { context, tokenCount, truncated } = inputData;

    // Only summarize if truncated OR if tokens > 4K
    if (!truncated && tokenCount < 4000) {
      return {
        summarizedContext: context,
        originalTokens: tokenCount,
        summarizedTokens: tokenCount,
        compressionRatio: 1.0,
      };
    }

    const prompt = `Summarize this legal research while preserving all critical information:

${context}

Target: 50-70% token reduction. Keep ALL case names, statutory references, dates, and key legal principles.`;

    const result = await summarizerAgent.generate(prompt, { maxSteps: 1 });
    const summarizedTokens = estimateTokens(result.text);

    console.log("[Summarization]", {
      originalTokens: tokenCount,
      summarizedTokens,
      compressionRatio: (summarizedTokens / tokenCount).toFixed(2),
      truncated,
    });

    return {
      summarizedContext: result.text,
      originalTokens: tokenCount,
      summarizedTokens,
      compressionRatio: summarizedTokens / tokenCount,
    };
  },
});
```

### Solution 2: Conditional Summarization with Token Monitoring

#### **Architecture**

Monitor token usage throughout workflow and trigger summarization only when needed.

#### **Implementation**

**A. Token Budget Tracker**

```typescript
// lib/utils/token-budget-tracker.ts
export class TokenBudgetTracker {
  private budget: number;
  private used: number = 0;
  private steps: Array<{ step: string; tokens: number }> = [];

  constructor(budget: number) {
    this.budget = budget;
  }

  addUsage(step: string, tokens: number): void {
    this.used += tokens;
    this.steps.push({ step, tokens });
  }

  getRemaining(): number {
    return this.budget - this.used;
  }

  getUtilization(): number {
    return this.used / this.budget;
  }

  shouldSummarize(threshold: number = 0.7): boolean {
    return this.getUtilization() > threshold;
  }

  getReport(): string {
    return `Token Budget: ${this.used}/${this.budget} (${(
      this.getUtilization() * 100
    ).toFixed(1)}%)
Steps:
${this.steps.map((s) => `  - ${s.step}: ${s.tokens} tokens`).join("\n")}`;
  }
}
```

**B. Conditional Summarization in Workflows**

```typescript
// In comprehensive-analysis-workflow.ts
const enhanceOrDeepDiveStep = createStep({
  // ... existing code ...
  execute: async ({ inputData, getInitData, runtimeContext }) => {
    const tracker = new TokenBudgetTracker(20000); // 20K budget
    tracker.addUsage("initial-research", inputData.tokenCount);

    // Check if we need to summarize before proceeding
    if (tracker.shouldSummarize(0.6)) {
      console.log(
        "[Token Management] 60% budget used, summarizing before next step"
      );

      // Summarize initial context
      const summarized = await summarizerAgent.generate(
        `Summarize: ${inputData.context}`,
        { maxSteps: 1 }
      );

      inputData.context = summarized.text;
      inputData.tokenCount = estimateTokens(summarized.text);

      console.log("[Token Management] Summarization freed up tokens:", {
        before: tracker.used,
        after: inputData.tokenCount,
        saved: tracker.used - inputData.tokenCount,
      });
    }

    // Continue with conditional branching...
  },
});
```

### Solution 3: Multi-Agent Summarization Pipeline

#### **Architecture**

Use specialized agents for different types of summarization:

1. **Extraction Agent**: Pulls out facts, citations, references
2. **Compression Agent**: Reduces verbosity while preserving meaning
3. **Synthesis Agent**: Combines multiple summaries into coherent output

#### **Implementation**

**A. Extraction Agent**

```typescript
// mastra/agents/extraction-agent.ts
export const extractionAgent = new Agent({
  name: "extraction-agent",
  instructions: `Extract structured information from legal research:

Output JSON format:
{
  "legalPrinciples": ["principle 1", "principle 2"],
  "caseLaw": [
    {"name": "Case v. Case", "citation": "...", "url": "...", "holding": "..."}
  ],
  "statutes": [
    {"name": "Act Name", "section": "...", "provision": "...", "url": "..."}
  ],
  "keyFacts": ["fact 1", "fact 2"],
  "dates": ["date 1", "date 2"],
  "amounts": ["amount 1", "amount 2"]
}

Extract ONLY factual information. No interpretation.`,

  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {},
});
```

**B. Compression Agent**

```typescript
// mastra/agents/compression-agent.ts
export const compressionAgent = new Agent({
  name: "compression-agent",
  instructions: `Compress legal text while preserving all critical information:

Rules:
1. Remove redundant phrases and filler words
2. Use concise legal terminology
3. Preserve ALL case names, citations, dates, amounts
4. Keep logical structure and flow
5. Target 50% token reduction

Do NOT:
- Remove any factual information
- Paraphrase legal terms
- Omit citations or references
- Change meaning or interpretation`,

  model: () => cerebrasProvider("gpt-oss-120b"),
  tools: {},
});
```

**C. Multi-Stage Summarization Step**

```typescript
const multiStageSummarizationStep = createStep({
  id: "multi-stage-summarization",
  description: "Extract, compress, and synthesize research content",
  inputSchema: z.object({
    contexts: z.array(z.string()),
    totalTokens: z.number(),
  }),
  outputSchema: z.object({
    extractedData: z.any(),
    compressedContext: z.string(),
    finalSummary: z.string(),
    tokensSaved: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { contexts, totalTokens } = inputData;

    // Stage 1: Extract structured data from all contexts
    const extractions = await Promise.all(
      contexts.map((ctx) =>
        extractionAgent.generate(`Extract from: ${ctx}`, { maxSteps: 1 })
      )
    );

    // Stage 2: Compress remaining narrative content
    const compressions = await Promise.all(
      contexts.map((ctx) =>
        compressionAgent.generate(`Compress: ${ctx}`, { maxSteps: 1 })
      )
    );

    // Stage 3: Synthesize into final summary
    const synthesisPrompt = `Create comprehensive summary from:

Extracted Data:
${extractions.map((e) => e.text).join("\n\n")}

Compressed Content:
${compressions.map((c) => c.text).join("\n\n")}`;

    const finalSummary = await synthesizerAgent.generate(synthesisPrompt, {
      maxSteps: 1,
    });

    const finalTokens = estimateTokens(finalSummary.text);

    return {
      extractedData: extractions.map((e) => e.text),
      compressedContext: compressions.map((c) => c.text).join("\n\n"),
      finalSummary: finalSummary.text,
      tokensSaved: totalTokens - finalTokens,
    };
  },
});
```

### Solution 4: Adaptive Token Allocation

#### **Architecture**

Dynamically adjust token allocation based on query complexity and available budget.

#### **Implementation**

**A. Token Allocation Strategy**

```typescript
// lib/utils/token-allocation.ts
export interface TokenAllocationStrategy {
  totalBudget: number;
  steps: Array<{
    name: string;
    minTokens: number;
    maxTokens: number;
    priority: number; // 1-5, higher = more important
  }>;
}

export function allocateTokens(
  strategy: TokenAllocationStrategy,
  actualUsage: Map<string, number>
): Map<string, number> {
  const { totalBudget, steps } = strategy;
  const allocations = new Map<string, number>();

  // Calculate total priority weight
  const totalPriority = steps.reduce((sum, s) => sum + s.priority, 0);

  // Allocate based on priority
  let remainingBudget = totalBudget;

  for (const step of steps.sort((a, b) => b.priority - a.priority)) {
    const proportionalAllocation =
      (step.priority / totalPriority) * totalBudget;

    // Clamp to min/max
    const allocation = Math.max(
      step.minTokens,
      Math.min(step.maxTokens, proportionalAllocation, remainingBudget)
    );

    allocations.set(step.name, allocation);
    remainingBudget -= allocation;
  }

  return allocations;
}
```

**B. Adaptive Workflow**

```typescript
// mastra/workflows/adaptive-comprehensive-workflow.ts
export const adaptiveComprehensiveWorkflow = createWorkflow({
  id: "adaptive-comprehensive-workflow",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
    tokenBudget: z.number().default(20000),
  }),
  // ... workflow definition with adaptive token allocation
});

const adaptiveInitialResearchStep = createStep({
  id: "adaptive-initial-research",
  execute: async ({ inputData, getInitData }) => {
    const { tokenBudget } = getInitData();

    // Allocate tokens based on strategy
    const strategy: TokenAllocationStrategy = {
      totalBudget: tokenBudget,
      steps: [
        {
          name: "initial-research",
          minTokens: 3000,
          maxTokens: 8000,
          priority: 5,
        },
        { name: "gap-filling", minTokens: 2000, maxTokens: 10000, priority: 4 },
        { name: "synthesis", minTokens: 2000, maxTokens: 5000, priority: 5 },
        { name: "buffer", minTokens: 1000, maxTokens: 3000, priority: 2 },
      ],
    };

    const allocations = allocateTokens(strategy, new Map());
    const initialResearchBudget = allocations.get("initial-research")!;

    console.log("[Adaptive Workflow] Token allocation:", {
      totalBudget: tokenBudget,
      initialResearch: initialResearchBudget,
      remaining: tokenBudget - initialResearchBudget,
    });

    // Execute with allocated budget
    const results = await tavilyContextSearchTool.execute({
      context: {
        query: inputData.query,
        maxTokens: initialResearchBudget,
        jurisdiction: inputData.jurisdiction,
      },
    });

    return results;
  },
});
```

---

## Recommended Implementation Plan

### Phase 1: Immediate Improvements (Week 1)

1. **Create Summarizer Agent** (`mastra/agents/summarizer-agent.ts`)
2. **Add Token Budget Tracker** (`lib/utils/token-budget-tracker.ts`)
3. **Implement Conditional Summarization** in comprehensive workflow
4. **Add Token Monitoring** to all workflow steps

### Phase 2: Enhanced Summarization (Week 2)

1. **Create Extraction Agent** for structured data extraction
2. **Create Compression Agent** for intelligent text compression
3. **Implement Multi-Stage Summarization** step
4. **Add Summarization to Advanced Search Workflow**

### Phase 3: Adaptive Allocation (Week 3)

1. **Implement Token Allocation Strategy** utility
2. **Create Adaptive Comprehensive Workflow**
3. **Add Dynamic Budget Adjustment** based on query complexity
4. **Implement Token Reallocation** when steps use less than allocated

### Phase 4: Monitoring & Optimization (Week 4)

1. **Add Token Usage Telemetry** to all workflows
2. **Create Token Usage Dashboard** (optional)
3. **Implement Automatic Summarization Triggers**
4. **Optimize Summarization Prompts** based on real usage

---

## Expected Outcomes

### Token Efficiency

- **50-70% reduction** in token waste from truncation
- **100% preservation** of critical information
- **Adaptive budgets** that scale with query complexity

### Quality Improvements

- **No information loss** from truncation
- **Better gap analysis** with complete context
- **Higher quality synthesis** with full information

### Cost Savings

- **Reduced API costs** from more efficient token usage
- **Fewer retries** due to incomplete information
- **Better resource utilization** across workflows

### User Experience

- **More comprehensive answers** with no missing information
- **Faster responses** from optimized token allocation
- **Better citations** with preserved source references

---

## Configuration Examples

### Example 1: High-Token Query (Complex Legal Analysis)

```typescript
// User query requires deep research
const result = await comprehensiveAnalysisWorkflow.createRunAsync();
await result.start({
  inputData: {
    query: "Analyze constitutional provisions on property rights in Zimbabwe",
    jurisdiction: "Zimbabwe",
    tokenBudget: 25000, // Increased budget for complex query
  },
});

// Workflow automatically:
// 1. Allocates 8K to initial research
// 2. Summarizes if truncation detected
// 3. Allocates remaining budget to gap-filling
// 4. Synthesizes with full context
```

### Example 2: Token-Constrained Query (Quick Research)

```typescript
// User needs quick answer with limited budget
const result = await advancedSearchWorkflow.createRunAsync();
await result.start({
  inputData: {
    query: "What is the Consumer Protection Act?",
    jurisdiction: "Zimbabwe",
    tokenBudget: 5000, // Limited budget
  },
});

// Workflow automatically:
// 1. Allocates 3K to search
// 2. Skips extraction (not enough budget)
// 3. Allocates 2K to synthesis
// 4. Returns concise answer
```

---

## Monitoring & Alerts

### Token Usage Metrics

```typescript
// Log token usage for monitoring
console.log("[Token Metrics]", {
  workflow: "comprehensive-analysis",
  totalBudget: 20000,
  actualUsage: 18500,
  utilization: 0.925,
  steps: {
    initialResearch: { allocated: 5000, used: 4800 },
    gapFilling: { allocated: 10000, used: 9500 },
    synthesis: { allocated: 5000, used: 4200 },
  },
  summarizationTriggered: true,
  tokensSaved: 3500,
});
```

### Alerts

- **Warning**: Token utilization > 90%
- **Error**: Token budget exceeded
- **Info**: Summarization triggered
- **Success**: Workflow completed within budget

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize solutions** based on immediate needs
3. **Create implementation tickets** for each phase
4. **Set up monitoring** for token usage
5. **Test with real queries** to validate approach
6. **Iterate and optimize** based on results
