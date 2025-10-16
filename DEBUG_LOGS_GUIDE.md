# Debug Logs Guide

## Overview

Debug logs have been added to clearly identify which route is being invoked when processing requests.

## Log Patterns

### Main Chat Route (`/api/chat`)

When the main chat system is invoked, you'll see:

```
================================================================================
🔵 MAIN CHAT ROUTE INVOKED
================================================================================
[Main Chat] Chat ID: abc-123-def
[Main Chat] Selected Model: chat-model-tsukiyo
[Main Chat] Message: What is the legal framework for intellectual property...
[Main Chat] Starting stream with model: chat-model-tsukiyo
[Main Chat] Message count: 3
[Main Chat] Executing streamText with provider: cerebras:gpt-oss-120b
```

**Key Indicators:**

- 🔵 Blue circle emoji
- "MAIN CHAT ROUTE INVOKED"
- `[Main Chat]` prefix on all logs
- Shows selected model from UI
- Shows provider being used

### Mastra Legal Agent Route (`/api/mastra-test`)

When the Mastra legal agent is invoked, you'll see:

#### POST Request

```
================================================================================
🟢 MASTRA LEGAL AGENT ROUTE INVOKED (POST)
================================================================================
[Mastra Agent] Query: What is the legal framework for intellectual property...
[Mastra Agent] Getting legal agent from Mastra...
[Mastra Agent] ✅ Legal agent found, generating response...
[Mastra Agent] ✅ Response generated (1234 chars)
```

#### GET Request

```
================================================================================
🟢 MASTRA LEGAL AGENT ROUTE INVOKED (GET)
================================================================================
[Mastra Agent] Query: What is contract law...
[Mastra Agent] Getting legal agent from Mastra...
[Mastra Agent] ✅ Legal agent found, generating response...
[Mastra Agent] ✅ Response generated (567 chars)
```

**Key Indicators:**

- 🟢 Green circle emoji
- "MASTRA LEGAL AGENT ROUTE INVOKED"
- `[Mastra Agent]` prefix on all logs
- Shows query being processed
- Shows success/failure of agent retrieval

## How to Test

### Test Main Chat

1. Open your app in the browser
2. Send a message through the chat interface
3. Check the terminal/console for 🔵 logs

### Test Mastra Agent

```bash
# POST request
curl -X POST http://localhost:3000/api/mastra-test \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the legal framework for IP in Zimbabwe?"}'

# GET request
curl "http://localhost:3000/api/mastra-test?query=What+is+contract+law"
```

Check the terminal/console for 🟢 logs

## Troubleshooting

### If you see 🔵 but expected 🟢

- You're hitting the main chat route instead of the Mastra agent
- Check your API endpoint URL
- Main chat: `/api/chat`
- Mastra agent: `/api/mastra-test`

### If you see 🟢 but expected 🔵

- You're hitting the Mastra test endpoint instead of main chat
- This shouldn't happen from the UI
- Check if you have custom routing

### If you see neither

- The routes aren't being hit at all
- Check your network requests in browser DevTools
- Verify the server is running
- Check for errors in the console

## Log Levels

All logs use `console.log()` for visibility. In production, you may want to:

- Use a proper logging library (Winston, Pino, etc.)
- Add log levels (DEBUG, INFO, WARN, ERROR)
- Send logs to a monitoring service (Datadog, LogRocket, etc.)
- Filter out debug logs in production

## Quick Reference

| Route              | Emoji | Prefix           | Purpose             |
| ------------------ | ----- | ---------------- | ------------------- |
| `/api/chat`        | 🔵    | `[Main Chat]`    | Main chat interface |
| `/api/mastra-test` | 🟢    | `[Mastra Agent]` | Legal agent testing |

---

**Added**: 2025-10-15
