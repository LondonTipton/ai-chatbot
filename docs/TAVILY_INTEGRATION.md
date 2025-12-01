# Tavily Search Integration

This document consolidates all Tavily-related configuration, optimization, and troubleshooting information.

## Configuration

### Environment Variables

```
TAVILY_API_KEY=your_api_key
TAVILY_API_KEY_2=secondary_key (optional)
TAVILY_API_KEY_3=tertiary_key (optional)
```

### Key Balancer

Similar to Cerebras, Tavily uses a key balancer for rate limit management:

- Round-robin key selection
- Automatic rotation on rate limits
- Redis-based health tracking (optional)

## Search Tools

### 1. Basic Search (`tavilySearchTool`)

```typescript
await tavilySearchTool.execute({
  context: {
    query: "contract law Zimbabwe",
    maxResults: 10,
  },
});
```

### 2. Advanced Search (`tavilySearchAdvancedTool`)

```typescript
await tavilySearchAdvancedTool.execute({
  context: {
    query: "employment law",
    maxResults: 20,
    jurisdiction: "Zimbabwe",
    includeRawContent: true,
  },
});
```

### 3. Extract Tool (`tavilyExtractTool`)

```typescript
await tavilyExtractTool.execute({
  context: {
    urls: ["https://example.com/article"],
  },
});
```

## Domain Prioritization

### Zimbabwe Legal Sources

The integration prioritizes these domains for legal queries:

- `zimlii.org` - Zimbabwe Legal Information Institute
- `veritaszim.net` - Veritas Zimbabwe
- `parlzim.gov.zw` - Parliament of Zimbabwe
- `justice.gov.zw` - Ministry of Justice
- `law.co.zw` - Zimbabwe Law Reports

### Configuration

```typescript
const priorityDomains = ["zimlii.org", "veritaszim.net", "parlzim.gov.zw"];
```

## Search Optimization

### Query Enhancement

All searches use LLM-enhanced queries:

```typescript
const enhanced = await enhanceSearchQuery(query);
// Use first variation for primary search
const results = await tavilySearch(enhanced.variations[0]);
```

### Result Filtering

- Filter by jurisdiction (Zimbabwe)
- Prioritize legal domains
- Remove duplicate URLs
- Validate content quality

### Performance Tuning

- **maxResults**: 10-20 (balance quality vs. latency)
- **includeRawContent**: false for summaries, true for deep analysis
- **searchDepth**: "basic" for speed, "advanced" for quality

## Rate Limits

### Tavily Limits

- Free tier: 1000 requests/month
- Pro tier: 10,000 requests/month
- Rate limit: 60 requests/minute

### Handling

- Automatic key rotation on 429 errors
- Exponential backoff on failures
- Graceful degradation to cached results

## Error Handling

### Common Errors

1. **Rate Limit (429)**: Rotate to next key
2. **Invalid API Key (401)**: Check environment variables
3. **Timeout**: Retry with shorter timeout
4. **No Results**: Fallback to broader query

### Retry Strategy

```typescript
const maxRetries = 3;
const baseDelay = 1000; // 1 second

for (let i = 0; i < maxRetries; i++) {
  try {
    return await tavilySearch(query);
  } catch (error) {
    if (i === maxRetries - 1) throw error;
    await sleep(baseDelay * Math.pow(2, i));
  }
}
```

## Testing

### Test Queries

```typescript
// Simple factual
"What is the Labour Act in Zimbabwe?";

// Case law
"Don Nyamande v Zuva Petroleum";

// Complex legal
"grounds for unfair dismissal in Zimbabwe";
```

### Validation

- Check result count (should be > 0)
- Verify domain prioritization
- Validate content relevance
- Test rate limit handling

## Monitoring

### Key Metrics

- Search success rate
- Average latency
- Rate limit hits
- Domain distribution

### Logging

```typescript
console.log("[Tavily] Query:", query);
console.log("[Tavily] Results:", results.length);
console.log("[Tavily] Latency:", latency);
console.log("[Tavily] Key used:", keyId);
```

## Best Practices

1. **Use query enhancement** for better results
2. **Enable domain prioritization** for legal queries
3. **Set appropriate maxResults** (10-20)
4. **Handle rate limits** with key rotation
5. **Cache results** when appropriate
6. **Monitor usage** to avoid quota exhaustion

## Troubleshooting

### No Results

- Check query formatting
- Try broader search terms
- Verify API key is valid
- Check Tavily service status

### Poor Quality Results

- Enable advanced search depth
- Add jurisdiction filter
- Use domain prioritization
- Enhance query with LLM

### Rate Limit Issues

- Add more API keys
- Implement caching
- Reduce search frequency
- Upgrade Tavily plan

## Reference

- Tavily Docs: https://docs.tavily.com
- API Reference: https://docs.tavily.com/api-reference
- Pricing: https://tavily.com/pricing
