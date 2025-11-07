# LLM-Based Query Enhancement - Implementation Plan

## Overview

Use a fast, cheap LLM to intelligently enhance search queries before sending to Tavily.
This leverages conversation context and is more flexible than regex patterns.

## Architecture

```
User Query + Conversation History
         ↓
   Query Enhancer Agent (Llama 3.3 70B - fast, cheap)
         ↓
   Enhanced Query (50-100 tokens cost)
         ↓
   Tavily Search
         ↓
   Results
```

## Implementation

### Step 1: Create Query Enhancer Agent

**File:** `mastra/agents/query-enhancer-agent.ts` (NEW FILE)

```typescript
/**
 * Query Enhancer Agent
 *
 * Uses LLM to intelligently enhance search queries for better Tavily results.
 * Particularly important for legal case queries and context-dependent searches.
 *
 * Token budget: 50-100 tokens per enhancement
 * Latency: ~200-500ms with Llama 3.3 70B
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

export const queryEnhancerAgent = new Agent({
  name: "Query Enhancer",
  instructions: `You are a search query enhancement specialist for Zimbabwe legal research.

Your task: Transform user queries into optimal search queries for legal databases.

RULES:
1. Keep it concise - add 3-7 relevant keywords maximum
2. For legal cases: Add "Supreme Court", "case law", "judgment", "legal case"
3. For statutes: Add "legislation", "statute", "law"
4. For general queries: Add "Zimbabwe" and relevant legal domain
5. Use conversation context to understand what user is really asking
6. If user mentions a case name, preserve it exactly
7. Always include "Zimbabwe" unless already present

EXAMPLES:

Input: "What about the zuva case?"
Context: Previous question was about Labour Act
Output: zuva case Zimbabwe Supreme Court employment labour judgment

Input: "Don Nyamande v Zuva Petroleum"
Context: None
Output: Don Nyamande v Zuva Petroleum Zimbabwe Supreme Court case law judgment

Input: "Section 12B"
Context: Discussing Labour Act
Output: Section 12B Labour Act Zimbabwe legislation statute

Input: "How to register a company?"
Context: None
Output: company registration Zimbabwe incorporation business law

Input: "What did the court say?"
Context: Previous question about Zuva case
Output: Zuva Petroleum Nyamande Zimbabwe Supreme Court judgment ruling

CRITICAL: 
- Output ONLY the enhanced query
- No explanations, no quotes, no extra text
- Maximum 15 words in output
- Preserve exact case names and citations from input`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {},
});

/**
 * Enhance a search query using conversation context
 */
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  try {
    // Build context from recent conversation (last 3 messages)
    const recentContext = conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const prompt = `${
      recentContext ? `CONVERSATION CONTEXT:\n${recentContext}\n\n` : ""
    }USER QUERY: ${query}

ENHANCED QUERY:`;

    const result = await queryEnhancerAgent.generate(prompt, {
      maxSteps: 1,
    });

    const enhanced = result.text.trim();

    // Validation: ensure output is reasonable
    if (enhanced.length > 200 || enhanced.length < query.length) {
      console.warn("[Query Enhancer] Invalid output, using original query");
      return `${query} Zimbabwe`;
    }

    console.log(`[Query Enhancer] Original: "${query}"`);
    console.log(`[Query Enhancer] Enhanced: "${enhanced}"`);

    return enhanced;
  } catch (error) {
    console.error("[Query Enhancer] Error:", error);
    // Fallback: just add Zimbabwe
    return `${query} Zimbabwe`;
  }
}
```

### Step 2: Update Advanced Search Workflow

**File:** `mastra/workflows/advanced-search-workflow.ts`

**Add import:**

```typescript
import { enhanceSearchQuery } from "@/mastra/agents/query-enhancer-agent";
```

**Modify the search step (around line 150):**

```typescript
const advancedSearchStep = createStep({
  id: "advanced-search",
  description: "Perform advanced web search with AI-enhanced query",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z.string().default("Zimbabwe"),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ).optional().default([]),
  }),
  outputSchema: z.object({
    // ... existing schema
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    try {
      // Enhance query using LLM with conversation context
      const enhancedQuery = await enhanceSearchQuery(query, conversationHistory);

      // Execute advanced search with enhanced query
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: enhancedQuery,  // ← AI-enhanced query
          maxResults: 20,
          jurisdiction,
          includeRawContent: true,
          domainStrategy: "prioritized",
          researchDepth: "deep",
        },
        runtimeContext,
      });

      // Rest stays the same...
```

### Step 3: Pass Conversation History from Chat Route

**File:** `app/(chat)/api/chat/route.ts`

**Find where workflow is called and add conversation history:**

```typescript
// Extract recent conversation history (last 5 messages)
const conversationHistory = messages.slice(-5).map((msg) => ({
  role: msg.role,
  content: msg.content,
}));

// Call workflow with history
const result = await advancedSearchWorkflow.execute({
  inputData: {
    query: userMessage,
    jurisdiction: "Zimbabwe",
    conversationHistory, // ← Pass conversation context
  },
});
```

