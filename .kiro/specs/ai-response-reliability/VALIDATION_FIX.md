# Validation Rule Fix: Accept Tool Activity Without Text

## Problem

The validation was rejecting valid AI responses that contained tool calls but no final text output. This was causing false negatives where the AI was working correctly but validation marked it as invalid.

### Example from Logs

```
[StreamRetry] Message 1: 6 parts - step-start, reasoning, tool-tavilyAdvancedSearch, step-start, reasoning, data-usage
[StreamRetry] ❌ Response validation failed: Text content too short (0 chars, minimum 10)
```

The AI:

- Called the `tavilyAdvancedSearch` tool
- Generated reasoning steps
- But didn't generate final text (or text generation was still in progress)

The old validation rejected this as invalid because it had 0 characters of text.

## Root Cause

The validation rules were too strict:

### Old Rule 3

```typescript
// Reject if tool calls without text
if (toolCallsWithoutText > 0 && totalTextLength === 0) {
  return { isValid: false, reason: "Only tool calls without text" };
}
```

### Old Rule 4

```typescript
// Reject if text < 10 characters
if (totalTextLength < MIN_TEXT_LENGTH) {
  return { isValid: false, reason: "Text too short" };
}
```

These rules didn't account for:

1. **Tool calls in progress** - AI is still working
2. **Tool outputs available** - AI has results to show
3. **Reasoning steps** - AI is thinking through the problem
4. **Streaming nature** - Text might be generated after validation runs

## Solution

Updated validation to accept responses with tool activity, even without text:

### New Rule 3

```typescript
// Only reject if tool calls WITHOUT outputs AND without text
if (toolCallsWithoutText > 0 && totalTextLength === 0 && !hasToolOutputs) {
  return { isValid: false, reason: "Tool calls without outputs or text" };
}
```

### New Rule 4

```typescript
// Only reject short text if NO tools were used
if (totalTextLength < MIN_TEXT_LENGTH && !hasToolCalls && !hasToolOutputs) {
  return { isValid: false, reason: "Text too short (no tools)" };
}
```

### New Rule 4b (Added)

```typescript
// Accept tool activity even without text
if ((hasToolCalls || hasToolOutputs) && totalTextLength < MIN_TEXT_LENGTH) {
  return {
    isValid: true,
    reason: "Tool activity detected (text generation may be in progress)",
  };
}
```

## Validation Logic Flow

```
1. No assistant messages? → INVALID
2. All messages empty? → INVALID
3. Tool calls without outputs or text? → INVALID
4. No tools AND text < 10 chars? → INVALID
5. Tool activity present? → VALID (even without text)
6. Tool outputs + text ≥ 10 chars? → VALID
7. Text ≥ 10 chars? → VALID
8. Otherwise? → INVALID
```

## What This Fixes

### Before (Rejected)

- ❌ Tool call + reasoning + 0 chars text
- ❌ Tool output + 5 chars text
- ❌ Multiple tool calls + reasoning steps

### After (Accepted)

- ✅ Tool call + reasoning + 0 chars text
- ✅ Tool output + 5 chars text
- ✅ Multiple tool calls + reasoning steps

### Still Rejected (Correctly)

- ❌ No messages at all
- ❌ All empty messages
- ❌ No tools AND text < 10 chars
- ❌ Tool calls without outputs AND no text

## Why This Makes Sense

1. **Tool calls indicate work in progress** - The AI is actively processing the request
2. **Tool outputs contain information** - Even without text, the outputs have value
3. **Reasoning steps show thinking** - The AI is working through the problem
4. **Streaming is asynchronous** - Text might be generated after validation runs
5. **UI can handle it** - The client can display tool activity and reasoning

## Impact

### Positive

- Reduces false negative validation failures
- Accepts valid AI responses that use tools
- Better handles streaming responses
- Improves user experience (fewer "empty" responses)

### Neutral

- Validation still catches truly empty responses
- No change to responses with sufficient text
- Transaction management still works correctly

### Monitoring

Watch for:

- Decrease in validation failure rate
- No increase in truly empty responses reaching users
- Tool usage patterns (calls vs outputs)

## Testing

### Test Cases Updated

```typescript
// Should now pass
test("accepts tool calls without text", () => {
  const messages = [
    {
      role: "assistant",
      parts: [
        { type: "tool-call", toolName: "search", args: {} },
        { type: "reasoning", text: "Searching..." },
      ],
    },
  ];
  expect(validateResponseEnhanced(messages).isValid).toBe(true);
});

// Should still fail
test("rejects empty response without tools", () => {
  const messages = [
    {
      role: "assistant",
      parts: [{ type: "text", text: "" }],
    },
  ];
  expect(validateResponseEnhanced(messages).isValid).toBe(false);
});
```

## Related Issues

This fix addresses the core issue that was being misdiagnosed as "socket errors":

- The socket errors were a red herring
- The real issue was overly strict validation
- Responses were valid but being rejected
- This caused confusion about retry logic

## Conclusion

The validation rules now correctly distinguish between:

- **Invalid responses** (truly empty, no activity)
- **Valid responses in progress** (tool activity, reasoning)
- **Complete valid responses** (text + optional tools)

This reduces false negatives while maintaining protection against truly empty responses.
