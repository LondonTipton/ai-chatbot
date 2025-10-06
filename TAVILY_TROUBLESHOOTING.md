# Tavily Search Troubleshooting Guide

Quick solutions for common Tavily integration issues.

## Issue 1: AI Not Using Search Tool

### Symptoms

- AI asks for more information instead of searching
- AI says "I need the full citation" or "Please provide more details"
- Search tool is never called

### Solutions

✅ **Already Fixed** - The system prompts have been updated to make the AI more proactive.

**Verify the fix:**

1. Restart your dev server: `pnpm dev`
2. Ask: "Tell me about the Bowers case"
3. AI should search immediately, not ask for more info

**If still not working:**

- Check `lib/ai/prompts.ts` - should have "SEARCH FIRST, ASK LATER" directive
- Check `lib/ai/tools/tavily-search.ts` - description should say "ALWAYS use this tool"
- Clear browser cache and restart

## Issue 2: Search Returns No Results

### Symptoms

- Search executes but returns empty results
- "No results found" message

### Causes & Solutions

**1. Query Too Specific**

```typescript
// Too specific
query: "Bowers and Another v Minister of Lands, Agriculture, Fisheries, Water and Rural Resettlement and 7 Others (7 of 2025) [2025] ZWCC 7 (15 May 2025)";

// Better
query: "Bowers Minister of Lands Zimbabwe ZWCC";
```

**2. Domain Filters Too Restrictive**

```typescript
// May be too restrictive
includeDomains: ["very-specific-domain.zw"];

// Try broader
includeDomains: ["gov.zw", "zimlii.org"];
// Or remove domain filter entirely
```

**3. Recent Cases Not Yet Indexed**

- Very recent cases (days old) may not be indexed yet
- Try searching without date restrictions
- Check official sources directly

## Issue 3: API Key Errors

### Symptoms

- "Invalid or missing Tavily API key"
- 401 or 403 errors
- Authentication failures

### Solutions

**1. Check API Key Exists**

```bash
# In .env.local
TAVILY_API_KEY=tvly-your-key-here
```

**2. Verify Key Format**

- Should start with `tvly-`
- No spaces or quotes
- No trailing newlines

**3. Test API Key**

```bash
# Test endpoint (create this)
curl http://localhost:3000/api/test/tavily
```

**4. Regenerate Key**

