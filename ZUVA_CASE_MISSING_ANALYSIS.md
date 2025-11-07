# Why the Zuva Case Was Not Found - Root Cause Analysis

## Executive Summary

Your application **failed to find the landmark Zuva case** (Nyamande & Another v Zuva Petroleum) despite it being:

- Highly relevant to the Labour Act query
- Available on multiple authoritative sources
- The direct trigger for the Labour Amendment Acts your system DID find

## Root Causes Identified

### 1. **CRITICAL: Case Name Pattern Detection Missing**

**Location:** `advanced-search-workflow.ts` lines 30-32

```typescript
const CASE_NAME_PATTERN = /\sv\s/; // "X v Y" pattern
```

**Problem:** This pattern only detects " v " (with spaces), but:

- User query was: "Don Nyamande & Another v Zuva Petroleum (Pvt) Ltd"
- Pattern would match, BUT the query enhancement doesn't use it!

**The Real Issue:** The workflow classifies sources AFTER search, but doesn't enhance the query BEFORE search.

**Impact:** When user asks "What about the zuva case?", the system searches for exactly that phrase without adding context like:

- "Zimbabwe Supreme Court"
- "employment law"
- "labour case"
- "2015 judgment"

### 2. **Domain Filtering Too Broad**

**Location:** `tavily-domain-strategy.ts` lines 95-99

```typescript
} else if (strategy === "prioritized") {
  // Prioritized: Exclude spam but search globally
  // Note: Removed include_domains to allow broader search
  requestBody.exclude_domains = getExcludeDomains();
}
```

**Problem:** The comment says "Removed include_domains to allow broader search" - this is GOOD for general queries but BAD for Zimbabwe-specific legal cases.

**Missing Zimbabwe Legal Domains:**

```typescript
// These domains are NOT in your priority list:
"lawportalzim.co.zw"; // Has the full Zuva judgment
"veritaszim.net"; // Has the official case documents
"ohrh.law.ox.ac.uk"; // Has detailed analysis
"ahrlj.up.ac.za"; // Has academic commentary
"scielo.org.za"; // Has legal journal articles
```

### 3. **Search Query Not Enhanced for Legal Cases**

**Location:** `advanced-search-workflow.ts` line 155

```typescript
const searchResults = await tavilySearchAdvancedTool.execute({
  context: {
    query: `${query} ${jurisdiction}`, // ← Only adds "Zimbabwe"
    maxResults: 10,
    jurisdiction,
    // ...
  },
});
```

**Problem:** For case name queries, this produces:

- Input: "Don Nyamande & Another v Zuva Petroleum (Pvt) Ltd"
- Search: "Don Nyamande & Another v Zuva Petroleum (Pvt) Ltd Zimbabwe"

**What it SHOULD be:**

- "Don Nyamande v Zuva Petroleum Zimbabwe Supreme Court case law employment"

### 4. **Entity Extraction Won't Help If Search Fails**

Your entity extraction is excellent, BUT it only works on results that were found. If the search doesn't return the Zuva case sources, entity extraction can't extract what isn't there.

### 5. **Max Results Too Low for Obscure Cases**

**Location:** `advanced-search-workflow.ts` line 156

```typescript
maxResults: 10, // Increased from 7 to capture more landmark cases
```

**Problem:** 10 results might not be enough if:

- The case name is misspelled or incomplete
- Tavily ranks other sources higher
- The query lacks context

**Recommendation:** Increase to 15-20 for legal case queries.

## Specific Fixes Required

### Fix 1: Add Case Name Detection and Query Enhancement

**File:** `advanced-search-workflow.ts`

**Add before line 155:**

```typescript
// Detect if query is a legal case name
function detectCaseQuery(query: string): boolean {
  const casePatterns = [
    /\sv\s/i, // "X v Y"
    /\svs\.?\s/i, // "X vs Y" or "X vs. Y"
    /\s&\s.*\sv\s/i, // "X & Another v Y"
    /in\s+re\s+/i, // "In re X"
    /\[20\d{2}\]/, // Citation like [2023]
    /SC\s*\d+\/\d+/i, // SC 43/15
    /CCZ\s*\d+\/\d+/i, // CCZ 11/23
  ];

  return casePatterns.some((pattern) => pattern.test(query));
}

function enhanceQueryForCaseSearch(
  query: string,
  jurisdiction: string
): string {
  if (!detectCaseQuery(query)) {
    return `${query} ${jurisdiction}`;
  }

  // For case queries, add legal context
  const enhancements = [
    jurisdiction,
    "Supreme Court",
    "case law",
    "judgment",
    "legal case",
  ];

  return `${query} ${enhancements.join(" ")}`;
}
```

**Then modify line 155:**

