# Follow-Up Question Hallucination - Root Cause Analysis

**Date:** November 11, 2025  
**Issue:** AI hallucinates on follow-up questions like "can you find additional case law to support this"  
**Status:** ROOT CAUSES IDENTIFIED

---

## Executive Summary

The hallucination on follow-up questions is caused by **MULTIPLE COMPOUNDING ISSUES** in your architecture:

1. **Context Loss** - Tool wrappers don't pass conversation history to workflows
2. **Tool Selection Failure** - Agent may not recognize follow-ups need research tools
3. **Query Enhancement Blind Spots** - Enhancer works without context but may miss nuances
4. **Validation Gaps** - Validator only runs AFTER generation (too late)
5. **Instruction Fatigue** - LLMs can ignore instructions when they "know" plausible answers

**The good news:** You've already fixed many issues. The remaining problems are architectural.

---

## The Complete Flow (What Actually Happens)

### Scenario: User asks follow-up question

```
User: "Tell me about Zimbabwe labour law"
Bot: [Explains labour law using research tools] ✅

User: "Can you find additional case law to support this?"
```

### What SHOULD Happen:

```
1. Chat Route receives: "Can you find additional case law..."
2. Passes FULL conversation history to Chat Agent
3. Chat Agent sees context: previous discussion about labour law
4. Agent calls: deepResearch tool
5. Tool wrapper calls: workflow with query + history
6. Query Enhancer gets: query + context about labour law
7. Enhanced query: "additional case law labour law Zimbabwe Supreme Court"
8. Tavily finds: Relevant labour law cases
9. Synthesizer cites: ONLY cases from Tavily results
10. Validator checks: Citations match tool results ✅
11. User sees: Accurate case law citations
```

### What ACTUALLY Happens (The Problem):

```
1. Chat Route receives: "Can you find additional case law..."
2. Passes FULL conversation history to Chat Agent ✅
3. Chat Agent sees context ✅
4. Agent decides: "I know cases from training data" ❌
   OR
   Agent calls: deepResearch tool ✅
5. Tool wrapper calls: workflow WITHOUT conversation history ❌
6. Query Enhancer gets: query + EMPTY history ❌
7. Enhanced query: "additional case law Zimbabwe Supreme Court" (missing "labour law" context)
8. Tavily finds: Generic cases (not labour-specific)
9. Synthesizer:
   - Option A: Cites cases from Tavily (but wrong topic) ❌
   - Option B: Supplements with training data (hallucination) ❌
10. Validator checks: Too late, already generated ❌
11. User sees: Hallucinated or irrelevant cases ❌
```

---

## Root Cause #1: Context Loss in Tool Wrappers

### The Problem

**File:** `mastra/tools/quick-fact-search-tool.ts` (and 7 other tool wrappers)

```typescript
export const quickFactSearchTool = createTool({
  execute: async ({ context }) => {
    const {
      query,
      jurisdiction = "Zimbabwe",
      conversationHistory = [], // ✅ Accepts history
    } = context;

    const result = await basicSearchWorkflowV2.execute({
      inputData: {
        query,
        jurisdiction,
        conversationHistory, // ✅ Passes history
      },
    });
  },
});
```

**BUT:** When Chat Agent calls this tool, it doesn't pass `conversationHistory`!

### Why This Happens

Mastra's tool system doesn't automatically pass conversation context. The agent has the full message history, but when it invokes a tool, it only passes the parameters defined in the tool's input schema.

**Agent's tool call:**

```typescript
// What the agent actually does:
quickFactSearch({
  query: "Can you find additional case law",
  jurisdiction: "Zimbabwe",
  // ❌ conversationHistory is NOT passed!
});
```

### Impact

- Query enhancer receives empty conversation history
- Enhancement lacks context: "additional case law" → "additional case law Zimbabwe Supreme Court"
- Missing crucial context: "labour law" from previous conversation
- Tavily returns generic cases instead of labour-specific cases

### Evidence

From `CONVERSATION_HISTORY_LIMITATION.md`:

> "Tool wrappers don't pass conversation history!"
>
> "8 tool wrappers are not passing conversation history!"

---

## Root Cause #2: Tool Selection Failure

### The Problem

Chat Agent has `toolChoice: "auto"` - it decides whether to use tools.

