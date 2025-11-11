# Chat Agent Tool Mismatch - Critical Fix Required 🚨

**Date:** November 11, 2025  
**Severity:** CRITICAL  
**Status:** IDENTIFIED - FIX REQUIRED

---

## The Problem

The chat agent is **defaulting to advancedSearchWorkflow** because there's a **MAJOR DISCREPANCY** between the agent definition and what's actually being used at runtime.

### What Should Happen

**File:** `mastra/agents/chat-agent.ts`

The chat agent is defined with **6 tools**:

```typescript
tools: {
  quickFactSearch: quickFactSearchTool,      // ✅ Simple queries
  standardResearch: standardResearchTool,    // ✅ Explanations
  multiSearch: multiSearchTool,              // ✅ Broad queries
  deepResearch: deepResearchTool,            // ✅ Deep analysis
  createDocument: createDocumentTool,        // ✅ Document creation
  updateDocument: updateDocumentTool,        // ✅ Document updates
}
```

### What Actually Happens

**File:** `lib/ai/mastra-sdk-integration.ts`

When the chat agent is created at runtime (which happens for every request because `userId` is always provided), it's created with only **3 tools**:

```typescript
tools: {
  advancedSearchWorkflow: advancedSearchWorkflowTool,  // ❌ WRONG!
  createDocument: contextTools.createDocument,
  updateDocument: contextTools.updateDocument,
}
```

**Result:** The agent has **NO CHOICE** but to use `advancedSearchWorkflow` for all research queries because it's the only research tool available!

---

## Why This Happens

### The Code Flow

1. User sends a message
2. Chat route calls `streamMastraAgentWithHistory()`
3. SDK integration checks if `userId` is provided (it always is)
4. Since `userId` exists, it creates a **NEW agent dynamically** instead of using the one from `chat-agent.ts`
5. This new agent only has `advancedSearchWorkflow` tool
6. Agent has no other research tools to choose from

### The Problematic Code

**Location:** `lib/ai/mastra-sdk-integration.ts` (lines 60-125 and 295-360)

```typescript
if (options?.userId) {
  // Creates a NEW agent instead of using the defined one
  switch (agentName) {
    case "chatAgent": {
      // ... imports ...

      agent = new Agent({
        name: "chat-agent",
        instructions: `...simplified instructions...`,
        model: () => cerebrasProvider("gpt-oss-120b"),
        tools: {
          advancedSearchWorkflow: advancedSearchWorkflowTool, // ❌ Only 1 research tool!
          createDocument: contextTools.createDocument,
          updateDocument: contextTools.updateDocument,
        },
      });
    }
  }
} else {
  // This branch is NEVER executed because userId is always provided
  agent = mastra.getAgent(agentName as any);
}
```

---

## The Fix

### Option 1: Use All Research Tools (RECOMMENDED)

Update `lib/ai/mastra-sdk-integration.ts` to include all 4 research tools:

```typescript
case "chatAgent": {
  const { createToolsWithContext } = await import(
    "@/lib/services/tool-context-factory"
  );
  const { Agent } = await import("@mastra/core/agent");
  const { getBalancedCerebrasProvider } = await import(
    "@/lib/ai/cerebras-key-balancer"
  );

  // Import ALL research tools
  const { quickFactSearchTool } = await import(
    "@/mastra/tools/quick-fact-search-tool"
  );
  const { standardResearchTool } = await import(
    "@/mastra/tools/standard-research-tool"
  );
  const { multiSearchTool } = await import(
    "@/mastra/tools/multi-search-tool"
  );
  const { deepResearchTool } = await import(
    "@/mastra/tools/deep-research-tool"
  );

  const cerebrasProvider = getBalancedCerebrasProvider();
  const contextTools = createToolsWithContext(options.userId);

  // Import the main chat agent to get its instructions
  const { chatAgent: mainChatAgent } = await import(
    "@/mastra/agents/chat-agent"
  );

  agent = new Agent({
    name: "chat-agent",
    instructions: mainChatAgent.instructions,  // ✅ Use same instructions
    model: () => cerebrasProvider("gpt-oss-120b"),
    tools: {
      // ✅ All 4 research tools (matching main chat agent)
      quickFactSearch: quickFactSearchTool,
      standardResearch: standardResearchTool,
      multiSearch: multiSearchTool,
      deepResearch: deepResearchTool,
      // Document tools with user context
      createDocument: contextTools.createDocument,
      updateDocument: contextTools.updateDocument,
    },
  });
  break;
}
```

**This fix needs to be applied in TWO places:**

1. `streamMastraAgent()` function (lines 60-125)
2. `streamMastraAgentWithHistory()` function (lines 295-360)

---

### Option 2: Use the Defined Agent (ALTERNATIVE)

Instead of creating a new agent, modify the existing one:

```typescript
if (options?.userId) {
  // Get the base agent
  const baseAgent = mastra.getAgent(agentName as any);

  if (agentName === "chatAgent") {
    // Create context-aware document tools
    const { createToolsWithContext } = await import(
      "@/lib/services/tool-context-factory"
    );
    const contextTools = createToolsWithContext(options.userId);

    // Clone the agent with updated document tools
    const { Agent } = await import("@mastra/core/agent");
    agent = new Agent({
      name: baseAgent.name,
      instructions: baseAgent.instructions,
      model: baseAgent.model,
      tools: {
        ...baseAgent.tools, // ✅ Keep all existing tools
        // Override document tools with context-aware versions
        createDocument: contextTools.createDocument,
        updateDocument: contextTools.updateDocument,
      },
    });
  } else {
    agent = baseAgent;
  }
} else {
  agent = mastra.getAgent(agentName as any);
}
```

