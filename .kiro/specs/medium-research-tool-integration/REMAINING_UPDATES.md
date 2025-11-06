# Remaining Manual Updates

## 1. Update components/multimodal-input.tsx

### Step 1: Add type definition (already done, needs save)

After line 89, the type definition should include:

```typescript
  usage?: AppUsage;
  comprehensiveWorkflowEnabled?: boolean;
  onComprehensiveWorkflowChange?: (enabled: boolean) => void;
}) {
```

### Step 2: Add the toggle in the render (around line 253)

Find the return statement that starts with:

```typescript
return (
  <div className={cn("relative flex w-full flex-col gap-4", className)}>
```

Add the toggle BEFORE the `<PromptInput>` component:

```typescript
return (
  <div className={cn("relative flex w-full flex-col gap-4", className)}>
    <UpgradeDialog
    // ... existing props
    />

    {/* ADD THIS: Comprehensive Workflow Toggle */}
    {comprehensiveWorkflowEnabled !== undefined &&
      onComprehensiveWorkflowChange && (
        <ComprehensiveWorkflowToggle
          enabled={comprehensiveWorkflowEnabled}
          onChange={onComprehensiveWorkflowChange}
        />
      )}

    <PromptInput
    // ... existing props
    />
  </div>
);
```

---

## 2. Update app/(chat)/api/chat/schema.ts

Add the new field to the schema:

```typescript
export const postRequestBodySchema = z.object({
  id: z.string(),
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(
      z.union([
        z.string(),
        z.object({
          type: z.literal("text"),
          text: z.string(),
        }),
        z.object({
          type: z.literal("image"),
          image: z.string(),
        }),
      ])
    ),
  }),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
  // ADD THIS LINE:
  comprehensiveWorkflowEnabled: z.boolean().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
```

---

## 3. Update app/(chat)/api/chat/route.ts

### Step 1: Extract the flag from request body

Around line 115, after parsing the request body:

```typescript
const {
  id,
  message,
  selectedChatModel,
  selectedVisibilityType,
  comprehensiveWorkflowEnabled, // ADD THIS
}: {
  id: string;
  message: ChatMessage;
  selectedChatModel: ChatModel["id"];
  selectedVisibilityType: VisibilityType;
  comprehensiveWorkflowEnabled?: boolean; // ADD THIS
} = requestBody;
```

### Step 2: Add comprehensive workflow handling

After the complexity detection (around line 160), add this BEFORE the Mastra routing:

```typescript
// Check if comprehensive workflow is explicitly enabled
if (comprehensiveWorkflowEnabled) {
  logger.log(
    "[Routing] 🔬 Using Comprehensive Analysis Workflow (user-enabled)"
  );
  logger.log("[Routing] ⚠️  High token usage: 18K-20K tokens");
  logger.log("[Routing] ⏱️  High latency: 25-47 seconds");

  // Begin usage transaction for comprehensive workflow
  const { beginTransaction } = await import("@/lib/db/usage-transaction");
  const txResult = await beginTransaction(dbUser.id);

  if (!txResult.allowed) {
    logger.log(
      `[Usage] User ${dbUser.id} exceeded daily limit: ${txResult.currentUsage.requestsToday}/${txResult.currentUsage.dailyLimit}`
    );
    return Response.json(
      {
        code: "rate_limit:chat",
        message: `You've reached your daily limit of ${txResult.currentUsage.dailyLimit} requests. Upgrade to continue.`,
        cause: "daily_limit_reached",
        requestsToday: txResult.currentUsage.requestsToday,
        dailyLimit: txResult.currentUsage.dailyLimit,
        plan: txResult.currentUsage.plan,
      },
      { status: 429 }
    );
  }

  const txId = txResult.transaction?.transactionId;
  if (!txId) {
    throw new Error("Transaction ID not found");
  }

  try {
    // Import and execute comprehensive workflow
    const { comprehensiveAnalysisWorkflow } = await import(
      "@/mastra/workflows/comprehensive-analysis-workflow"
    );

    logger.log("[Routing] 🚀 Starting comprehensive analysis workflow");

    const run = await comprehensiveAnalysisWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        query: userMessageText,
        jurisdiction: "Zimbabwe",
      },
    });

    logger.log(`[Routing] Workflow completed with status: ${result.status}`);

    if (result.status !== "success") {
      throw new Error(
        `Comprehensive workflow failed with status: ${result.status}`
      );
    }

    // Extract output from document step
    const documentStep = result.steps.document;

    if (!documentStep || documentStep.status !== "success") {
      throw new Error("Document step failed or not found");
    }

    const output = documentStep.output as {
      response: string;
      totalTokens: number;
      path: "enhance" | "deep-dive";
    };

    logger.log(
      `[Routing] ✅ Comprehensive workflow completed. Path: ${output.path}, Tokens: ${output.totalTokens}`
    );

    // Save assistant message
    const assistantMessageId = generateUUID();
    await saveMessages({
      messages: [
        {
          id: assistantMessageId,
          role: "assistant",
          parts: [{ type: "text", text: output.response }],
          createdAt: new Date(),
          attachments: [],
          chatId: id,
        },
      ],
    });

    // Commit transaction
    await commitTransaction(txId);
    logger.log(`[Usage] Committed transaction ${txId}`);

    // Return simple response (not streaming for comprehensive workflow)
    return Response.json({
      id: assistantMessageId,
      role: "assistant",
      content: output.response,
      totalTokens: output.totalTokens,
      path: output.path,
    });
  } catch (error) {
    logger.error("[Routing] ❌ Comprehensive workflow error:", error);

    // Rollback transaction
    await rollbackTransaction(txId);
    logger.log(`[Usage] Rolled back transaction ${txId}`);

    throw error;
  }
}