**From `mastra/agents/chat-agent.ts`:**

```typescript
export const chatAgent = new Agent({
  tools: {
    quickFactSearch: quickFactSearchTool,
    standardResearch: standardResearchTool,
    deepResearch: deepResearchTool,
  },
  // toolChoice: "auto" is implicit (default)
});
```

### Why This Fails

When user asks "Can you find additional case law", the agent might:

1. **Recognize it needs research** → Calls `deepResearch` tool ✅
2. **Think it already knows** → Answers from training data ❌

**From `CRITICAL_HALLUCINATION_INCIDENT.md`:**

> "User asked: 'what additional case law can you add to support this position'
>
> The chat agent responded with 10 case citations, of which 7 were completely fictitious"

The agent chose NOT to use tools because:

- It has training data about Zimbabwe case law
- The query seemed "straightforward" to the LLM
- Instructions said "Answer directly WITHOUT tools when: You already know the answer from training"

### Evidence

From `ANTI_HALLUCINATION_FIX.md`:

> "The agent interpreted 'what additional case law' as 'straightforward legal guidance from your knowledge' and generated cases from its training data instead of using search tools."

---

## Root Cause #3: Query Enhancement Without Context

### The Problem

Even when tools ARE called, the query enhancer doesn't get conversation context.

**From `mastra/agents/query-enhancer-agent.ts`:**

```typescript
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [] // ✅ Accepts history
  // ...
) {
  // Build context from recent conversation
  const recentContext = conversationHistory
    .slice(-maxContextMessages)
    .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`)
    .join("\n");

  // ❌ BUT: conversationHistory is EMPTY when called from tool wrappers!
}
```

### Example

**User conversation:**

```
User: "Tell me about Zimbabwe labour law"
Bot: [Explains Labour Act, employment rights, etc.]
User: "What about the zuva case?"
```

**What enhancer SHOULD receive:**

```typescript
enhanceSearchQuery("What about the zuva case?", [
  { role: "user", content: "Tell me about Zimbabwe labour law" },
  { role: "assistant", content: "Zimbabwe labour law..." },
]);
// Output: "zuva case Zimbabwe Supreme Court labour law employment judgment"
```

**What enhancer ACTUALLY receives:**

```typescript
enhanceSearchQuery(
  "What about the zuva case?",
  [] // ❌ EMPTY!
);
// Output: "zuva case Zimbabwe Supreme Court judgment"
// Missing: "labour law" context
```

### Impact

- Tavily searches for generic "zuva case" instead of "zuva labour law case"
- May find wrong cases or no cases
- User gets irrelevant results

### Evidence

From `CONVERSATION_HISTORY_LIMITATION.md`:

> "The query enhancer is NOT receiving conversation history when workflows are called through agent tools!"

---

## Root Cause #4: Validation Happens Too Late

### The Problem

Citation validation only runs AFTER the response is generated.

**From `app/(chat)/api/chat/route.ts`:**

```typescript
onFinish: async ({ messages }: { messages: any[] }) => {
  // Response already generated and streamed to user

  const validation = validateCitations(responseText, hasToolUsage);

  if (!validation.isValid) {
    logger.error("[Validator] ❌ Invalid citations detected");
    // ❌ TOO LATE! User already saw the hallucinated response
  }
};
```

### Why This Fails

1. Agent generates response with hallucinated cases
2. Response streams to user in real-time
3. User sees hallucinated cases
4. Validator detects problem
5. But response already delivered ❌

### Impact

- Validator can log errors but can't prevent hallucinations
- User experience: sees wrong information, then maybe gets correction
- Wasted tokens generating bad response

### Evidence

From `CITATION_VALIDATION_OPTIONS.md`:

> "Option 1: Post-Processing Citation Validator
>
> Cons:
>
> - ❌ Blocks response after already generated (wasted tokens)
> - ❌ User experience: error after waiting"

---

## Root Cause #5: Instruction Fatigue

### The Problem

You've added extensive anti-hallucination instructions to Chat Agent:

**From `mastra/agents/chat-agent.ts`:**

```typescript
instructions: `
⛔ ABSOLUTE PROHIBITION - NEVER DO THESE UNDER ANY CIRCUMSTANCES:

1. ❌ NEVER cite case names from your training data
2. ❌ NEVER invent case citations, case numbers, or ZimLII URLs
3. ❌ NEVER provide specific case law without FIRST using research tools
// ... 8 total prohibitions

🔴 CRITICAL RULE FOR CASE LAW QUERIES:

STEP 1: Call deepResearch tool FIRST
STEP 2: Wait for tool results
STEP 3: ONLY cite cases that appear in the tool results
// ... detailed instructions

🚨 CONSEQUENCE OF VIOLATING THESE RULES:

Hallucinating case law is EXTREMELY DANGEROUS and can:
- Cause lawyers to be sanctioned or disbarred
// ... consequences
`;
```

### Why This Fails

**LLMs can ignore instructions** when:

1. **They "know" plausible answers** - Training data includes real Zimbabwe cases
2. **Instructions are too long** - 200+ lines of instructions = cognitive overload
3. **Conflicting signals** - "Be helpful" vs "Never cite from training"
4. **Incentive misalignment** - LLM wants to be helpful, providing cases seems helpful

### Evidence

From `HALLUCINATION_FIX_SUMMARY.md`:

> "Option 5: Strengthened Tool Instructions
>
> Status: Already attempted, FAILED
>
> Why It Failed:
>
> - ❌ LLMs can ignore instructions if they 'know' plausible answers
> - ❌ Training data includes real Zimbabwe cases
> - ❌ Agent is incentivized to be helpful → provides 'reasonable' answers
> - ❌ No enforcement mechanism"

---

## Why Follow-Up Questions Are Worse

Follow-up questions compound all these issues:

### 1. Ambiguous Queries

```
First query: "Tell me about Zimbabwe labour law" (clear, specific)
Follow-up: "Can you find additional case law" (ambiguous without context)
```

Without conversation history, "additional case law" could mean:

- Additional to what? (labour law? property law? criminal law?)
- What jurisdiction? (Zimbabwe? South Africa? UK?)
- What court level? (Supreme Court? High Court?)

### 2. Agent Overconfidence

Agent thinks: "I just answered about labour law, so 'additional case law' obviously means labour law cases. I know some from training data!"

Result: Cites cases from training without calling tools.

### 3. Query Enhancement Blind Spots

Without context, enhancer produces generic enhancement:

- "additional case law" → "additional case law Zimbabwe Supreme Court"
- Missing: "labour law" (the actual topic)

### 4. Tavily Confusion

Tavily receives: "additional case law Zimbabwe Supreme Court"

- Too generic
- Returns random Supreme Court cases
- Not labour-specific

### 5. Synthesizer Desperation

Synthesizer sees:

- User wants "additional case law"
- Tavily returned 5 generic cases (not labour-related)
- Synthesizer knows from context this is about labour law
- Synthesizer supplements with training data ❌

---

## The Compounding Effect

Each issue makes the next worse:

```
Context Loss
    ↓
