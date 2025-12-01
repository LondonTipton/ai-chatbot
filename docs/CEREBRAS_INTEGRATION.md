# Cerebras AI Integration

This document consolidates all Cerebras-related configuration, setup, and optimization information.

## Model Configuration

### Available Models

- `llama-3.3-70b` - Fast, general-purpose (used for query enhancement, coordination)
- `gpt-oss-120b` - Advanced reasoning, tool calling (default for agents)
- `llama3.1-8b` - Lightweight, fast (used for artifacts)

### Model Selection Strategy

```typescript
// Default chat model
model: () => cerebrasProvider("gpt-oss-120b");

// Query enhancement (faster)
model: () => cerebrasProvider("llama-3.3-70b");

// Artifacts (lightweight)
model: () => cerebrasProvider("llama3.1-8b");
```

## Key Balancer

### Setup

The key balancer distributes requests across multiple Cerebras API keys to avoid rate limits.

**Environment Variables:**

```
CEREBRAS_API_KEY=primary_key
CEREBRAS_API_KEY_2=secondary_key
CEREBRAS_API_KEY_3=tertiary_key
```

**Redis Configuration (optional but recommended):**

```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### How It Works

1. Round-robin selection across available keys
2. Automatic key rotation on rate limit errors
3. Redis-based health tracking (disables keys until UTC midnight on rate limit)
4. In-memory caching for rapid-fire requests (30s TTL)

## Rate Limits

### Cerebras Limits (per key)

- 30 requests per minute (RPM)
- 900 requests per hour (RPH)
- 14,400 requests per day (RPD)

### Error Handling

- **Rate Limit (429)**: Key disabled until UTC midnight, immediate rotation to next key
- **Queue Overflow**: Key disabled for 15 seconds, immediate rotation
- **Other Errors**: 2-second backoff, retry with same key

## Mastra Integration

### Agent Configuration

```typescript
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";

export const myAgent = new Agent({
  name: "my-agent",
  instructions: "...",
  model: () => {
    const provider = getBalancedCerebrasProviderSync();
    return provider("gpt-oss-120b");
  },
  tools: { ... }
});
```

### Token Management

- Context window: 131K tokens for gpt-oss-120b
- Recommended max output: 4K tokens
- Temperature: 0.7 (default), 0.3 (structured output)

## Performance Optimization

### Best Practices

1. Use `llama-3.3-70b` for simple tasks (faster, cheaper)
2. Use `gpt-oss-120b` for complex reasoning and tool calling
3. Enable key balancing with multiple API keys
4. Use Redis for production deployments
5. Monitor rate limits via Redis health tracking

### Latency Targets

- Simple queries: 200-500ms
- Complex reasoning: 1-3s
- Tool calling: 2-5s (depends on tool execution)

## Troubleshooting

### "No Cerebras API key available"

- Ensure `CEREBRAS_API_KEY` is set in `.env.local`
- Check that the key is valid and active

### Frequent Rate Limits

- Add more API keys (CEREBRAS_API_KEY_2, etc.)
- Enable Redis for better key health tracking
- Reduce request frequency

### Tool Calling Issues

- Use `gpt-oss-120b` (best tool calling support)
- Ensure tool schemas are valid JSON Schema
- Keep tool descriptions concise

## Reference

- Cerebras Docs: https://cerebras.ai/docs
- Model Comparison: https://cerebras.ai/models
- Rate Limits: https://cerebras.ai/pricing
