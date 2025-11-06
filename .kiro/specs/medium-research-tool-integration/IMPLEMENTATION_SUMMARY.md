# Implementation Summary: Workflow-Based Routing

## What Was Implemented ✅

### 1. New Workflows Created

**Low-Advance Search Workflow** (`mastra/workflows/low-advance-search-workflow.ts`)

- 5 search results
- No raw content
- Token budget: 2K-4K
- Latency: 4-7s
- Use case: Moderate research, balanced speed/quality

**High-Advance Search Workflow** (`mastra/workflows/high-advance-search-workflow.ts`)

- 10 search results
- No raw content
- Token budget: 5K-10K
- Latency: 8-15s
- Use case: Maximum source coverage

### 2. Workflow Tools Created

**Basic Search Workflow Tool** (`mastra/tools/basic-search-workflow-tool.ts`)

- Wraps Basic Search Workflow as a tool
- Can be called by chat agent
- Returns synthesized response with sources

**Low-Advance Search Workflow Tool** (`mastra/tools/low-advance-search-workflow-tool.ts`)

- Wraps Low-Advance Search Workflow as a tool
- Can be called by chat agent

**High-Advance Search Workflow Tool** (`mastra/tools/high-advance-search-workflow-tool.ts`)

- Wraps High-Advance Search Workflow as a tool
- Can be called by chat agent

### 3. Chat Agent Updated

**File:** `mastra/agents/chat-agent.ts`

**Added tools:**

- `basicSearchWorkflow`
- `lowAdvanceSearchWorkflow`
- `advancedSearchWorkflow` (already existed)
- `highAdvanceSearchWorkflow`

**Updated instructions:**

- Clear guidance on when to use each workflow
- Token budgets and latency expectations
- Examples for each workflow type

### 4. UI Component Created

**Comprehensive Workflow Toggle** (`components/comprehensive-workflow-toggle.tsx`)

- Switch component for enabling deep research mode
- Tooltip with workflow details
- Visual indicator when enabled

---

## What Still Needs to Be Done ❌

### 1. Update MultimodalInput Component

**File:** `components/multimodal-input.tsx`

Add props:

```typescript
comprehensiveWorkflowEnabled?: boolean;
onComprehensiveWorkflowChange?: (enabled: boolean) => void;
```

Add the toggle component in the UI (before the textarea):

```typescript
import { ComprehensiveWorkflowToggle } from "./comprehensive-workflow-toggle";

// In the render:
{
  comprehensiveWorkflowEnabled !== undefined &&
    onComprehensiveWorkflowChange && (
      <ComprehensiveWorkflowToggle
        enabled={comprehensiveWorkflowEnabled}
        onChange={onComprehensiveWorkflowChange}
      />
    );
}
```

### 2. Update Chat Component

**File:** `components/chat.tsx`

**Already done:**

- Added state for `comprehensiveWorkflowEnabled`
- Updated `prepareSendMessagesRequest` to include the flag

**Still need to do:**

- Pass props to MultimodalInput (file has unsaved changes, needs manual update):

```typescript
<MultimodalInput
  // ... existing props
  comprehensiveWorkflowEnabled={comprehensiveWorkflowEnabled}
  onComprehensiveWorkflowChange={setComprehensiveWorkflowEnabled}
/>
```

### 3. Update Chat Route Schema

**File:** `app/(chat)/api/chat/schema.ts`

Add to schema:

```typescript
export const postRequestBodySchema = z.object({
  id: z.string(),
  message: z.object({...}),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum([...]),
  // NEW: Add this
  comprehensiveWorkflowEnabled: z.boolean().optional(),
});
```

### 4. Update Chat Route Logic

**File:** `app/(chat)/api/chat/route.ts`

In the POST handler, after parsing request body:

```typescript
const {
  id,
  message,
  selectedChatModel,
  selectedVisibilityType,
  comprehensiveWorkflowEnabled, // NEW
} = requestBody;

// If comprehensive workflow is enabled, use it directly
if (comprehensiveWorkflowEnabled) {
  logger.log(
    "[Routing] 🔬 Using Comprehensive Analysis Workflow (user-enabled)"
  );

  // Execute comprehensive workflow
  const { comprehensiveAnalysisWorkflow } = await import(
    "@/mastra/workflows/comprehensive-analysis-workflow"
  );

  const run = await comprehensiveAnalysisWorkflow.createRunAsync();
  const result = await run.start({
    inputData: {
      query: userMessageText,
      jurisdiction: "Zimbabwe",
    },
  });

  if (result.status !== "success") {
    throw new Error(`Comprehensive workflow failed: ${result.status}`);
  }

  const documentStep = result.steps.document;
  const output = documentStep.output as {
    response: string;
    totalTokens: number;
    path: "enhance" | "deep-dive";
  };

  // Save assistant message
  await saveMessages({
    messages: [
      {
        id: generateUUID(),
        role: "assistant",
        parts: [{ type: "text", text: output.response }],
        createdAt: new Date(),
        attachments: [],
        chatId: id,
      },
    ],
  });

  // Return response
  return Response.json({
    messages: [
      ...uiMessages,
      {
        id: generateUUID(),
        role: "assistant",
        parts: [{ type: "text", text: output.response }],
      },
    ],
  });
}

// Otherwise, continue with normal routing...
```

### 5. Update Mastra SDK Integration (Optional)

**File:** `lib/ai/mastra-sdk-integration.ts`

If you want to use Mastra streaming for comprehensive workflow:

```typescript
export async function streamComprehensiveWorkflow(
  query: string,
  options?: MastraStreamOptions
) {
  logger.log("[Mastra SDK] Executing comprehensive workflow");

  const { comprehensiveAnalysisWorkflow } = await import(
    "@/mastra/workflows/comprehensive-analysis-workflow"
  );

  const run = await comprehensiveAnalysisWorkflow.createRunAsync();
  const result = await run.start({
    inputData: {
      query,
      jurisdiction: "Zimbabwe",
    },
  });

  // Convert to stream format
  // ... implementation depends on your streaming needs
}
```

---

## Workflow Hierarchy

```
Chat Agent (Intelligent Routing)
    ↓
    ├─→ basicSearchWorkflow (1K-2.5K tokens, 3-5s)
    │   └─→ 3 results, quick synthesis
    │
    ├─→ lowAdvanceSearchWorkflow (2K-4K tokens, 4-7s)
    │   └─→ 5 results, moderate depth
    │
    ├─→ advancedSearchWorkflow (4K-8K tokens, 5-10s)
    │   └─→ 7 results + extract top 2
    │
    ├─→ highAdvanceSearchWorkflow (5K-10K tokens, 8-15s)
    │   └─→ 10 results, maximum coverage
    │
    └─→ [User Toggle] Comprehensive Analysis Workflow (18K-20K tokens, 25-47s)
        └─→ Context search + gap analysis + conditional branching
```

---

## Testing Checklist

- [ ] Test basic search workflow tool in chat
- [ ] Test low-advance search workflow tool in chat
- [ ] Test advanced search workflow tool in chat
- [ ] Test high-advance search workflow tool in chat
- [ ] Test comprehensive workflow toggle in UI
- [ ] Verify comprehensive workflow executes when toggle is on
- [ ] Verify normal routing when toggle is off
- [ ] Test token usage tracking for all workflows
- [ ] Test error handling for each workflow
- [ ] Verify sources are returned correctly
- [ ] Test with various query complexities

---

## Next Steps

1. **Save all files** in your editor (especially `components/chat.tsx`)
2. **Update MultimodalInput** to add the toggle component
3. **Update chat route schema** to accept `comprehensiveWorkflowEnabled`
4. **Update chat route logic** to handle comprehensive workflow
5. **Test the implementation** with various queries
6. **Monitor token usage** and latency
7. **Adjust routing logic** based on real-world usage

---

## Architecture Benefits

✅ **Intelligent routing** - Chat agent selects appropriate workflow
✅ **User control** - Toggle for heavy comprehensive workflow
✅ **Scalable** - Easy to add more workflows as tools
✅ **Token efficient** - Workflows optimized for different budgets
✅ **Fast** - Most queries use lighter workflows
✅ **Quality** - Comprehensive workflow available when needed

The implementation provides a complete spectrum from fast answers (basic) to publication-quality research (comprehensive), with the chat agent intelligently routing to the appropriate workflow based on query complexity.
