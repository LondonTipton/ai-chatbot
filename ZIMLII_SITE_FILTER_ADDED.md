# ZimLII Site Filter Added to Case Law Queries ✅

**Date:** November 11, 2025  
**Status:** IMPLEMENTED  
**File Modified:** `mastra/agents/query-enhancer-agent.ts`

---

## What Was Added

Automatic `site:zimlii.org` filter for all case law queries to prioritize results from Zimbabwe Legal Information Institute (ZimLII).

---

## Implementation

### Change Made

Added automatic site filter after query enhancement:

```typescript
// Add zimlii for case law queries to prioritize Zimbabwe Legal Information Institute
if (detectedType === "case" && !enhanced.toLowerCase().includes("zimlii")) {
  enhanced = `${enhanced} site:zimlii.org`;
  console.log(`[Query Enhancer] Added zimlii site filter for case law query`);
}
```

### How It Works

1. **Query type detection** - Detects if query is about case law
2. **Enhancement** - LLM enhances the query with relevant keywords
3. **Site filter** - Automatically appends `site:zimlii.org`
4. **Tavily search** - Prioritizes results from zimlii.org

---

## Examples

### Example 1: Case Name Query

**User query:** "What about the zuva case?"

**Enhancement flow:**

```
1. Detect type: "case"
2. LLM enhances: "zuva case Zimbabwe Supreme Court employment labour judgment"
3. Add site filter: "zuva case Zimbabwe Supreme Court employment labour judgment site:zimlii.org"
4. Tavily searches with site filter
```

**Result:** Tavily prioritizes results from zimlii.org

---

### Example 2: Case Law Request

**User query:** "Find cases about unfair dismissal"

**Enhancement flow:**

```
1. Detect type: "case"
2. LLM enhances: "unfair dismissal cases Zimbabwe Supreme Court Labour Act"
3. Add site filter: "unfair dismissal cases Zimbabwe Supreme Court Labour Act site:zimlii.org"
4. Tavily searches with site filter
```

**Result:** Tavily prioritizes ZimLII case law database

---

### Example 3: Citation Query

**User query:** "SC 43/15"

**Enhancement flow:**

```
1. Detect type: "case" (citation pattern detected)
2. LLM enhances: "SC 43/15 Zimbabwe Supreme Court case law judgment"
3. Add site filter: "SC 43/15 Zimbabwe Supreme Court case law judgment site:zimlii.org"
4. Tavily searches with site filter
```

**Result:** Tavily finds the case on zimlii.org

---

### Example 4: Statute Query (No Filter)

**User query:** "Section 12B Labour Act"

**Enhancement flow:**

```
1. Detect type: "statute" (not case law)
2. LLM enhances: "Section 12B Labour Act Zimbabwe legislation statute"
3. NO site filter added (not case law)
4. Tavily searches broadly
```

**Result:** No site filter for statute queries

---

## Benefits

### 1. Higher Quality Results ✅

ZimLII is the authoritative source for Zimbabwe case law:

- Official court judgments
- Verified citations
- Complete case text
- Proper formatting

### 2. Reduced Hallucination ✅

By prioritizing ZimLII:

- More likely to find actual cases
- Less reliance on secondary sources
- Fewer fabricated citations
- Better source verification

### 3. Better Citation Accuracy ✅

ZimLII provides:

- Proper case citations
- Correct URLs
- Accurate case names
- Verified court information

### 4. Faster Results ✅

Tavily can focus on:

- One authoritative domain
- Fewer irrelevant results
- More targeted search

---

## Case Law Detection

The query enhancer detects case law queries using these patterns:

```typescript
const CASE_INDICATORS = [
  /\sv\s/i, // "X v Y" pattern
  /case/i, // Contains "case"
  /judgment/i, // Contains "judgment"
  /ruling/i, // Contains "ruling"
  /court/i, // Contains "court"
  /appellant/i, // Contains "appellant"
  /respondent/i, // Contains "respondent"
  /\[20\d{2}\]/i, // Citation like [2023]
  /sc\s*\d+/i, // SC 43/15
  /zwsc|zwhhc|zwcc/i, // Court codes
];
```

**If any pattern matches** → Query type = "case" → Add site filter

---

## When Site Filter is NOT Added

1. **Statute queries** - Type detected as "statute"
2. **General queries** - Type detected as "general"
3. **Already has zimlii** - Filter already in query

---

## Logging

The enhancement now logs when site filter is added:

```
[Query Enhancer] Original: "What about the zuva case?"
[Query Enhancer] Type: case
[Query Enhancer] Added zimlii site filter for case law query
[Query Enhancer] Enhanced: "zuva case Zimbabwe Supreme Court employment labour judgment site:zimlii.org"
```

---

## Testing

