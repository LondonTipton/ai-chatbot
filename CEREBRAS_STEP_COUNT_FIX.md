# Cerebras Step Count Fix - Tool Execution Issue

## Problem

After implementing the research progress UI, tools were executing successfully and the progress UI was working perfectly, but **no final message was being displayed**.

### Root Cause

Cerebras was hitting the `stopWhen: stepCountIs(5)` limit during tool execution, causing it to stop **before generating a text response**.

### What Was Happening

1. User asks a question requiring research
2. Cerebras calls `tavilySearch` (step 1)
3. Cerebras calls `tavilyExtract` (step 2)
4. Cerebras calls `tavilySearch` again (step 3)
5. Cerebras calls `tavilyExtract` again (step 4)
6. Cerebras reaches step 5 limit
7. **Stream ends without generating text response**

### Logs Showed

```
[Tool Execution] 🔧 Tool started: tavilySearch
[Tool Execution] ✅ Tool completed: tavilySearch
[Tool Execution] 🔧 Tool started: tavilyExtract
[Tool Execution] ✅ Tool completed: tavilyExtract
[Tool Execution] 🔧 Tool started: tavilySearch
[Tool Execution] ✅ Tool completed: tavilySearch
[Tool Execution] 🔧 Tool started: tavilyExtract
[Tool Execution] ✅ Tool completed: tavilyExtract
[Main Chat] ✅ Response completed: 1 assistant message(s), with tool outputs
```

Note: "with tool outputs" but no text content!

## Solution

### Increased Step Count Limit

Changed from `stepCountIs(5)` to `stepCountIs(10)`:

```typescript
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPrompt({ selectedChatModel, requestHints }),
  messages: convertToModelMessages(uiMessages),
  stopWhen: stepCountIs(10), // Increased from 5 to allow text generation after tools
  // ...
});
```

### Why This Works

- Each tool call counts as a step
- With complex research queries, 4-5 tool calls are common
- The model needs additional steps to:
  1. Process tool results
  2. Generate a coherent response
  3. Stream the text to the user

### Step Count Breakdown

**Before (stepCountIs(5)):**

- Step 1: tavilySearch
- Step 2: tavilyExtract
- Step 3: tavilySearch
- Step 4: tavilyExtract
- Step 5: ❌ Limit reached, no text generation

**After (stepCountIs(10)):**

- Steps 1-4: Tool calls
- Steps 5-6: Process results
- Steps 7-10: Generate and stream response ✅

## Additional Improvements

### Enhanced Validation Logging

Added more detailed warnings when no text is generated:

```typescript
console.warn(
  "[Main Chat] 🔧 This is likely due to Cerebras stopping after tool execution."
);
console.warn(
  "[Main Chat] 💡 Consider: 1) Increasing stepCountIs limit, 2) Using a different model for tool-heavy queries, or 3) Implementing a follow-up mechanism"
);
```

## Testing

Test with research-heavy queries:

- "Are there cases about spamming?"
- "Find cases involving Notice of Opposition"
- "What are recent amendments to the Labour Act?"

Expected behavior:

1. ✅ Progress UI appears and tracks tools
2. ✅ Multiple tools execute (search, extract, search, extract)
3. ✅ Progress UI shows completion
4. ✅ **Final message appears with analysis**
5. ✅ Progress UI auto-dismisses

## Performance Considerations

### Step Count vs. Cost

- Higher step count = more potential API calls
- But: Cerebras is fast and relatively inexpensive
- Trade-off: Better UX vs. slightly higher cost

### Optimal Settings

For research-heavy legal queries:

- **Minimum**: `stepCountIs(8)` - Allows 4 tool calls + response
- **Recommended**: `stepCountIs(10)` - Comfortable margin
- **Maximum**: `stepCountIs(15)` - For very complex queries

## Alternative Solutions Considered

### 1. Reduce Tool Calls

❌ Would limit research depth and quality

### 2. Use Different Model

❌ Other models are slower or more expensive

### 3. Follow-up Mechanism

⚠️ Complex to implement, adds latency

### 4. Increase Step Count

✅ **Simple, effective, minimal downside**

## Related Issues

This fix also addresses:

- Empty responses after tool execution
- "Response completed but contains no meaningful content" warnings
- UI showing spinner indefinitely
- Users thinking the system is broken

## Files Modified

- `app/(chat)/api/chat/route.ts`
  - Changed `stopWhen: stepCountIs(5)` to `stepCountIs(10)`
  - Added enhanced validation logging

## Monitoring

Watch for these log patterns:

**Good (Working):**

```
[Tool Execution] 🔧 Tool started: tavilySearch
[Tool Execution] ✅ Tool completed: tavilySearch
[Main Chat] ✅ Response completed: 1 assistant message(s), 5577 chars, with tool outputs
```

**Bad (Still Failing):**

```
[Tool Execution] ✅ Tool completed: tavilyExtract
[Main Chat] ⚠️ Response completed but contains no meaningful content!
[Main Chat] 🔧 This is likely due to Cerebras stopping after tool execution.
```

If you see the "Bad" pattern, increase `stepCountIs` further.

## Future Enhancements

1. **Dynamic Step Count**: Adjust based on query complexity
2. **Model Selection**: Auto-switch to different model for tool-heavy queries
3. **Streaming Indicators**: Show "Analyzing results..." after tools complete
4. **Fallback Mechanism**: Retry with higher step count if no text generated