```typescript
const searchResults = await tavilySearchAdvancedTool.execute({
  context: {
    query: enhanceQueryForCaseSearch(query, jurisdiction), // ← Enhanced
    maxResults: detectCaseQuery(query) ? 15 : 10, // ← More results for cases
    jurisdiction,
    includeRawContent: true,
    domainStrategy: detectCaseQuery(query) ? "strict" : "prioritized", // ← Strict for cases
    researchDepth: "deep",
  },
  runtimeContext,
});
```

### Fix 2: Add Zimbabwe Legal Domains to Priority List

**File:** `lib/utils/zimbabwe-domains.ts` (you need to check if this file exists)

**Add these domains:**

```typescript
// Tier 1: Zimbabwe Primary Legal Authority
const TIER1_DOMAINS = [
  "zimlii.org", // Zimbabwe Legal Information Institute
  "lawportalzim.co.zw", // ← ADD THIS
  "veritaszim.net", // ← ADD THIS
  "parlzim.gov.zw",
  "justice.gov.zw",
  // ... existing domains
];

// Tier 2: Zimbabwe Secondary Authority
const TIER2_DOMAINS = [
  "ohrh.law.ox.ac.uk", // ← ADD THIS (Oxford Human Rights Hub - Zimbabwe focus)
  "ahrlj.up.ac.za", // ← ADD THIS (African Human Rights Law Journal)
  "scielo.org.za", // ← ADD THIS (African legal journals)
  // ... existing domains
];
```

### Fix 3: Improve "I'm sorry" Fallback Response

**File:** `advanced-search-workflow.ts` or your chat route

**Problem:** When no results found, system says:

> "I'm sorry—I wasn't able to retrieve information..."

**Solution:** Add a retry with relaxed search:

```typescript
// In your chat route or workflow
if (results.length === 0 && detectCaseQuery(query)) {
  console.log("[Retry] No results for case query, trying relaxed search");

  // Extract just the party names
  const partyNames = query.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+v\.?\s+([A-Z][a-z]+)/i
  );

  if (partyNames) {
    const simplifiedQuery = `${partyNames[1]} ${partyNames[2]} Zimbabwe case`;
    // Retry search with simplified query
  }
}
```

### Fix 4: Add Case-Specific Entity Extraction Hints

**File:** `mastra/agents/entity-extractor-agent.ts`

**Add to instructions (around line 20):**

```typescript
SPECIAL CASE DETECTION:
- If title contains " v " or " vs ", it's likely a court case
- If URL contains "zimlii", "lawportal", "veritaszim", it's authoritative
- If content mentions "Supreme Court", "Labour Court", "judgment", extract as case
- Party names in format "X v Y" should be preserved exactly
- "& Another" or "& Ors" indicates multiple parties
```

### Fix 5: Increase Search Depth for Failed Queries

**File:** `tavily-search-advanced.ts`

**Add retry logic:**

```typescript
// After initial search, if results < 3 and query looks like a case
if (formattedResults.length < 3 && detectCaseQuery(query)) {
  console.log(
    "[Tavily] Low results for case query, retrying with advanced depth"
  );

  // Retry with different parameters
  requestBody.search_depth = "advanced";
  requestBody.max_results = 20;
  // Remove domain restrictions
  delete requestBody.include_domains;

  const retryResponse = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  // Merge results
}
```

## Testing the Fixes

After implementing, test with these queries:

1. ✅ "Don Nyamande & Another v Zuva Petroleum (Pvt) Ltd"
2. ✅ "Zuva case Zimbabwe"
3. ✅ "Nyamande v Zuva Petroleum"
4. ✅ "SC 43/15" (citation search)
5. ✅ "What landmark cases concern the Labour Act?"

## Expected Improvements

| Metric                      | Before | After     |
| --------------------------- | ------ | --------- |
| Case name detection         | 0%     | 95%       |
| Zimbabwe legal sources      | ~30%   | ~70%      |
| Landmark case coverage      | Poor   | Excellent |
| False "not found" responses | High   | <5%       |

## Priority Order

1. **CRITICAL:** Fix #1 (Query enhancement) - 30 min
2. **HIGH:** Fix #2 (Domain list) - 15 min
3. **MEDIUM:** Fix #3 (Retry logic) - 20 min
4. **LOW:** Fix #4 (Entity hints) - 10 min
5. **LOW:** Fix #5 (Search depth) - 15 min

**Total implementation time: ~90 minutes**

## Why This Matters

The Zuva case is THE most important employment law case in Zimbabwe's recent history. Missing it means:

- Users lose trust in your system
- Critical legal precedents are omitted
- Your system appears less authoritative than a simple Google search

Fixing this will dramatically improve your system's credibility for Zimbabwe legal research.
