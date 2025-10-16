# Cerebras Tool Calling Status

## Current Situation

Cerebras Llama 3.1 models are configured as the default provider, but tool calling is not working as expected.

### Observed Behavior

The model is generating tool calls as JSON text output instead of using the proper tool calling mechanism:

```
[DEBUG] Generated text preview: {"type": "function", "name": "tavilySearch", "parameters": {...
[DEBUG] Tool calls: 0
```

This indicates the model is trying to call tools but the AI SDK is not recognizing them as proper tool calls.

## Root Cause Analysis

### 1. Model Behavior

Cerebras Llama 3.1 models support tool calling according to their documentation, but they may require specific configuration or prompting that differs from other providers.

### 2. AI SDK Integration

The `@ai-sdk/cerebras` package may not fully implement tool calling support, or it may require additional configuration.

### 3. Prompt Engineering

The system prompt may be confusing the model, causing it to output JSON text instead of making proper tool calls.

## Potential Solutions

### Option 1: Use Gemini for Tool Calling (Recommended for Now)

**Status**: ✅ Easiest and most reliable

Switch back to Gemini for models that need tool calling, while keeping Cerebras for simple chat:

```typescript
// In lib/ai/providers.ts
export const myProvider = customProvider({
  languageModels: {
    // Use Gemini for tool-heavy tasks
    "chat-model": googleProvider("gemini-2.5-flash"),

    // Use Cerebras for simple chat (no tools)
    "chat-model-simple": cerebrasProvider("llama3.1-8b"),

    // Use Gemini for reasoning with tools
    "chat-model-reasoning": googleProvider("gemini-2.5-pro"),
  },
});
```

### Option 2: Configure Cerebras with Strict Mode

**Status**: ⚠️ Requires testing

According to Cerebras documentation, tool schemas need `"strict": True`:

```python
tools = [{
    "type": "function",
    "function": {
        "name": "calculate",
        "strict": True,  # Required for Cerebras
        "description": "...",
        "parameters": {...}
    }
}]
```

The AI SDK may not be setting this automatically. We would need to:

1. Check if `@ai-sdk/cerebras` supports strict mode
2. Potentially create custom tool wrappers
3. Test with Cerebras API directly

### Option 3: Use Cerebras for Non-Tool Tasks Only

**Status**: ✅ Practical hybrid approach

Keep Cerebras for fast, simple responses without tools:

- Title generation
- Simple Q&A
- Text summarization

Use Gemini when tools are needed:

- Web search (tavilySearch)
- Document extraction (tavilyExtract)
- Complex legal research

### Option 4: Wait for AI SDK Update

**Status**: ⏳ Future solution

The `@ai-sdk/cerebras` package may need updates to properly support tool calling. Monitor:

- https://github.com/vercel/ai
- https://ai-sdk.dev/providers/ai-sdk-providers/cerebras

## Recommended Action Plan

### Immediate (Today)

1. **Switch back to Gemini for the main chat model** to restore tool calling
2. **Keep Cerebras for specific use cases** where tools aren't needed
3. **Document the limitation** for future reference

### Short Term (This Week)

1. **Test Cerebras tool calling directly** using their Python SDK
2. **Compare behavior** with AI SDK implementation
3. **Report issue** to Vercel AI SDK if it's a bug

### Long Term (This Month)

1. **Monitor AI SDK updates** for Cerebras improvements
2. **Consider contributing** a fix if the issue is in the SDK
3. **Evaluate alternative providers** (Groq, Fireworks) for fast inference with tools

## Implementation: Hybrid Approach

Here's how to implement a hybrid approach that uses both providers optimally:

```typescript
// lib/ai/providers.ts
export const myProvider = customProvider({
  languageModels: {
    // Gemini for tool-heavy chat (default)
    "chat-model": googleProvider("gemini-2.5-flash"),

    // Cerebras for fast simple responses
    "chat-model-fast": cerebrasProvider("llama3.1-8b"),

    // Gemini for advanced reasoning with tools
    "chat-model-reasoning": googleProvider("gemini-2.5-pro"),

    // Cerebras for title generation (no tools needed)
    "title-model": cerebrasProvider("llama3.1-8b"),

    // Cerebras for artifacts (no tools needed)
    "artifact-model": cerebrasProvider("llama3.1-8b"),
  },
});
```

## Testing Checklist

- [ ] Test Gemini tool calling (should work)
- [ ] Test Cerebras without tools (should work)
- [ ] Test Cerebras with tools (currently broken)
- [ ] Test hybrid approach (Gemini for tools, Cerebras for simple)
- [ ] Verify performance improvements with Cerebras where applicable
- [ ] Document which models support which features

## References

- [Cerebras Tool Use Documentation](https://inference-docs.cerebras.ai/capabilities/tool-use)
- [AI SDK Cerebras Provider](https://ai-sdk.dev/providers/ai-sdk-providers/cerebras)
- [Vercel AI SDK GitHub](https://github.com/vercel/ai)
- [Cerebras Python SDK](https://github.com/Cerebras/cerebras-cloud-sdk-python)

## Status Updates

- **2025-01-15**: Initial investigation - tool calling not working with Cerebras
- **2025-01-15**: Simplified prompts and removed experimental features
- **2025-01-15**: Recommended hybrid approach as interim solution