## Token Cost Analysis

### Per Query Enhancement:

- **Input:** ~100-200 tokens (query + context)
- **Output:** ~20-50 tokens (enhanced query)
- **Total:** ~120-250 tokens per enhancement

### Cost with Cerebras (Llama 3.3 70B):

- **Price:** $0.60 per 1M tokens
- **Per enhancement:** $0.00015 (0.015 cents)
- **Per 1000 queries:** $0.15

**Verdict:** Essentially free! 💰

### Latency:

- **Llama 3.3 70B on Cerebras:** ~200-500ms
- **Added to workflow:** Minimal impact
- **Total workflow time:** Still under 10s

## Advantages Over Regex

| Aspect                | Regex Approach       | LLM Approach                 |
| --------------------- | -------------------- | ---------------------------- |
| **Context awareness** | ❌ None              | ✅ Uses conversation history |
| **Flexibility**       | ❌ Brittle patterns  | ✅ Adapts to variations      |
| **Maintenance**       | ❌ Constant updates  | ✅ Self-improving            |
| **Edge cases**        | ❌ Misses many       | ✅ Handles naturally         |
| **Cost**              | ✅ Free              | ✅ ~$0.00015 per query       |
| **Latency**           | ✅ Instant           | ⚠️ +200-500ms                |
| **Reliability**       | ⚠️ Can fail silently | ✅ Fallback to original      |

## Example Scenarios

### Scenario 1: Follow-up Question

```
User: "How does the Labour Act protect workers?"
Enhanced: "Labour Act Zimbabwe workers rights protection employment"
↓
User: "What landmark cases are there?"
Context: Previous question about Labour Act
Enhanced: "landmark cases Labour Act Zimbabwe Supreme Court employment"
↓
User: "Tell me about the zuva case"
Context: Discussing Labour Act cases
Enhanced: "zuva case Zimbabwe Supreme Court Labour Act employment judgment"
```

### Scenario 2: Vague Reference

```
User: "What about that 2015 case?"
Context: Discussing employment termination
Enhanced: "2015 employment termination case Zimbabwe Supreme Court judgment"
```

### Scenario 3: Citation Search

```
User: "SC 43/15"
Context: None
Enhanced: "SC 43/15 Zimbabwe Supreme Court case law judgment"
```

## Testing Strategy

### Test 1: Context-Aware Enhancement

```typescript
const history = [
  { role: "user", content: "How does the Labour Act work?" },
  { role: "assistant", content: "The Labour Act protects workers..." },
];

const enhanced = await enhanceSearchQuery("What about the zuva case?", history);
// Expected: Should mention Labour Act or employment
```

### Test 2: No Context

```typescript
const enhanced = await enhanceSearchQuery("Nyamande v Zuva", []);
// Expected: Should add Supreme Court, case law, judgment
```

### Test 3: Fallback

```typescript
// Simulate LLM failure
const enhanced = await enhanceSearchQuery("test query", []);
// Expected: Should return "test query Zimbabwe"
```

## Monitoring

Add logging to track enhancement quality:

```typescript
// In query-enhancer-agent.ts
console.log({
  original: query,
  enhanced: enhanced,
  contextUsed: conversationHistory.length > 0,
  tokenEstimate: Math.ceil((query.length + enhanced.length) / 4),
  timestamp: new Date().toISOString(),
});
```

## Rollback Plan

If LLM enhancement causes issues:

1. **Disable enhancement:**

   ```typescript
   // In advanced-search-workflow.ts
   const enhancedQuery = query; // Skip enhancement
   ```

2. **Add feature flag:**
   ```typescript
   const USE_LLM_ENHANCEMENT = process.env.USE_LLM_ENHANCEMENT === "true";
   const enhancedQuery = USE_LLM_ENHANCEMENT
     ? await enhanceSearchQuery(query, conversationHistory)
     : `${query} Zimbabwe`;
   ```

## Implementation Timeline

- **Step 1:** Create agent (15 min)
- **Step 2:** Update workflow (10 min)
- **Step 3:** Pass conversation history (10 min)
- **Testing:** (15 min)

**Total:** ~50 minutes

## Success Criteria

✅ **Must Have:**

- [ ] "zuva case" with Labour Act context finds the case
- [ ] Follow-up questions use context
- [ ] Fallback works if LLM fails
- [ ] Latency increase < 1 second

✅ **Nice to Have:**

- [ ] Enhancement quality improves over time
- [ ] Handles misspellings better
- [ ] Understands abbreviations

## Next Steps

1. Create the query enhancer agent
2. Test it standalone with various queries
3. Integrate into workflow
4. Test end-to-end with conversation context
5. Monitor and refine

**Ready to implement?** This is much cleaner than regex! 🚀
