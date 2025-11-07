# Zuva Case Fix - Complete Implementation Plan

## Overview

This plan implements query enhancement and domain improvements to ensure landmark cases like Zuva are found reliably.

## Pre-Implementation Checklist

- [x] Max results increased to 20 (already done by you)
- [ ] Understand query enhancement (see QUERY_ENHANCEMENT_EXPLAINED.md)
- [ ] Backup current code
- [ ] Test current behavior with "zuva case" query

## Implementation Steps

### Phase 1: Core Query Enhancement (30 min)

#### Step 1.1: Create Query Enhancement Utility

**File:** `lib/utils/query-enhancement.ts` (NEW FILE)

**Purpose:** Centralized query detection and enhancement logic

**Code:**

```typescript
/**
 * Query Enhancement Utilities
 *
 * Intelligently enhances search queries based on detected intent.
 * Particularly important for legal case queries.
 */

/**
 * Detect if query is asking about a legal case
 */
export function detectCaseQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Negative patterns - exclude these first
  const negativePatterns = [
    /in case of/i,
    /just in case/i,
    /in any case/i,
    /in this case/i,
    /use case/i,
  ];

  if (negativePatterns.some((p) => p.test(query))) {
    return false;
  }

  // Positive patterns - indicators of case queries
  const casePatterns = [
    /\sv\s/i, // "X v Y"
    /\svs\.?\s/i, // "X vs Y" or "X vs. Y"
    /\s&\s.*\sv\s/i, // "X & Another v Y"
    /in\s+re\s+/i, // "In re X"
    /\[20\d{2}\]/, // Citation like [2023]
    /SC\s*\d+\/\d+/i, // SC 43/15
    /CCZ\s*\d+\/\d+/i, // CCZ 11/23
    /ZWSC|ZWHHC|ZWCC/i, // Zimbabwe court codes
    /\bcase\s+(?:name|law|of)\b/i, // "case name", "case law", "case of"
    /landmark\s+case/i, // "landmark case"
    /court\s+case/i, // "court case"
    /legal\s+case/i, // "legal case"
    /\bcase\b.*\bcourt\b/i, // "case" and "court" in query
  ];

  return casePatterns.some((pattern) => pattern.test(query));
}

/**
 * Detect if query is asking about a statute/legislation
 */
export function detectStatuteQuery(query: string): boolean {
  const statutePatterns = [
    /section\s+\d+/i, // "Section 12"
    /chapter\s+\d+/i, // "Chapter 28"
    /act\s+\d+/i, // "Act 17"
    /\bact\b.*\bchapter\b/i, // "Act" and "Chapter"
    /statute/i, // "statute"
    /legislation/i, // "legislation"
  ];

  return statutePatterns.some((pattern) => pattern.test(query));
}

/**
 * Get query type
 */
export type QueryType = "case" | "statute" | "general";

export function getQueryType(query: string): QueryType {
  if (detectCaseQuery(query)) return "case";
  if (detectStatuteQuery(query)) return "statute";
  return "general";
}

/**
 * Enhance query based on detected type
 */
export function enhanceQuery(
  query: string,
  jurisdiction: string = "Zimbabwe"
): string {
  const type = getQueryType(query);

  switch (type) {
    case "case":
      // Add legal case context
      return `${query} ${jurisdiction} Supreme Court case law judgment legal case`;

    case "statute":
      // Add legislation context
      return `${query} ${jurisdiction} legislation statute law`;

    case "general":
      // Just add jurisdiction
      return `${query} ${jurisdiction}`;
  }
}

/**
 * Get optimal search parameters based on query type
 */
export interface SearchParameters {
  maxResults: number;
  domainStrategy: "strict" | "prioritized" | "open";
  researchDepth: "quick" | "standard" | "deep" | "comprehensive";
}

export function getOptimalSearchParameters(query: string): SearchParameters {
  const type = getQueryType(query);

  switch (type) {
    case "case":
      return {
        maxResults: 20, // More results for cases
        domainStrategy: "strict", // Only authoritative sources
        researchDepth: "deep", // Thorough search
      };

    case "statute":
      return {
        maxResults: 15,
        domainStrategy: "strict",
        researchDepth: "deep",
      };

    case "general":
      return {
        maxResults: 20, // You've set this globally
        domainStrategy: "prioritized",
        researchDepth: "standard",
      };
  }
}
```

#### Step 1.2: Update Advanced Search Workflow

**File:** `mastra/workflows/advanced-search-workflow.ts`

**Changes:**

1. Import the new utility at the top
2. Use it in the search step

**Add import (line ~10):**

```typescript
import {
  enhanceQuery,
  getOptimalSearchParameters,
  getQueryType,
} from "@/lib/utils/query-enhancement";
```

**Replace lines 150-165 (the search execution) with:**