### Test Case 1: Simple Case Query

**Input:** "zuva case"

**Expected:**

```
Enhanced: "zuva case Zimbabwe Supreme Court judgment site:zimlii.org"
```

**Verify:**

- ✅ Type detected as "case"
- ✅ Site filter added
- ✅ Tavily prioritizes zimlii.org

---

### Test Case 2: Case Citation

**Input:** "SC 43/15"

**Expected:**

```
Enhanced: "SC 43/15 Zimbabwe Supreme Court case law judgment site:zimlii.org"
```

**Verify:**

- ✅ Citation pattern detected
- ✅ Type = "case"
- ✅ Site filter added

---

### Test Case 3: Case Law Request

**Input:** "Find cases about property rights"

**Expected:**

```
Enhanced: "property rights cases Zimbabwe Supreme Court judgment site:zimlii.org"
```

**Verify:**

- ✅ "cases" keyword detected
- ✅ Type = "case"
- ✅ Site filter added

---

### Test Case 4: Statute Query (No Filter)

**Input:** "Section 12B Labour Act"

**Expected:**

```
Enhanced: "Section 12B Labour Act Zimbabwe legislation statute"
```

**Verify:**

- ✅ Type detected as "statute"
- ✅ NO site filter added
- ✅ Broad search

---

## Tavily Site Filter Syntax

The `site:` operator tells Tavily to prioritize results from a specific domain:

```
site:zimlii.org
```

**How Tavily handles it:**

- Searches primarily on zimlii.org
- May include other results if zimlii has no matches
- Ranks zimlii.org results higher

**Alternative syntax (not used):**

- `zimlii.org` - Less specific, may match URLs containing "zimlii.org" anywhere
- `site:*.zimlii.org` - Includes subdomains (not needed)

---

## ZimLII Information

**Website:** https://zimlii.org  
**Full Name:** Zimbabwe Legal Information Institute  
**Content:**

- Supreme Court judgments
- High Court judgments
- Constitutional Court judgments
- Labour Court judgments
- Magistrates Court judgments
- Legislation and statutes

**Coverage:**

- Cases from 1980s to present
- Regularly updated
- Free and open access
- Authoritative source

---

## Impact on Other Issues

### Helps with Hallucination

By prioritizing ZimLII:

- ✅ More likely to find real cases
- ✅ Less need to supplement with training data
- ✅ Better source verification
- ✅ Accurate citations

### Helps with Query Enhancement

Site filter makes queries more focused:

- ✅ Clearer intent to Tavily
- ✅ Better result ranking
- ✅ Fewer irrelevant results

### Helps with Citation Accuracy

ZimLII provides proper citations:

- ✅ Correct case names
- ✅ Proper citation format
- ✅ Verified URLs
- ✅ Complete case information

---

## Monitoring

### Check Logs

Look for site filter additions:

```
[Query Enhancer] Added zimlii site filter for case law query
```

### Verify Results

Check that Tavily returns zimlii.org results:

```
[Tavily Advanced] Results found: 10
[Tavily Advanced] First result: https://zimlii.org/...
```

### Monitor Success Rate

Track percentage of case law queries that find results:

- Before: X% success rate
- After: Y% success rate (should be higher)

---

## Future Enhancements

### 1. Multiple Site Filters

Add other authoritative sources:

```
site:zimlii.org OR site:saflii.org OR site:veritaszim.net
```

### 2. Conditional Site Filters

Use different filters based on query:

- Case law → zimlii.org
- Legislation → parlzim.gov.zw
- Analysis → veritaszim.net

### 3. Domain Prioritization

Instead of strict site filter, use domain prioritization:

```
zimlii.org veritaszim.net saflii.org [query]
```

---

## Rollback

If issues arise, remove the site filter:

```typescript
// Comment out or remove these lines:
if (detectedType === "case" && !enhanced.toLowerCase().includes("zimlii")) {
  enhanced = `${enhanced} site:zimlii.org`;
}
```

---

## Conclusion

Automatic `site:zimlii.org` filter has been added for all case law queries. This will help Tavily prioritize results from Zimbabwe's authoritative legal database, reducing hallucination and improving citation accuracy.

**Status:** ✅ IMPLEMENTED  
**Testing:** 🔄 READY FOR TESTING  
**Expected Impact:** 🟢 HIGH (better case law results, fewer hallucinations)

---

**Next Action:** Test with case law queries and verify zimlii.org results are prioritized.

**Related Documentation:**

- `CRITICAL_CASE_CITATION_ANALYSIS.md` - Hallucination analysis
- `CHAT_AGENT_TOOL_FIX_APPLIED.md` - Tool selection fix
- `CONTEXT_LOSS_FIX_COMPLETE.md` - Context integration
