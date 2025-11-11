# Case Name-URL Matching Fix

## Issue Reported

User reported: **"some of them are being linked to wrong link sources"**

### Example of the Problem

```
Agent finds 10 search results from Tavily:
1. Nduna v Proton Bakeries - URL: zimLII.org/zw/judgment/harare-high-court/2015/164
2. Majoni v State - URL: zimLII.org/zw/judgment/supreme-court/2018/45
3. Article about labour law - URL: legal.co.zw/article/123

But agent cites:
"In *Nduna v Proton Bakeries* [2015] ZWHHC 164 (zimLII.org/zw/judgment/supreme-court/2018/45)..."
                                                    ↑
                                            WRONG URL! This is Majoni's URL
```

**Root Cause**: Agent was citing **correct case names** but **linking them to wrong URLs** from other search results.

---

## What This Is NOT

❌ **NOT hallucination** - The cases are real and found in search results  
❌ **NOT fake citations** - The case names and years are accurate  
❌ **NOT missing tool calls** - Search tools ran successfully

✅ **This IS**: **Citation-URL misattribution** - Real cases linked to wrong URLs

---

## Solution Implemented

### 1. Enhanced Chat Agent Instructions

**File**: `mastra/agents/chat-agent.ts`

Added new steps to case law citation workflow:

```typescript
STEP 4: Match each case name to its EXACT URL from the search results
STEP 5: NEVER mix case names with wrong URLs
```

### 2. Added Explicit Example

Added visual example showing CORRECT vs WRONG citation:

```markdown
✅ CORRECT:
"In _Nduna v Proton Bakeries_ [2015] ZWHHC 164
([zimLII.org/.../2015/164](https://zimLII.org/.../2015/164))..."

❌ WRONG - MISMATCHED URLs:
"In _Nduna v Proton Bakeries_ [2015] ZWHHC 164
([zimLII.org/.../2018/45](https://zimLII.org/.../2018/45))..."
↑ This links Nduna case to Majoni's URL - NEVER DO THIS!
```

### 3. Enhanced Search Agent Instructions

**File**: `mastra/agents/search-agent.ts`

Added case name-URL pairing rules:

```markdown
🔴 CRITICAL: CASE NAME-URL MATCHING

When you find cases in search results:

- ALWAYS keep case names paired with their EXACT URLs from the source
- NEVER mix case names with wrong URLs
- If a source mentions multiple cases, note which URL belongs to which case
- IF source mentions case names, note which URL corresponds to which case
```

---

## Why This Happens

### Tavily Search Returns Multiple Source Types

1. **Direct case URLs**: ZimLII case pages (correct URLs)
2. **Legal articles**: Articles that MENTION multiple cases
3. **Academic sources**: Papers discussing case law

### Problem Scenario

```
Search results:
1. Article: "Employment Law in Zimbabwe" (mentions 5 cases)
   URL: legal.co.zw/article/456

2. Actual case: "Nduna v Proton Bakeries [2015] ZWHHC 164"
   URL: zimLII.org/zw/judgment/harare-high-court/2015/164

3. Another case: "Majoni v State [2018] ZWSC 45"
   URL: zimLII.org/zw/judgment/supreme-court/2018/45

Agent might:
- Extract case name from article (#1)
- But link it to URL from different case (#3)
- Result: Wrong URL attached to case name
```

---

## How the Fix Works

### Before Fix

```typescript
// Agent sees search results
// Extracts case names: "Nduna v Proton", "Majoni v State"
// Extracts URLs: [URL1, URL2, URL3]
// Links them randomly or by order
```

### After Fix

```typescript
// Agent sees search results
// For each case found:
//   1. Note the case name
//   2. Note its EXACT URL from that source
//   3. Keep them paired
// When citing: Use paired (case_name, exact_url) tuples
// NEVER mix case names with URLs from different sources
```

---

## Testing Instructions

### Test Case 1: Multiple Cases Query

**User asks**: "What additional case law can you add to support this position?"

**Expected behavior**:

1. Agent calls deepResearch tool ✅
2. Tool returns 5-10 sources ✅
3. Agent cites 2-4 cases ✅
4. **Each case name is linked to its CORRECT URL** ✅

**How to verify**:

- Click each case URL
- Check if the case name matches the page title
- If clicking "Nduna v Proton" link opens "Majoni v State" page → BUG

### Test Case 2: Mixed Sources

**User asks**: "Find cases about wrongful termination in Zimbabwe"

**Search might return**:

- 3 actual ZimLII case pages
- 5 legal articles mentioning cases
- 2 academic papers

**Expected behavior**:

- Agent cites ONLY the 3 actual cases with ZimLII URLs
- OR if citing cases from articles, uses article URL (not fake ZimLII URL)
- Case names match their URLs

