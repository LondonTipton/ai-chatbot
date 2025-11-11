# Tavily Configuration - Complete Codebase Map

**Date:** November 11, 2025  
**Status:** DOCUMENTED

---

## Executive Summary

Your codebase uses **TWO APPROACHES** for Tavily integration:

1. **SIMPLIFIED (Current/Active)** - Minimal configuration, matches MCP Tavily behavior
2. **LEGACY (Inactive)** - Complex domain filtering and prioritization (not currently used)

**Current Status:** You're using the **SIMPLIFIED** approach after discovering complex filtering was causing issues.

---

## Current Active Configuration (SIMPLIFIED)

### Core Tavily Tools (2 files)

#### 1. Basic Search Tool

**File:** `mastra/tools/tavily-search.ts`

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  max_results: maxResults, // Default: 10
};
```

**Features:**

- ✅ Minimal configuration (matches MCP)
- ✅ No domain filtering
- ✅ No search depth override
- ✅ No include_domains or exclude_domains
- ✅ Just query + max_results

**Used by:**

- Basic search workflow V2
- Simple search workflow

---

#### 2. Advanced Search Tool

**File:** `mastra/tools/tavily-search-advanced.ts`

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  search_depth: "advanced", // Only difference from basic
  max_results: validMaxResults, // Default: 10, max: 20
  include_raw_content: includeRawContent, // Default: false
};
```

**Features:**

- ✅ Minimal configuration (matches MCP)
- ✅ Advanced search depth for better results
- ✅ Optional raw content inclusion
- ✅ No domain filtering
- ✅ No include_domains or exclude_domains

**Used by:**

- Advanced search workflow V2
- High advance search workflow V2
- Comprehensive analysis workflow V2

---

## Legacy Configuration (INACTIVE)

### Domain Strategy System

**Files:**

- `lib/utils/tavily-domain-strategy.ts` - Strategy logic
- `lib/utils/zimbabwe-domains.ts` - Domain lists

**Status:** ⚠️ **NOT CURRENTLY USED** by active workflows

**Why it exists:**

- Originally built for domain prioritization
- Discovered it was over-filtering results
- Simplified approach works better

**What it provides:**

```typescript
// Three strategies
type DomainStrategy = "strict" | "prioritized" | "open";

// Four research depths
type ResearchDepth = "quick" | "standard" | "deep" | "comprehensive";

// Functions
getExcludeDomains(); // Spam/low-quality domains to exclude
getPriorityDomains(); // Zimbabwe legal domains to prioritize
buildTavilyRequestBody(); // Build request with domain filtering
```

**Domain tiers:**

- **Tier 1:** Government & Courts (zimlii.org, gov.zw, parlzim.gov.zw)
- **Tier 2:** Legal professionals (zlsc.co.zw, veritaszim.net)
- **Tier 3:** Regional sources (saflii.org, africanlii.org)
- **Tier 4:** News (herald.co.zw, newsday.co.zw)

---

## Other Tavily Tools (Legacy/Specialized)

### 3. Tavily QNA Tool

**File:** `mastra/tools/tavily-qna.ts`

**Status:** ⚠️ Uses legacy domain strategy

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  search_depth: "basic",
  max_results: 5,
  include_answer: true,
  // Uses domain strategy functions:
  include_domains: getPriorityDomains(depth), // If strict
  exclude_domains: getExcludeDomains(), // If prioritized/open
};
```

**Used by:** Not currently used in main workflows

---

### 4. Tavily QNA Direct Tool

**File:** `mastra/tools/tavily-qna-direct.ts`

**Status:** ⚠️ Uses legacy domain strategy

**Similar to tavily-qna.ts but with direct answer focus**

**Used by:** Not currently used in main workflows

---

### 5. Tavily Context Search Tool

**File:** `mastra/tools/tavily-context-search.ts`

**Status:** ⚠️ Uses legacy domain strategy

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  search_depth: "advanced",
  max_results: 10,
  include_raw_content: true,
  // Uses domain strategy
};
```

