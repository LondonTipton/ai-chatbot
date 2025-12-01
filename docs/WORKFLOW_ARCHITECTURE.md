# Workflow Architecture

This document consolidates all workflow-related architecture, implementation, and optimization information.

## Workflow Types

### 1. Quick Fact Search (Fastest)

- **Use Case**: Simple factual queries
- **Latency**: 2-5 seconds
- **Tools**: Tavily search only
- **Model**: llama-3.3-70b

### 2. Standard Research (Balanced)

- **Use Case**: General legal research
- **Latency**: 5-10 seconds
- **Tools**: Tavily + Legal search (parallel)
- **Model**: gpt-oss-120b

### 3. Multi-Search (Comprehensive)

- **Use Case**: Complex multi-part queries
- **Latency**: 10-20 seconds
- **Tools**: Query decomposition → parallel searches → synthesis
- **Model**: gpt-oss-120b

### 4. Deep Research (Most Thorough)

- **Use Case**: In-depth legal analysis
- **Latency**: 20-40 seconds
- **Tools**: Multi-stage search → extraction → analysis
- **Model**: gpt-oss-120b

## Architecture Patterns

### Route-Driven Selection

The chat agent automatically selects the appropriate workflow based on query complexity:

```typescript
// Complexity detection
if (isSimpleFactual(query)) {
  return quickFactSearchTool.execute();
} else if (isMultiPart(query)) {
  return multiSearchTool.execute();
} else if (requiresDeepAnalysis(query)) {
  return deepResearchTool.execute();
} else {
  return standardResearchTool.execute();
}
```

### Parallel Execution

Workflows execute searches in parallel for better performance:

```typescript
const [tavilyResults, legalResults] = await Promise.all([
  tavilySearchTool.execute({ query }),
  legalSearchTool.execute({ query }),
]);
```

### Query Enhancement

All workflows use LLM-based query enhancement:

```typescript
const enhanced = await enhanceSearchQuery(query, conversationHistory);
// Returns: { variations: string[], hydePassage: string }
```

## Data Flow

### 1. Input Processing

```
User Query → Query Enhancement → Workflow Selection
```

### 2. Search Execution

```
Enhanced Query → Parallel Searches → Result Aggregation
```

### 3. Synthesis

```
Raw Results → Content Extraction → LLM Synthesis → Formatted Response
```

## Context Management

### Conversation History

- Workflows receive conversation history for context-aware enhancement
- Limited to last 5 messages to avoid token bloat
- Used for query disambiguation and follow-up handling

### Result Caching

- Query enhancement results cached for 1 hour
- Search results not cached (freshness priority)
- LRU cache with max 1000 entries

## Token Management

### Budget Allocation

- Query Enhancement: 50-100 tokens
- Search Execution: N/A (external API)
- Content Extraction: 500-1000 tokens per source
- Synthesis: 2000-4000 tokens

### Optimization Strategies

1. Use smaller models for enhancement (llama-3.3-70b)
2. Limit search results (10-20 per query)
3. Extract only relevant sections from sources
4. Use structured output for synthesis

## Error Handling

### Graceful Degradation

```typescript
try {
  return await primaryWorkflow.execute();
} catch (error) {
  console.error("Primary workflow failed:", error);
  return await fallbackWorkflow.execute();
}
```

### Timeout Management

- Quick Fact: 10s timeout
- Standard: 20s timeout
- Multi-Search: 30s timeout
- Deep Research: 60s timeout

## Performance Metrics

### Target Latencies

- P50: < 5s (standard research)
- P95: < 15s (standard research)
- P99: < 30s (standard research)

### Success Rates

- Search success: > 95%
- Synthesis success: > 98%
- Overall workflow: > 93%

## Best Practices

### Workflow Design

1. Keep workflows focused on single responsibility
2. Use parallel execution where possible
3. Implement proper error handling and fallbacks
4. Monitor and log performance metrics

### Tool Integration

1. Wrap external APIs with retry logic
2. Validate tool inputs/outputs
3. Handle rate limits gracefully
4. Cache expensive operations

### Testing

1. Test each workflow independently
2. Test with various query types
3. Test error scenarios and timeouts
4. Monitor production metrics

## Migration Notes

### V1 → V2 Workflows

- Removed redundant tool wrapping
- Simplified data flow (direct tool execution)
- Improved error handling
- Better token management

### Breaking Changes

- Tool execution now returns raw results (no wrapper objects)
- Workflow context structure changed
- Enhanced query format updated

## Reference

- Mastra Workflows: https://mastra.ai/docs/workflows
- Tool Integration: https://mastra.ai/docs/tools
- Agent Architecture: https://mastra.ai/docs/agents