### Test Case 3: Article Mentions Multiple Cases

**Search result**: Article at `legal.co.zw/article/123` mentions:

- Nduna v Proton Bakeries
- Majoni v State
- Zimuto v Chieza

**Expected behavior**:

✅ **CORRECT** - Agent should cite:

```
"According to [this article](legal.co.zw/article/123),
the courts have applied this principle in Nduna v Proton Bakeries,
Majoni v State, and Zimuto v Chieza."
```

❌ **WRONG** - Agent should NOT do:

```
"Nduna v Proton Bakeries [2015] ZWHHC 164
(zimLII.org/zw/fake-url)..." ← Created fake ZimLII URL
```

---

## Validator Rules (Existing)

The citation validator already has some detection for this issue:

### RULE 5.6: Citation-URL Mismatch Detection

```typescript
if (citationCount > zimliiUrls.length + 2) {
  suspiciousPatterns.push(
    `Citation-URL mismatch: ${citationCount} case citations 
    but only ${zimliiUrls.length} ZimLII URLs provided`
  );
}
```

**What it catches**:

- 7 case citations but only 3 ZimLII URLs → WARNING

**What it doesn't catch**:

- 3 case citations, 3 ZimLII URLs, but they're mismatched
- "Nduna" linked to "Majoni's" URL

**Why we can't auto-detect mismatches**:

- Case names have many formats: "Nduna v Proton" vs "Nduna v. Proton Bakeries (Pvt) Ltd"
- URLs encode differently: `/harare-high-court/2015/164` (no case name)
- Would need complex parsing and fuzzy matching
- Better to prevent at source (agent instructions) than detect later

---

## Expected Outcomes

### Before Fix

```
[Validator] ⚠️ Suspicious patterns detected: [
  'Claims to have "verified" cases but no research tool was used'
]
```

User clicks case link → **Wrong case opens** → **User reports issue**

### After Fix

```
[Validator] 🔍 Tool detection: 1 tools called, hasToolUsage=true
[Validator] 🔍 Tool names: advancedSearchWorkflowTool
[Validator] Citation count: 3, Tool used: true
```

User clicks case link → **Correct case opens** → **Issue resolved** ✅

---

## Monitoring

### Logs to Watch

```bash
# Tool successfully ran
[Advanced Search Workflow Tool] Successfully completed.
Response length: 15782 chars, Sources: 10

# Tool detection working
[Validator] 🔍 Tool detection: 1 tools called, hasToolUsage=true
[Validator] 🔍 Tool names: advancedSearchWorkflowTool

# No false warnings
[Validator] ✅ All validations passed
```

### Red Flags

```bash
# Too many cases for sources
[Validator] ⚠️ Citation-URL mismatch: 8 case citations
but only 3 ZimLII URLs provided

# This means agent is probably mixing URLs
```

---

## Files Modified

1. **`mastra/agents/chat-agent.ts`**:

   - Added STEP 4-5 about URL matching
   - Added visual example of correct vs wrong citation
   - Added warning: "DO NOT link case names to wrong URLs"

2. **`mastra/agents/search-agent.ts`**:
   - Added "CASE NAME-URL MATCHING" section
   - Added instruction to keep case names paired with URLs
   - Enhanced output format to note URL-case correspondence

---

## Next Steps

1. ✅ Agent instructions updated
2. ✅ Search agent updated
3. 🔄 **USER TESTING** - Ask case law query and verify URLs match
4. 🔄 **Monitor validator logs** - Check for citation-URL mismatch warnings
5. 🔄 **Click-test URLs** - Click each cited case URL to verify correct page opens

---

## Success Criteria

✅ **Case names match their URLs**  
✅ **No more "wrong link sources" reports**  
✅ **Validator shows tool detection working**  
✅ **Clicking case links opens correct cases**

---

## Technical Notes

### Why Not Auto-Validate in Validator?

**Option 1**: Parse case names from URLs

```typescript
// URL: /zw/judgment/harare-high-court/2015/164
// How to extract "Nduna v Proton Bakeries"?
// Can't - URL doesn't contain case name
```

**Option 2**: Scrape case page to get title

```typescript
// Too slow - adds latency
// Requires HTTP requests for each URL
// Increases API costs
```

**Option 3**: Fuzzy match case names to URLs

```typescript
// Complex - many case name formats
// High false positive rate
// Maintenance burden
```

**Chosen approach**: **Prevent at source** (agent instructions) rather than detect after

---

## Related Fixes

1. **Tool Detection Bug** - Fixed in VALIDATOR_FIX_COMPLETE.md
2. **404 URL Detection** - Added in VALIDATOR_FIX_COMPLETE.md
3. **Statutory Misattribution** - Fixed in previous session
4. **This Fix**: Case name-URL matching

All 4 issues address different types of citation problems.