**Used by:** Not currently used in main workflows

---

### 6. Tavily News Search Tool

**File:** `mastra/tools/tavily-news-search.ts`

**Status:** ⚠️ Uses legacy domain strategy

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  query,
  topic: "news", // News-specific
  days: 30, // Last 30 days
  max_results: 10,
  // Uses domain strategy
};
```

**Used by:** Not currently used in main workflows

---

### 7. Tavily Extract Tool

**File:** `mastra/tools/tavily-extract.ts`

**Status:** ✅ Active (used in comprehensive workflows)

**Configuration:**

```typescript
const requestBody = {
  api_key: process.env.TAVILY_API_KEY,
  urls: urls, // Extract content from specific URLs
};
```

**Features:**

- Extracts content from specific URLs
- No search, just content extraction
- Used after search to get full content

**Used by:**

- Enhanced comprehensive workflow V2
- Comprehensive analysis workflow V2

---

### 8. Tavily Summarize Tool

**File:** `mastra/tools/tavily-summarize.ts`

**Status:** ✅ Active (utility tool)

**Not a search tool** - Summarizes long content locally

**Used by:** Content summarization in workflows

---

## Workflow Usage Map

### Active Workflows (Using Simplified Tavily)

#### 1. Basic Search Workflow V2

**File:** `mastra/workflows/basic-search-workflow-v2.ts`

**Tavily tool:** `tavilySearchTool`
**Configuration:** Minimal (query + max_results: 10)

---

#### 2. Advanced Search Workflow V2

**File:** `mastra/workflows/advanced-search-workflow-v2.ts`

**Tavily tool:** `tavilySearchAdvancedTool`
**Configuration:**

```typescript
{
  query: enhancedQuery,
  maxResults: 10,
  includeRawContent: true,  // Full source text
}
```

---

#### 3. High Advance Search Workflow V2

**File:** `mastra/workflows/high-advance-search-workflow-v2.ts`

**Tavily tool:** `tavilySearchAdvancedTool`
**Configuration:**

```typescript
{
  query: enhancedQuery,
  maxResults: 10,
  includeRawContent: false,  // Summaries only
}
```

---

#### 4. Comprehensive Analysis Workflow V2

**File:** `mastra/workflows/comprehensive-analysis-workflow-v2.ts`

**Tavily tools:**

- `tavilySearchAdvancedTool` (initial search)
- `tavilyExtractTool` (follow-up extraction)

**Configuration:**

```typescript
// Initial search
{
  query: enhancedQuery,
  maxResults: 10,
  includeRawContent: true,
}

// Follow-up searches
{
  query: gapQuery,
  maxResults: 5,
  includeRawContent: false,
}
```

---

#### 5. Enhanced Comprehensive Workflow V2

**File:** `mastra/workflows/enhanced-comprehensive-workflow-v2.ts`

**Tavily tools:**

- `tavilySearchAdvancedTool` (initial search)
- `tavilyExtractTool` (content extraction)

**Configuration:**

```typescript
// Initial search
{
  query: enhancedQuery,
  maxResults: 10,
  includeRawContent: true,
}

// Gap analysis searches
{
  query: gapQuery,
  maxResults: 5,
  includeRawContent: false,
}
```

---

## Environment Configuration

### Required Environment Variable

**File:** `.env.local` (or `.env`)

```bash
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxxx
```

**Where it's used:**

- All Tavily tools check `process.env.TAVILY_API_KEY`
- Throws error if not configured

**Get API key:** https://tavily.com

---

## Query Enhancement Integration

### How Queries Reach Tavily

```
1. User query
   ↓
2. Query Enhancer Agent (mastra/agents/query-enhancer-agent.ts)
   ↓
3. Enhanced query with context
   ↓
4. Workflow passes to Tavily tool
   ↓
5. Tavily tool sends to API
   ↓
