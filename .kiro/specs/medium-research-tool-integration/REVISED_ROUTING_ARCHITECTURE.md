# Revised Routing Architecture: Mapping Existing Workflows to Tavily Modes

## Reality Check: What You Already Have vs What I Proposed

### What You Already Have ✅

| Workflow                   | Steps | Features                                                      | Tokens  | Latency |
| -------------------------- | ----- | ------------------------------------------------------------- | ------- | ------- |
| **Basic Search**           | 2     | Search (3 results) → Synthesize                               | 1K-2.5K | 3-5s    |
| **Advanced Search**        | 3     | Search (7 results) → Extract (top 2) → Synthesize             | 4K-8K   | 5-10s   |
| **Comprehensive Analysis** | 4     | Context Search → Gap Analysis → Conditional Branch → Document | 18K-20K | 25-47s  |

### What I Proposed (Redundant) ❌

| Mode                  | What I Suggested       | Reality                                              |
| --------------------- | ---------------------- | ---------------------------------------------------- |
| **QnA**               | Simple Tavily QnA      | Not needed - Basic workflow handles this             |
| **Standard Search**   | 5 results              | **Already exists as Basic (3 results)**              |
| **Advanced Search**   | 10 queries             | **Already exists (7 results + extraction)**          |
| **RAG Mode**          | Search + raw content   | **Already exists in Comprehensive (context search)** |
| **Extract Mode**      | URL extraction         | **Already exists in Advanced (top 2 URLs)**          |
| **Multi-Extract RAG** | Search + extract + RAG | **Already exists in Comprehensive**                  |

---

## The Truth: You Don't Need New Modes

Your existing workflows **already cover** all the Tavily features I proposed! Here's the mapping:

### Mapping: Proposed Modes → Existing Workflows

```
My Proposal                     Your Reality
─────────────────────────────────────────────────────────────
QnA Mode                    →   Basic Search Workflow
(tavilyQna)                     (3 results, fast)

Standard Search             →   Basic Search Workflow
(tavilySearch, 5 results)       (3 results, synthesized)

Advanced Search             →   Advanced Search Workflow
(tavilyAdvancedSearch, 10)      (7 results + extract top 2)

RAG Mode                    →   Comprehensive Analysis Workflow
(search + raw content)          (context search with raw content)

Extract Mode                →   Advanced Search Workflow
(tavilyExtract)                 (extracts top 2 URLs)

Multi-Extract RAG           →   Comprehensive Analysis Workflow
(search + extract + RAG)        (context + gap analysis + conditional)
```

---

## Revised Routing Architecture (Simplified)

### 3 Complexity Levels = 3 Workflows

```
User Query
    ↓
Complexity Detection
    ↓
    ├─→ Simple/Light (1K-2.5K tokens, 3-5s)
    │   └─→ Basic Search Workflow
    │       - 3 search results
    │       - Quick synthesis
    │       - Fast answers
    │
    ├─→ Medium (4K-8K tokens, 5-10s)
    │   └─→ Advanced Search Workflow
    │       - 7 search results
    │       - Extract top 2 URLs
    │       - Comprehensive synthesis
    │
    └─→ Deep/Comprehensive (18K-20K tokens, 25-47s)
        └─→ Comprehensive Analysis Workflow
            - Context search (raw content)
            - Gap analysis
            - Conditional branching (enhance vs deep-dive)
            - Publication-quality document
```

---

## Updated Complexity Detection

### Simplified Detection Logic

