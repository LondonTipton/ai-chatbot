# ✅ Cerebras gpt-oss-120b Now Default Model

## What Changed

Your application now uses **Cerebras gpt-oss-120b** as the default model for all chat interactions!

### Model Configuration

| Use Case      | Model              | Provider | Notes                               |
| ------------- | ------------------ | -------- | ----------------------------------- |
| **Main Chat** | `gpt-oss-120b`     | Cerebras | ✅ Default (fast, cost-effective)   |
| **Reasoning** | `gpt-oss-120b`     | Cerebras | ✅ 131K context, reasoning capable  |
| **Images**    | `gemini-2.5-flash` | Google   | Cerebras doesn't support images yet |
| **Titles**    | `llama3.1-8b`      | Cerebras | Fast generation                     |
| **Artifacts** | `llama3.1-8b`      | Cerebras | Fast generation                     |
| **Image Gen** | `imagen-3.0`       | Google   | Cerebras doesn't support image gen  |

### Fallback Strategy

If Cerebras is unavailable, the system automatically falls back to:

- **Chat**: Gemini 2.5 Flash
- **Reasoning**: Gemini 2.5 Pro

## Why Cerebras gpt-oss-120b?

### ⚡ Performance

- **Faster inference** than Gemini
- **131K context window** (vs Gemini's 1M, but sufficient for most chats)
- **Reasoning capable** - supports complex legal analysis

### 💰 Cost-Effective

- **$0.25 per 1M input tokens** (vs Gemini's variable pricing)
- **$0.69 per 1M output tokens**
- Significant cost savings for high-volume usage

### 🔧 Capabilities

- ✅ Tool calling (search, extract, document creation)
- ✅ Structured outputs
- ✅ Streaming responses
- ✅ JSON mode
- ❌ Image understanding (use Gemini for this)
- ❌ Image generation (use Gemini for this)

## What Still Uses Gemini?

### Image Understanding

When users upload images, the system automatically uses `gemini-2.5-flash` because Cerebras doesn't support multimodal inputs yet.

### Image Generation

When generating images (artifacts), the system uses `imagen-3.0-generate-001` because Cerebras doesn't support image generation.

## Testing

### 1. Test Regular Chat

```bash
# Start your dev server
npm run dev

# Open http://localhost:3000
# Try: "What is the legal framework for IP in Zimbabwe?"
```

You should see in the console:

```
[Providers] Using Cerebras gpt-oss-120b as default chat model
[DEBUG] Using model: chat-model
```

### 2. Test Tool Calling

```bash
# Try: "Search for recent IP law changes in Zimbabwe"
```

The system should:

1. Use Cerebras gpt-oss-120b
2. Call the Tavily search tool
3. Return results with citations

### 3. Test Image Understanding

```bash
# Upload an image and ask: "What's in this image?"
```

The system should automatically switch to Gemini for image understanding.

## Configuration

### Environment Variables Required

```bash
# Primary (required)
CEREBRAS_API_KEY=your-cerebras-key-here

# Fallback (optional but recommended)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here

# For search tools
TAVILY_API_KEY=your-tavily-key-here
```

### Load Balancing (Optional)

If you have multiple Cerebras API keys, the system will automatically load balance:

```bash
CEREBRAS_API_KEY_85=key1
CEREBRAS_API_KEY_86=key2
CEREBRAS_API_KEY_87=key3
CEREBRAS_API_KEY_88=key4
CEREBRAS_API_KEY_89=key5
```

## Monitoring

### Console Logs

You'll see these logs indicating Cerebras is being used:

```
[Providers] Cerebras provider initialized: true
[Providers] Using Cerebras gpt-oss-120b as default chat model
[DEBUG] Using model: chat-model
[DEBUG] Model ID: gpt-oss-120b
```

### Fallback Logs

If Cerebras fails, you'll see:

```
[Providers] Cerebras unavailable for chat, falling back to Gemini
[DEBUG] Using model: chat-model
[DEBUG] Model ID: gemini-2.5-flash
```

## Reverting to Gemini (If Needed)

If you want to switch back to Gemini as default, simply swap the model assignments in `lib/ai/providers.ts`:

```typescript
// Change this:
"chat-model": cerebrasProvider("gpt-oss-120b"),

// To this:
"chat-model": googleProvider("gemini-2.5-flash"),
```

## Known Limitations

### Cerebras gpt-oss-120b

- ❌ No image understanding (use Gemini)
- ❌ No image generation (use Gemini)
- ⚠️ Tool calling is good but Gemini might be more reliable for complex multi-tool scenarios

### When to Use Gemini Instead

- Image understanding required
- Image generation required
- Extremely complex multi-tool orchestration
- Need 1M+ context window

## Performance Comparison

Based on typical legal research queries:

| Metric           | Cerebras gpt-oss-120b | Gemini 2.5 Flash |
| ---------------- | --------------------- | ---------------- |
| **Speed**        | ⚡⚡⚡ Very Fast      | ⚡⚡ Fast        |
| **Cost**         | 💰 Low                | 💰💰 Moderate    |
| **Tool Calling** | ✅ Good               | ✅ Excellent     |
| **Context**      | 131K tokens           | 1M tokens        |
| **Images**       | ❌ No                 | ✅ Yes           |
| **Reasoning**    | ✅ Yes                | ✅ Yes           |

## Next Steps

1. ✅ **Test it** - Try some queries and see the performance
2. 📊 **Monitor** - Watch the console logs
3. 💰 **Track costs** - Compare with previous Gemini usage
4. 🔧 **Tune** - Adjust prompts if needed for Cerebras
5. 📈 **Scale** - Add more API keys for load balancing

## Support

### Issues?

- Check console logs for detailed error messages
- Verify `CEREBRAS_API_KEY` is set correctly
- Ensure API key is valid at https://inference.cerebras.ai/

### Questions?

- See `CEREBRAS_TOOL_CALLING_STATUS.md` for tool calling details
- See `CEREBRAS_JSON_SCHEMA_CONSTRAINTS.md` for schema limitations
- See `README_MASTRA.md` for Mastra integration details

---

**Status**: ✅ **Cerebras gpt-oss-120b is now your default model!**

Enjoy faster, more cost-effective AI interactions while maintaining the same great user experience! 🚀
