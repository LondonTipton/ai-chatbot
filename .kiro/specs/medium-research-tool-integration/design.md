# Design Document

## Overview

This design integrates the existing Advanced Search Workflow as a tool that the Chat Agent can invoke for research-intensive queries. The architecture eliminates the need for separate research routes by making research a capability of the chat system through workflow-based tools. When users ask research-intensive questions, the Chat Agent invokes the Advanced Search Workflow tool, which executes deterministically and returns complete results in a single tool call.

**Key Design Principles:**

- Workflow-based tools: Workflows execute deterministically without nested agent decisions
- Single tool call: Workflow returns complete synthesized response, avoiding step budget issues
- Reuse existing workflows: Leverage the proven Advanced Search Workflow from hybrid-agent-workflow spec
- Reuse existing UI: All rendering through messages.tsx and artifact.tsx
- Graceful degradation: Workflow handles errors at each step and returns partial results when possible

## Architecture

### High-Level Flow

```
User Query → Chat Agent → Decides if research needed
                ↓
         Invokes Advanced Search Workflow Tool (1 tool call)
                ↓
    Workflow executes deterministically:
      → Search (Tavily API direct)
      → Extract (Tavily API direct)
      → Synthesize (synthesizerAgent)
                ↓
    Returns complete synthesized response
                ↓
    Chat Agent continues with result
                ↓
    Existing Chat UI renders
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────┐
│                     Chat Route                          │
│  (app/(chat)/api/chat/route.ts)                        │
│                                                         │
│  • Receives user message                               │
│  • Detects complexity                                  │
│  • Routes to Mastra if medium complexity               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Mastra SDK Integration                     │
│  (lib/ai/mastra-sdk-integration.ts)                    │
│                                                         │
│  • Selects chatAgent for medium complexity             │
│  • Creates agent with user context + workflow tools    │
│  • Returns AI SDK v5 compatible stream                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Chat Agent                            │
│  (mastra/agents/chat-agent.ts)                         │
│                                                         │
│  • Registered with Advanced Search Workflow tool       │
│  • Decides when to invoke research                     │
│  • Invokes workflow (1 tool call)                      │
│  • Receives complete response                          │
│  • Streams results back                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼ (when research needed)
┌─────────────────────────────────────────────────────────┐
│       Advanced Search Workflow Tool [NEW]               │
│  (mastra/tools/advanced-search-workflow-tool.ts)       │
│                                                         │
│  • Wraps existing Advanced Search Workflow             │
│  • Accepts query and jurisdiction                      │
│  • Executes workflow.createRunAsync()                  │
│  • Returns complete synthesized response               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│          Advanced Search Workflow [EXISTING]            │
│  (mastra/workflows/advanced-search-workflow.ts)        │
│                                                         │
│  • Step 1: Advanced search (Tavily API direct)         │
│  • Step 2: Extract top sources (Tavily API direct)     │
│  • Step 3: Synthesize (synthesizerAgent)               │
│  • Returns: response, sources, totalTokens             │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Advanced Search Workflow Tool (NEW)

**File:** `mastra/tools/advanced-search-workflow-tool.ts`

**Purpose:** Wraps the existing Advanced Search Workflow as a Mastra tool that can be invoked by the Chat Agent.

**Interface:**

```typescript
// Input Schema
{
  query: string;           // Research query
  jurisdiction?: string;   // Legal jurisdiction (default: "Zimbabwe")
}

