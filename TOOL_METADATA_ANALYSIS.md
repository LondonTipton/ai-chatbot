# Tool Metadata Analysis

## Current State

### Quick Fact Search Tool ⚠️

**Issues:**

- ❌ Says "1 search result" but actually uses 10 results
- ❌ Token budget says "500-1500" but should be "1K-2K"
- ❌ Latency says "2-4 seconds" but should be "2-3s"
- ✅ Description is clear about use cases
- ✅ Examples are good

### Standard Research Tool ⚠️

**Issues:**

- ❌ Says "2-3 searches" but actually uses 1 search with 10 results
- ❌ Token budget says "2K-4K" but should be "3K-5K"
- ❌ Latency says "4-7 seconds" but should be "3-5s"
- ✅ Description is clear
- ✅ Examples are good

### Deep Research Tool ⚠️

**Issues:**

- ❌ Says "4-5 searches" but actually uses 1 search with 10 results + raw content
- ❌ Token budget says "4K-8K" but should be "3K-5K"
- ❌ Latency says "5-10 seconds" but should be "3-5s"
- ✅ Good distinction from comprehensive research
- ✅ Clear purpose statement
- ✅ Examples are excellent

### Comprehensive Research Tool ✅

**Issues:**

- ❌ Says "6+ searches" but actually uses 1-3 searches (10+5+5 results)
- ✅ Token budget "5K-10K" is correct
- ✅ Latency "8-15 seconds" is correct
- ✅ Excellent distinction from deep research
- ✅ Clear purpose statement
- ✅ Examples are excellent

## Key Problems

### 1. Outdated Metadata

All tools reference old workflow characteristics:

- Old: Multiple separate searches
- New: Single search with multiple results

### 2. Confusing Terminology

- "1 search result" vs "10 results from 1 search"
- "4-5 searches" vs "1 search with 10 results"

### 3. Incorrect Token Budgets

Token budgets don't match V2 workflow reality:

- Quick: Says 500-1500, should be 1K-2K
- Standard: Says 2K-4K, should be 3K-5K
- Deep: Says 4K-8K, should be 3K-5K

## What the LLM Sees

When the LLM decides which tool to use, it sees:

```json
{
  "name": "quickFactSearch",
  "description": "Performs quick factual lookup with intelligent search and rapid synthesis. Use this for simple factual questions, definitions, or current facts that need fast answers. Returns a concise response with source citation. Token budget: 500-1500 tokens. Best for straightforward queries requiring speed over depth.",
  "parameters": {
    "query": "The factual question or definition request to investigate",
    "jurisdiction": "Legal jurisdiction for the query",
    "conversationHistory": "Recent conversation history for context"
  }
}
```

## Recommendations

### 1. Update Tool Descriptions

Make them accurate to V2 workflows:

- Correct token budgets
- Correct latency estimates
- Clarify "results" vs "searches"

### 2. Emphasize Key Distinctions

Make it crystal clear when to use each tool:

- **Quick:** Simple questions, definitions
- **Standard:** Explanations, overviews
- **Deep:** Dense content extraction, analysis
- **Comprehensive:** Trends, patterns, comparisons

### 3. Add Negative Examples

Tell the LLM when NOT to use each tool:

- Quick: NOT for analysis
- Standard: NOT for trends
- Deep: NOT for broad surveys
- Comprehensive: NOT for dense extraction

### 4. Simplify Metadata

Remove confusing technical details:

- Don't mention "searches" (confusing)
- Focus on use cases and outcomes
- Keep token budgets accurate

## Proposed New Descriptions

### Quick Fact Search

```
Fast factual lookup for simple questions and definitions.
Use for: "What is...", "Define...", single-fact queries.
Returns: Concise answer with sources (10 results analyzed).
Speed: 2-3s | Tokens: 1-2K | Best for: Speed over depth.
```

### Standard Research

```
Balanced research for explanations and overviews.
Use for: "Explain...", "Tell me about...", "How does...".
Returns: Comprehensive answer with full source content (10 results with details).
Speed: 3-5s | Tokens: 3-5K | Best for: Balanced depth and speed.
```

### Deep Research

```
Deep analysis of dense legal content and specific provisions.
Use for: "Analyze...", "Extract...", "Break down...", detailed case law.
Returns: Detailed analysis with full source text (10 results with complete content).
Speed: 3-5s | Tokens: 3-5K | Best for: Extracting precise information from dense sources.
NOT for: Broad surveys or trend analysis (use comprehensive instead).
```

### Comprehensive Research

```
Broad analysis across many sources to identify trends and patterns.
Use for: "What are trends...", "Compare perspectives...", "Survey...".
Returns: Synthesis with pattern analysis (10-20 results from multiple searches).
Speed: 8-15s | Tokens: 5-10K | Best for: Understanding how different sources view a topic.
NOT for: Dense content extraction (use deep instead).
```

## Impact on LLM Decision Making

### Current State

The LLM might be confused by:

- Outdated token budgets
- Confusing "search" terminology
- Unclear distinctions between tools

### After Update

The LLM will have:

- ✅ Accurate performance expectations
- ✅ Clear use case distinctions
- ✅ Better understanding of when NOT to use each tool
- ✅ Simplified, actionable metadata

## Conclusion

**Current metadata is PARTIALLY sufficient** but has issues:

- ✅ Use cases are clear
- ✅ Examples are good
- ❌ Technical details are outdated
- ❌ Token budgets are wrong
- ❌ Terminology is confusing

**Recommendation:** Update all tool descriptions to match V2 workflow reality.