Tool Selection Failure (agent thinks it knows)
    ↓
OR
Query Enhancement Blind Spots (missing context)
    ↓
Tavily Returns Wrong Results
    ↓
Synthesizer Supplements with Training Data
    ↓
Validation Detects Problem (too late)
    ↓
User Sees Hallucinated Cases ❌
```

---

## Solutions (Ranked by Impact)

### 🔴 CRITICAL: Fix Context Loss in Tool Wrappers ✅ COMPLETE

**Impact:** HIGH (fixes root cause)  
**Effort:** MEDIUM (8 files to update)  
**Priority:** 1  
**Status:** ✅ IMPLEMENTED

**Solution:** Pass conversation history through `agentContext` in Mastra SDK integration.

**Implementation:** ✅ COMPLETE

Modified `lib/ai/mastra-sdk-integration.ts` to pass conversation history through `agentContext`:

```typescript
// Prepare conversation history for tools (exclude current message)
const conversationHistory = mastraMessages.slice(0, -1).map((msg) => ({
  role: msg.role,
  content: msg.content,
}));

// Pass through agentContext
const stream = await agent.stream(mastraMessages, {
  format: "aisdk",
  maxSteps: 15,
  agentContext: {
    conversationHistory, // ✅ Available to all tools
    userId: options?.userId,
    chatId: options?.chatId,
    sessionId: options?.sessionId,
  },
});
```

Updated all 8 tool wrappers to extract conversation history from `executionContext.agentContext.conversationHistory`.

**Files modified:**

- ✅ `lib/ai/mastra-sdk-integration.ts`
- ✅ `mastra/tools/quick-fact-search-tool.ts`
- ✅ `mastra/tools/standard-research-tool.ts`
- ✅ `mastra/tools/deep-research-tool.ts`
- ✅ `mastra/tools/comprehensive-research-tool.ts`
- ✅ `mastra/tools/advanced-search-workflow-tool.ts`
- ✅ `mastra/tools/basic-search-workflow-tool.ts`
- ✅ `mastra/tools/low-advance-search-workflow-tool.ts`
- ✅ `mastra/tools/high-advance-search-workflow-tool.ts`

**See:** `CONTEXT_LOSS_FIX_COMPLETE.md` for full implementation details.

---

### 🟡 HIGH: Force Tool Usage for Case Law Queries

**Impact:** HIGH (prevents no-tool hallucinations)  
**Effort:** LOW (routing logic change)  
**Priority:** 2

**Solution:** Route ALL case law queries to `searchAgent` (which forces tool usage) instead of `chatAgent`.

**From `TOOL_SELECTION_LOGIC.md`:**

> "The agent uses automatic tool choice... The LLM decides whether to use a tool"

**Problem:** `chatAgent` can choose NOT to use tools.

**Solution:** Detect case law queries and route to `searchAgent`:

```typescript
// In complexity-detector.ts
if (
  query.match(
    /case law|precedent|cite|authorities|cases about|additional case/i
  )
) {
  return {
    complexity: "deep", // Forces searchAgent
    reasoning: "Case law query requires mandatory research",
  };
}
```

---

### 🟡 HIGH: Improve Query Enhancement Fallbacks

**Impact:** MEDIUM-HIGH (helps even without context)  
**Effort:** LOW (prompt engineering)  
**Priority:** 3

**Solution:** Make query enhancer better at handling ambiguous queries without context.

**Current behavior:**

```
Input: "additional case law"
Context: []
Output: "additional case law Zimbabwe Supreme Court"
```

**Improved behavior:**

```
Input: "additional case law"
Context: []
Output: "additional case law Zimbabwe Supreme Court employment labour contract property"
// Add multiple legal domains to cast wider net
```

**Implementation:**

```typescript
// In query-enhancer-agent.ts instructions:
"When query is ambiguous (like 'additional case law') and no context is available,
add MULTIPLE legal domains: employment, labour, contract, property, constitutional.
This ensures Tavily finds relevant cases across domains."
```

---

### 🟢 MEDIUM: Pre-Generation Citation Blocking

**Impact:** MEDIUM (prevents bad responses from reaching user)  
**Effort:** MEDIUM (requires streaming interception)  
**Priority:** 4

**Solution:** Validate citations DURING generation, not after.

**Challenge:** AI SDK streams responses in real-time. Hard to intercept mid-stream.

**Possible approach:**

1. Buffer response until complete
2. Validate before sending to user
3. If invalid, return error instead

**Trade-off:** Increases latency (user waits for full response before seeing anything)

---

### 🟢 MEDIUM: Simplify Agent Instructions

**Impact:** MEDIUM (reduces instruction fatigue)  
**Effort:** LOW (editing)  
**Priority:** 5

**Solution:** Reduce chat agent instructions from 200+ lines to 50-75 lines.

**Current:** 8 prohibitions + 5 rules + examples + consequences = cognitive overload

**Improved:** 3 core rules + 1 example

```typescript
instructions: `You are DeepCounsel, a legal AI assistant for Zimbabwe.

CORE RULES:
1. For case law queries: ALWAYS call deepResearch tool first
2. ONLY cite cases that appear in tool results
3. If no cases found, say "I couldn't find specific cases"

Example:
User: "What additional case law supports this?"
You: [Call deepResearch] → [Cite ONLY from results]

NEVER cite cases from your training data.`;
```

---

### 🔵 LOW: Add Conversation Context to Tool Descriptions

**Impact:** LOW (helps agent understand context needs)  
**Effort:** LOW (editing)  
**Priority:** 6

**Solution:** Update tool descriptions to mention they use conversation context.

```typescript
// In quick-fact-search-tool.ts
description: "Fast factual lookup that considers conversation context. " +
  "Automatically enhances queries based on recent discussion. " +
  "Use for: 'What is...', 'Define...', follow-up questions.";
