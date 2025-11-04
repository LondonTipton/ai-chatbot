# Mastra Integration Documentation

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Agents and Workflows](#agents-and-workflows)
4. [Routing Logic](#routing-logic)
5. [Available Tools](#available-tools)
6. [Error Handling](#error-handling)
7. [Monitoring and Metrics](#monitoring-and-metrics)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Mastra integration provides multi-agent workflow orchestration for handling complex queries that require multiple steps. This solves provider limitations where long-running queries fail by breaking work into smaller sub-agents (max 3 steps each), ensuring reliable responses.

### Key Benefits

- **Reliability**: Sub-agents complete within provider limits (3 steps max)
- **Complexity Handling**: Can handle multi-step queries through workflow orchestration
- **Transparency**: Users see progress through workflow steps
- **Automatic Fallback**: Falls back to AI SDK on failure
- **Detailed Monitoring**: Comprehensive metrics per workflow

### Architecture

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

---

## Configuration

### Environment Variables

Add these to your `.env` or `.env.local` file:

```env
# Enable/disable Mastra routing
ENABLE_MASTRA=true

# Maximum steps per agent (recommended: 3)
MASTRA_MAX_STEPS_PER_AGENT=3

# Enable streaming responses
MASTRA_ENABLE_STREAMING=true

# Enable fallback to AI SDK on failure
MASTRA_FALLBACK_TO_AI_SDK=true
```

### Mastra Instance Configuration

Location: `lib/ai/mastra-config.ts`

```typescript
import { Mastra } from "@mastra/core";
import { createCerebrasProvider } from "./providers";

export const mastra = new Mastra({
  agents: {
    // All agents are registered here
  },
  workflows: {
    // All workflows are registered here
  },
});

// Configuration constants
export const MASTRA_CONFIG = {
  maxStepsPerAgent: parseInt(process.env.MASTRA_MAX_STEPS_PER_AGENT || "3"),
  streamingEnabled: process.env.MASTRA_ENABLE_STREAMING === "true",
  fallbackEnabled: process.env.MASTRA_FALLBACK_TO_AI_SDK === "true",
};
```

### Feature Flag

To disable Mastra routing entirely:

```env
ENABLE_MASTRA=false
```

When disabled, all queries route to AI SDK regardless of complexity.

---

## Agents and Workflows

### Medium Research Agent

**Purpose**: Handle medium complexity queries requiring 2-3 search operations

**Location**: `lib/ai/agents/medium-research.ts`

**Configuration**:

- Max Steps: 3
- Tools: All available tools
- Use Case: Multi-search queries, comparative research

**Example Query**: "Compare contract law in California vs New York"

### Deep Research Workflow

**Purpose**: Handle deep research queries requiring comprehensive analysis

**Location**: `lib/ai/workflows/deep-research.ts`

**Steps**:

1. **Search Agent** (3 steps max): Find relevant information
2. **Extract Agent** (3 steps max): Extract detailed content
3. **Analyze Agent** (3 steps max): Synthesize findings

**Example Query**: "Analyze the legal implications of AI-generated content ownership"

### Document Review Workflow

**Purpose**: Analyze legal documents for structure, issues, and recommendations

**Location**: `lib/ai/workflows/document-review.ts`

**Steps**:

1. **Structure Agent** (3 steps max): Analyze document structure
2. **Issues Agent** (3 steps max): Identify problems and gaps
3. **Recommendations Agent** (3 steps max): Provide improvement suggestions

**Example Query**: "Review this employment contract for potential issues"

### Case Law Analysis Workflow

**Purpose**: Compare and analyze legal precedents

**Location**: `lib/ai/workflows/case-law-analysis.ts`

**Steps**:

1. **Case Search Agent** (3 steps max): Find relevant cases
2. **Holdings Agent** (3 steps max): Extract key holdings
3. **Compare Agent** (3 steps max): Analyze precedents

**Example Query**: "Compare precedents on data privacy in healthcare"

### Legal Drafting Workflow

**Purpose**: Draft comprehensive legal documents

**Location**: `lib/ai/workflows/legal-drafting.ts`

**Steps**:

1. **Research Agent** (3 steps max): Research provisions and precedents
2. **Draft Agent** (3 steps max): Create document structure
3. **Refine Agent** (3 steps max): Finalize and polish

**Example Query**: "Draft a non-disclosure agreement for a tech startup"

---

## Routing Logic

### Complexity Detection

Location: `lib/ai/complexity-detector.ts`

The system analyzes queries and assigns complexity levels:

| Complexity          | Description          | Handler           | Example                        |
| ------------------- | -------------------- | ----------------- | ------------------------------ |
| `simple`            | Basic questions      | AI SDK            | "What is a contract?"          |
| `light`             | Single-step queries  | AI SDK            | "Define force majeure"         |
| `medium`            | Multi-search queries | Medium Agent      | "Compare laws in 3 states"     |
| `deep`              | Complex analysis     | Deep Workflow     | "Analyze AI regulation trends" |
| `workflow-review`   | Document review      | Review Workflow   | "Review this contract"         |
| `workflow-caselaw`  | Case law analysis    | Case Law Workflow | "Compare precedents"           |
| `workflow-drafting` | Document drafting    | Drafting Workflow | "Draft an NDA"                 |

### Routing Decision Flow

```typescript
// In app/(chat)/api/chat/route.ts

const complexity = detectComplexity(userMessage);

if (shouldUseMastra(complexity)) {
  // Route to Mastra
  const stream = await routeToMastra(complexity, userMessage, context);
  return stream;
} else {
  // Route to AI SDK
  const stream = await executeAISDK(userMessage, context);
  return stream;
}
```

### shouldUseMastra() Logic

```typescript
export function shouldUseMastra(complexity: QueryComplexity): boolean {
  if (process.env.ENABLE_MASTRA !== "true") {
    return false;
  }

  return [
    "medium",
    "deep",
    "workflow-review",
    "workflow-caselaw",
    "workflow-drafting",
  ].includes(complexity);
}
```

---

## Available Tools

All Mastra agents have access to all tools. This ensures maximum flexibility for any workflow step.

### Search Tools

#### tavilySearch

- **Purpose**: General web search
- **Use Case**: Finding information, articles, resources
- **Parameters**: `query`, `maxResults`

#### tavilyAdvancedSearch

- **Purpose**: Advanced search with depth control
- **Use Case**: Deep research, comprehensive information gathering
- **Parameters**: `query`, `searchDepth`, `maxResults`

#### tavilyQna

- **Purpose**: Quick question-answering
- **Use Case**: Specific factual questions
- **Parameters**: `query`

#### tavilyExtract

- **Purpose**: Extract content from URLs
- **Use Case**: Getting full content from specific sources
- **Parameters**: `urls[]`

### Document Tools

#### createDocument

- **Purpose**: Create document artifacts
- **Use Case**: Generating contracts, agreements, legal documents
- **Parameters**: `title`, `content`, `kind`

#### updateDocument

- **Purpose**: Update existing documents
- **Use Case**: Revising drafts, incorporating feedback
- **Parameters**: `documentId`, `content`, `description`

### Utility Tools

#### requestSuggestions

- **Purpose**: Generate follow-up suggestions
- **Use Case**: Guiding user to next steps
- **Parameters**: `context`, `count`

#### summarizeContent

- **Purpose**: Summarize long content
- **Use Case**: Condensing research findings
- **Parameters**: `content`, `maxLength`

#### getWeather

- **Purpose**: Get weather information (demo tool)
- **Use Case**: Testing tool integration
- **Parameters**: `location`

### Tool Configuration

All agents are configured with all tools:

```typescript
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

export const exampleAgent = new Agent({
  name: "example",
  instructions: "...",
  model: {
    provider: "cerebras",
    name: "llama-3.3-70b",
  },
  maxSteps: 3,
  tools: allTools,
});
```

---

## Error Handling

### Fallback Strategy

The system implements automatic fallback to AI SDK when Mastra fails:

```typescript
try {
  // Try Mastra workflow
  const result = await routeToMastra(complexity, query, context);

  // Validate response
  if (!validateMastraResponse(result)) {
    throw new Error("Invalid Mastra response");
  }

  return result;
} catch (error) {
  console.error("[Mastra] Workflow failed, falling back to AI SDK:", error);

  // Fallback to AI SDK
  return executeAISDK(query, context);
}
```

### Sub-Agent Failure Handling

Workflows continue with partial results when sub-agents fail:

```typescript
// In workflow step configuration
onStepError: (step, error) => {
  console.error(`[Mastra] Step ${step.name} failed:`, error);

  // Log failure
  await logWorkflowError(step, error);

  // Continue with partial results
  return {
    continue: true,
    partialResult: step.partialOutput || "Step failed, continuing...",
  };
};
```

### Response Validation

Location: `lib/ai/mastra-validation.ts`

All Mastra responses are validated before returning to client:

```typescript
export function validateMastraResponse(response: string): boolean {
  // Must have minimum length
  if (response.length < 10) {
    return false;
  }

  // Must not be empty or whitespace only
  if (!response.trim()) {
    return false;
  }

  return true;
}
```

### Error Logging

All errors are logged with context:

```typescript
console.error("[Mastra] Error details:", {
  workflow: workflowName,
  step: currentStep,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});
```

---

## Monitoring and Metrics

### Metrics Collection

Location: `lib/ai/mastra-metrics.ts`

The system tracks comprehensive metrics for all workflows:

```typescript
interface MastraMetrics {
  workflowType: string;
  executionTime: number;
  agentsUsed: number;
  stepsCompleted: number;
  success: boolean;
  fallbackUsed: boolean;
  responseLength: number;
  timestamp: Date;
}
```

### Logging Workflow Execution

```typescript
console.log("[Mastra] 🤖 Routing to Medium Research Agent");
console.log("[Mastra] 📊 Agent: medium-research, Step 1/3: Searching...");
console.log("[Mastra] 📊 Agent: medium-research, Step 2/3: Analyzing...");
console.log("[Mastra] 📊 Agent: medium-research, Step 3/3: Synthesizing...");
console.log("[Mastra] ✅ Workflow completed in 2.3s, 3 steps, 245 chars");
```

### Metrics API Endpoint

Access metrics via: `GET /api/admin/mastra-metrics`

```typescript
// Example response
{
  "totalWorkflows": 150,
  "successRate": 0.96,
  "averageExecutionTime": 3.2,
  "workflowBreakdown": {
    "medium": { "count": 50, "successRate": 0.98 },
    "deep": { "count": 40, "successRate": 0.95 },
    "workflow-review": { "count": 30, "successRate": 0.97 },
    "workflow-caselaw": { "count": 20, "successRate": 0.94 },
    "workflow-drafting": { "count": 10, "successRate": 0.93 }
  }
}
```

### Performance Monitoring

Track these key metrics:

1. **Execution Time**: How long workflows take
2. **Success Rate**: Percentage of successful completions
3. **Fallback Rate**: How often fallback to AI SDK occurs
4. **Steps Completed**: Average steps per workflow
5. **Response Quality**: Length and completeness of responses

---

## Troubleshooting

### Common Issues

#### 1. Empty Responses

**Symptom**: Mastra returns empty or very short responses

**Causes**:

- Agent hitting step limit before completing
- Tool calls failing silently
- Response validation failing

**Solutions**:

```typescript
// Check validation logs
console.log("[Mastra] Response validation failed:", {
  length: response.length,
  content: response.substring(0, 100),
});

// Increase step limit (if appropriate)
MASTRA_MAX_STEPS_PER_AGENT = 5;

// Check tool execution logs
console.log("[Mastra] Tool execution:", toolName, toolResult);
```

#### 2. Workflow Timeouts

**Symptom**: Workflows take too long or timeout

**Causes**:

- Too many workflow steps
- Slow tool execution
- Network issues with external APIs

**Solutions**:

```typescript
// Reduce workflow complexity
// Optimize tool calls
// Add timeout handling

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Workflow timeout")), 30000)
);

const result = await Promise.race([executeWorkflow(), timeoutPromise]);
```

#### 3. Fallback Loop

**Symptom**: System constantly falls back to AI SDK

**Causes**:

- Mastra configuration error
- Provider API issues
- Validation too strict

**Solutions**:

```typescript
// Check Mastra configuration
console.log("[Mastra] Config:", MASTRA_CONFIG);

// Verify provider connection
await testCerebrasConnection();

// Review validation rules
if (response.length < 10) {
  // Maybe too strict?
  return false;
}
```

#### 4. Tool Execution Failures

**Symptom**: Tools not working in workflows

**Causes**:

- Missing API keys
- Tool not registered with agent
- Tool parameter errors

**Solutions**:

```typescript
// Verify tool registration
console.log("[Mastra] Agent tools:", agent.tools);

// Check API keys
console.log(
  "[Mastra] Tavily API key:",
  process.env.TAVILY_API_KEY ? "Set" : "Missing"
);

// Validate tool parameters
console.log("[Mastra] Tool call:", {
  tool: toolName,
  params: toolParams,
});
```

### Debugging Workflow Execution

Enable detailed logging:

```typescript
// In workflow execution
console.log("[Mastra] Workflow start:", {
  type: workflowType,
  query: query.substring(0, 100),
  context: Object.keys(context),
});

// After each step
console.log("[Mastra] Step complete:", {
  step: stepName,
  duration: stepDuration,
  outputLength: output.length,
});

// On completion
console.log("[Mastra] Workflow complete:", {
  totalDuration: totalDuration,
  stepsCompleted: steps.length,
  success: true,
});
```

### Testing Workflows

Use the test script to verify workflows:

```bash
pnpm tsx scripts/test-real-queries.ts
```

This tests all workflow types with real queries and reports success/failure.

### Verification Scripts

#### Verify Agent Tools

```bash
pnpm tsx scripts/verify-agent-tools.ts
```

Checks that all agents have access to all tools.

#### Verify Mastra Tools

```bash
pnpm tsx scripts/verify-mastra-tools.ts
```

Tests each tool individually to ensure proper execution.

### Health Checks

Monitor these indicators:

1. **Success Rate**: Should be >95%
2. **Fallback Rate**: Should be <10%
3. **Average Execution Time**: Should be <10s for deep workflows
4. **Response Length**: Should be >100 chars for complex queries

### Getting Help

If issues persist:

1. Check logs in console for `[Mastra]` prefixed messages
2. Review metrics at `/api/admin/mastra-metrics`
3. Run verification scripts to test components
4. Check environment variables are set correctly
5. Verify Cerebras API is accessible

### Rollback Plan

If Mastra causes critical issues:

```env
# Disable Mastra immediately
ENABLE_MASTRA=false
```

This routes all queries to AI SDK without code changes.

---

## Best Practices

### 1. Agent Design

- Keep agents focused on single responsibilities
- Limit to 3 steps maximum per agent
- Provide clear, specific instructions
- Include examples in agent prompts

### 2. Workflow Design

- Break complex tasks into 3-4 steps maximum
- Pass relevant data between steps
- Handle partial results gracefully
- Include error recovery logic

### 3. Tool Usage

- Use appropriate tools for each task
- Validate tool parameters before calling
- Handle tool failures gracefully
- Log tool execution for debugging

### 4. Performance

- Monitor execution times
- Optimize slow workflows
- Cache results when appropriate
- Use parallel execution where possible

### 5. Error Handling

- Always implement fallback logic
- Log errors with full context
- Continue workflows with partial results
- Validate responses before returning

---

## Additional Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Requirements Document](./requirements.md)
- [Design Document](./design.md)
- [Implementation Tasks](./tasks.md)
- [Quick Test Guide](./QUICK_TEST_GUIDE.md)
- [Real Query Testing](./REAL_QUERY_TESTING.md)

---

## Version History

- **v1.0** (2024-11): Initial Mastra integration
  - Medium Research Agent
  - Deep Research Workflow
  - Document Review Workflow
  - Case Law Analysis Workflow
  - Legal Drafting Workflow
  - Comprehensive tool integration
  - Error handling and fallback
  - Metrics and monitoring
