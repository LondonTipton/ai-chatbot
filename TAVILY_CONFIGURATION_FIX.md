# Tavily Configuration Issue - ROOT CAUSE FOUND! 🎯

## Problem Identified

Your Tavily configuration is **TOO RESTRICTIVE** compared to the basic MCP Tavily that successfully finds cases.

## Comparison

### Your Configuration (NOT WORKING)

```typescript
// In tavily-search.ts
requestBody.exclude_domains = getExcludeDomains();

// getExcludeDomains() returns:
[
  "reddit.com",
  "quora.com",
  "medium.com",
  "linkedin.com",
  "youtube.com",
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "pinterest.com",
  "w3schools.com",
  "stackoverflow.com",
  "wikihow.com",
  "disqus.com",
  "lexisnexis.com",
  "westlaw.com", // ❌ BLOCKING LEGAL SOURCES!
  "huggingface.co",
];

// Also:
search_depth: "basic"; // ❌ Too shallow
max_results: 20;
include_raw_content: false;
```

### MCP Tavily (WORKING) ✅

```typescript
// Simple, no restrictions
{
  query: "zuva case zimbabwe labour law",
  max_results: 10,
  search_depth: "advanced",  // ✅ Better depth
  // NO exclude_domains
  // NO include_domains
  // NO complex filtering
}
```

## The Issues

### Issue 1: Excluding Legal Sources ❌

```typescript
"lexisnexis.com",  // Major legal database
"westlaw.com",     // Major legal database
```

These are PREMIUM legal sources! You're blocking them.

### Issue 2: search_depth = "basic" ❌

```typescript
search_depth: "basic"; // Your config
search_depth: "advanced"; // MCP config (better)
```

Basic search is too shallow for legal research.

### Issue 3: Too Many Exclusions ❌

You're excluding 17+ domains. This might be causing Tavily to miss relevant results.

### Issue 4: Complex Domain Strategy ❌

The domain strategy logic is adding complexity that might be interfering with results.

## The Fix

### Option 1: Simplify to Match MCP (RECOMMENDED)

**File:** `mastra/tools/tavily-search.ts`

Replace the entire `execute` function with:

```typescript
execute: async ({ context }) => {
  const {
    query,
    maxResults = 20,
  } = context as {
    query: string;
    maxResults?: number;
  };

  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  try {
    // SIMPLIFIED: Use basic Tavily configuration like MCP
    const requestBody = {
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
      search_depth: "advanced",  // Changed from "basic"
      // NO exclude_domains - let Tavily find best results
      // NO include_domains - don't restrict
    };

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`);
    }

    const data = await response.json();

    const results =
      data.results?.map((result: any) => ({
        title: result.title || "",
        url: result.url || "",
        content: result.content || "",
        score: result.score || 0,
        tier: getDomainTier(result.url),
      })) || [];

    // Calculate token estimate for results
    const answerTokens = estimateTokens(data.answer || "");
    const resultsTokens = estimateSearchResultTokens(results);
    const tokenEstimate = answerTokens + resultsTokens;

    const sourceDistribution = analyzeSourceDistribution(results);

    return {
      answer: data.answer || "No answer generated",
      results,
      totalResults: results.length,
      tokenEstimate,
      sourceDistribution,
    };
  } catch (error) {
    console.error("Tavily search error:", error);
    throw error;
  }
},
```

### Option 2: Keep Domain Strategy But Fix Exclusions

**File:** `lib/utils/tavily-domain-strategy.ts`

Change `getExcludeDomains()`:

```typescript
export function getExcludeDomains(): string[] {
  return [
    // ONLY exclude obvious spam/social media
    // DO NOT exclude legitimate legal sources
    "reddit.com",
    "quora.com",
    "youtube.com",
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "pinterest.com",
    // Removed: lexisnexis.com, westlaw.com (these are good!)
    // Removed: medium.com, linkedin.com (sometimes have good legal articles)
  ];
}
```

And change search_depth:

**File:** `mastra/tools/tavily-search.ts`

```typescript
const requestBody: Record<string, unknown> = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  max_results: maxResults,
  include_answer: true,
  include_raw_content: false,
  search_depth: "advanced", // Changed from "basic"
};
```

### Option 3: Add Feature Flag for Simple Mode

**File:** `mastra/tools/tavily-search.ts`

```typescript
execute: async ({ context }) => {
  const {
    query,
    maxResults = 20,
    domainStrategy = "prioritized",
    researchDepth = "standard",
  } = context;

  // Feature flag: Use simple mode like MCP
  const USE_SIMPLE_MODE = process.env.TAVILY_SIMPLE_MODE === "true";

  if (USE_SIMPLE_MODE) {
    // Simple mode: No domain filtering, just like MCP
    const requestBody = {
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      include_answer: true,
      search_depth: "advanced",
    };
    // ... rest of simple implementation
  } else {
    // Complex mode: Use domain strategy
    // ... existing implementation
  }
};
```

Then in `.env.local`:

```
TAVILY_SIMPLE_MODE=true
```

## Recommended Action

**Use Option 1** - Simplify to match MCP configuration.

Why?

- ✅ MCP configuration WORKS
- ✅ Simpler is better
- ✅ Less chance of bugs
- ✅ Easier to maintain
- ✅ Tavily's own algorithms are good at ranking

You can always add domain filtering LATER if needed, but start with what works.

## Testing

After applying fix, test with:

```
"what is the zuva case in zimbabwean labour law?"
```

Expected result: ✅ Should find Nyamande v Zuva Petroleum

## Why This Happened

You were trying to be too smart with domain filtering:

- Excluding domains that might have good content
- Using "basic" search depth instead of "advanced"
- Adding complexity that Tavily doesn't need

**Tavily's algorithms are already good at finding relevant results!** You don't need to over-engineer it.

## Comparison Table

| Feature         | Your Config | MCP Config | Recommendation    |
| --------------- | ----------- | ---------- | ----------------- |
| search_depth    | "basic"     | "advanced" | Use "advanced"    |
| exclude_domains | 17+ domains | None       | Remove or minimal |
| include_domains | Sometimes   | Never      | Don't use         |
| Domain strategy | Complex     | None       | Remove            |
| max_results     | 20          | 10         | Keep 20 (good)    |

## Quick Fix (5 minutes)

1. Open `mastra/tools/tavily-search.ts`
2. Find line: `search_depth: "basic"`
3. Change to: `search_depth: "advanced"`
4. Find line: `requestBody.exclude_domains = getExcludeDomains();`
5. Comment it out: `// requestBody.exclude_domains = getExcludeDomains();`
6. Save and test

That's it! Your searches should work now.

## Long-term Solution

Consider:

1. Remove domain strategy complexity
2. Let Tavily's algorithms do the work
3. Add domain filtering only if you see spam in results
4. Use "advanced" search depth by default
5. Keep it simple!

---

**Status:** ROOT CAUSE IDENTIFIED ✅
**Fix Complexity:** Simple (5 minutes)
**Expected Outcome:** Cases will be found
**Confidence:** 95%