6. Results returned
```

### Example Flow

**User:** "What about the zuva case?"
**Context:** Previous discussion about labour law

```typescript
// Step 1: Query enhancement
const enhanced = await enhanceSearchQuery(
  "What about the zuva case?",
  conversationHistory  // ✅ Now includes context
);
// Result: "zuva case Zimbabwe Supreme Court labour law employment judgment"

// Step 2: Tavily search
const results = await tavilySearchAdvancedTool.execute({
  context: {
    query: enhanced,  // Enhanced query
    maxResults: 10,
    includeRawContent: true,
  },
});

// Step 3: Tavily API request
{
  api_key: "tvly-xxx",
  query: "zuva case Zimbabwe Supreme Court labour law employment judgment",
  search_depth: "advanced",
  max_results: 10,
  include_raw_content: true
}
```

---

## Configuration Philosophy

### Why Simplified?

**Before (Complex):**

```typescript
{
  api_key: "...",
  query: "zuva case",
  search_depth: "advanced",
  max_results: 10,
  include_domains: ["zimlii.org", "veritaszim.net", ...],  // 60+ domains
  exclude_domains: ["reddit.com", "quora.com", ...],       // 20+ domains
  topic: "general",
  country: "ZW",
}
```

**Problems:**

- ❌ Over-filtering (missed relevant results)
- ❌ Too restrictive (excluded valid sources)
- ❌ Complex to maintain
- ❌ Didn't match MCP behavior (which works well)

**After (Simplified):**

```typescript
{
  api_key: "...",
  query: "zuva case Zimbabwe Supreme Court labour law employment judgment",
  search_depth: "advanced",
  max_results: 10,
  include_raw_content: true
}
```

**Benefits:**

- ✅ Lets Tavily's AI do the filtering
- ✅ Better query enhancement compensates
- ✅ Matches MCP behavior (proven to work)
- ✅ Simpler to maintain
- ✅ More flexible results

---

## Key Insights

### 1. Query Quality > Domain Filtering

**Better approach:**

```
Good query + minimal config > Poor query + complex filtering
```

**Example:**

- ❌ "zuva case" + strict domain filtering = No results
- ✅ "zuva case Zimbabwe Supreme Court labour law employment judgment" + minimal config = Perfect results

### 2. Tavily's AI is Smart

Tavily's ranking algorithm already:

- Understands legal queries
- Prioritizes authoritative sources
- Filters spam automatically
- Ranks by relevance

**Our job:** Provide good queries, let Tavily do its job

### 3. Context is King

With conversation history now flowing to tools:

- Query enhancer produces better queries
- Better queries = better Tavily results
- Better results = less hallucination

---

## Troubleshooting

### Issue: No Results Found

**Check:**

1. ✅ Is `TAVILY_API_KEY` set?
2. ✅ Is query enhanced properly?
3. ✅ Check Tavily API logs

**Don't:**

- ❌ Add domain filtering (makes it worse)
- ❌ Restrict to Zimbabwe domains only
- ❌ Over-configure the request

**Do:**

- ✅ Improve query enhancement
- ✅ Add more context keywords
- ✅ Let Tavily search globally

---

### Issue: Wrong Results

**Check:**

1. ✅ Is query specific enough?
2. ✅ Does query include jurisdiction?
3. ✅ Is conversation history flowing?

**Fix:**

- ✅ Improve query enhancement
- ✅ Add legal domain keywords
- ✅ Include case type (employment, property, etc.)

---

### Issue: Too Many Irrelevant Results

**Check:**

1. ✅ Is query too generic?
2. ✅ Missing legal context?

**Fix:**

- ✅ Add "Zimbabwe" to query
- ✅ Add "Supreme Court" or "High Court"
- ✅ Add legal domain (labour law, property law)
- ✅ Add "judgment" or "case law"

---

## Migration History

### Phase 1: Complex Domain Strategy (Deprecated)

- Built comprehensive domain lists
- Implemented tier-based prioritization
- Created strategy selection logic
- **Result:** Over-filtering, missed results

### Phase 2: Simplified Approach (Current)

- Removed domain filtering
- Focused on query enhancement
- Matched MCP behavior
- **Result:** Better results, simpler code

### Phase 3: Context Integration (Recent)

- Added conversation history to tools
- Improved query enhancement with context
- **Result:** Even better follow-up handling

---

## Files Summary

### Active Files (Currently Used)

**Tavily Tools:**

1. ✅ `mastra/tools/tavily-search.ts` - Basic search
2. ✅ `mastra/tools/tavily-search-advanced.ts` - Advanced search
3. ✅ `mastra/tools/tavily-extract.ts` - Content extraction
4. ✅ `mastra/tools/tavily-summarize.ts` - Content summarization

**Workflows:** 5. ✅ `mastra/workflows/basic-search-workflow-v2.ts` 6. ✅ `mastra/workflows/advanced-search-workflow-v2.ts` 7. ✅ `mastra/workflows/high-advance-search-workflow-v2.ts` 8. ✅ `mastra/workflows/comprehensive-analysis-workflow-v2.ts` 9. ✅ `mastra/workflows/enhanced-comprehensive-workflow-v2.ts`

**Query Enhancement:** 10. ✅ `mastra/agents/query-enhancer-agent.ts`

---

### Legacy Files (Not Currently Used)

**Domain Strategy:**

1. ⚠️ `lib/utils/tavily-domain-strategy.ts` - Domain filtering logic
2. ⚠️ `lib/utils/zimbabwe-domains.ts` - Domain lists

**Legacy Tools:** 3. ⚠️ `mastra/tools/tavily-qna.ts` - QNA with domain filtering 4. ⚠️ `mastra/tools/tavily-qna-direct.ts` - Direct QNA 5. ⚠️ `mastra/tools/tavily-context-search.ts` - Context search with filtering 6. ⚠️ `mastra/tools/tavily-news-search.ts` - News search with filtering

**Status:** These files exist but are not used by active workflows. They use the legacy domain strategy approach.

---

## Recommendations

### Keep Using Simplified Approach

✅ **Current approach is working well:**

- Minimal configuration
- Better query enhancement
- Conversation history integration
- Matches proven MCP behavior

### Don't Reintroduce Domain Filtering

❌ **Avoid going back to:**

- Complex domain lists
- Strict filtering
- Over-configuration

### Focus on Query Quality

✅ **Continue improving:**

- Query enhancement with context
- Conversation history integration
- Multi-domain keyword addition for ambiguous queries

---

## Quick Reference

### Basic Tavily Search

```typescript
await tavilySearchTool.execute({
  context: {
    query: enhancedQuery,
    maxResults: 10,
  },
});
```

### Advanced Tavily Search

```typescript
await tavilySearchAdvancedTool.execute({
  context: {
    query: enhancedQuery,
    maxResults: 10,
    includeRawContent: true,
  },
});
```

### With Query Enhancement

```typescript
const enhanced = await enhanceSearchQuery(query, conversationHistory);

const results = await tavilySearchAdvancedTool.execute({
  context: {
    query: enhanced,
    maxResults: 10,
    includeRawContent: true,
  },
});
```

---

## Conclusion

Your Tavily configuration is **SIMPLE and EFFECTIVE**:

1. **Two main tools:** Basic and Advanced search
2. **Minimal configuration:** Just query + max_results + search_depth
3. **No domain filtering:** Let Tavily's AI handle it
4. **Focus on query quality:** Enhanced queries with context
5. **Proven approach:** Matches MCP behavior that works

**Status:** ✅ WELL-CONFIGURED  
**Recommendation:** Keep current approach, continue improving query enhancement

---

**Related Documentation:**

- `CONTEXT_LOSS_FIX_COMPLETE.md` - Conversation history integration
- `FOLLOW_UP_HALLUCINATION_ANALYSIS.md` - Root cause analysis
- `ALL_QUERY_MODIFICATIONS_FIXED.md` - Query modification cleanup
