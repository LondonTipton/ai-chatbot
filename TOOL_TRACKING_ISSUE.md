# Tool Tracking Issue - Stream Consumption Conflict

## Problem Discovered

When implementing real-time tool tracking, we encountered a critical issue:

**The `fullStream` from AI SDK can only be consumed once.**

### What Happened

1. We added code to consume `result.fullStream` to track tool calls in real-time
2. This prevented `result.toUIMessageStream()` from working properly
3. Result: Tool progress UI worked, but **no final message was displayed**

### Root Cause

```typescript
// ❌ WRONG - Consumes the stream twice
for await (const part of result.fullStream) {
  // Track tools...
}

dataStream.merge(result.toUIMessageStream()); // This won't work!
```

The `fullStream` is a ReadableStream that can only be read once. When we consumed it in our monitoring loop, there was nothing left for `toUIMessageStream()` to read.

### Solution Options

#### Option 1: Remove Real-time Tool Tracking (Current)

- Remove `fullStream` consumption
- Keep server-side logging only
- Messages display correctly
- **Trade-off**: No real-time progress UI

#### Option 2: Wrap Tool Functions

- Add tracking code inside each tool function
- Emit events before/after tool execution
- Doesn't interfere with stream
- **Trade-off**: Requires modifying each tool

#### Option 3: Use Transform Stream (Complex)

- Create a TransformStream to tee the fullStream
- One branch for UI, one for tracking
- **Trade-off**: Complex implementation, potential issues

#### Option 4: Server-Sent Events from Tools

- Tools emit SSE events directly
- Client listens to separate event stream
- **Trade-off**: Additional complexity

## Current Status

- ✅ Messages display correctly
- ✅ Tool execution logs in server console
- ❌ No real-time progress UI (temporarily disabled)

## Recommended Next Steps

Implement **Option 2** - wrap tool functions to emit progress events:

```typescript
// In each tool function
export const tavilySearch = tool({
  execute: async (args, { dataStream }) => {
    const toolId = generateUUID();

    // Emit start event
    dataStream?.write({
      type: "data-toolStart",
      data: { id: toolId, tool: "tavilySearch", message: "Searching..." },
    });

    try {
      const result = await performSearch(args);

      // Emit complete event
      dataStream?.write({
        type: "data-toolComplete",
        data: { id: toolId },
      });

      return result;
    } catch (error) {
      // Emit error event
      dataStream?.write({
        type: "data-toolError",
        data: { id: toolId, error: error.message },
      });
      throw error;
    }
  },
});
```

This approach:

- ✅ Doesn't interfere with stream consumption
- ✅ Provides real-time updates
- ✅ Works with existing infrastructure
- ✅ Allows error tracking
- ⚠️ Requires updating each tool function

## Files Affected

- `app/(chat)/api/chat/route.ts` - Stream handling
- `lib/ai/tools/*.ts` - Tool implementations
- `components/research-progress.tsx` - Progress UI
- `hooks/use-tool-execution.ts` - State management
