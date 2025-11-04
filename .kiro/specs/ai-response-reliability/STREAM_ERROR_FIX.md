# Stream Error Detection and Retry Fix

## Problem

The AI response system was experiencing failures where:

1. Socket/connection errors occurred mid-stream (e.g., `TypeError: terminated`, `SocketError: other side closed`)
2. The stream would start successfully but fail partway through
3. By the time validation detected the issue (0 characters received), the stream had already been returned to the client
4. The retry system couldn't retry because the response was already sent
5. Users received incomplete or empty responses

### Error Pattern from Logs

```
[Stream] ❌ Stream error: [TypeError: terminated] {
  [cause]: [Error [SocketError]: other side closed]
}
[Validation] INVALID: Text length 0 chars is below minimum 10 chars
[StreamRetry] ❌ Response validation failed: Text content too short (0 chars, minimum 10)
[StreamRetry] ⚠️  Validation failed but stream already returned. This indicates a stream error occurred.
```

## Root Cause

The architecture had a timing issue:

1. `createUIMessageStream()` creates and returns a stream immediately
2. The retry manager validates the stream and returns it to the client
3. Socket errors occur during streaming (after the response has started)
4. Validation in `onFinish` detects the problem but can't trigger a retry
5. The stream has already been sent to the client

## Solution

Implemented a **stream warmup period** that validates the stream before returning it to the client:

### Key Changes

1. **Capture Stream Errors Early**

   - Added `streamError` variable to capture errors from `onError` callback
   - Added `streamCompleted` flag to track stream lifecycle

2. **Stream Warmup Period**

   - Wait 500ms after stream creation before returning it
   - This allows time for socket/connection errors to surface
   - If an error occurs during warmup, throw it to trigger retry

3. **Early Validation**
   - If stream completes during warmup, validate the response
   - If validation fails, throw error to trigger retry
   - Only return stream if it passes warmup checks

### Code Changes

```typescript
// Track stream state
let streamError: Error | null = null;
let streamCompleted = false;

// In onError callback
onError: (error) => {
  streamError = error instanceof Error ? error : new Error(String(error));
  // ... existing error handling
};

// In onFinish callback
onFinish: async ({ messages }) => {
  streamCompleted = true;
  // ... existing validation

  // If stream had an error, we can retry
  if (streamError) {
    throw new Error(
      `Stream validation failed: ${validation.reason}. Original error: ${streamError.message}`
    );
  }
};

// Before returning stream - warmup period
const warmupTimeMs = 500;
await new Promise((resolve) => setTimeout(resolve, warmupTimeMs));

// Check for early errors
if (streamError) {
  throw streamError; // Triggers retry
}

// Check for early validation failures
if (streamCompleted && capturedMessages.length > 0) {
  const validation = validateResponseEnhanced(capturedMessages);
  if (!validation.isValid) {
    throw new Error(`Stream validation failed: ${validation.reason}`);
  }
}

// Stream passed warmup, safe to return
return { stream, messages: capturedMessages };
```

## Benefits

1. **Catches Socket Errors Early**: 500ms warmup period detects connection issues before returning stream
2. **Enables Retry**: Throwing errors during warmup allows retry manager to catch and retry
3. **Prevents Incomplete Responses**: Users don't receive partial/empty responses
4. **Maintains Streaming**: Still returns a stream (not buffering entire response)
5. **Minimal Latency Impact**: 500ms delay is acceptable for reliability gain

## Trade-offs

- **Slight Latency Increase**: Adds 500ms to first token time
- **Not Perfect**: Errors that occur after 500ms still can't be retried
- **Acceptable**: The vast majority of socket errors occur immediately or within first 500ms

## Testing

To verify the fix works:

1. Monitor logs for `[StreamRetry] Warming up stream...` messages
2. Check that socket errors trigger `[StreamRetry] 🔄 Early stream error detected, triggering retry`
3. Verify retry attempts increase when errors occur
4. Confirm users receive complete responses after retry

## Future Improvements

1. **Adaptive Warmup**: Adjust warmup time based on model/provider
2. **Stream Health Monitoring**: Track stream health metrics over time
3. **Provider-Specific Handling**: Different strategies for different AI providers
4. **Client-Side Retry**: Allow client to detect and retry incomplete responses

## Related Files

- `app/(chat)/api/chat/route.ts` - Main implementation
- `lib/utils/validate-response.ts` - Response validation
- `lib/ai/retry-manager.ts` - Retry orchestration
- `.kiro/specs/ai-response-reliability/` - Full spec documentation