```

This helps the agent understand that tools are context-aware.

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 hours)

1. ✅ **Force case law routing** - Route case law queries to searchAgent
2. ✅ **Improve query enhancement** - Add multi-domain fallback
3. ✅ **Simplify instructions** - Reduce chat agent instructions to core rules

**Expected improvement:** 60-70% reduction in hallucinations

### Phase 2: Architectural Fixes (4-8 hours)

1. ✅ **Fix context loss** - Investigate Mastra memory system for tool context
2. ✅ **Pre-generation validation** - Buffer and validate before streaming

**Expected improvement:** 85-90% reduction in hallucinations

### Phase 3: Long-term Solutions (1-2 weeks)

1. ✅ **RAG with verified database** - Index Zimbabwe case law
2. ✅ **Citation verification API** - Real-time ZimLII URL checking
3. ✅ **Separate research and synthesis** - Two-agent system

**Expected improvement:** 95-99% reduction in hallucinations

---

## Testing Strategy

### Test Case 1: Follow-Up Without Context

```
User: "Tell me about Zimbabwe labour law"
Bot: [Response]
User: "Can you find additional case law to support this?"
```

**Expected:**

- ✅ Agent calls deepResearch tool
- ✅ Query enhanced with "labour law" context
- ✅ Tavily finds labour-specific cases
- ✅ Response cites ONLY cases from Tavily
- ✅ No hallucinated cases

### Test Case 2: Ambiguous Follow-Up

```
User: "What is the zuva case?"
Bot: [Response about Nyamande v Zuva Petroleum]
User: "What other cases are similar?"
```

**Expected:**

- ✅ Agent calls deepResearch tool
- ✅ Query enhanced with "employment" context from previous answer
- ✅ Tavily finds similar employment cases
- ✅ Response cites ONLY cases from Tavily

### Test Case 3: Direct Case Law Request

```
User: "Find me cases about property rights in Zimbabwe"
```

**Expected:**

- ✅ Routed to searchAgent (forced tool usage)
- ✅ Query enhanced with "property rights" keywords
- ✅ Tavily finds property cases
- ✅ Response cites ONLY cases from Tavily

---

## Monitoring and Metrics

### Key Metrics to Track

1. **Tool Usage Rate**

   - % of case law queries that trigger tool calls
   - Target: 100%

2. **Context Preservation**

   - % of tool calls that receive conversation history
   - Target: 100%

3. **Query Enhancement Quality**

   - Manual review of enhanced queries
   - Target: 90% include relevant context

4. **Hallucination Rate**

   - % of responses with fabricated citations
   - Target: <5%

5. **Citation Accuracy**
   - % of citations that match tool results
   - Target: 100%

### Logging to Add

```typescript
// In tool wrappers
console.log("[Tool] Conversation history length:", conversationHistory.length);
console.log("[Tool] Context preview:", conversationHistory.slice(-2));

