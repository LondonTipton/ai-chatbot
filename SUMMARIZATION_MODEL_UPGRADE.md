# Summarization Model Upgrade

## Changes Made

### Model Upgrade

**From:** `llama3.1-8b` (8,192 token context)  
**To:** `llama-3.3-70b` (128,000 token context)

This is a **16x increase** in context window capacity!

### Why This Matters

The summarization model (used by `title-model` in providers) is responsible for:

- Summarizing large legal documents from web extraction
- Processing content before sending to main chat model
- Handling title generation and artifact processing

With the old 8K context limit, documents over ~30K characters would fail. Now we can handle documents up to ~400K characters (100x more!).

## Updated Limits

### tavily-extract.ts

```typescript
const SUMMARIZE_THRESHOLD = 100_000; // Up from 30K
const ABSOLUTE_MAX_LENGTH = 400_000; // Up from 100K
```

### summarize-content.ts

```typescript
const maxInputChars = 400_000;  // Up from 20K
// Token limit check: 120K instead of 7K
if (estimatedTokens > 120_000) { ... }
```

## Performance Impact

### Before (llama3.1-8b)

- Context: 8,192 tokens
- Speed: ~2,200 tokens/sec
- Max content: ~30K chars
- Cost: Lower

### After (llama-3.3-70b)

- Context: 128,000 tokens (16x more)
- Speed: ~2,100 tokens/sec (similar)
- Max content: ~400K chars (13x more)
- Cost: Slightly higher (but worth it)

## Benefits

1. **No More Context Errors**: Can handle massive legal documents
2. **Better Summaries**: 70B model is more capable than 8B
3. **Fewer Truncations**: Most content fits without chunking
4. **Better Legal Analysis**: Can process entire case documents

## Testing

Try extracting content from large legal documents:

```
"Extract and summarize the key points from [large legal document URL]"
```

Watch for logs:

```
✅ [Providers] Using Cerebras llama-3.3-70b for title-model
✅ [Summarize] Estimated tokens: 95000 (limit: 128K)
✅ [Summarize] Reduced from 380000 to 8500 chars
```

## Cost Considerations

llama-3.3-70b is more expensive than llama3.1-8b, but:

- Still very affordable on Cerebras
- Prevents failed requests (which waste money)
- Better quality summaries reduce follow-up requests
- Overall better value for legal use case

## Rollback (if needed)

If you need to revert to the cheaper model:

```typescript
// In lib/ai/providers.ts
"title-model": cerebrasProvider("llama3.1-8b")

// In lib/ai/tools/summarize-content.ts
const maxInputChars = 20_000;
if (estimatedTokens > 7000) { ... }

// In lib/ai/tools/tavily-extract.ts
const SUMMARIZE_THRESHOLD = 30_000;
const ABSOLUTE_MAX_LENGTH = 100_000;
```

## Related Files

- `lib/ai/providers.ts` - Model configuration
- `lib/ai/tools/summarize-content.ts` - Summarization logic
- `lib/ai/tools/tavily-extract.ts` - Content extraction
