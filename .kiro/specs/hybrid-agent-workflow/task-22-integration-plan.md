# Task 22: Integration Plan - Research Interface into Chat UI

## Status: In Progress

## Completed Changes

### 1. Updated Models Configuration ✅

**File:** `lib/ai/models.ts`

Changed from Tsukiyo/Jacana models to research modes:

- `research-auto` (AUTO) - Fast research • 1-10s ⚡
- `research-medium` (MEDIUM) - Balanced research • 10-20s ⚖️
- `research-deep` (DEEP) - Comprehensive research • 25-47s 🔬

Added icon and latency fields to ChatModel type.

### 2. Updated Model Selector UI ✅

**File:** `components/multimodal-input.tsx`

- Added icon display in model selector trigger button
- Updated SelectItem to show icons alongside model names
- Icons now display in both the button and dropdown menu

### 3. Created Research Mode Hook ✅

**File:** `hooks/use-research-mode.ts`

Created a custom hook for managing research mode state and execution:

- `researchMode` state with localStorage persistence
- `setResearchMode` to change modes
- `isResearchLoading` loading state
- `executeResearch` function to call the research API

## Remaining Changes (Blocked by Unsaved Files)

### 4. Update Chat Component ⚠️

**File:** `components/chat.tsx`

Need to add:

```typescript
// Helper functions to detect and extract research mode
const isResearchMode = (modelId: string) => {
  return modelId.startsWith("research-");
};

const getResearchMode = (modelId: string): "auto" | "medium" | "deep" => {
  if (modelId === "research-auto") return "auto";
  if (modelId === "research-medium") return "medium";
  if (modelId === "research-deep") return "deep";
  return "auto";
};

// Custom send message handler
const handleSendMessage = useCallback(
  async (message?: ChatMessage) => {
    if (!message) return;

    const modelId = currentModelIdRef.current;

    if (isResearchMode(modelId)) {
      const mode = getResearchMode(modelId);

      // Extract query text
      const textParts = message.parts.filter((p: any) => p.type === "text");
      const queryText = textParts.map((p: any) => p.text).join(" ");

      if (!queryText.trim()) {
        toast({
          type: "error",
          description: "Please enter a query for research",
        });
        return;
      }

      // Add user message
      const userMessage: ChatMessage = {
        ...message,
        id: generateUUID(),
        role: "user",
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add loading message
      const loadingMessageId = generateUUID();
      const loadingMessage: ChatMessage = {
        id: loadingMessageId,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `🔍 Researching with ${mode.toUpperCase()} mode...`,
          },
        ],
      };
      setMessages((prev) => [...prev, loadingMessage]);

      try {
        // Call research API
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryText,
            mode,
            jurisdiction: "Zimbabwe",
          }),
        });

        const data = await response.json();

        // Remove loading message
        setMessages((prev) => prev.filter((m) => m.id !== loadingMessageId));

        if (data.success && data.response) {
          // Format response with metadata and sources
          let responseText = data.response;

          if (data.metadata) {
            responseText += `\n\n---\n\n**Research Metadata:**\n`;
            responseText += `- Mode: ${data.metadata.mode.toUpperCase()}\n`;
            responseText += `- Steps: ${data.metadata.stepsUsed || 0}\n`;
            responseText += `- Tools: ${
              data.metadata.toolsCalled?.length || 0
            }\n`;
            responseText += `- Tokens: ~${data.metadata.tokenEstimate || 0}\n`;
            responseText += `- Cached: ${
              data.metadata.cached ? "Yes" : "No"
            }\n`;
            responseText += `- Latency: ${data.metadata.latency || 0}ms\n`;
          }

          if (data.sources && data.sources.length > 0) {
            responseText += `\n**Sources:**\n`;
            data.sources.forEach((source: any, idx: number) => {
              responseText += `${idx + 1}. [${source.title}](${source.url})\n`;
            });
          }

          const resultMessage: ChatMessage = {
            id: generateUUID(),
            role: "assistant",
            parts: [{ type: "text", text: responseText }],
          };
          setMessages((prev) => [...prev, resultMessage]);
        } else {
          // Handle error
          const errorMessage =
            data.error?.message || "Research failed. Please try again.";
          const errorMsg: ChatMessage = {
            id: generateUUID(),
            role: "assistant",
            parts: [{ type: "text", text: `❌ **Error:** ${errorMessage}` }],
          };
          setMessages((prev) => [...prev, errorMsg]);

          // Show toast for rate limits
          if (data.error?.code === "RATE_LIMIT_EXCEEDED") {
            toast({
              type: "error",
              description: `Rate limit exceeded. ${
                data.error.retryAfter
                  ? `Retry after ${Math.ceil(data.error.retryAfter / 1000)}s`
                  : "Please try again later."
              }`,
            });
          }
        }
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== loadingMessageId));
        const errorMsg: ChatMessage = {
          id: generateUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "❌ **Network error.** Please check your connection and try again.",
            },
          ],
        };
        setMessages((prev) => [...prev, errorMsg]);
        toast({
          type: "error",
          description: "Failed to connect to research service",
        });
      }

      mutate(unstable_serialize(getChatHistoryPaginationKey));
      mutateUsage();
    } else {
      // Use normal chat for non-research modes
      sendMessage(message);
    }
  },
  [sendMessage, setMessages, mutate, mutateUsage, id]
);
```

Then update:

- `MultimodalInput` sendMessage prop to use `handleSendMessage`
- `Artifact` sendMessage prop to use `handleSendMessage`
- `useEffect` for query parameter to use `handleSendMessage`

### 5. Update Attachments Button Logic ⚠️

**File:** `components/multimodal-input.tsx`

Change the disabled logic from:

```typescript
const isReasoningModel = selectedModelId === "chat-model-reasoning";
```

To:

```typescript
const isResearchModel = selectedModelId.startsWith("research-");
```

And update the disabled prop:

```typescript
disabled={status !== "ready" || isResearchModel}
```

## How It Works

1. **User selects research mode** from the model selector (AUTO/MEDIUM/DEEP)
2. **User enters query** in the chat input
3. **handleSendMessage intercepts** the message if research mode is active
4. **Research API is called** with query, mode, and jurisdiction
5. **Loading message** is shown while waiting for response
6. **Results are displayed** as a chat message with:
   - Main response text
   - Metadata section (mode, steps, tools, tokens, cached, latency)
   - Sources section with clickable links
7. **Error handling** shows user-friendly messages for:
   - Rate limit errors (with retry time)
   - Network errors
   - API failures

## Testing Checklist

- [ ] Model selector shows three research modes with icons
- [ ] Selecting AUTO mode and sending a query calls /api/research
- [ ] Loading message appears during research
- [ ] Results display with metadata and sources
- [ ] Rate limit errors show proper toast messages
- [ ] Network errors are handled gracefully
- [ ] Switching back to normal chat mode works
- [ ] File attachments are disabled in research modes
- [ ] Chat history is saved correctly

## Next Steps

1. Save all unsaved files in the editor
2. Apply the remaining changes to `components/chat.tsx`
3. Update the attachments button logic
4. Test the end-to-end flow
5. Verify error handling for rate limits
6. Complete task 22