- Go to [tavily.com/dashboard](https://tavily.com/dashboard)
- Generate new API key
- Update `.env.local`
- Restart server

## Issue 4: Rate Limit Exceeded

### Symptoms

- "Rate limit exceeded" error
- 429 status code
- Search stops working after many requests

### Solutions

**1. Check Usage**

- Visit [tavily.com/dashboard](https://tavily.com/dashboard)
- View current usage and limits
- Free tier: 1,000 searches/month

**2. Optimize Queries**

- Use `searchDepth: "basic"` for simple queries
- Reduce `maxResults` to 3-5
- Cache common queries (future enhancement)

**3. Upgrade Plan**

- Consider Pro tier for production
- Higher limits and priority processing

**4. Temporary Workaround**

```typescript
// In lib/ai/tools/tavily-search.ts
// Already implemented - returns graceful error
// AI will fall back to training data
```

## Issue 5: Slow Search Response

### Symptoms

- Search takes 5+ seconds
- UI feels sluggish
- Timeout errors

### Solutions

**1. Use Basic Search Depth**

```typescript
searchDepth: "basic"; // Faster
// vs
searchDepth: "advanced"; // Slower but more thorough
```

**2. Reduce Max Results**

```typescript
maxResults: 3; // Faster
// vs
maxResults: 10; // Slower
```

**3. Check Network**

- Test internet connection
- Check Tavily service status
- Try different network

**4. Add Timeout**

```typescript
// In lib/ai/tools/tavily-search.ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

const response = await fetch("https://api.tavily.com/search", {
  signal: controller.signal,
  // ... other options
});
```

## Issue 6: Irrelevant Results

### Symptoms

- Search returns unrelated content
- Wrong jurisdiction (not Zimbabwe)
- Off-topic results

### Solutions

**1. Improve Query Specificity**

```typescript
// Vague
query: "property rights";

// Better
query: "Zimbabwe property rights constitutional law";

// Best
query: "Zimbabwe Constitution Section 71 property rights 2013";
```

**2. Use Domain Filters**

```typescript
// For Zimbabwean content
includeDomains: ["gov.zw", "zimlii.org", "parlzim.gov.zw"];
```

**3. Exclude Irrelevant Domains**

```typescript
excludeDomains: ["wikipedia.org", "facebook.com"];
```

## Issue 7: Multi-Turn Queries Not Working

### Symptoms

- AI doesn't perform follow-up searches
- Context lost between searches
- Repetitive questions

### Solutions

✅ **Already Fixed** - System prompts now include multi-turn strategy.

**Verify:**

1. Ask: "Tell me about property rights in Zimbabwe"
2. Follow up: "Find recent court cases on this"
3. AI should search again with refined query

**If not working:**

- Check conversation context is maintained
- Verify AI has access to previous search results
- Restart conversation if context is lost

## Issue 8: Search Results Not Cited

### Symptoms

- AI provides information without sources
- No URLs in response
- Can't verify information

### Solutions

✅ **Already Fixed** - System prompts require citation.

**Expected format:**

```
According to [Source] (URL, Date):
[Information]

Sources:
- URL 1
- URL 2
```

**If not working:**

- Check system prompts in `lib/ai/prompts.ts`
- Verify search results include URLs
- Ask AI explicitly: "Please cite your sources"

## Testing Tavily Integration

### Quick Test

**1. Simple Search Test**

```
User: "Search for Zimbabwe Labour Act"
Expected: AI searches immediately and presents results with sources
```

**2. Partial Information Test**

```
User: "Tell me about the Bowers case"
Expected: AI searches with partial info, doesn't ask for full citation
```

**3. Multi-Turn Test**

```
User: "Find cases about property rights"
AI: [Presents results]
User: "Find analysis on the first case"
Expected: AI performs second search with refined query
```

### Create Test Endpoint

Create `app/api/test/tavily/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "TAVILY_API_KEY not configured",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: "Zimbabwe legal system test",
        max_results: 2,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `API returned ${response.status}`,
          details: await response.text(),
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Tavily API is working correctly",
      resultCount: data.results?.length || 0,
      query: data.query,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Test it:**

```bash
curl http://localhost:3000/api/test/tavily
```

## Common Error Messages

### "TAVILY_API_KEY is not configured"

**Fix:** Add key to `.env.local` and restart server

### "Tavily API error (401)"

**Fix:** Invalid API key - check key at tavily.com/dashboard

### "Tavily API error (429)"

**Fix:** Rate limit exceeded - wait or upgrade plan

### "Failed to perform web search"

**Fix:** Network issue or Tavily service down - check status

### "No direct answer available"

**Fix:** Normal - not all queries have direct answers, results still provided

## Best Practices to Avoid Issues

### 1. Query Construction

✅ Include jurisdiction: "Zimbabwe"
✅ Use specific terms: "Labour Act Section 12"
✅ Add context: "termination procedures"

### 2. Search Parameters

✅ Use `basic` for simple queries
✅ Use `advanced` for research
✅ Limit results to 3-7 for most queries

### 3. Error Handling

✅ Graceful degradation to training data
✅ Clear error messages to users
✅ Retry logic for transient failures

### 4. Performance

✅ Cache common queries (future)
✅ Optimize query strings
✅ Use appropriate search depth

## Getting Help

### Check Logs

```bash
# Development server logs
# Look for "Tavily search error:" messages
```

### Verify Configuration

```bash
# Check environment variables
echo $TAVILY_API_KEY

# Check file
cat .env.local | grep TAVILY
```

### Test Manually

```bash
# Test API directly
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-key",
    "query": "test query",
    "max_results": 2
  }'
```

### Resources

- [Tavily Documentation](https://docs.tavily.com)
- [Tavily Status](https://status.tavily.com)
- [Tavily Support](https://tavily.com/support)
- [DeepCounsel Issues](https://github.com/your-repo/issues)

## Quick Fixes Checklist

When search isn't working:

- [ ] API key in `.env.local`
- [ ] Server restarted after adding key
- [ ] Key format correct (starts with `tvly-`)
- [ ] Not over rate limit (check dashboard)
- [ ] Internet connection working
- [ ] System prompts updated (check `lib/ai/prompts.ts`)
- [ ] Tool description updated (check `lib/ai/tools/tavily-search.ts`)
- [ ] Browser cache cleared
- [ ] Test endpoint returns success

---

**Still having issues?** Check the detailed documentation in [TAVILY_SEARCH_INTEGRATION.md](./TAVILY_SEARCH_INTEGRATION.md) or create an issue with:

- Error message
- Query that failed
- Console logs
- Environment (dev/prod)