// Output Schema
{
  response: string;        // Synthesized comprehensive response
  sources: Array<{         // Source citations
    title: string;
    url: string;
  }>;
  totalTokens: number;     // Total tokens used in workflow
}
```

**Implementation Strategy:**

- Use `createTool()` from `@mastra/core/tools`
- Import existing `advancedSearchWorkflow` from `mastra/workflows/advanced-search-workflow.ts`
- Execute workflow using `workflow.createRunAsync()` and `run.start()`
- Extract output from the synthesize step (last step)
- Return formatted output matching schema
- Pattern already proven in `mastra/agents/medium-agent.ts`

**Example Implementation (from medium-agent.ts):**

```typescript
const advancedSearchTool = createTool({
  id: "advanced-search-workflow",
  description: "Performs advanced legal research with comprehensive sources...",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
  }),
  outputSchema: z.object({
    response: z.string(),
    sources: z.array(z.object({ title: z.string(), url: z.string() })),
    totalTokens: z.number(),
  }),
  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;
    const run = await advancedSearchWorkflow.createRunAsync();
    const result = await run.start({ inputData: { query, jurisdiction } });

    if (result.status !== "success") {
      throw new Error(`Workflow failed: ${result.status}`);
    }

    const synthesizeStep = result.steps.synthesize;
    return synthesizeStep.output;
  },
});
```

### 2. Chat Agent Updates

**File:** `mastra/agents/chat-agent.ts`

**Changes Required:**

1. Import the Advanced Search Workflow tool
2. Register tool in the agent's tools configuration
3. Update instructions to guide when to use the workflow tool

**Updated Instructions Pattern:**

```
You are DeepCounsel, a helpful legal AI assistant for Zimbabwe.

Your capabilities:
- Answer simple legal questions directly
- Use the advancedSearchWorkflow tool for complex queries requiring multiple sources
- Create and update documents

When to use advancedSearchWorkflow:
- User asks for comprehensive research on a topic
- Query requires multiple perspectives or sources
- Question involves case law, precedents, or detailed legal analysis
- User explicitly requests "research" or "find cases about"

When NOT to use advancedSearchWorkflow:
- Simple definitions or explanations
- Direct questions with straightforward answers
- General legal guidance

CRITICAL: When user asks to "create a document", you MUST call the createDocument tool.

Always provide clear, professional responses with proper citations.
```

### 3. Mastra SDK Integration Updates

**File:** `lib/ai/mastra-sdk-integration.ts`

**Changes Required:**

- Update `selectAgentForComplexity()` to use chatAgent for "medium" complexity
- Ensure chatAgent factory includes Advanced Search Workflow tool when created with context
- No changes to streaming logic (already compatible)

**Agent Selection Logic:**

```typescript
function selectAgentForComplexity(complexity: QueryComplexity): string {
  switch (complexity) {
    case "simple":
    case "light":
      return "chatAgent"; // Chat agent handles simple + light

    case "medium":
      return "chatAgent"; // Chat agent with workflow tool for medium

    case "deep":
    case "workflow-review":
    case "workflow-drafting":
    case "workflow-caselaw":
      return "searchAgent"; // Keep existing deep research agent

    default:
      return "chatAgent";
  }
}
```

### 4. Chat Route Updates

**File:** `app/(chat)/api/chat/route.ts`

**Changes Required:**

- Update complexity routing to use chatAgent for medium queries
- Remove separate handling for medium complexity (unified through Mastra)
- Ensure proper error handling and fallback

**Routing Logic:**

```typescript
// Detect complexity
const complexityAnalysis = detectQueryComplexity(userMessageText);

// Route to Mastra for medium+ complexity (unless simple chat mode)
if (!useSimpleChat && shouldUseMastra(complexityAnalysis.complexity)) {
  // Use Mastra with chatAgent (which has workflow tool)
  const mastraStream = await streamMastraAgent(
    complexityAnalysis.complexity,
    userMessageText,
    { userId: dbUser.id, chatId: id }
  );

  return mastraStream.toUIMessageStreamResponse({ ... });
}
```

## Data Models

### Workflow Tool Context

```typescript
interface WorkflowToolContext {
  query: string;
  jurisdiction: string;
}
```

### Workflow Tool Result

```typescript
interface WorkflowToolResult {
  response: string;
  sources: WorkflowSource[];
  totalTokens: number;
}