```typescript
// lib/ai/complexity-detector.ts

export type QueryComplexity =
  | "simple" // Basic Search Workflow
  | "medium" // Advanced Search Workflow
  | "deep"; // Comprehensive Analysis Workflow

export interface ComplexityAnalysis {
  complexity: QueryComplexity;
  workflow: "basic" | "advanced" | "comprehensive";
  reasoning: string;
  estimatedTokens: number;
  estimatedLatency: string;
  features: string[];
}

export function detectQueryComplexity(
  query: string,
  userOverride?: "basic" | "advanced" | "comprehensive"
): ComplexityAnalysis {
  // User override
  if (userOverride) {
    return mapUserOverrideToComplexity(userOverride);
  }

  // Detect comprehensive needs
  if (requiresComprehensiveAnalysis(query)) {
    return {
      complexity: "deep",
      workflow: "comprehensive",
      reasoning:
        "Query requires comprehensive analysis with gap identification",
      estimatedTokens: 19000,
      estimatedLatency: "25-47s",
      features: [
        "context_search",
        "raw_content",
        "gap_analysis",
        "conditional_branching",
        "publication_quality",
      ],
    };
  }

  // Detect medium complexity
  if (requiresMultiplePerspectives(query)) {
    return {
      complexity: "medium",
      workflow: "advanced",
      reasoning: "Query requires multiple sources and URL extraction",
      estimatedTokens: 6000,
      estimatedLatency: "5-10s",
      features: [
        "advanced_search",
        "7_results",
        "url_extraction",
        "comprehensive_synthesis",
      ],
    };
  }

  // Default to simple
  return {
    complexity: "simple",
    workflow: "basic",
    reasoning: "Simple query with quick answer needs",
    estimatedTokens: 1750,
    estimatedLatency: "3-5s",
    features: ["basic_search", "3_results", "fast_synthesis"],
  };
}

// Detection helpers
function requiresComprehensiveAnalysis(query: string): boolean {
  const keywords = [
    "comprehensive analysis",
    "full analysis",
    "complete review",
    "detailed examination",
    "in-depth study",
    "thorough investigation",
    "publication quality",
    "research paper",
    "full report",
    "exhaustive",
    "all aspects of",
  ];

  const lowerQuery = query.toLowerCase();

  // Check for explicit comprehensive keywords
  if (keywords.some((kw) => lowerQuery.includes(kw))) {
    return true;
  }

  // Check for very long queries (likely complex)
  if (query.split(" ").length > 15) {
    return true;
  }

  return false;
}

function requiresMultiplePerspectives(query: string): boolean {
  const keywords = [
    "compare",
    "contrast",
    "different perspectives",
    "various viewpoints",
    "multiple sources",
    "comprehensive",
    "across",
    "between",
    "versus",
    "vs",
    "analyze",
    "examine",
    "evaluate",
  ];

  const lowerQuery = query.toLowerCase();

  // Check for comparison/analysis keywords
  if (keywords.some((kw) => lowerQuery.includes(kw))) {
    return true;
  }

  // Check for complex legal topics
  const complexTopics = [
    "constitutional",
    "case law",
    "precedent",
    "legal framework",
    "regulatory",
    "statutory",
    "amendments",
    "reforms",
  ];

  // Complex topic + moderate length = medium complexity
  if (
    complexTopics.some((topic) => lowerQuery.includes(topic)) &&
    query.split(" ").length > 6
  ) {
    return true;
  }

  return false;
}

function mapUserOverrideToComplexity(
  override: "basic" | "advanced" | "comprehensive"
): ComplexityAnalysis {
  const map = {
    basic: {
      complexity: "simple" as const,
      workflow: "basic" as const,
      reasoning: "User selected Basic mode",
      estimatedTokens: 1750,
      estimatedLatency: "3-5s",
      features: ["basic_search", "3_results", "fast_synthesis"],
    },
    advanced: {
      complexity: "medium" as const,
      workflow: "advanced" as const,
      reasoning: "User selected Advanced mode",
      estimatedTokens: 6000,
      estimatedLatency: "5-10s",
      features: ["advanced_search", "7_results", "url_extraction"],
    },
    comprehensive: {
      complexity: "deep" as const,
      workflow: "comprehensive" as const,
      reasoning: "User selected Comprehensive mode",
      estimatedTokens: 19000,
      estimatedLatency: "25-47s",
      features: ["context_search", "gap_analysis", "publication_quality"],
    },
  };

  return map[override];
}
```

