# Legal Research Guide for DeepCounsel

This guide explains how DeepCounsel handles legal research queries using the Tavily search integration.

## Core Principle: Search First, Ask Later

DeepCounsel is configured to be **proactive** with web searches. When users ask about legal matters, the AI should:

1. ✅ Search immediately with available information
2. ✅ Analyze and present results
3. ✅ Perform follow-up searches if needed
4. ✅ Ask clarifying questions only after searching

❌ Do NOT ask for more details before searching
❌ Do NOT require full citations before searching
❌ Do NOT hesitate due to incomplete information

## Common Query Patterns

### 1. Partial Case References

**User Query:** "Tell me about the Bowers case"

**AI Action:**

```typescript
tavilySearch({
  query: "Bowers Zimbabwe court case",
  searchDepth: "advanced",
  maxResults: 7,
  includeDomains: ["zimlii.org"],
});
```

**Then:** Present results, identify the specific case, offer to search for more details

### 2. General Legal Topics

**User Query:** "What are the requirements for company registration?"

**AI Action:**

```typescript
tavilySearch({
  query: "Zimbabwe company registration requirements",
  searchDepth: "advanced",
  maxResults: 5,
  includeDomains: ["gov.zw", "zimlii.org"],
});
```

**Then:** Present official requirements with sources

### 3. Recent Developments

**User Query:** "Recent changes to the Labour Act"

**AI Action:**

```typescript
tavilySearch({
  query: "Zimbabwe Labour Act recent amendments 2024",
  searchDepth: "advanced",
  maxResults: 7,
});
```

**Then:** Summarize changes with dates and sources

### 4. Specific Statutes

**User Query:** "Explain Section 71 of the Constitution"

**AI Action:**

```typescript
tavilySearch({
  query: "Zimbabwe Constitution Section 71 property rights",
  searchDepth: "advanced",
  maxResults: 5,
  includeDomains: ["gov.zw", "zimlii.org", "parlzim.gov.zw"],
});
```

**Then:** Explain the section with official sources

### 5. Case Law Analysis

**User Query:** "Find cases about property rights"

**AI Action:**

```typescript
tavilySearch({
  query: "Zimbabwe Supreme Court property rights cases",
  searchDepth: "advanced",
  maxResults: 10,
  includeDomains: ["zimlii.org"],
});
```

**Then:** List relevant cases with citations and summaries

## Multi-Turn Research Strategy

### Example: Complex Case Research

**Turn 1 - Initial Query:**
User: "Tell me about the Bowers and Another v Minister of Lands case"

**AI Action 1:**

```typescript
tavilySearch({
  query: "Bowers Minister of Lands Zimbabwe",
  searchDepth: "advanced",
  maxResults: 7,
  includeDomains: ["zimlii.org"],
});
```

**AI Response 1:**
"I found the case: Bowers and Another v Minister of Lands, Agriculture, Fisheries, Water and Rural Resettlement and 7 Others (7 of 2025) [2025] ZWCC 7 (15 May 2025). This is a Constitutional Court case dealing with [summary from search results].

Would you like me to search for:

- The full judgment text
- Academic analysis of this case
- Related cases on similar issues"

**Turn 2 - Follow-up:**
User: "Yes, find analysis on this case"

**AI Action 2:**

```typescript
tavilySearch({
  query: "Bowers Minister of Lands ZWCC 7 2025 analysis commentary",
  searchDepth: "advanced",
  maxResults: 7,
});
```

**AI Response 2:**
"Here's the academic analysis I found: [present results with sources]"

## Search Query Optimization

### For Zimbabwean Legal Content

**Always include:**

- "Zimbabwe" or "Zimbabwean"
- Specific court names (Constitutional Court, Supreme Court, High Court)
- Relevant legal terms

**Good queries:**

- "Zimbabwe Constitutional Court property rights 2024"
- "Zimbabwean Labour Act Section 12 termination"
- "Zimbabwe Supreme Court precedent contract law"

**Poor queries:**

- "property rights" (too broad, no jurisdiction)
- "court case about land" (too vague)
- "legal requirements" (no context)

### Domain Filtering

**Official Government Sources:**

```typescript
includeDomains: ["gov.zw", "parlzim.gov.zw", "justice.gov.zw"];
```

**Legal Databases:**

```typescript
includeDomains: ["zimlii.org", "southernafricalitigationcentre.org"];
```

**News and Analysis:**

```typescript
includeDomains: ["herald.co.zw", "newsday.co.zw"];
```

**Comprehensive Search:**

```typescript
// No domain filter - search everything
```

## Handling Search Results

### 1. No Results Found

