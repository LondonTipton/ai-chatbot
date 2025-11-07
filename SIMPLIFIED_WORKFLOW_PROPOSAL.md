# Simplified Workflow Architecture Proposal

## Current Problem

Your workflows have become **overly complex** with multiple validation layers that **block good results**:

```
Current Flow (5 steps after search):
1. Search (Tavily) ✅
2. Extract Entities (can fail) ❌
3. Validate Entities (can filter out good results) ❌
4. Extract Claims (can fail) ❌
5. Compose Document (can fail) ❌
```

**Result:** The Zuva case is probably being found by Tavily but filtered out by downstream validation!

## Proposed Solution: "Search Coordinator Agent"

Replace the entire workflow with a **single intelligent agent** that:

- Receives conversation history
- Enhances the query (using existing query-enhancer-agent)
- Calls Tavily as a tool
- Provides light synthesis
- **Always passes raw Tavily results forward** (no filtering!)
- **Never fails** (always returns something useful)

```
New Flow (1 agent):
1. Search Coordinator Agent
   ├─ Enhance query (with conversation context) ✅
   ├─ Call Tavily tool ✅
   ├─ Light synthesis (optional) ✅
   └─ Return raw results + synthesis ✅
```

## Benefits

1. **Simpler**: 1 agent instead of 5 steps
2. **More reliable**: No validation layers to block results
3. **Faster**: Fewer LLM calls
4. **Better context**: Agent has full conversation history
5. **Flexible**: Agent can decide what to do with results
6. **Debuggable**: Single point of failure

## Implementation

### Option A: Agent-Based Workflow (Recommended)

```typescript
// mastra/agents/search-coordinator-agent.ts
export const searchCoordinatorAgent = new Agent({
  name: "Search Coordinator",
  instructions: `You are a legal research coordinator for Zimbabwe law.

Your task:
1. Analyze the user's query and conversation history
2. Enhance the query for better search results
3. Search using Tavily
4. Provide a clear, well-sourced answer

CRITICAL RULES:
- ALWAYS use the tavilySearch tool
- NEVER filter or validate results - pass everything through
- If Tavily finds results, use them ALL
- Cite sources with [Title](URL) format
- If search fails, explain what happened

You have access to:
- tavilySearch: Search legal databases
- User's conversation history for context`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {
    tavilySearch: tavilySearchTool,
  },
});

// mastra/workflows/simple-search-workflow.ts
export const simpleSearchWorkflow = createWorkflow({
  id: "simple-search-workflow",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
    conversationHistory: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      )
      .default([]),
  }),
  outputSchema: z.object({
    response: z.string(),
    sources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    rawResults: z.any(), // Pass through raw Tavily results
  }),
})
  .then(searchCoordinatorStep)
  .commit();
```

### Option B: Hybrid Approach (More Control)

Keep query enhancement separate, but simplify the rest:

```typescript
const searchCoordinatorStep = createStep({
  id: "search-coordinator",
  execute: async ({ inputData }) => {
    const { query, conversationHistory } = inputData;

    // 1. Enhance query (existing logic)
    const enhancedQuery = await enhanceSearchQuery(query, conversationHistory);

    // 2. Search with Tavily
    const searchResults = await tavilySearchTool.execute({
      context: { query: enhancedQuery, maxResults: 20 },
    });

    // 3. Light synthesis using agent
    const synthesisPrompt = `
Query: ${query}

Search Results:
${searchResults.results
  .map(
    (r) => `
Title: ${r.title}
URL: ${r.url}
Content: ${r.content}
`
  )
  .join("\n")}

Provide a clear answer citing these sources. Use ALL results provided.`;

    const synthesis = await searchCoordinatorAgent.generate(synthesisPrompt, {
      maxSteps: 1,
    });

    // 4. Return EVERYTHING (no filtering!)
    return {
      response: synthesis.text,
      sources: searchResults.results.map((r) => ({
        title: r.title,
        url: r.url,
      })),
      rawResults: searchResults, // Pass through for debugging
    };
  },
});
```

## Migration Strategy

### Phase 1: Create Simplified Workflow

1. Create `search-coordinator-agent.ts`
2. Create `simple-search-workflow.ts`
3. Test with "what is the zuva case?" query

### Phase 2: Update Tool Wrappers

Update all 8 tool wrappers to use the new workflow:

- `quick-fact-search-tool.ts`
- `standard-research-tool.ts`
- etc.

### Phase 3: Deprecate Old Workflows

Keep old workflows for comparison, but default to new one.

## Expected Results

For "what is the zuva case?" (follow-up):

- ✅ Query enhancement gets conversation context
- ✅ Enhanced query: "zuva case Zimbabwe Supreme Court Labour Act employment judgment"
- ✅ Tavily finds the case
- ✅ ALL results passed to synthesis
- ✅ Agent provides clear answer with sources
- ✅ No validation layers to block results

## Testing Plan

1. Test with original query: "what is the zuva case?"
2. Test with explicit query: "what is the zuva case in zimbabwean labour law?"
3. Compare results with old workflow
4. Check if Zuva case is found and cited

## Next Steps

Which approach do you prefer?

- **Option A**: Pure agent-based (simpler, more flexible)
- **Option B**: Hybrid with explicit steps (more control, easier to debug)

I recommend **Option B** for now because:

- You keep the excellent query enhancement logic
- You can still debug each step
- You remove the problematic validation layers
- You can gradually migrate to Option A later