interface WorkflowSource {
  title: string;
  url: string;
}
```

## Error Handling

### Tool-Level Errors

**Strategy:** Graceful degradation with informative messages

```typescript
try {
  // Execute workflow
  const run = await advancedSearchWorkflow.createRunAsync();
  const result = await run.start({ inputData: { query, jurisdiction } });

  if (result.status !== "success") {
    throw new Error(`Workflow failed with status: ${result.status}`);
  }

  return formatResult(result);
} catch (error) {
  console.error("[Advanced Search Workflow Tool] Error:", error);

  // Return error in tool output format
  return {
    response:
      "I encountered an error while researching. Please try rephrasing your question.",
    sources: [],
    totalTokens: 0,
  };
}
```

### Agent-Level Errors

**Strategy:** Chat Agent handles tool failures and provides fallback response

The Chat Agent's LLM will receive the error message from the tool and can:

1. Acknowledge the research limitation
2. Provide a direct answer if possible
3. Suggest alternative approaches

### Route-Level Errors

**Strategy:** Existing error handling in chat route catches Mastra failures

If Mastra fails entirely, the route falls back to AI SDK flow with standard tools.

## Testing Strategy

### Unit Tests

**Tool Tests** (`mastra/tools/advanced-search-workflow-tool.test.ts`):

- Test tool creation and schema validation
- Mock workflow execution responses
- Verify output format matches schema
- Test error handling and edge cases

**Agent Tests** (`mastra/agents/chat-agent.test.ts`):

- Verify tool registration
- Test tool invocation logic
- Validate instruction updates

### Integration Tests

**End-to-End Flow** (`tests/e2e/workflow-tool-integration.spec.ts`):

1. Send research query through chat UI
2. Verify Chat Agent invokes Advanced Search Workflow tool
3. Confirm research results appear in chat
4. Validate proper source citations
5. Check that only 1 tool call is made (not nested)

**Complexity Routing** (`tests/e2e/complexity-routing.spec.ts`):

- Simple query → Direct chat response (no tool)
- Medium query → Workflow tool invocation
- Verify UI shows tool invocation indicator

### Manual Testing Scenarios

1. **Simple Question:** "What is a contract?"
   - Expected: Direct answer, no workflow tool
2. **Research Question:** "Find cases about property rights in Zimbabwe"
   - Expected: Workflow tool invoked, multiple sources cited
3. **Document Creation:** "Research employment law and create a document"
   - Expected: Workflow tool for research, then createDocument tool
4. **Error Handling:** Disable Tavily API key
   - Expected: Graceful error message, no crash

## Implementation Notes

### Why Workflows Over Agent Networks

**Problem with Agent Networks:**

- Nested tool calls: Chat Agent → Research Agent → Multiple tool calls
- Step budget exhaustion: Inner agent uses 3-5 steps, outer agent may not get response
- No streaming visibility: User sees "Using tool" for 30 seconds
- Unpredictable: Each agent makes LLM decisions

**Solution with Workflows:**

- Single tool call: Chat Agent → Workflow tool (1 step)
- Deterministic execution: Workflow steps execute without LLM decisions
- Guaranteed response: Workflow always returns complete synthesized output
- Predictable: Same query always follows same execution path
- Token efficient: Only synthesis step uses LLM

### Workflow Execution Flow

```typescript
// Chat Agent perspective (maxSteps: 5)
Step 1: LLM decides to call advancedSearchWorkflow tool
Step 2: Workflow executes (NOT counted as agent steps):
  - Calls Tavily API directly (no LLM)
  - Calls Tavily Extract directly (no LLM)
  - Calls synthesizerAgent.generate() (1 LLM call, maxSteps: 1)
  - Returns complete answer