```typescript
if (results.totalResults === 0) {
  // Try broader search
  tavilySearch({
    query: "broader version of original query",
    searchDepth: "advanced",
    maxResults: 10,
    // Remove domain filters
  });
}
```

### 2. Multiple Relevant Results

Present top 3-5 results with:

- Title and source
- Brief summary
- URL for reference
- Publication date if available

### 3. Ambiguous Results

"I found several cases/statutes that might match:

1. [Option 1 with details]
2. [Option 2 with details]
3. [Option 3 with details]

Which one are you interested in, or would you like me to search for more specific information?"

### 4. Conflicting Information

"I found different information from multiple sources:

Source 1 (gov.zw, 2024): [Information]
Source 2 (zimlii.org, 2023): [Information]

The most recent official source suggests [conclusion]. Would you like me to search for more recent updates?"

## Citation Format

Always cite sources in this format:

```
According to [Source Name] ([URL], [Date]):
[Information]

Key points:
- Point 1
- Point 2
- Point 3

Source: [Full URL]
Last updated: [Date if available]
```

## Error Handling

### API Key Missing

```
I attempted to search for current information, but the search service is not configured. Based on my training data: [provide answer]

Note: For the most current information, please ensure TAVILY_API_KEY is configured.
```

### Rate Limit Exceeded

```
I've reached the search limit for now. Based on my training data: [provide answer]

Note: This information may not reflect the most recent developments. For current information, please try again later or check official sources at gov.zw or zimlii.org.
```

### Search Failed

```
I encountered an issue searching for current information. Let me provide what I know from my training data: [provide answer]

For the most current information, I recommend checking:
- Zimbabwe Legal Information Institute (zimlii.org)
- Government of Zimbabwe (gov.zw)
- Parliament of Zimbabwe (parlzim.gov.zw)
```

## Best Practices

### DO:

✅ Search immediately when legal information is requested
✅ Use advanced search depth for case law and statutes
✅ Include relevant domains for authoritative sources
✅ Perform multiple searches for complex queries
✅ Cite all sources with URLs
✅ Indicate when information is from search vs. training data
✅ Offer to search for more specific information
✅ Present results clearly and concisely

### DON'T:

❌ Ask for full citations before searching
❌ Require complete information before searching
❌ Rely solely on training data for current legal matters
❌ Present search results without citations
❌ Ignore search errors (handle gracefully)
❌ Overwhelm users with too many results (top 3-5 is good)
❌ Forget to mention publication dates

## Example Conversations

### Good Interaction

**User:** "What's the latest on the Labour Act?"

**AI:** _Searches immediately_

```typescript
tavilySearch({
  query: "Zimbabwe Labour Act latest amendments 2024",
  searchDepth: "advanced",
  maxResults: 5,
  includeDomains: ["gov.zw", "parlzim.gov.zw"],
});
```

**AI Response:**
"Based on current information from the Government of Zimbabwe:

The Labour Act (Chapter 28:01) was most recently amended in [date]. Key changes include:

1. [Amendment 1] - Source: [URL]
2. [Amendment 2] - Source: [URL]
3. [Amendment 3] - Source: [URL]

These amendments affect [areas of law].

Would you like me to search for:

- Specific sections of the amendments
- Analysis or commentary on these changes
- Implementation guidelines"

### Poor Interaction (Avoid This)

**User:** "What's the latest on the Labour Act?"

**AI:** ❌ "I need more information. Which specific section of the Labour Act are you interested in? What year are you asking about? Do you want amendments or the original text?"

**Why it's poor:** Asking too many questions before taking action. Should search first with available information.

## Performance Tips

### Optimize Search Queries

**Instead of:**

- "case about land" → "Zimbabwe land rights court case"
- "company rules" → "Zimbabwe company registration Companies Act"
- "worker rights" → "Zimbabwe Labour Act employee rights"

### Use Appropriate Search Depth

**Basic (faster, cheaper):**

- Simple factual queries
- Well-known statutes
- General information

**Advanced (comprehensive):**

- Case law research
- Complex legal analysis
- Recent developments
- Ambiguous queries

### Limit Results Appropriately

- **3-5 results**: Most queries
- **7-10 results**: Comprehensive research
- **1-3 results**: Very specific queries

## Monitoring and Improvement

### Track Search Effectiveness

Monitor:

- Queries that return no results
- Queries that need refinement
- Common user patterns
- Search-to-answer success rate

### Continuous Improvement

- Refine search queries based on results
- Update domain lists as new sources emerge
- Adjust search depth based on query type
- Improve citation formatting
- Enhance multi-turn conversation flow

---

**Remember:** The goal is to provide users with accurate, current legal information as quickly as possible. Search proactively, present clearly, cite thoroughly.
