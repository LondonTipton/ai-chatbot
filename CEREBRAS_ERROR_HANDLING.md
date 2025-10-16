# Cerebras Error Handling

## Overview

The application now includes robust error handling for Cerebras API failures, including automatic retries and user-friendly error messages.

## Features

### 1. Automatic Retries

The chat route now includes `maxRetries: 2` in the `streamText` configuration, which automatically retries failed requests up to 2 times before giving up.

### 2. Enhanced Error Messages

When errors occur, users see helpful, context-specific messages instead of generic errors:

- **Server Errors (500)**: "The AI service is temporarily unavailable. Please try again in a moment."
- **Type Validation Errors**: "The AI service returned an unexpected response. Please try again."
- **Rate Limit Errors (429)**: "Too many requests. Please wait a moment and try again."
- **Generic Errors**: "An error occurred while processing your request. Please try again."

### 3. Key Rotation on Errors

The Cerebras key balancer now automatically disables keys that encounter server errors:

- **Server errors (500)**: Key disabled for 30 seconds
- **Rate limit errors (429)**: Key disabled for 60 seconds (or as specified in error)
- Automatic rotation to next available key
- Keys are re-enabled after cooldown period

## Error Flow

1. User sends a message
2. Cerebras API returns an error (e.g., 500)
3. AI SDK retries automatically (up to 2 times)
4. If all retries fail:
   - Error is logged to console with details
   - Failed key is marked and disabled temporarily
   - User sees friendly error message
   - Next request will use a different key

## Monitoring

Check the console logs for error details:

```
[Main Chat] Stream error: <error details>
[Cerebras Balancer] Disabled key abc12345... for 30s due to: Server error
```

## Configuration

### Adjust Retry Count

In `app/(chat)/api/chat/route.ts`:

```typescript
const result = streamText({
  // ...
  maxRetries: 2, // Change this value
  // ...
});
```

### Adjust Cooldown Periods

In `lib/ai/cerebras-key-balancer.ts`:

```typescript
const retryDelay = retryMatch
  ? Number.parseFloat(retryMatch[1])
  : isServerError
  ? 30
  : 60; // Adjust these values
```

## Testing

To test error handling:

1. Temporarily use an invalid API key
2. Send a message
3. Observe the error message and key rotation in console
4. Verify user sees friendly error message

## Common Issues

### All Keys Disabled

If all keys are disabled simultaneously, the balancer will use the least recently disabled key and re-enable it automatically.

### Persistent 500 Errors

If Cerebras API is experiencing widespread issues:

- The system will continue retrying with different keys
- Consider temporarily switching to Gemini fallback
- Check Cerebras status page for service updates

## Fallback Strategy

For critical applications, consider implementing a fallback to Gemini when all Cerebras keys fail:

```typescript
// In providers.ts
"chat-model": (() => {
  try {
    return cerebrasProvider("gpt-oss-120b");
  } catch (error) {
    console.warn("Cerebras unavailable, falling back to Gemini");
    return googleProvider("gemini-2.5-flash");
  }
})()
```

This is already implemented in the provider configuration but only catches initialization errors, not runtime errors.

## Recent Fixes

### Fixed Model Reference in Summarize Tool (Latest)

**Issue**: The `summarize-content.ts` tool was referencing a non-existent model `llama-3.3-70b`, causing errors:

```
Error [AI_NoSuchModelError]: No such languageModel: llama-3.3-70b
```

**Fix**: Updated to use `title-model` which maps to Cerebras `llama3.1-8b` - a fast, efficient model perfect for summarization tasks.

**Location**: `lib/ai/tools/summarize-content.ts`

### Available Models

The following model IDs are available in the provider configuration:

- `chat-model` - Main chat (Cerebras gpt-oss-120b)
- `chat-model-reasoning` - Advanced reasoning (Cerebras gpt-oss-120b)
- `chat-model-image` - Multimodal (Gemini 2.5 Flash)
- `title-model` - Fast generation (Cerebras llama3.1-8b)
- `artifact-model` - Artifact generation (Cerebras llama3.1-8b)

Always use these model IDs when calling `myProvider.languageModel()`.
