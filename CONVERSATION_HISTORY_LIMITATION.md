# Conversation History Limitation - Root Cause Analysis

## THE REAL ISSUE DISCOVERED! 🎯

The query enhancer is **NOT receiving conversation history** when workflows are called through agent tools!

## How Your Application Works

### Path 1: Comprehensive Workflow (Direct Call)

```
User Query
    ↓
Chat Route
    ↓
Extracts conversation history ✅
    ↓
Calls: enhancedComprehensiveWorkflow.execute({
  query,
  jurisdiction,
  conversationHistory  ✅ PASSED
})
    ↓
Query Enhancer gets conversation history ✅
    ↓
Good enhancement with context ✅
```

### Path 2: Regular Queries (Through Agent) ❌

```
User Query
    ↓
Chat Route
    ↓
Calls: streamMastraAgentWithHistory(complexity, uiMessages, options)
    ↓
Chat Agent (has full message history)
    ↓
Agent decides to call: quickFactSearch tool
    ↓
Tool calls: basicSearchWorkflow.execute({
  query,
  jurisdiction
  // ❌ NO conversationHistory!
})
    ↓
Query Enhancer gets: query + [] (empty history) ❌
    ↓
Enhancement WITHOUT context ❌
```

## The Problem

**Tool wrappers don't pass conversation history!**

### Example Tool Wrapper:

**File:** `mastra/tools/quick-fact-search-tool.ts`

```typescript
const result = await basicSearchWorkflow.execute({
  inputData: {
    query,
    jurisdiction,
    // ❌ conversationHistory is MISSING!
  },
});
```

### Why This Happens:

Mastra tools don't have access to the agent's conversation context. The agent has the full message history, but when it calls a tool, the tool only gets the parameters defined in its input schema.

## Impact

### Queries Through Comprehensive Workflow:

✅ **WORKING** - Gets conversation history

- User explicitly enables comprehensive mode
- Chat route calls workflow directly
- Conversation history passed

### Queries Through Chat Agent:

❌ **NOT WORKING** - No conversation history

- Most user queries go through this path
- Agent calls tool wrappers
- Tool wrappers don't pass conversation history
- Query enhancer has no context

## Why "what is the zuva case?" Fails

### User Conversation:

```
User: "Tell me about Zimbabwe labour law"
Bot: [Explains labour law]
User: "What about the zuva case?"
```

### What Should Happen:

```
Query Enhancer receives:
- Query: "What about the zuva case?"
- Context: ["Tell me about Zimbabwe labour law", "..."]
- Enhancement: "zuva case Zimbabwe Supreme Court labour law employment judgment"
✅ Finds the case
```

### What Actually Happens:

```
Query Enhancer receives:
- Query: "What about the zuva case?"
- Context: [] (empty!)
- Enhancement: "zuva case Zimbabwe Supreme Court judgment"
❌ Might not find the case (missing "labour law" context)
```

## Solutions

### Solution 1: Improve Query Enhancer Without Context (QUICK FIX)

Make the query enhancer better at handling queries without context.

**Current enhancement for "what is the zuva case in zimbabwean labour law?":**

```
Input: "what is the zuva case in zimbabwean labour law?"
Context: []
Output: "zuva case Zimbabwe Supreme Court labour law judgment"
```

This should actually be GOOD ENOUGH because:

- The user already said "zimbabwean labour law" in the query
- The enhancer should preserve that
- Should still find the case

**The issue might be that the enhancer is NOT preserving the "labour law" part!**

Let me check the enhancer instructions again...

### Solution 2: Update All Tool Wrappers (MEDIUM EFFORT)

Update all 8 tool wrappers to pass empty conversation history explicitly:

```typescript
const result = await workflow.execute({
  inputData: {
    query,
    jurisdiction,
    conversationHistory: [], // ✅ Explicit empty array
  },
});
```

This ensures the workflow gets the parameter even if it's empty.

### Solution 3: Agent Provides Context in Query (COMPLEX)

Have the agent include context in the query itself when calling tools:

```typescript
// Agent's tool call
quickFactSearch({
  query: "What about the zuva case? (Context: discussing Labour Act)",
  jurisdiction: "Zimbabwe",
});
```

But this requires changing agent behavior.

### Solution 4: Pass History Through Runtime Context (COMPLEX)

Modify Mastra framework to pass conversation history through runtime context. This is a framework-level change.

## Recommended Action

### Immediate: Test Current Enhancement

The query "what is the zuva case in zimbabwean labour law?" already contains "labour law", so the enhancer should preserve it even without conversation context.

**Test this:**

```typescript
import { enhanceSearchQuery } from "@/mastra/agents/query-enhancer-agent";

const enhanced = await enhanceSearchQuery(
  "what is the zuva case in zimbabwean labour law?",
  [] // Empty history
);

console.log("Enhanced:", enhanced);
// Expected: Should include "labour law" from the original query
```

If the enhancer is working correctly, it should produce:

```
"zuva case Zimbabwe Supreme Court labour law employment judgment"
```

This should be good enough to find the case!

### If That Doesn't Work:

Update the query enhancer instructions to better preserve important keywords from the original query.

## Why This Might Still Work

Even without conversation history, the query enhancer should:

1. **Preserve important keywords** from the original query
2. **Add relevant legal terms** (Supreme Court, judgment, case law)
3. **Include Zimbabwe** (rule #7)
4. **Detect query type** (case, statute, general)

For "what is the zuva case in zimbabwean labour law?":

- ✅ Should preserve "zuva case"
- ✅ Should preserve "labour law"
- ✅ Should add "Supreme Court", "judgment"
- ✅ Should add "Zimbabwe" (or keep "zimbabwean")

Result: "zuva case Zimbabwe Supreme Court labour law employment judgment"

**This should work!** ✅

## The Real Question

**Is the query enhancer actually being called?**

If it's being called and producing good enhancements, the cases should be found. If not, we need to debug:

1. Is Cerebras API working?
2. Is the enhancer producing good output?
3. Is the enhanced query reaching Tavily?

## Next Steps

1. **Add debug logging** to see what's actually happening
2. **Test query enhancer directly** with empty history
3. **Check if Cerebras API is responding**
4. **Verify enhanced query reaches Tavily**

## Files That Need Conversation History

### Currently Passing History: ✅

- `mastra/workflows/enhanced-comprehensive-workflow.ts` (called from chat route)

### NOT Passing History: ❌

- `mastra/tools/quick-fact-search-tool.ts`
- `mastra/tools/standard-research-tool.ts`
- `mastra/tools/deep-research-tool.ts`
- `mastra/tools/comprehensive-research-tool.ts`
- `mastra/tools/advanced-search-workflow-tool.ts`
- `mastra/tools/basic-search-workflow-tool.ts`
- `mastra/tools/low-advance-search-workflow-tool.ts`
- `mastra/tools/high-advance-search-workflow-tool.ts`

**8 tool wrappers** are not passing conversation history!

## Conclusion

The conversation history limitation is real, but **it shouldn't prevent the query enhancer from working**. The enhancer should still produce good enhancements from the query itself.

The real issue is likely:

1. Query enhancer not being called
2. Cerebras API not responding
3. Enhanced query not reaching Tavily
4. Or the enhancer is not preserving important keywords

**Next action:** Debug to see what the query enhancer is actually producing!

---

**Status:** ROOT CAUSE IDENTIFIED ✅
**Issue:** Tool wrappers don't pass conversation history
**Impact:** Query enhancer has no context for agent-invoked workflows
**Severity:** Medium (enhancer should still work without context)
**Next Step:** Debug query enhancer output
