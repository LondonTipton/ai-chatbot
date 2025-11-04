# Mastra Integration Design

## Overview

Implement Mastra multi-agent workflows to handle complex queries by breaking them into smaller sub-agents (max 3 steps each). This ensures reliable responses by working within provider limitations while maintaining the ability to handle complex, multi-step queries.

## Architecture

### High-Level Flow

```
User Query
  ↓
Complexity Detection
  ↓
┌─────────────────┴─────────────────┐
│                                   │
Simple/Light                  Medium/Deep/Workflow
  ↓                                 ↓
AI SDK                          Mastra
  ↓                                 ↓
Direct Response              Multi-Agent Workflow
  ↓                                 ↓
Stream to Client              Stream to Client
```

### Mastra Architecture

```
Mastra Instance
  ├─ Agents (all have access to all tools)
  │   ├─ Medium Research Agent (single agent, 3 steps)
  │   ├─ Search Sub-Agent (for workflows, 3 steps)
  │   ├─ Extract Sub-Agent (for workflows, 3 steps)
  │   ├─ Analyze Sub-Agent (for workflows, 3 steps)
  │   ├─ Structure Sub-Agent (for document review, 3 steps)
  │   ├─ Issues Sub-Agent (for document review, 3 steps)
  │   ├─ Recommendations Sub-Agent (for document review, 3 steps)
  │   ├─ Case Search Sub-Agent (for case law, 3 steps)
  │   ├─ Holdings Sub-Agent (for case law, 3 steps)
  │   ├─ Compare Sub-Agent (for case law, 3 steps)
  │   ├─ Research Sub-Agent (for drafting, 3 steps)
  │   ├─ Draft Sub-Agent (for drafting, 3 steps)
  │   └─ Refine Sub-Agent (for drafting, 3 steps)
  │
  └─ Workflows
      ├─ Deep Research Workflow (Search → Extract → Analyze)
      ├─ Document Review Workflow (Structure → Issues → Recommend)
      ├─ Case Law Analysis Workflow (Search Cases → Extract Holdings → Compare)
      └─ Legal Drafting Workflow (Research → Draft → Refine)
```

### Available Tools (All Agents)

All Mastra agents have access to:

- `tavilySearch` - General web search
- `tavilyAdvancedSearch` - Advanced search with depth control
- `tavilyQna` - Quick Q&A search
- `tavilyExtract` - Extract content from URLs
- `createDocument` - Create document artifacts
- `updateDocument` - Update existing documents
- `requestSuggestions` - Request follow-up suggestions
- `summarizeContent` - Summarize long content
- `getWeather` - Weather information (demo tool)

## Components and Interfaces

### 1. Mastra Configuration (`lib/ai/mastra-config.ts`)

```typescript
import { Mastra } from "@mastra/core";
import { myProvider } from "./providers";

export const mastra = new Mastra({
  provider: myProvider,
  config: {
    maxStepsPerAgent: 3,
    streamingEnabled: true,
  },
});
```

### 2. Medium Research Agent (`lib/ai/agents/medium-research.ts`)

```typescript
import { Agent } from "@mastra/core";

export const mediumResearchAgent = new Agent({
  name: "medium-research",
  instructions: `You are a legal research assistant. Perform up to 3 searches to gather information, then synthesize into a comprehensive answer.`,
  model: "chat-model",
  maxSteps: 3,
  tools: ["tavilySearch", "tavilyAdvancedSearch"],
});
```

### 3. Deep Research Workflow (`lib/ai/workflows/deep-research.ts`)

```typescript
import { Workflow } from "@mastra/core";

export const deepResearchWorkflow = new Workflow({
  name: "deep-research",
  steps: [
    {
      agent: "search-agent",
      maxSteps: 3,
      output: "searchResults",
    },
    {
      agent: "extract-agent",
      maxSteps: 3,
      input: "searchResults",
      output: "extractedContent",
    },
    {
      agent: "analyze-agent",
      maxSteps: 3,
      input: "extractedContent",
      output: "analysis",
    },
  ],
});
```

### 4. Document Review Workflow (`lib/ai/workflows/document-review.ts`)

```typescript
import { Workflow } from "@mastra/core";

export const documentReviewWorkflow = new Workflow({
  name: "document-review",
  steps: [
    {
      agent: "structure-agent",
      maxSteps: 3,
      output: "structure",
    },
    {
      agent: "issues-agent",
      maxSteps: 3,
      input: "structure",
      output: "issues",
    },
    {
      agent: "recommendations-agent",
      maxSteps: 3,
      input: "issues",
      output: "recommendations",
    },
  ],
});
```

### 5. Mastra Router (`lib/ai/mastra-router.ts`)

```typescript
export async function routeToMastra(
  complexity: QueryComplexity,
  query: string,
  context: any
): Promise<ReadableStream> {
  switch (complexity) {
    case "medium":
      return mediumResearchAgent.stream(query, context);
    case "deep":
      return deepResearchWorkflow.stream(query, context);
    case "workflow":
      return documentReviewWorkflow.stream(query, context);
    default:
      throw new Error(`Unsupported complexity: ${complexity}`);
  }
}
```

### 6. Chat Route Integration

```typescript
// In app/(chat)/api/chat/route.ts

if (shouldUseMastra(complexityAnalysis.complexity)) {
  console.log(
    `[Routing] 🤖 Using Mastra for ${complexityAnalysis.complexity} query`
  );

  const mastraStream = await routeToMastra(
    complexityAnalysis.complexity,
    userMessageText,
    { session, uiMessages }
  );

  // Convert Mastra stream to UI stream format
  const stream = convertMastraStreamToUI(mastraStream);

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
} else {
  console.log(
    `[Routing] ⚡ Using AI SDK for ${complexityAnalysis.complexity} query`
  );
  // Existing AI SDK flow
}
```

