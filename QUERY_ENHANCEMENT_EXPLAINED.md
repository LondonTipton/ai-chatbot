# Query Enhancement Strategy - Detailed Explanation

## What is Query Enhancement?

Query enhancement is the process of **intelligently adding context to user queries** before sending them to the search engine. It's like having a librarian who understands what you're really looking for.

## The Problem

### Current Behavior:

```
User asks: "What about the zuva case?"
System searches: "What about the zuva case? Zimbabwe"
                  ↑ Just adds jurisdiction
```

**Why this fails:**

- Tavily doesn't know "zuva case" is a legal case name
- No context about it being a Supreme Court judgment
- No keywords like "employment", "labour", "dismissal"
- Tavily might return news articles, blog posts, or nothing

### What We Need:

```
User asks: "What about the zuva case?"
System detects: This is a legal case query (has "case" + proper noun)
System searches: "Zuva Zimbabwe Supreme Court case law judgment employment labour"
                  ↑ Rich context helps Tavily find authoritative sources
```

## How Query Enhancement Works

### Step 1: Detection

```typescript
function detectCaseQuery(query: string): boolean {
  const casePatterns = [
    /\sv\s/i, // "X v Y" (Nyamande v Zuva)
    /\svs\.?\s/i, // "X vs Y" or "X vs. Y"
    /\s&\s.*\sv\s/i, // "X & Another v Y"
    /in\s+re\s+/i, // "In re X"
    /\[20\d{2}\]/, // Citation like [2023]
    /SC\s*\d+\/\d+/i, // SC 43/15
    /CCZ\s*\d+\/\d+/i, // CCZ 11/23
    /case/i, // Contains word "case"
  ];

  return casePatterns.some((pattern) => pattern.test(query));
}
```

**Examples:**

- ✅ "Don Nyamande v Zuva Petroleum" → Detected (has " v ")
- ✅ "What about the zuva case?" → Detected (has "case")
- ✅ "SC 43/15" → Detected (citation format)
- ❌ "How does the Labour Act work?" → Not detected (no case indicators)

### Step 2: Enhancement

```typescript
function enhanceQueryForCaseSearch(
  query: string,
  jurisdiction: string
): string {
  if (!detectCaseQuery(query)) {
    // Not a case query, just add jurisdiction
    return `${query} ${jurisdiction}`;
  }

  // It's a case query - add legal context
  const enhancements = [
    jurisdiction, // "Zimbabwe"
    "Supreme Court", // Court context
    "case law", // Legal context
    "judgment", // Document type
    "legal case", // Reinforcement
  ];

  return `${query} ${enhancements.join(" ")}`;
}
```

**Transformation Examples:**

| User Query          | Current Search               | Enhanced Search                                                       |
| ------------------- | ---------------------------- | --------------------------------------------------------------------- |
| "zuva case"         | "zuva case Zimbabwe"         | "zuva case Zimbabwe Supreme Court case law judgment legal case"       |
| "Nyamande v Zuva"   | "Nyamande v Zuva Zimbabwe"   | "Nyamande v Zuva Zimbabwe Supreme Court case law judgment legal case" |
| "SC 43/15"          | "SC 43/15 Zimbabwe"          | "SC 43/15 Zimbabwe Supreme Court case law judgment legal case"        |
| "Labour Act rights" | "Labour Act rights Zimbabwe" | "Labour Act rights Zimbabwe" (no enhancement)                         |

### Step 3: Adaptive Parameters

Based on detection, we also adjust search parameters:

```typescript
const searchResults = await tavilySearchAdvancedTool.execute({
  context: {
    query: enhanceQueryForCaseSearch(query, jurisdiction),

    // More results for case queries (you've already set to 20 ✓)
    maxResults: detectCaseQuery(query) ? 20 : 10,

    // Stricter domain filtering for cases
    domainStrategy: detectCaseQuery(query) ? "strict" : "prioritized",

    // Deeper search for cases
    researchDepth: detectCaseQuery(query) ? "deep" : "standard",
  },
});
```

## Why This Works

### 1. **Better Tavily Ranking**

Tavily's AI uses your query to understand intent. More context = better understanding.

```
Query: "zuva case"
Tavily thinks: "Could be any case, any jurisdiction, any topic"
Results: Random articles, maybe some Zimbabwe content

Query: "zuva case Zimbabwe Supreme Court case law judgment"
Tavily thinks: "This is a legal case from Zimbabwe Supreme Court"
Results: Legal databases, court websites, law journals
```

### 2. **Keyword Matching**

Legal sources use specific terminology:

- "judgment" appears on court websites
- "case law" appears on legal databases
- "Supreme Court" filters out lower courts

### 3. **Domain Prioritization**

When you use `domainStrategy: "strict"`, it searches ONLY in:

- zimlii.org
- lawportalzim.co.zw
- veritaszim.net
- parlzim.gov.zw
- etc.

This dramatically increases chances of finding authoritative sources.

## Advanced: Context-Aware Enhancement

We can make it even smarter by detecting query type:

```typescript
function getQueryType(query: string): "case" | "statute" | "general" {
  if (detectCaseQuery(query)) return "case";

  if (/section|chapter|act\s+\d+|statute/i.test(query)) {
    return "statute";
  }

  return "general";
}

function enhanceQuery(query: string, jurisdiction: string): string {
  const type = getQueryType(query);

  switch (type) {
    case "case":
      return `${query} ${jurisdiction} Supreme Court case law judgment`;

    case "statute":
      return `${query} ${jurisdiction} legislation statute law`;

    case "general":
      return `${query} ${jurisdiction}`;
  }
}
```

**Examples:**

| Query                        | Type    | Enhanced Query                                            |
| ---------------------------- | ------- | --------------------------------------------------------- |
| "zuva case"                  | case    | "zuva case Zimbabwe Supreme Court case law judgment"      |
| "Section 12B Labour Act"     | statute | "Section 12B Labour Act Zimbabwe legislation statute law" |
| "How to register a company?" | general | "How to register a company? Zimbabwe"                     |

## Real-World Impact

### Before Enhancement:

```
User: "What about the zuva case?"
Search: "What about the zuva case? Zimbabwe"
Results:
  1. News article about Zuva Petroleum company
  2. Blog post mentioning "case studies"
  3. Wikipedia page about Zimbabwe
  4. (No actual court case found)
Response: "I'm sorry—I wasn't able to retrieve information..."
```

### After Enhancement:

```
User: "What about the zuva case?"
Detected: Case query
Search: "zuva case Zimbabwe Supreme Court case law judgment legal case"
Results:
  1. lawportalzim.co.zw - Full judgment text
  2. veritaszim.net - Case summary
  3. ohrh.law.ox.ac.uk - Legal analysis
  4. ahrlj.up.ac.za - Academic commentary
Response: "The Zuva case (Nyamande & Another v Zuva Petroleum SC 43/15)..."
```

## Implementation Considerations

### 1. **Token Cost**

Enhanced queries are longer, but:

- Only adds ~5-10 tokens per query
- Dramatically improves result quality
- Reduces need for retry searches
- **Net benefit: Positive**

### 2. **False Positives**

What if we wrongly detect a case query?

```typescript
// Example: "In case of emergency, what are my rights?"
// Detected as case query because of "case"

// Solution: Add negative patterns
function detectCaseQuery(query: string): boolean {
  // Exclude common phrases
  const negativePatterns = [
    /in case of/i,
    /just in case/i,
    /in any case/i,
    /in this case/i,
  ];

  if (negativePatterns.some((p) => p.test(query))) {
    return false;
  }

  // Then check positive patterns
  const casePatterns = [
    /\sv\s/i,
    /case\s+name/i,
    /case\s+law/i,
    // ...
  ];

  return casePatterns.some((p) => p.test(query));
}
```

### 3. **Over-Enhancement**

Can we add too much context?

**Answer:** Yes, but unlikely. Tavily handles long queries well. However, we should:

- Keep enhancements relevant
- Avoid redundancy
- Test with various query lengths

## Testing Strategy

After implementation, test with:

### Case Queries (Should Enhance):

- ✅ "zuva case"
- ✅ "Nyamande v Zuva Petroleum"
- ✅ "SC 43/15"
- ✅ "What landmark cases concern the Labour Act?"

### Non-Case Queries (Should NOT Enhance):

- ❌ "How does the Labour Act work?"
- ❌ "What are my employment rights?"
- ❌ "In case of dismissal, what should I do?"

### Edge Cases:

- 🤔 "case law on employment" (Should enhance - contains "case law")
- 🤔 "landmark cases" (Should enhance - plural "cases" in legal context)

## Summary

**Query enhancement is like adding GPS coordinates to a vague address:**

- **Without:** "Find the Zuva place" → Search everywhere, find nothing
- **With:** "Find Zuva at Supreme Court, Legal District, Zimbabwe" → Direct hit

It's a **simple but powerful technique** that:

1. Costs almost nothing (few extra tokens)
2. Dramatically improves search quality
3. Reduces false negatives
4. Makes your system appear more intelligent

The key is **smart detection** + **relevant context** + **adaptive parameters**.
