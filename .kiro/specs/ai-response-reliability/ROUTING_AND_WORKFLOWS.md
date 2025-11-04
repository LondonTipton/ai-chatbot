# Routing and Workflow Architecture

## Current State

### Routing Logic (Complexity-Based)

The system routes queries based on detected complexity:

```typescript
Simple → tavilyQna (single Q&A)
Light → tavilyAdvancedSearch (multiple searches)
Medium/Deep/Workflow → tavilySearch + tavilyExtract (standard tools)
```

### What's Currently Used

**AI SDK Only** - All queries are handled by AI SDK's `streamText` with different tool configurations:

1. **Simple Queries**

   - Tools: `tavilyQna`, `createDocument`, `updateDocument`
   - Use case: "What is X?", "Define Y"
   - Single tool call expected

2. **Light Research**

   - Tools: `tavilyAdvancedSearch`, `createDocument`, `updateDocument`, `requestSuggestions`
   - Use case: General legal questions requiring research
   - **Problem**: Allows unlimited tool calls (AI made 4 calls)

3. **Medium/Deep/Workflow**
   - Tools: `tavilySearch`, `tavilyExtract`, `createDocument`, `updateDocument`, `requestSuggestions`
   - Use case: Complex research, document review
   - Standard tool usage

### What's NOT Used

**Mastra Workflows** - Completely disabled with comment:

```typescript
// Medium/Deep/Workflow - use standard tools (Mastra disabled for now)
```

## The Problem

### Issue: Unlimited Tool Calls in "Light" Complexity

When a query is classified as "light", it uses `tavilyAdvancedSearch` which allows the AI to make multiple calls in a single execution.

**Example from logs:**

```
[StreamRetry] Message 1: 15 parts -
  step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, tool-tavilyAdvancedSearch,
  step-start, reasoning, data-usage
```

The AI made **4 Tavily calls** in a single execution, which:

- ❌ Hits Tavily rate limits (3 calls recommended)
- ❌ Causes AI to not generate final text (too many steps)
- ❌ Wastes API calls
- ❌ Increases latency

### Root Cause

No limit on tool roundtrips - the AI can call tools as many times as it wants until it hits the `stopWhen: stepCountIs(15)` limit.

## The Fix (Implemented)

### Added `maxToolRoundtrips: 3`

```typescript
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({ selectedChatModel, requestHints }),
  messages: convertToModelMessages(uiMessages),
  maxToolRoundtrips: 3, // NEW: Limit to 3 tool calls
  maxRetries: 5,
  // ... rest of config
});
```

This limits the AI to **3 tool calls maximum** per execution, which:

- ✅ Works within Tavily's recommended limits
- ✅ Forces AI to be more efficient
- ✅ Leaves room for final text generation
- ✅ Reduces API costs

## Mastra Workflows (Future)

### Why Mastra Was Disabled

Looking at the code, Mastra workflows were planned but never fully implemented. The complexity detector has workflow detection logic, but the routing doesn't use it.

### Workflow Detection Logic (Exists but Unused)

```typescript
// From lib/ai/complexity-detector.ts
const workflowIndicators = [
  "review this",
  "review the",
  "draft a",
  "create a",
  // ... more indicators
];

if (workflowIndicators.some((indicator) => lowerMessage.includes(indicator))) {
  return {
    complexity: "workflow",
    reasoning: "Requires multi-agent workflow with validation steps",
  };
}
```

### Workflow Types Defined (Not Implemented)

```typescript
export function getWorkflowType(complexity: QueryComplexity): string {
  switch (complexity) {
    case "medium":
      return "mediumResearchAgent";
    case "deep":
      return "deepResearchWorkflow";
    case "workflow":
      return "documentReviewWorkflow";
    default:
      return "none";
  }
}
```

### Why Workflows Would Help

**Current Problem:**

- Single agent tries to do everything in one execution
- Makes multiple tool calls
- Runs out of "thinking space" before generating text

**Workflow Solution:**