```typescript
try {
  // Enhance query based on detected type
  const enhancedQuery = enhanceQuery(query, jurisdiction);
  const searchParams = getOptimalSearchParameters(query);
  const queryType = getQueryType(query);

  console.log(`[Advanced Search] Query type: ${queryType}`);
  console.log(`[Advanced Search] Original: "${query}"`);
  console.log(`[Advanced Search] Enhanced: "${enhancedQuery}"`);

  // Execute advanced search with enhanced query and optimal parameters
  const searchResults = await tavilySearchAdvancedTool.execute({
    context: {
      query: enhancedQuery,  // ← Enhanced query
      maxResults: searchParams.maxResults,
      jurisdiction,
      includeRawContent: true,
      domainStrategy: searchParams.domainStrategy,  // ← Adaptive strategy
      researchDepth: searchParams.researchDepth,    // ← Adaptive depth
    },
    runtimeContext,
  });

  // Rest of the code stays the same...
```

### Phase 2: Domain List Enhancement (15 min)

#### Step 2.1: Check Zimbabwe Domains File

**File:** `lib/utils/zimbabwe-domains.ts`

**Action:** Read the file to see current domain list

#### Step 2.2: Add Missing Domains

**Add these domains to appropriate tiers:**

```typescript
// Tier 1: Primary Legal Authority (if not already there)
"lawportalzim.co.zw",
"veritaszim.net",

// Tier 2: Secondary Authority (if not already there)
"ohrh.law.ox.ac.uk",      // Oxford Human Rights Hub
"ahrlj.up.ac.za",         // African Human Rights Law Journal
"scielo.org.za",          // African legal journals
"ggg.co.zw",              // Gill, Godlonton & Gerrans (law firm)
```

### Phase 3: Testing (20 min)

#### Test Cases

**Test 1: Direct Case Name**

```
Query: "Don Nyamande & Another v Zuva Petroleum (Pvt) Ltd"
Expected: Should find the case
Check: Look for lawportalzim.co.zw or veritaszim.net in results
```

**Test 2: Informal Case Reference**

```
Query: "What about the zuva case?"
Expected: Should find the case
Check: Should detect as case query and enhance
```

**Test 3: Citation Search**

```
Query: "SC 43/15"
Expected: Should find Zuva case
Check: Should detect as case query
```

**Test 4: General Query (Should NOT Enhance)**

```
Query: "How does the Labour Act protect workers?"
Expected: Should NOT add case context
Check: Query should only have "Zimbabwe" added
```

**Test 5: False Positive Check**

```
Query: "In case of dismissal, what are my rights?"
Expected: Should NOT detect as case query
Check: Should be treated as general query
```

### Phase 4: Monitoring & Validation (Ongoing)

#### Add Logging

**File:** `mastra/workflows/advanced-search-workflow.ts`

**Add after search results:**

```typescript
// Log search effectiveness
console.log(`[Advanced Search] Results breakdown:`, {
  total: searchResults.results.length,
  courtCases: classifiedResults.filter((r) => r.sourceType === "court-case")
    .length,
  zimbabweDomains: classifiedResults.filter(
    (r) =>
      r.url.includes(".zw") ||
      r.url.includes("zimlii") ||
      r.url.includes("lawportal") ||
      r.url.includes("veritaszim")
  ).length,
});
```

## Rollback Plan

If something breaks:

1. **Remove query enhancement:**

   ```typescript
   // In advanced-search-workflow.ts, revert to:
   query: `${query} ${jurisdiction}`,
   ```

2. **Revert domain changes:**

   - Restore `lib/utils/zimbabwe-domains.ts` from backup

3. **Check logs:**
   - Look for errors in console
   - Check if Tavily API calls are failing

## Success Criteria

✅ **Must Have:**

- [ ] "zuva case" query returns relevant results
- [ ] "Nyamande v Zuva" query returns the case
- [ ] No false positives on general queries
- [ ] No increase in API errors

✅ **Nice to Have:**

- [ ] Citation searches work (e.g., "SC 43/15")
- [ ] Related cases are found
- [ ] Response time < 10 seconds

## Risk Assessment

| Risk                      | Likelihood | Impact   | Mitigation                               |
| ------------------------- | ---------- | -------- | ---------------------------------------- |
| False positive detection  | Medium     | Low      | Negative patterns filter common phrases  |
| Over-enhancement          | Low        | Low      | Enhancement is additive, not restrictive |
| Token cost increase       | High       | Very Low | Only ~10 tokens per query                |
| API rate limits           | Low        | Medium   | Already using 20 max results             |
| Breaking existing queries | Low        | High     | Extensive testing before deployment      |

## Timeline

- **Phase 1:** 30 minutes (Core enhancement)
- **Phase 2:** 15 minutes (Domain updates)
- **Phase 3:** 20 minutes (Testing)
- **Phase 4:** Ongoing (Monitoring)

**Total:** ~65 minutes for initial implementation

## Next Steps

1. ✅ Review this plan
2. ⏳ Read QUERY_ENHANCEMENT_EXPLAINED.md
3. ⏳ Backup current code
4. ⏳ Implement Phase 1
5. ⏳ Test with "zuva case" query
6. ⏳ Implement Phase 2
7. ⏳ Full testing suite
8. ⏳ Deploy and monitor

## Questions to Answer Before Starting

1. Do you want to implement all phases at once or incrementally?
2. Should we add more logging for debugging?
3. Do you want to test in a separate branch first?
4. Should we add unit tests for the detection functions?

Let me know when you're ready to proceed!