// Continue with normal routing if comprehensive workflow not enabled...
```

---

## 4. Update components/chat.tsx (already done)

The chat component already has:

- State for `comprehensiveWorkflowEnabled`
- Updated `prepareSendMessagesRequest` to include the flag
- Props passed to MultimodalInput (needs manual verification after save)

---

## Testing Steps

1. **Start the dev server:**

   ```bash
   pnpm dev
   ```

2. **Test basic workflow tool:**

   - Ask: "What is the VAT rate in Zimbabwe?"
   - Should use `basicSearchWorkflow` (3 sources, fast)

3. **Test low-advance workflow tool:**

   - Ask: "Explain employment contracts in Zimbabwe"
   - Should use `lowAdvanceSearchWorkflow` (5 sources)

4. **Test advanced workflow tool:**

   - Ask: "Compare contract law principles in Zimbabwe"
   - Should use `advancedSearchWorkflow` (7 sources + extraction)

5. **Test high-advance workflow tool:**

   - Ask: "Comprehensive analysis of labor law reforms in Zimbabwe"
   - Should use `highAdvanceSearchWorkflow` (10 sources)

6. **Test comprehensive workflow toggle:**

   - Enable the "Deep Research Mode" toggle
   - Ask any question
   - Should execute comprehensive analysis workflow (18K-20K tokens, 25-47s)
   - Check for gap analysis and conditional branching in logs

7. **Verify token tracking:**

   - Check usage counter updates correctly
   - Verify transaction commits/rollbacks

8. **Test error handling:**
   - Try with invalid queries
   - Verify graceful degradation

---

## Expected Behavior

### Normal Mode (Toggle OFF)

- Chat agent intelligently selects workflow based on query
- Fast responses (3-15s)
- Moderate token usage (1K-10K)
- 4 workflow tools available to agent

### Deep Research Mode (Toggle ON)

- Always uses comprehensive analysis workflow
- Slow responses (25-47s)
- High token usage (18K-20K)
- Gap analysis + conditional branching
- Publication-quality output

---

## File Summary

### Created Files ✅

- `mastra/workflows/low-advance-search-workflow.ts`
- `mastra/workflows/high-advance-search-workflow.ts`
- `mastra/tools/basic-search-workflow-tool.ts`
- `mastra/tools/low-advance-search-workflow-tool.ts`
- `mastra/tools/high-advance-search-workflow-tool.ts`
- `components/comprehensive-workflow-toggle.tsx`

### Modified Files ✅

- `mastra/agents/chat-agent.ts` (added 4 workflow tools)
- `components/chat.tsx` (added state and request preparation)

### Need Manual Updates ⚠️

- `components/multimodal-input.tsx` (add toggle in render)
- `app/(chat)/api/chat/schema.ts` (add field to schema)
- `app/(chat)/api/chat/route.ts` (add comprehensive workflow handling)

---

## Architecture Diagram

```
User Query
    ↓
[Toggle OFF] → Chat Agent → Intelligent Routing
                    ↓
                    ├─→ basicSearchWorkflow (simple)
                    ├─→ lowAdvanceSearchWorkflow (moderate)
                    ├─→ advancedSearchWorkflow (complex)
                    └─→ highAdvanceSearchWorkflow (comprehensive)

[Toggle ON] → Comprehensive Analysis Workflow
                    ↓
              Context Search → Gap Analysis → Conditional Branch
                                                    ↓
                                            ├─→ Enhance (≤2 gaps)
                                            └─→ Deep-Dive (>2 gaps)
```

This gives you the best of both worlds: intelligent routing for everyday use, and a powerful deep research mode when needed!