```
Step 1: Research Agent
  - Make 1-2 Tavily calls
  - Gather information
  - Pass to next agent

Step 2: Analysis Agent
  - Receive research results
  - Analyze and synthesize
  - Generate comprehensive response

Step 3: Validation Agent (optional)
  - Review response quality
  - Ensure all questions answered
  - Add citations
```

Each agent has its own tool call budget, so total work can be > 3 calls while each step stays within limits.

## Recommendations

### Short-term (Current Fix)

- ✅ **Implemented**: `maxToolRoundtrips: 3` limits tool calls
- ✅ **Monitor**: Check if AI generates text after tool calls now
- ✅ **Adjust**: If 3 is too restrictive, try 4 or 5

### Medium-term (Next Sprint)

1. **Implement Mastra Workflows** for "workflow" complexity

   - Create `documentReviewWorkflow`
   - Create `deepResearchWorkflow`
   - Test with complex queries

2. **Refine Routing Logic**

   - Better complexity detection
   - Route "workflow" queries to Mastra
   - Keep simple/light queries on AI SDK

3. **Add Workflow Monitoring**
   - Track workflow execution time
   - Monitor step-by-step success rates
   - Compare workflow vs single-agent performance

### Long-term (Future)

1. **Hybrid Approach**

   - Use AI SDK for simple/light queries (fast, streaming)
   - Use Mastra workflows for complex queries (thorough, multi-step)
   - Automatic fallback if one approach fails

2. **Workflow Library**

   - Legal research workflow
   - Document drafting workflow
   - Case analysis workflow
   - Citation verification workflow

3. **Adaptive Routing**
   - Learn which queries benefit from workflows
   - Automatically route based on historical success rates
   - User preference for speed vs thoroughness

## Current Routing Decision Tree

```
Query Received
    ↓
Complexity Detection
    ↓
    ├─ Simple → AI SDK + tavilyQna (1 call)
    ├─ Light → AI SDK + tavilyAdvancedSearch (max 3 calls)
    └─ Medium/Deep/Workflow → AI SDK + tavilySearch/Extract (max 3 calls)

Mastra Workflows: NOT USED
```

## Proposed Future Routing

```
Query Received
    ↓
Complexity Detection
    ↓
    ├─ Simple → AI SDK + tavilyQna (1 call, fast)
    ├─ Light → AI SDK + tavilyAdvancedSearch (max 3 calls, streaming)
    ├─ Medium → AI SDK + tavilySearch/Extract (max 3 calls)
    ├─ Deep → Mastra deepResearchWorkflow (multi-step, thorough)
    └─ Workflow → Mastra documentReviewWorkflow (multi-agent, validated)
```

## Implementation Status

### Completed

- ✅ Complexity detection logic
- ✅ Tool-based routing
- ✅ `maxToolRoundtrips` limit added
- ✅ Workflow type definitions

### Not Implemented

- ❌ Mastra workflow execution
- ❌ Multi-agent workflows
- ❌ Workflow-specific routing
- ❌ Step-by-step validation

### Dependencies

- Mastra package installed but not configured
- Workflow agents need to be defined
- Routing logic needs workflow branch

## Testing Plan

### Test `maxToolRoundtrips: 3`

1. Send "light" complexity query
2. Verify AI makes ≤ 3 tool calls
3. Verify AI generates final text
4. Check response quality

### Test Workflow Implementation (Future)

1. Create simple workflow (2 steps)
2. Test with "workflow" complexity query
3. Verify each step executes
4. Compare quality vs single-agent

## Metrics to Track

### Current Metrics

- Tool calls per request
- Text generation rate after tools
- Validation failure rate
- Response latency

### Future Metrics (with Workflows)

- Workflow execution time
- Step success rates
- Workflow vs single-agent quality
- User satisfaction by routing type

## Conclusion

**Current State:**

- All queries use AI SDK (no Mastra workflows)
- Tool calls now limited to 3 per execution
- Should fix the "no text after tools" issue

**Next Steps:**

1. Monitor if `maxToolRoundtrips: 3` solves the problem
2. Plan Mastra workflow implementation
3. Define workflow agents and routing logic
4. Test hybrid approach with real queries
