# Simplified Workflow Implementation

## Problem Identified

Your workflows have TWO major issues:

### Issue 1: Conversation History Not Reaching Tools ❌

```
User: "what is the zuva case?" (follow-up question)
    ↓
Chat Agent (HAS conversation history) ✅
    ↓
Agent calls: quickFactSearch tool
    ↓
Tool input: { query: "what is the zuva case?" } ❌ NO conversationHistory!
    ↓
Workflow gets: { query, jurisdiction } ❌ NO conversationHistory!
    ↓
Query enhancer gets: query + [] (empty history) ❌
    ↓
Enhancement: "zuva case Zimbabwe Supreme Court judgment" ❌ Missing Labour Act context!
```

### Issue 2: Complex Validation Pipeline Blocks Results ❌

```
Current Flow (5 steps after search):
1. Search (Tavily) ✅ Finds Zuva case
2. Extract Entities ❌ May fail to extract
3. Validate Entities ❌ May filter out good results
4. Extract Claims ❌ May fail
5. Compose Document ❌ May fail

Result: Zuva case found by Tavily but filtered out by validation!
```

## Solution: Two-Part Fix

### Part 1: Simplified Workflow (DONE ✅)

Created:

- `mastra/agents/search-coordinator-agent.ts` - Single intelligent agent
- `mastra/workflows/simple-search-workflow.ts` - One-step workflow
- Updated `mastra/tools/quick-fact-search-tool.ts` - Uses new workflow

Benefits:

- 1 step instead of 5
- No validation layers to block results
- Faster (fewer LLM calls)
- More reliable (always returns something)

### Part 2: Pass Conversation History to Tools

**Option A: Modify Agent Instructions (Recommended)**

Update the chat agent to include context in queries when calling tools:

```typescript
// In mastra/agents/chat-agent.ts or lib/ai/mastra-sdk-integration.ts

instructions: `...

When calling research tools (quickFactSearch, standardResearch, etc.):
- If the user's question is a follow-up (e.g., "what is the zuva case?" after discussing Labour Act)
- Include the relevant context in the query parameter
- Example: Instead of query="what is the zuva case?", use query="what is the zuva case in zimbabwean labour law?"

...`;
```

**Option B: Modify Tool Wrappers to Extract Context (More Complex)**

Update all 8 tool wrappers to extract conversation history from the agent's context:

```typescript
// This requires Mastra framework support for passing agent context to tools
// May not be possible with current Mastra version
```

**Option C: Use Search Coordinator Agent Directly (Simplest)**

Instead of having the chat agent call tool wrappers that call workflows,
have the chat agent call the Search Coordinator Agent directly as a tool:

```typescript
// In chat agent tools
tools: {
  searchCoordinator: createTool({
    id: "search-coordinator",
    execute: async ({ context, agentContext }) => {
      // agentContext would have conversation history
      return await coordinateSearch(
        context.query,
        agentContext.conversationHistory, // ← This is the key!
        context.jurisdiction
      );
    },
  }),
}
```

## Recommended Implementation Path

### Step 1: Test Simplified Workflow ✅

- Already created
- Test with: "what is the zuva case in zimbabwean labour law?"
- Should work because query contains full context

### Step 2: Fix Conversation History (Choose One)

**Easiest:** Option A - Update agent instructions

- Modify chat agent to include context in queries
- No code changes to tools/workflows
- Agent intelligence handles context inclusion

**Best:** Option C - Direct agent-to-agent communication

- Search Coordinator Agent becomes a tool for Chat Agent
- Chat Agent passes conversation history directly
- Most architecturally clean

### Step 3: Migrate Other Tools

Once working, update:

- `standard-research-tool.ts`
- `deep-research-tool.ts`
- `comprehensive-research-tool.ts`
- All workflow tools

## Testing Plan

### Test 1: Explicit Context (Should Work Now)

```
User: "what is the zuva case in zimbabwean labour law?"
Expected: Finds case because query contains full context
```

### Test 2: Follow-up Question (Needs Fix)

```
User 1: "tell me about zimbabwean labour law"
User 2: "what is the zuva case?"
Expected: Should understand "zuva case" is in Labour Act context
Current: Fails because conversation history not passed
```

### Test 3: Simplified vs Old Workflow

```
Compare results:
- Old: basicSearchWorkflow (5 steps, validation)
- New: simpleSearchWorkflow (1 step, no validation)
Expected: New workflow finds more results, less filtering
```

## Next Steps

1. **Test the simplified workflow** with explicit context
2. **Choose a fix** for conversation history (I recommend Option A)
3. **Implement the fix**
4. **Test with follow-up questions**
5. **Migrate other tools** to use simplified workflow

## Files Created

- ✅ `mastra/agents/search-coordinator-agent.ts`
- ✅ `mastra/workflows/simple-search-workflow.ts`
- ✅ Updated `mastra/tools/quick-fact-search-tool.ts`
- ✅ `SIMPLIFIED_WORKFLOW_PROPOSAL.md`
- ✅ `SIMPLIFIED_WORKFLOW_IMPLEMENTATION.md` (this file)

## What to Do Next?

Which approach do you want to take for passing conversation history?

**A)** Update agent instructions (easiest, quick fix)
**B)** Direct agent-to-agent communication (best architecture)
**C)** Test current implementation first with explicit queries

Let me know and I'll implement it!