---

## Updated Main Chat Route Integration

### Workflow Selection Logic

```typescript
// lib/ai/mastra-sdk-integration.ts

export async function streamMastraAgent(
  complexity: QueryComplexity,
  query: string,
  options?: MastraStreamOptions
) {
  logger.log("[Mastra SDK] Streaming agent", { complexity, options });

  // Select workflow based on complexity
  const workflowSelection = selectWorkflow(complexity, options);

  logger.log(
    `[Mastra SDK] Selected: ${workflowSelection.type} - ${workflowSelection.name}`
  );

  // For workflows, we need to execute them differently than agents
  if (workflowSelection.type === "workflow") {
    return await executeWorkflowAsStream(
      workflowSelection.name,
      query,
      options
    );
  }

  // For agents (simple queries), use existing agent logic
  const agent = await getSingleAgent(workflowSelection.name, options);

  const stream = await agent.stream([{ role: "user", content: query }], {
    format: "aisdk",
    maxSteps: workflowSelection.maxSteps,
  } as any);

  return stream;
}

function selectWorkflow(
  complexity: QueryComplexity,
  options?: MastraStreamOptions
): {
  type: "agent" | "workflow";
  name: string;
  maxSteps: number;
} {
  // User override
  if (options?.workflowName) {
    return {
      type: "workflow",
      name: options.workflowName,
      maxSteps: 10,
    };
  }

  // Select based on complexity
  switch (complexity) {
    case "simple":
      // Use chat agent for simple queries (no workflow needed)
      return {
        type: "agent",
        name: "chatAgent",
        maxSteps: 3,
      };

    case "medium":
      // Use Advanced Search Workflow
      return {
        type: "workflow",
        name: "advancedSearchWorkflow",
        maxSteps: 5,
      };

    case "deep":
      // Use Comprehensive Analysis Workflow
      return {
        type: "workflow",
        name: "comprehensiveAnalysisWorkflow",
        maxSteps: 10,
      };

    default:
      return {
        type: "agent",
        name: "chatAgent",
        maxSteps: 3,
      };
  }
}

async function executeWorkflowAsStream(
  workflowName: string,
  query: string,
  options?: MastraStreamOptions
): Promise<any> {
  logger.log(`[Mastra SDK] Executing workflow: ${workflowName}`);

  // Import workflow
  let workflow: any;

  switch (workflowName) {
    case "basicSearchWorkflow": {
      const { basicSearchWorkflow } = await import(
        "@/mastra/workflows/basic-search-workflow"
      );
      workflow = basicSearchWorkflow;
      break;
    }

    case "advancedSearchWorkflow": {
      const { advancedSearchWorkflow } = await import(
        "@/mastra/workflows/advanced-search-workflow"
      );
      workflow = advancedSearchWorkflow;
      break;
    }

    case "comprehensiveAnalysisWorkflow": {
      const { comprehensiveAnalysisWorkflow } = await import(
        "@/mastra/workflows/comprehensive-analysis-workflow"
      );
      workflow = comprehensiveAnalysisWorkflow;
      break;
    }

    default:
      throw new Error(`Unknown workflow: ${workflowName}`);
  }

  // Execute workflow
  const run = await workflow.createRunAsync();
  const result = await run.start({
    inputData: {
      query,
      jurisdiction: "Zimbabwe",
    },
  });

  if (result.status !== "success") {
    throw new Error(`Workflow failed with status: ${result.status}`);
  }

  // Get final output from last step
  const finalStep = Object.values(result.steps).pop() as any;
  const output = finalStep.output;

  // Convert workflow output to AI SDK stream format
  // This is a simplified version - you'll need to adapt based on your needs
  return createStreamFromWorkflowOutput(output);
}

function createStreamFromWorkflowOutput(output: any): any {
  // TODO: Convert workflow output to AI SDK v5 stream format
  // This will depend on how you want to stream workflow results
  // For now, return a simple response

  const { createUIMessageStream } = require("ai");

  return createUIMessageStream({
    execute: ({ writer }) => {
      // Write the workflow response as a message
      writer.write({
        type: "text",
        text: output.response,
      });

      // Write sources if available
      if (output.sources) {
        writer.write({
          type: "data",
          data: {
            sources: output.sources,
          },
        });
      }

      writer.close();
    },
  });
}
```

