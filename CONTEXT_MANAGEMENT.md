# Context Window Management

## Problem

Cerebras has a 65K token context limit. When using Tavily tools for legal research, the extracted content can easily exceed this limit, causing API errors.

## Solution Implemented

### 1. Message History Truncation

**File:** `app/(chat)/api/chat/route.ts`

- Limits conversation history to last 20 messages
- Prevents old messages from consuming context space
- Full history still saved to database

```typescript
const MAX_MESSAGES = 20;
const uiMessages =
  allMessages.length > MAX_MESSAGES
    ? allMessages.slice(-MAX_MESSAGES)
    : allMessages;
```

### 2. Search Result Truncation

**File:** `lib/ai/tools/tavily-search.ts`

- Limits each search result to 1,000 characters
- Provides enough context for the AI to understand relevance
- Adds "[truncated]" indicator

### 3. Smart Content Summarization

**Files:**

- `lib/ai/tools/tavily-extract.ts`
- `lib/ai/tools/summarize-content.ts`

**Three-tier approach:**

1. **Small content (< 5K chars)**: Return as-is
2. **Medium content (5K-45K chars)**: Simple truncation
3. **Large content (> 45K chars)**: AI-powered summarization

The AI summarization:

- Uses a fast model (Llama 3.3 70B) to extract key information
- Focuses on legal principles, citations, facts, and outcomes
- Reduces content while preserving critical details
- Falls back to truncation if summarization fails

### 4. Better Error Handling

**File:** `app/(chat)/api/chat/route.ts`

- Catches context length exceeded errors
- Returns user-friendly message
- Suggests starting a new chat

## Token Budget

With these changes, typical usage:

- Search results: ~5K tokens (5 results × 1K each)
- Extract results: ~25K tokens (5 URLs × 5K each, or less with summarization)
- Message history: ~10K tokens (20 messages × ~500 each)
- System prompt + tools: ~5K tokens
- **Total: ~45K tokens** (well under 65K limit)

## Why Not Multi-Part Loading?

You asked about sending data in chunks (64K, then more). This doesn't work because:

1. **LLMs process all context at once** - No "wait" mechanism exists
2. **No memory between calls** - Each API call is independent
3. **Context is not cumulative** - Can't "pre-load" information

## Alternative Approaches

If you need more context:

### Option 1: Use a Larger Context Model

- **Gemini 1.5 Pro**: 2M tokens (recommended for legal research)
- **Claude 3.5 Sonnet**: 200K tokens
- **GPT-4 Turbo**: 128K tokens

### Option 2: RAG (Retrieval-Augmented Generation)

- Store documents in vector database
- Retrieve only relevant chunks
- More complex but scales better

### Option 3: Hierarchical Processing

- First pass: Extract key info from documents
- Second pass: Answer user question with extracted info
- Already partially implemented with summarization

## Configuration

Adjust these constants in the tool files:

```typescript
// tavily-search.ts
const MAX_CONTENT_LENGTH = 1000; // Per search result

// tavily-extract.ts
const MAX_CONTENT_LENGTH = 5000; // Per extracted URL (after truncation)
const SUMMARIZE_THRESHOLD = 45000; // When to use AI summarization (~11K tokens)

// chat/route.ts
const MAX_MESSAGES = 20; // Message history limit
```

## Monitoring

Watch for these log messages:

- `[Main Chat] Truncated X messages to Y to fit context window`
- `[Summarize] Content too long (X chars), summarizing to ~Y chars`
- `[Summarize] Reduced from X to Y chars`

## Future Improvements

1. **Token counting**: Use actual token counts instead of character estimates
2. **Smart message selection**: Keep important messages, not just recent ones
3. **Streaming summarization**: Summarize in real-time as content is fetched
4. **Caching**: Cache summarized content to avoid re-processing
