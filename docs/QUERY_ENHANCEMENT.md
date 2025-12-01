# Query Enhancement System

This document consolidates all query enhancement, HyDE (Hypothetical Document Embeddings), and search optimization information.

## Overview

The query enhancement system uses LLMs to transform user queries into multiple semantic variations and hypothetical answers to improve search retrieval.

## Architecture

### Query Enhancer Agent

```typescript
import { enhanceSearchQuery } from "@/mastra/agents/query-enhancer-agent";

const enhanced = await enhanceSearchQuery(
  "can i be fired without notice?",
  conversationHistory
);

// Returns:
// {
//   variations: [
//     "Can an employee be dismissed without notice in Zimbabwe?",
//     "termination on notice provisions Labour Act Zimbabwe",
//     "dismissal without notice requirements and exemptions"
//   ],
//   hydePassage: "In terms of the Labour Act [Chapter 28:01]..."
// }
```

## Enhancement Strategy

### 1. Query Variations

Generates 3 distinct search queries:

- **Variation 1**: Natural language question
- **Variation 2**: Legal keyword string
- **Variation 3**: Alternative phrasing or related concept

### 2. HyDE Passage

Generates a hypothetical legal paragraph that would answer the query:

- Uses plausible legal language
- Cites relevant acts (Labour Act, Constitution)
- Focuses on statutory language and principles
- Avoids hallucinating specific case citations

## Usage Patterns

### Basic Search

```typescript
const enhanced = await enhanceSearchQuery(query);
const results = await tavilySearch(enhanced.variations[0]);
```

### Multi-Search

```typescript
const enhanced = await enhanceSearchQuery(query);
const searches = enhanced.variations.map((v) => tavilySearch(v));
const allResults = await Promise.all(searches);
```

### Vector Search

```typescript
const enhanced = await enhanceSearchQuery(query);
// Use HyDE passage for semantic search
const vectorResults = await vectorSearch(enhanced.hydePassage);
```

## Caching

### Cache Strategy

- **TTL**: 1 hour
- **Max Size**: 1000 entries
- **Key**: Hash of query + context
- **Eviction**: LRU (Least Recently Used)

### Cache Hit Rate

- Target: > 30% for repeated queries
- Actual: ~40% in production

## Context Awareness

### Conversation History

```typescript
const enhanced = await enhanceSearchQuery("what about termination?", [
  { role: "user", content: "Tell me about employment contracts" },
  { role: "assistant", content: "Employment contracts in Zimbabwe..." },
]);
// Enhancement considers previous context
```

### Context Limits

- Max messages: 5 (last 5 turns)
- Max chars per message: 200
- Total context budget: ~1000 chars

## Token Management

### Budget

- Input: 50-100 tokens (query + context)
- Output: 100-200 tokens (variations + HyDE)
- Total: 150-300 tokens per enhancement

### Optimization

- Use smaller model (llama-3.3-70b)
- Limit context to recent messages
- Cache results aggressively

## Performance

### Latency

- P50: 200ms
- P95: 500ms
- P99: 1000ms

### Success Rate

- > 99% (fallback to original query on failure)

## Error Handling

### Fallback Strategy

```typescript
try {
  return await enhanceSearchQuery(query);
} catch (error) {
  console.error("[Query Enhancer] Error:", error);
  // Fallback to simple variations
  return {
    variations: [`${query} Zimbabwe`, `${query} legal`, query],
    hydePassage: `${query} This is a legal issue in Zimbabwe.`,
  };
}
```

## Examples

### Simple Query

**Input**: "contract breach"

**Output**:

```json
{
  "variations": [
    "What constitutes a breach of contract in Zimbabwe?",
    "breach of contract remedies Zimbabwe law",
    "contract violation consequences and damages"
  ],
  "hydePassage": "A breach of contract occurs when one party fails to perform their obligations under the contract. In Zimbabwe, remedies include specific performance, damages, and cancellation..."
}
```

### Case Law Query

**Input**: "Don Nyamande case"

**Output**:

```json
{
  "variations": [
    "Don Nyamande v Zuva Petroleum Supreme Court judgment",
    "common law right to terminate on notice Nyamande case",
    "impact of Zuva Petroleum judgment on labour law"
  ],
  "hydePassage": "The Supreme Court judgment in Don Nyamande v Zuva Petroleum confirmed the common law right of an employer to terminate a contract of employment on notice..."
}
```

## Best Practices

1. **Always use enhancement** for search queries
2. **Use first variation** for primary search
3. **Use HyDE for vector search** when available
4. **Provide conversation context** for follow-ups
5. **Cache aggressively** to reduce latency
6. **Monitor cache hit rate** for optimization

## Monitoring

### Metrics to Track

- Enhancement latency
- Cache hit rate
- Fallback rate
- Token usage
- Variation quality

### Logging

```typescript
console.log("[Query Enhancer] Original:", query);
console.log("[Query Enhancer] Variations:", enhanced.variations);
console.log("[Query Enhancer] HyDE:", enhanced.hydePassage.substring(0, 50));
console.log("[Query Enhancer] Cache hit:", cacheHit);
```

## Troubleshooting

### Poor Enhancement Quality

- Check model configuration (should be llama-3.3-70b)
- Verify prompt instructions
- Review conversation context
- Test with different queries

### High Latency

- Check cache hit rate
- Reduce context size
- Use faster model
- Implement request batching

### Cache Issues

- Monitor cache size
- Check TTL settings
- Verify cache key generation
- Review eviction policy

## Reference

- HyDE Paper: https://arxiv.org/abs/2212.10496
- Query Expansion: https://en.wikipedia.org/wiki/Query_expansion
- Semantic Search: https://www.pinecone.io/learn/semantic-search/