---

## Updated UI: Workflow Mode Selector

```typescript
// components/workflow-mode-selector.tsx

export function WorkflowModeSelector({
  value,
  onChange,
}: {
  value?: "basic" | "advanced" | "comprehensive";
  onChange: (mode?: "basic" | "advanced" | "comprehensive") => void;
}) {
  return (
    <Select
      value={value || "auto"}
      onValueChange={(v) => onChange(v === "auto" ? undefined : (v as any))}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">🤖 Auto-detect</SelectItem>

        <SelectSeparator />

        <SelectItem value="basic">
          ⚡ Basic (3-5s)
          <span className="text-xs text-muted-foreground block">
            3 sources, quick synthesis
          </span>
        </SelectItem>

        <SelectItem value="advanced">
          🔍 Advanced (5-10s)
          <span className="text-xs text-muted-foreground block">
            7 sources + URL extraction
          </span>
        </SelectItem>

        <SelectItem value="comprehensive">
          📚 Comprehensive (25-47s)
          <span className="text-xs text-muted-foreground block">
            Gap analysis, publication quality
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

## Workflow Feature Matrix

| Feature                   | Basic         | Advanced      | Comprehensive  |
| ------------------------- | ------------- | ------------- | -------------- |
| **Search Results**        | 3             | 7             | 10+ (context)  |
| **URL Extraction**        | ❌            | ✅ (top 2)    | ✅ (context)   |
| **Raw Content**           | ❌            | ❌            | ✅             |
| **Gap Analysis**          | ❌            | ❌            | ✅             |
| **Conditional Branching** | ❌            | ❌            | ✅             |
| **Parallel Searches**     | ❌            | ❌            | ✅ (deep-dive) |
| **Zimbabwe Filtering**    | Optional      | ✅            | ✅             |
| **Time Range**            | ❌            | ✅ (year)     | ✅ (year)      |
| **Synthesis Model**       | llama-3.3-70b | llama-3.3-70b | llama-3.3-70b  |
| **Output Quality**        | Good          | Excellent     | Publication    |

---

## What This Means

### ✅ You Already Have Everything

Your existing workflows **already implement** all the Tavily features I proposed:

1. **Basic Search** = QnA + Standard Search modes
2. **Advanced Search** = Advanced Search + Extract modes
3. **Comprehensive Analysis** = RAG + Multi-Extract RAG modes

### ❌ Don't Build New Modes

You don't need to create:

- Separate QnA agent
- Separate Standard Search agent
- Separate RAG agent
- Separate Extract agent
- Separate Multi-Extract agent

### ✅ Just Route to Existing Workflows

Your routing logic should simply:

1. Detect query complexity (simple/medium/deep)
2. Route to appropriate workflow (basic/advanced/comprehensive)
3. Let the workflow handle all the Tavily features

---

## Implementation Checklist

- [ ] Update complexity detector to use 3 levels (simple/medium/deep)
- [ ] Map complexity to workflows (basic/advanced/comprehensive)
- [ ] Update main chat route to execute workflows
- [ ] Create workflow-to-stream converter
- [ ] Add UI selector for workflow override
- [ ] Test routing with various query types
- [ ] Monitor token usage and latency
- [ ] Document workflow selection logic

---

## Conclusion

**The good news:** You already built a comprehensive workflow system that covers all Tavily features!

**The simplification:** Instead of 6 modes, you have 3 workflows that do everything.

**The routing:** Just detect complexity and route to the right workflow.

**The result:** Simpler architecture, less code, same capabilities.

Your existing workflows are well-designed and cover the full spectrum from fast answers to publication-quality research. No need to reinvent the wheel!
