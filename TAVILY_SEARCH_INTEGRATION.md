# Tavily Search Integration

DeepCounsel integrates Tavily's AI-powered search API to provide real-time access to current legal information, case law, statutes, and recent legal developments.

## Overview

Tavily Search enables DeepCounsel to:

- Search for current legal information and recent court decisions
- Find Zimbabwean statutes, regulations, and legal precedents
- Access up-to-date legal news and developments
- Retrieve information from specific legal domains
- Provide citations and sources for legal research

## Setup

### 1. Get a Tavily API Key

1. Visit [Tavily.com](https://tavily.com)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

Tavily offers:

- **Free tier**: 1,000 searches per month
- **Pro tier**: Higher limits for production use

### 2. Configure Environment Variable

Add your Tavily API key to `.env.local`:

```bash
TAVILY_API_KEY=tvly-your-api-key-here
```

### 3. Restart Your Application

```bash
pnpm dev
```

The Tavily search tool will now be available to the AI assistant.

## How It Works

### Automatic Tool Selection

The AI automatically decides when to use Tavily search based on the user's query. It will search when:

- User asks about recent legal developments
- Current information is needed (e.g., "latest amendments to the Labour Act")
- Specific case law or precedents are requested
- Zimbabwean legal information is queried
- The AI determines its training data may be outdated

### Search Parameters

The tool supports several parameters:

```typescript
{
  query: string;              // The search query
  searchDepth: 'basic' | 'advanced';  // Search thoroughness
  maxResults: number;         // Number of results (1-10)
  includeDomains?: string[];  // Specific domains to search
  excludeDomains?: string[];  // Domains to exclude
}
```

## Usage Examples

### Example 1: Recent Legal Developments

**User Query:**

```
What are the recent amendments to Zimbabwe's Labour Act?
```

**AI Action:**
The AI will automatically call `tavilySearch` with:

```json
{
  "query": "Zimbabwe Labour Act recent amendments 2024",
  "searchDepth": "advanced",
  "maxResults": 5
}
```

### Example 2: Case Law Research

**User Query:**

```
Find recent Supreme Court cases on property rights in Zimbabwe
```

**AI Action:**

```json
{
  "query": "Zimbabwe Supreme Court property rights cases recent",
  "searchDepth": "advanced",
  "maxResults": 7,
  "includeDomains": ["zimlii.org", "gov.zw"]
}
```

### Example 3: Specific Legal Domain

**User Query:**

```
What does the Zimbabwean government website say about company registration?
```

**AI Action:**

```json
{
  "query": "Zimbabwe company registration requirements",
  "searchDepth": "basic",
  "maxResults": 5,
  "includeDomains": ["gov.zw"]
}
```

## Search Response Format

The tool returns structured data:

```json
{
  "query": "Zimbabwe Labour Act amendments",
  "answer": "Brief AI-generated summary of findings",
  "results": [
    {
      "position": 1,
      "title": "Labour Amendment Act 2023",
      "url": "https://example.com/labour-act",
      "content": "Relevant excerpt from the page...",
      "relevanceScore": 0.95,
      "publishedDate": "2023-12-15"
    }
  ],
  "totalResults": 5,
  "responseTime": 1.2,
  "searchDepth": "advanced"
}
```

## Recommended Legal Domains for Zimbabwe

When searching for Zimbabwean legal information, consider including these domains:

### Official Government Sources

- `gov.zw` - Government of Zimbabwe
- `parlzim.gov.zw` - Parliament of Zimbabwe
- `justice.gov.zw` - Ministry of Justice

### Legal Information Institutes

- `zimlii.org` - Zimbabwe Legal Information Institute
- `southernafricalitigationcentre.org` - Southern Africa Litigation Centre

### Legal News and Analysis

- `herald.co.zw` - The Herald (legal news)
- `newsday.co.zw` - NewsDay (legal developments)

### Example with Domain Filtering

```typescript
// Search only official government sources
tavilySearch({
  query: "Zimbabwe company registration requirements",
  includeDomains: ["gov.zw", "parlzim.gov.zw"],
  searchDepth: "advanced",
});
```

## Best Practices

### 1. Specific Queries

✅ **Good**: "Zimbabwe Labour Act Section 12 termination procedures"
❌ **Poor**: "employment law"

### 2. Include Jurisdiction

Always specify Zimbabwe in queries for local legal matters:

- "Zimbabwe contract law"
- "Zimbabwean property rights"
- "Zimbabwe Supreme Court precedents"

### 3. Use Advanced Search for Research

For comprehensive legal research, use `searchDepth: "advanced"`:

```typescript
{
  query: "Zimbabwe constitutional law property rights",
  searchDepth: "advanced",
  maxResults: 10
}
```

### 4. Filter by Domain for Authoritative Sources

When you need official information, filter by government domains:

```typescript
{
  query: "Zimbabwe tax regulations 2024",
  includeDomains: ["gov.zw"],
  searchDepth: "advanced"
}
```

### 5. Combine with AI Analysis

The AI will:

1. Search using Tavily
2. Analyze the results
3. Synthesize information
4. Provide citations
5. Offer legal analysis

## Rate Limits and Quotas

### Free Tier

- 1,000 searches per month
- Basic search depth
- Standard response times

### Pro Tier

- Higher search limits
- Advanced search depth
- Priority processing
- Better for production use

### Monitoring Usage

Check your Tavily dashboard regularly to monitor:

- API calls made
- Remaining quota
- Search performance
- Cost (if on paid plan)

## Error Handling

The tool handles common errors gracefully:

### Missing API Key

```
Error: TAVILY_API_KEY is not configured
```

**Solution**: Add the API key to your `.env.local` file

### Rate Limit Exceeded

```
Error: Tavily API error (429): Rate limit exceeded
```

**Solution**:

- Wait for quota reset
- Upgrade to Pro tier
- Implement request caching

### Network Errors

```
Error: Failed to perform web search
```

**Solution**: Check internet connection and Tavily service status

## Integration with DeepCounsel

### System Prompt Enhancement

The AI is instructed to:

- Use Tavily for current legal information
- Cite sources from search results
- Verify information across multiple sources
- Prioritize official government sources
- Indicate when information is from web search vs. training data

### User Experience

When Tavily search is used:

1. User asks a question
2. AI determines search is needed
3. Search is performed (transparent to user)
4. Results are analyzed
5. AI provides answer with citations
6. Sources are included in the response

### Example Interaction

**User**: "What are the requirements for registering a company in Zimbabwe?"

**AI Response**:

```
Based on current information from the Government of Zimbabwe website,
the requirements for company registration include:

1. Completed Form CR6 (Application for Registration)
2. Memorandum and Articles of Association
3. Prescribed registration fees
4. Details of directors and shareholders
5. Registered office address in Zimbabwe

[Sources:
- gov.zw/company-registration
- zimlii.org/companies-act
Last updated: January 2024]
```

## Advanced Features

### Multi-Step Research

The AI can perform multiple searches in sequence:

1. Initial broad search
2. Follow-up specific searches
3. Cross-reference findings
4. Synthesize comprehensive answer

### Source Verification

The AI can:

- Compare information across sources
- Identify conflicting information
- Prioritize authoritative sources
- Note publication dates

### Citation Management

Search results include:

- Source URLs
- Publication dates
- Relevance scores
- Content excerpts

## Troubleshooting

### Search Returns No Results

**Possible causes:**

- Query too specific
- Domain filters too restrictive
- Information not available online

**Solutions:**

- Broaden the query
- Remove domain filters
- Try alternative search terms

### Irrelevant Results

**Possible causes:**

- Query too broad
- Wrong jurisdiction
- Missing context

**Solutions:**

- Add "Zimbabwe" to query
- Use more specific legal terms
- Include relevant act/statute names

### Slow Response Times

**Possible causes:**

- Advanced search depth
- High maxResults value
- Network latency

**Solutions:**

- Use basic search depth for quick queries
- Reduce maxResults to 3-5
- Check internet connection

## Security and Privacy

### API Key Security

- Never commit API keys to version control
- Use environment variables only
- Rotate keys periodically
- Monitor usage for anomalies

### User Privacy

- Search queries are sent to Tavily
- No personal user data is included
- Results are not stored permanently
- Follow Tavily's privacy policy

### Data Handling

- Search results are processed in real-time
- No long-term storage of search data
- Citations include source URLs
- Users can verify sources independently

## Cost Optimization

### Tips to Reduce API Calls

1. **Use basic search for simple queries**

   ```typescript
   searchDepth: "basic"; // Faster and cheaper
   ```

2. **Limit results appropriately**

   ```typescript
   maxResults: 3; // Usually sufficient
   ```

3. **Cache common queries** (future enhancement)

   - Store frequently asked questions
   - Refresh cache periodically

4. **Combine with AI knowledge**
   - Use search only when necessary
   - Rely on training data for general questions

## Future Enhancements

Potential improvements:

- **Result caching**: Store common searches
- **Smart retry**: Automatic retry with adjusted parameters
- **Source ranking**: Prioritize authoritative sources
- **Multi-language**: Support for Shona and Ndebele queries
- **PDF extraction**: Direct access to legal documents
- **Case law database**: Integration with legal databases

## Support and Resources

### Tavily Resources

- [Tavily Documentation](https://docs.tavily.com)
- [API Reference](https://docs.tavily.com/api-reference)
- [Support](https://tavily.com/support)

### DeepCounsel Resources

- Check `lib/ai/tools/tavily-search.ts` for implementation
- Review `app/(chat)/api/chat/route.ts` for integration
- See system prompts in `lib/ai/prompts.ts`

## Feedback and Improvements

If you encounter issues or have suggestions:

1. Check Tavily service status
2. Review error messages
3. Verify API key configuration
4. Test with simple queries first
5. Report persistent issues

---

**Note**: Tavily search provides access to current information, but legal advice should always be verified with qualified legal professionals. DeepCounsel is an AI assistant tool, not a replacement for professional legal counsel.
