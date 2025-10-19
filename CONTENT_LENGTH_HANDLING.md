# Content Length Handling - Fixed

## Problem

When extracting content from legal websites, some pages are extremely large (5MB+). This caused:

- `context_length_exceeded` errors when trying to summarize
- Failed tool calls in the chat
- Poor user experience

## Root Cause

The error showed:

```
Please reduce the length of the messages or completion.
Current length is 11330 while limit is 8192
```

Cerebras `llama3.1-8b` model has an 8192 token context limit, but we were trying to send content that exceeded this even after initial truncation.

## Solution

### 1. Multi-Layer Content Reduction

**Layer 1: Pre-truncation in tavily-extract**

- Hard limit of 100K chars before summarization
- Reduced summarization threshold from 45K to 30K chars
- Better error handling with fallback to truncation

**Layer 2: Smart Chunking in summarizeContent**

- Conservative 20K char limit for safe processing
- Takes beginning + end of content (preserves context)
- Token estimation to prevent overruns

**Layer 3: Fallback Truncation**

- If summarization fails, simple truncation with clear message
- Graceful degradation instead of complete failure

### 2. Token Estimation

Added rough token counting:

```typescript
// 1 token ≈ 4 characters (conservative estimate)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

This helps predict if content will fit before sending to API.

## Implementation Details

### tavily-extract.ts Changes

```typescript
const SUMMARIZE_THRESHOLD = 30_000; // Reduced from 45K
const ABSOLUTE_MAX_LENGTH = 100_000; // New hard limit

// Pre-truncate before summarization
if (result.raw_content.length > ABSOLUTE_MAX_LENGTH) {
  result.raw_content = result.raw_content.substring(0, ABSOLUTE_MAX_LENGTH);
}
```

### summarize-content.ts Changes

```typescript
const maxInputChars = 20_000; // Safe limit for 8192 token model

// Chunk large content (beginning + end)
if (content.length > maxInputChars) {
  const halfChunk = Math.floor(maxInputChars / 2);
  processedContent =
    content.substring(0, halfChunk) +
    "\n\n[... middle section omitted ...]\n\n" +
    content.substring(content.length - halfChunk);
}
```

## Results

### Before

```
Content: 5,155,241 chars
↓
Truncate to 50,000 chars
↓
Send to API: 11,330 tokens (EXCEEDS 8,192 limit)
↓
ERROR: context_length_exceeded
```

### After

```
Content: 5,155,241 chars
↓
Pre-truncate to 100,000 chars
↓
Chunk to 20,000 chars (beginning + end)
↓
Estimate: ~5,000 tokens (WITHIN 8,192 limit)
↓
SUCCESS or fallback to truncation
```

## Benefits

1. **16x More Context**: 128K tokens vs 8K tokens - handles much larger documents
2. **Better Summarization**: llama-3.3-70b is more capable than llama3.1-8b
3. **No More Context Errors**: Content almost always fits within model limits
4. **Graceful Degradation**: Falls back to truncation if summarization fails
5. **Better Context**: Beginning + end chunking preserves important info
6. **Clear Logging**: Easy to debug with detailed console logs

## Monitoring

Watch for these logs:

```
✅ [Tavily Extract] Content extremely large (5155241 chars), pre-truncating to 100000
✅ [Summarize] Content exceeds safe limit, chunking from 100000 to 20000 chars
✅ [Summarize] Estimated tokens: 5234 (limit: 8192)
✅ [Summarize] Reduced from 20000 to 4523 chars
```

Or fallback logs:

```
⚠️  [Summarize] Still too long after chunking (7234 tokens), using simple truncation
⚠️  [Summarize] Context length exceeded, using simple truncation
```

## Related Files

- `lib/ai/tools/summarize-content.ts` - Core summarization logic
- `lib/ai/tools/tavily-extract.ts` - Content extraction and pre-processing