---

## Impact Analysis

### Current Behavior (Broken)

**User asks:** "What is the Consumer Protection Act?"

**Agent thinks:**

- "I have only one research tool: advancedSearchWorkflow"
- "I'll use it for this simple question"

**Result:**

- ❌ Uses heavy workflow for simple query
- ❌ Wastes tokens (4K-8K instead of 1K-2.5K)
- ❌ Slower response (5-10s instead of 3-5s)
- ❌ Higher cost

---

### After Fix (Correct)

**User asks:** "What is the Consumer Protection Act?"

**Agent thinks:**

- "I have 4 research tools: quickFactSearch, standardResearch, multiSearch, deepResearch"
- "This is a simple 'What is...' question"
- "I'll use quickFactSearch"

**Result:**

- ✅ Uses appropriate tool for query
- ✅ Efficient token usage (1K-2.5K)
- ✅ Faster response (3-5s)
- ✅ Lower cost

---

## Why This Wasn't Caught Earlier

1. **The agent still works** - It just uses the wrong tool
2. **advancedSearchWorkflow is capable** - It can handle all queries, just inefficiently
3. **No error messages** - Everything appears to work
4. **Subtle performance issue** - Only noticeable when comparing costs/latency

---

## Testing After Fix

### Test Case 1: Simple Query

**Query:** "What is the Labour Act?"

**Expected:**

- ✅ Agent calls `quickFactSearch`
- ✅ NOT `advancedSearchWorkflow`
- ✅ Fast response (3-5s)
- ✅ Low tokens (1K-2.5K)

**Check logs:**

```
[Mastra] 🔨 Tools invoked: quickFactSearch
```

---

### Test Case 2: Explanation Query

**Query:** "Explain employment termination procedures"

**Expected:**

- ✅ Agent calls `standardResearch`
- ✅ NOT `advancedSearchWorkflow`
- ✅ Moderate response time (4-7s)
- ✅ Moderate tokens (2K-4K)

**Check logs:**

```
[Mastra] 🔨 Tools invoked: standardResearch
```

---

### Test Case 3: Broad Query

**Query:** "What case law supports Labour Act protections?"

**Expected:**

- ✅ Agent calls `multiSearch`
- ✅ NOT `advancedSearchWorkflow`
- ✅ Breaks into focused sub-queries
- ✅ Moderate tokens (4K-8K)

**Check logs:**

```
[Mastra] 🔨 Tools invoked: multiSearch
```

---

### Test Case 4: Deep Analysis

**Query:** "Analyze Section 12B of the Labour Act in detail"

**Expected:**

- ✅ Agent calls `deepResearch`
- ✅ NOT `advancedSearchWorkflow`
- ✅ Deep analysis (5-10s)
- ✅ Higher tokens (4K-8K)

**Check logs:**

```
[Mastra] 🔨 Tools invoked: deepResearch
```

---

## Implementation Steps

### Step 1: Update streamMastraAgent() Function

**File:** `lib/ai/mastra-sdk-integration.ts` (lines 60-125)

Replace the `case "chatAgent"` block with the fix from Option 1.

---

### Step 2: Update streamMastraAgentWithHistory() Function

**File:** `lib/ai/mastra-sdk-integration.ts` (lines 295-360)

Replace the `case "chatAgent"` block with the fix from Option 1.

---

### Step 3: Test All Query Types

Run tests for:

- Simple queries (should use quickFactSearch)
- Explanations (should use standardResearch)
- Broad queries (should use multiSearch)
- Deep analysis (should use deepResearch)

---

### Step 4: Monitor Logs

Check that the correct tools are being invoked:

```bash
# Should see variety of tools, not just advancedSearchWorkflow
grep "Tools invoked:" logs.txt
```

**Expected output:**

```
[Mastra] 🔨 Tools invoked: quickFactSearch
[Mastra] 🔨 Tools invoked: standardResearch
[Mastra] 🔨 Tools invoked: multiSearch
[Mastra] 🔨 Tools invoked: deepResearch
```

**NOT just:**

```
[Mastra] 🔨 Tools invoked: advancedSearchWorkflow
[Mastra] 🔨 Tools invoked: advancedSearchWorkflow
[Mastra] 🔨 Tools invoked: advancedSearchWorkflow
```

---

## Related Issues

This tool mismatch contributes to:

1. **Query enhancement failures** - Heavy workflow used for simple queries
2. **Keyword soup queries** - Broad queries not handled by multiSearch
3. **Inefficient token usage** - Using 4K-8K tokens for 1K queries
4. **Slower responses** - Using 5-10s workflows for 3-5s queries
5. **Higher costs** - Unnecessary API calls and token usage

---

## Conclusion

**Root Cause:** SDK integration creates a new agent with only `advancedSearchWorkflow` instead of using the defined agent with all 4 research tools.

**Fix:** Update SDK integration to include all 4 research tools when creating the dynamic agent.

**Impact:**

- ✅ Proper tool selection
- ✅ Efficient token usage
- ✅ Faster responses
- ✅ Lower costs
- ✅ Better query handling

**Status:** 🚨 **CRITICAL FIX REQUIRED**  
**Priority:** HIGH  
**Effort:** LOW (simple code change)  
**Risk:** LOW (just adding missing tools)

---

**Next Action:** Apply the fix to both functions in `lib/ai/mastra-sdk-integration.ts` and test with various query types.
