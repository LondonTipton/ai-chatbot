# Debug: Why Tavily Isn't Finding the Zuva Case

## The Problem

Even with the query "what is the zuva case in zimbabwean labour law", Tavily is not finding the case.

## Possible Causes

### 1. Query Enhancement Not Working

The Search Coordinator Agent should be enhancing the query, but maybe it's not calling Tavily at all?

**Check:** Look at server logs for:

```
[Search Coordinator] Starting search with context
[Search Coordinator] Query: ...
[Tavily Search] Query: ...
[Tavily Search] Results found: ...
```

### 2. Agent Not Calling Tavily Tool

The agent might be trying to answer without calling the tool.

**Fix:** Make the agent instructions more explicit about ALWAYS calling the tool.

### 3. Tavily API Not Finding the Case

Even with a good query, Tavily might not have the case in its index.

**Test:** Run direct Tavily API call (need TAVILY_API_KEY in environment)

### 4. Tool Call Extraction Broken

The coordinateSearch function has TypeScript errors extracting tool results.

**Fix:** Update the tool call extraction logic.

## Immediate Actions

### Action 1: Fix Tool Call Extraction

The search coordinator has errors:

```typescript
// Current (broken):
if (toolCall.toolName === "tavilySearch" && toolCall.result) {
  // toolName and result don't exist on ToolCallChunk
}

// Should be:
if (toolCall.type === "tool-call" && toolCall.toolName === "tavilySearch") {
  // Need to find the result in a different way
}
```

### Action 2: Add More Logging

Add console.logs to see:

1. What query the agent receives
2. Whether the agent calls Tavily
3. What Tavily returns
4. What the agent synthesizes

### Action 3: Test Tavily Directly

Create a simple test that bypasses the agent and calls Tavily directly with:

- "zuva case Zimbabwe Supreme Court Labour Act employment judgment"
- "Don Nyamande v Zuva Petroleum Zimbabwe"
- "SC 43/15 Zimbabwe Supreme Court"

### Action 4: Check if Case Exists Online

The case might not be indexed by Tavily at all. Check:

- https://zimlii.org (search for "Nyamande Zuva")
- https://saflii.org (search for "Zuva Petroleum")
- Google: "Don Nyamande v Zuva Petroleum SC 43/15"

## Quick Fix to Try

Instead of using the Search Coordinator Agent, let's bypass it and call Tavily directly from the workflow:

```typescript
// In simple-search-workflow.ts
const searchStep = createStep({
  id: "direct-tavily-search",
  execute: async ({ inputData }) => {
    const { query } = inputData;

    // Call Tavily directly
    const searchResults = await tavilySearchTool.execute({
      context: {
        query: `${query} Zimbabwe Supreme Court case law judgment`,
        maxResults: 20,
      },
    });

    // Return raw results
    return {
      response: searchResults.answer,
      sources: searchResults.results.map((r) => ({
        title: r.title,
        url: r.url,
      })),
      totalTokens: searchResults.tokenEstimate,
      rawResults: searchResults,
    };
  },
});
```

This removes the agent layer entirely and just calls Tavily directly.

## Next Steps

1. Check server logs to see what's happening
2. Fix the tool call extraction errors
3. Try the direct Tavily call approach
4. Test if the case actually exists in Tavily's index