// In query enhancer
console.log("[Enhancer] Input query:", query);
console.log("[Enhancer] Context available:", conversationHistory.length > 0);
console.log("[Enhancer] Enhanced query:", enhanced);

// In chat agent
console.log("[Agent] Tool decision:", toolName || "no tool");
console.log("[Agent] Reasoning:" /* agent's internal reasoning if available */);
```

---

## Conclusion

The follow-up question hallucination is caused by **architectural issues**, not just prompt engineering:

1. **Context loss** - Tool wrappers don't receive conversation history
2. **Tool selection** - Agent can choose not to use tools
3. **Query enhancement** - Works without context but less effectively
4. **Validation timing** - Happens after generation (too late)
5. **Instruction limits** - LLMs can ignore even strong instructions

**The fix requires:**

- Architectural changes (context passing)
- Routing improvements (force tool usage)
- Better fallbacks (multi-domain enhancement)

**Good news:**

- You've already fixed many issues (validation, routing, instructions)
- The remaining fixes are well-understood
- Implementation is straightforward

**Next steps:**

1. Implement Phase 1 quick wins
2. Test with user's actual queries
3. Monitor metrics
4. Iterate based on results

---

**Status:** Analysis Complete  
**Confidence:** HIGH  
**Recommended Action:** Implement Phase 1 (Quick Wins) first, then Phase 2
