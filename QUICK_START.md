# 🚀 Quick Start: Mastra + Cerebras Integration

## ✅ What's Ready

Your Mastra + Cerebras integration is **complete and ready to test**!

## 🎯 Test It Now

### 1. Make sure your environment variables are set

Check `.env.local` has:

```bash
CEREBRAS_API_KEY=your-key-here
TAVILY_API_KEY=your-key-here
```

### 2. Start the dev server (if not already running)

```bash
npm run dev
```

### 3. Test the Mastra agent

**Using curl:**

```bash
curl -X POST http://localhost:3000/api/mastra-test \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the legal framework for intellectual property in Zimbabwe?"}'
```

**Using your browser's console:**

```javascript
fetch("/api/mastra-test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "Explain contract law basics in Zimbabwe",
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

## 📊 What You Have Now

### Current Setup (Working Great! ✅)

- **Gemini 2.5 Flash** for main chat
- Reliable tool calling
- Document creation/updates
- Your existing UI

### New Mastra Setup (Ready to Test! 🆕)

- **Cerebras gpt-oss-120b** for fast, cost-effective inference
- Tavily search and extract tools
- Framework for workflows, memory, and evals
- Test endpoint at `/api/mastra-test`

## 🎨 Choose Your Approach

### Option 1: Keep Both (Recommended)

Use Gemini for interactive chat, Mastra for specific workflows.

### Option 2: Test & Compare

Try the same query with both systems and see which you prefer.

### Option 3: Gradual Migration

Start using Mastra for new features while keeping Gemini for existing ones.

## 📚 Next Steps

1. **Test the endpoint** (see above)
2. **Read** `MASTRA_INTEGRATION_COMPLETE.md` for full details
3. **Explore** `MASTRA_SETUP.md` for customization options
4. **Check** [Mastra docs](https://mastra.ai/docs) for advanced features

## 🆘 Need Help?

- Check console logs for detailed error messages
- Verify API keys are valid
- See `MASTRA_SETUP.md` for troubleshooting

---

**Status**: ✅ Ready to test! Your Gemini setup is still working great, and now you have Mastra as a powerful alternative.