Step 3: Chat Agent receives complete answer
Step 4: Chat Agent synthesizes final response
```

**Benefits:**

- ✅ Workflow always returns complete answer
- ✅ Only uses 1 step from Chat Agent's perspective
- ✅ Predictable token usage (4K-8K)
- ✅ Fast execution (5-10 seconds)
- ✅ No nested agent problems

### UI Indicators

The existing chat UI already handles tool invocations. When the workflow tool is called, users will see:

- Tool invocation indicator: "Using tool: advanced-search-workflow"
- Progress updates if workflow streams intermediate results
- Final response with formatted sources
- Document artifacts if created separately

No UI changes required - the existing `messages.tsx` component handles tool calls.

## Migration Path

### Phase 1: Add Workflow Tool (This Spec)

- Create Advanced Search Workflow tool wrapper
- Register with Chat Agent
- Update routing for medium complexity
- Test end-to-end flow

### Phase 2: Monitor and Optimize (Future)

- Track workflow tool usage metrics
- Monitor token usage and latency
- Optimize workflow steps if needed
- Gather user feedback

### Phase 3: Expand to Other Workflows (Future)

- Add Basic Search Workflow tool (for light queries)
- Add Comprehensive Analysis Workflow tool (for deep queries)
- Allow Chat Agent to choose appropriate workflow based on query
- Implement multi-workflow strategies

## Performance Considerations

### Workflow Execution Time

Advanced Search Workflow performs search + extract + synthesize, which takes 5-10 seconds. This is acceptable because:

- Users expect research to take time
- UI shows progress indicator
- Results are comprehensive
- Faster than nested agent approach

### Token Usage

Workflow returns structured data with controlled token usage:

- Search: ~2K-4K tokens
- Extract: ~1K-3K tokens
- Synthesis: ~1K-1.5K tokens
- Total: ~4K-8K tokens (predictable)

Compare to nested agent: Unpredictable, could be 8K-20K tokens.

### Caching Opportunities

Future optimization: Cache workflow results by query hash for 1 hour. If same query asked within cache window, return cached results instantly.

## Security Considerations

### User Context Isolation

Workflow execution doesn't require user context since it doesn't create documents. Documents are created separately by Chat Agent using createDocument tool with proper user association.

### API Key Protection

Tavily API key remains server-side in the workflow. The tool wrapper doesn't expose or handle API keys directly.

### Rate Limiting

Existing usage transaction system applies to workflow tool invocations. Each workflow execution counts as one request against the user's daily limit.

## Monitoring and Observability

### Logging Points

1. **Tool Invocation:** Log when Chat Agent calls workflow tool
2. **Workflow Execution:** Log workflow start/completion
3. **Workflow Steps:** Log each step execution
4. **Errors:** Log all tool and workflow errors with context

### Metrics to Track

- Workflow tool invocation rate
- Average execution time
- Success/failure rate
- Token usage per invocation
- User satisfaction (implicit: continued usage)

### Example Log Output

```
[Chat Agent] Invoking advancedSearchWorkflow for query: "property rights Zimbabwe"
[Workflow Tool] Creating workflow run
[Workflow] Step 1: advanced-search starting
[Workflow] Step 1: advanced-search complete (2.3s, 3.2K tokens)
[Workflow] Step 2: extract-top-sources starting
[Workflow] Step 2: extract-top-sources complete (1.8s, 2.1K tokens)
[Workflow] Step 3: synthesize starting
[Workflow] Step 3: synthesize complete (2.1s, 1.4K tokens)
[Workflow Tool] Workflow complete: 6.2s, 6.7K tokens, 5 sources
[Chat Agent] Streaming workflow results to user
```

## Future Enhancements

### Multi-Workflow Orchestration

Allow Chat Agent to invoke multiple workflows in sequence:

1. Basic Search Workflow for quick overview
2. Advanced Search Workflow for detailed research
3. Synthesize results from both

### Streaming Workflow Results

Instead of waiting for full workflow completion, stream intermediate results:

- "Searching for relevant sources..."
- "Extracting content from top sources..."
- "Synthesizing findings..."

### Workflow Variants

Create specialized workflow variants:

- Case law focused workflow
- Statutory research workflow
- Comparative analysis workflow

### Adaptive Workflow Selection

Chat Agent automatically selects appropriate workflow based on:

- Query complexity
- Required depth
- Time constraints
- User preferences
