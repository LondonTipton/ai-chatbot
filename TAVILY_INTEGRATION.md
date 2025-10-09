# Tavily Integration Guide

## Overview

DeepCounsel now integrates Tavily's AI-powered web search and content extraction capabilities directly into the chat experience. This allows the AI to automatically search for current legal information, extract full documents, and create artifacts with the results.

## Architecture

### Integration Method: AI SDK Tools (Not MCP)

We use **Tavily's REST API** integrated as **AI SDK tools** rather than MCP (Model Context Protocol) because:

- ✅ **Vercel Compatible**: Works with serverless functions
- ✅ **No Persistent Connections**: Simple REST API calls
- ✅ **Secure**: API key stays server-side
- ✅ **Automatic Orchestration**: AI decides when to use tools
- ✅ **Seamless Artifacts**: Works with existing document creation

**Why Not MCP?**

- MCP requires persistent connections (not compatible with Vercel's serverless architecture)
- MCP is designed for local AI assistants (Claude Desktop, Cursor, Kiro)
- MCP doesn't support OAuth or web-based authentication
- REST API is simpler and more appropriate for production web apps

## Features

### 1. Web Search (`tavilySearch`)

Search the web for current legal information, cases, statutes, and regulations.

**Capabilities:**

- Search with partial information (case names, parties, topics)
- Filter by domain (e.g., only `.gov` or `.org` sites)
- Basic or advanced search depth
- AI-generated answer summaries
- Relevance scoring

**Example Usage:**

```typescript
// User: "Find the Brown v. Board case"
// AI automatically calls:
tavilySearch({
  query: "Brown Board Education Zimbabwe court",
  searchDepth: "advanced",
  maxResults: 7,
  includeDomains: ["zimlii.org", "gov.zw"],
});
```

### 2. Content Extraction (`tavilyExtract`)

Extract clean, structured content from web URLs.

**Capabilities:**

- Extract full text from legal documents
- Clean markdown formatting
- Handle complex pages with tables
- Extract from multiple URLs at once (max 5)
- Basic or advanced extraction depth

**Example Usage:**

```typescript
// After search finds relevant URLs:
tavilyExtract({
  urls: ["https://zimlii.org/case/123"],
  format: "markdown",
  extractDepth: "advanced",
});
```

### 3. Automatic Document Creation

The AI automatically combines these tools with the existing `createDocument` artifact system.

**Typical Workflow:**

1. User asks about a legal case
2. AI searches with `tavilySearch`
3. AI extracts full content with `tavilyExtract`
4. AI creates document artifact with full case text
5. AI optionally creates second document with analysis
6. AI responds with summary and document links

## Implementation Details

### File Structure

```
lib/ai/tools/
├── tavily-search.ts      # Web search tool
├── tavily-extract.ts     # Content extraction tool (NEW)
├── create-document.ts    # Artifact creation
├── update-document.ts    # Artifact updates
└── ...

app/(chat)/api/chat/
└── route.ts              # Chat API with tools registered

lib/ai/
└── prompts.ts            # System prompt with Tavily guidance
```

### Environment Variables

```bash
# .env.local or Vercel Environment Variables
TAVILY_API_KEY=tvly-xxxxx
```

**Getting an API Key:**

1. Sign up at https://app.tavily.com/
2. Free tier: 1,000 API credits/month
3. No credit card required
4. Add key to `.env.local` for local development
5. Add to Vercel project settings for production

### Tool Registration

Both tools are registered in the chat API route:

```typescript
// app/(chat)/api/chat/route.ts
tools: {
  getWeather,
  tavilySearch,        // Web search
  tavilyExtract,       // Content extraction (NEW)
  createDocument,
  updateDocument,
  requestSuggestions,
}
```

### System Prompt Guidance

The AI is instructed to:

- Search proactively with partial information
- Extract full content from promising sources
- Create document artifacts with extracted content
- Synthesize and analyze findings
- Cite sources with URLs

## Usage Examples

### Example 1: Court Case Research

**User:** "Find and summarize the Bowers v. Minister of Lands case"

**AI Workflow:**

1. Searches: `tavilySearch({ query: "Bowers Minister Lands Zimbabwe court" })`
2. Extracts: `tavilyExtract({ urls: [top_result] })`
3. Creates: `createDocument({ title: "Bowers v. Minister of Lands - Full Text" })`
4. Creates: `createDocument({ title: "Case Summary & Analysis" })`
5. Responds with summary and document links

### Example 2: Statute Lookup

**User:** "What does Section 71 of the Constitution say about property rights?"

**AI Workflow:**

1. Searches: `tavilySearch({ query: "Zimbabwe Constitution Section 71 property rights" })`
2. Extracts: `tavilyExtract({ urls: [constitution_url] })`
3. Creates: `createDocument({ title: "Constitution Section 71 - Property Rights" })`
4. Responds with explanation and full text

### Example 3: Recent Legal Developments

**User:** "What are the latest amendments to the Labour Act?"

**AI Workflow:**

1. Searches: `tavilySearch({ query: "Zimbabwe Labour Act amendments 2024", topic: "news" })`
2. Extracts: `tavilyExtract({ urls: [official_gazette_url] })`
3. Creates: `createDocument({ title: "Labour Act Amendments Summary" })`
4. Responds with summary of changes

## API Costs & Limits

### Free Tier

- 1,000 API credits/month
- No credit card required
- All features available

### Credit Usage

- Basic search: 1 credit
- Advanced search: 2 credits
- Extract: 1 credit per URL
- Example: Search (2) + Extract 3 URLs (3) = 5 credits total

### Rate Limits

- Development: 5 requests/second
- Production: Contact Tavily for higher limits

## Security

### API Key Security

- ✅ API key stored server-side only (environment variables)
- ✅ Never exposed to client/browser
- ✅ All calls are server-to-server
- ✅ No CORS issues (Next.js API routes handle requests)

### No Additional Authentication Needed

- No OAuth required
- No origin restrictions needed
- Standard Next.js API route security applies
- Rate limiting can be added at API route level if needed

## Monitoring & Debugging

### Check Tool Usage

View tool calls in the chat interface - they appear as expandable sections showing:

- Tool name
- Parameters used
- Results returned
- Execution time

### Error Handling

Both tools include comprehensive error handling:

- Invalid API key → Clear error message
- Rate limit exceeded → Helpful guidance
- Network errors → Graceful fallback
- Empty results → Informative response

### Logs

Check server logs for:

```bash
# Successful searches
Tavily search: query="..." results=5

# Extraction
Tavily extract: urls=["..."] format=markdown

# Errors
Tavily search error: [error details]
```

## Best Practices

### For Users

1. **Be Specific**: "Find the 2024 Labour Act amendments" is better than "Labour Act"
2. **Use Case Names**: Even partial names work ("Bowers case" vs full citation)
3. **Request Documents**: Ask for "full text" or "complete document" to trigger extraction
4. **Verify Information**: Always verify legal information with official sources

### For Developers

1. **Monitor Credits**: Track API usage to avoid hitting limits
2. **Cache Results**: Consider caching frequent searches
3. **Domain Filtering**: Use `includeDomains` for authoritative sources
4. **Error Handling**: Tools gracefully handle errors and provide fallbacks
5. **Search Depth**: Use "advanced" for comprehensive legal research

## Troubleshooting

### "TAVILY_API_KEY is not configured"

**Solution:**

1. Get API key from https://app.tavily.com/
2. Add to `.env.local`: `TAVILY_API_KEY=tvly-xxxxx`
3. Restart dev server: `pnpm dev`
4. For production: Add to Vercel environment variables

### "Rate limit exceeded"

**Solution:**

1. Check usage at https://app.tavily.com/dashboard
2. Wait for monthly reset
3. Upgrade plan if needed
4. Implement caching to reduce API calls

### "No results found"

**Possible Causes:**

- Query too specific
- Domain filters too restrictive
- Content not available online

**Solution:**

- Try broader search terms
- Remove domain filters
- Use "advanced" search depth

### Extraction Failed

**Possible Causes:**

- URL blocked by site
- Site requires authentication
- Complex JavaScript rendering

**Solution:**

- Try different URL from search results
- Use "advanced" extraction depth
- Check if site allows scraping

## Future Enhancements

### Potential Additions

1. **Caching Layer**

   - Cache search results for common queries
   - Reduce API costs
   - Faster responses

2. **Usage Analytics**

   - Track which searches lead to document creation
   - Monitor credit usage per user
   - Identify popular legal topics

3. **Rate Limiting**

   - Limit searches per user per day
   - Prevent abuse
   - Manage API costs

4. **Domain Presets**

   - Quick filters for "Legal Sources Only"
   - "Government Sites Only"
   - "Case Law Only"

5. **Search History**
   - Save successful searches
   - Allow users to re-run searches
   - Build knowledge base

## Resources

- **Tavily Documentation**: https://docs.tavily.com
- **API Playground**: https://app.tavily.com/playground
- **Dashboard**: https://app.tavily.com/dashboard
- **Support**: https://community.tavily.com

## Summary

The Tavily integration provides DeepCounsel with powerful web search and content extraction capabilities that work seamlessly with the existing artifact system. The AI can now:

✅ Search for current legal information automatically
✅ Extract full documents and cases
✅ Create document artifacts with findings
✅ Provide comprehensive, cited legal research
✅ Handle multi-step research workflows

All of this happens automatically based on user queries, with no additional UI or configuration needed.