## Data Models

### Mastra Context

```typescript
interface MastraContext {
  session: Session;
  uiMessages: UIMessage[];
  chatId: string;
  userId: string;
  transactionId: string;
}
```

### Workflow Result

```typescript
interface WorkflowResult {
  success: boolean;
  response: string;
  steps: WorkflowStep[];
  duration: number;
  agentsUsed: number;
}

interface WorkflowStep {
  agent: string;
  duration: number;
  output: any;
  error?: string;
}
```

## Error Handling

### Fallback Strategy

```typescript
try {
  // Try Mastra workflow
  const result = await routeToMastra(complexity, query, context);
  return result;
} catch (error) {
  console.error("[Mastra] Workflow failed, falling back to AI SDK:", error);

  // Fallback to AI SDK
  return executeAISDK(query, context);
}
```

### Sub-Agent Failure

```typescript
// In workflow definition
onStepError: (step, error) => {
  console.error(`[Mastra] Step ${step.name} failed:`, error);

  // Continue with partial results
  return {
    continue: true,
    partialResult: step.partialOutput,
  };
};
```

## Testing Strategy

### Unit Tests

- Test each agent in isolation
- Test workflow orchestration
- Test routing logic
- Test stream conversion

### Integration Tests

- Test end-to-end flow for each complexity level
- Test fallback to AI SDK
- Test error handling
- Test streaming responses

### Performance Tests

- Measure workflow execution time
- Compare Mastra vs AI SDK performance
- Test concurrent workflow execution
- Monitor memory usage

## Monitoring

### Metrics to Track

```typescript
interface MastraMetrics {
  workflowType: string;
  executionTime: number;
  agentsUsed: number;
  stepsCompleted: number;
  success: boolean;
  fallbackUsed: boolean;
  responseLength: number;
}
```

### Logging

```
[Mastra] 🤖 Routing to Medium Research Agent
[Mastra] 📊 Agent: medium-research, Step 1/3: Searching...
[Mastra] 📊 Agent: medium-research, Step 2/3: Analyzing...
[Mastra] 📊 Agent: medium-research, Step 3/3: Synthesizing...
[Mastra] ✅ Workflow completed in 2.3s, 3 steps, 245 chars
```

## Deployment Considerations

### Environment Variables

```env
# Mastra Configuration
MASTRA_MAX_STEPS_PER_AGENT=3
MASTRA_ENABLE_STREAMING=true
MASTRA_FALLBACK_TO_AI_SDK=true
```

### Feature Flag

```env
# Enable Mastra routing
ENABLE_MASTRA=true
```

### Rollback Plan

If Mastra causes issues:

1. Set `ENABLE_MASTRA=false`
2. All queries route to AI SDK
3. No code changes needed

## Benefits

1. **Reliability**: Sub-agents complete within provider limits
2. **Complexity**: Can handle multi-step queries
3. **Transparency**: Users see progress through workflow
4. **Fallback**: Automatic fallback to AI SDK on failure
5. **Monitoring**: Detailed metrics per workflow

## Trade-offs

1. **Latency**: Multi-agent workflows take longer than single AI SDK call
2. **Complexity**: More moving parts to maintain
3. **Cost**: Multiple agent calls may cost more
4. **Debugging**: Harder to debug multi-agent flows

## Success Criteria

- Medium/Deep/Workflow queries complete reliably (>95% success rate)
- Each sub-agent completes within 3 steps
- Response quality matches or exceeds AI SDK
- Fallback to AI SDK works seamlessly
- Performance acceptable (<10s for deep workflows)

### 5. Case Law Analysis Workflow (`lib/ai/workflows/case-law-analysis.ts`)

```typescript
import { Workflow } from "@mastra/core";

export const caseLawAnalysisWorkflow = new Workflow({
  name: "case-law-analysis",
  steps: [
    {
      agent: "case-search-agent",
      maxSteps: 3,
      output: "cases",
    },
    {
      agent: "holdings-agent",
      maxSteps: 3,
      input: "cases",
      output: "holdings",
    },
    {
      agent: "compare-agent",
      maxSteps: 3,
      input: "holdings",
      output: "comparison",
    },
  ],
});
```

### 6. Legal Drafting Workflow (`lib/ai/workflows/legal-drafting.ts`)

```typescript
import { Workflow } from "@mastra/core";

export const legalDraftingWorkflow = new Workflow({
  name: "legal-drafting",
  steps: [
    {
      agent: "research-agent",
      maxSteps: 3,
      output: "research",
    },
    {
      agent: "draft-agent",
      maxSteps: 3,
      input: "research",
      output: "draft",
    },
    {
      agent: "refine-agent",
      maxSteps: 3,
      input: "draft",
      output: "finalDraft",
    },
  ],
});
```

### 7. Tool Configuration (All Agents)

```typescript
// All agents have access to all tools
const allTools = [
  "tavilySearch",
  "tavilyAdvancedSearch",
  "tavilyQna",
  "tavilyExtract",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "summarizeContent",
  "getWeather",
];

// Example agent with all tools
export const exampleAgent = new Agent({
  name: "example",
  instructions: "...",
  model: "chat-model",
  maxSteps: 3,
  tools: allTools, // All agents get all tools
});
```
