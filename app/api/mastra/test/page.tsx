"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

/**
 * Mastra AI SDK Integration Test Page
 *
 * Demonstrates the official @mastra/ai-sdk integration pattern
 * using useChat() hook with Mastra agents
 */
export default function MastraTestPage() {
  const [inputValue, setInputValue] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("legalAgent");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/mastra/chat",
      prepareSendMessagesRequest({ messages: chatMessages }) {
        return {
          body: {
            messages: chatMessages,
            agent: selectedAgent,
            // Optional: Add memory configuration
            memory: {
              thread: "test-thread",
              resource: "test-user",
            },
          },
        };
      },
    }),
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      return;
    }

    sendMessage({ text: inputValue });
    setInputValue("");
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">
          Mastra AI SDK Integration Test
        </h1>
        <p className="text-muted-foreground">
          Testing official @mastra/ai-sdk integration with useChat() hook
        </p>
      </div>

      {/* Agent Selector */}
      <div className="mb-4">
        <label
          className="mb-2 block font-medium text-sm"
          htmlFor="agent-select"
        >
          Select Agent:
        </label>
        <select
          className="w-full rounded-md border p-2"
          disabled={status === "streaming"}
          id="agent-select"
          onChange={(e) => setSelectedAgent(e.target.value)}
          value={selectedAgent}
        >
          <option value="legalAgent">Legal Agent</option>
          <option value="mediumResearchAgent">Medium Research Agent</option>
          <option value="searchAgent">Search Agent</option>
          <option value="extractAgent">Extract Agent</option>
          <option value="analysisAgent">Analysis Agent</option>
        </select>
      </div>

      {/* Messages Display */}
      <div className="mb-4 max-h-[600px] min-h-[400px] overflow-y-auto rounded-md border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No messages yet. Start a conversation!
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                className={`rounded-lg p-3 ${
                  message.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground"
                    : "mr-8 bg-muted"
                }`}
                key={message.id}
              >
                <div className="mb-1 font-semibold text-xs opacity-70">
                  {message.role === "user" ? "You" : selectedAgent}
                </div>
                {message.parts.map((part, partIndex) => {
                  if (typeof part === "string") {
                    return (
                      <div key={`${message.id}-part-${partIndex}`}>{part}</div>
                    );
                  }
                  if ("text" in part) {
                    return (
                      <div key={`${message.id}-part-${partIndex}`}>
                        {part.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </div>
        )}

        {status === "streaming" && (
          <div className="py-4 text-center text-muted-foreground">
            <div className="animate-pulse">Agent is thinking...</div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
            <strong>Error:</strong> {error.message}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form className="flex gap-2" onSubmit={handleFormSubmit}>
        <input
          className="flex-1 rounded-md border p-3"
          disabled={status === "streaming"}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a legal question..."
          type="text"
          value={inputValue}
        />
        <button
          className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status === "streaming" || !inputValue.trim()}
          type="submit"
        >
          {status === "streaming" ? "Sending..." : "Send"}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
        <h3 className="mb-2 font-semibold">Integration Details:</h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>Using official @mastra/ai-sdk package</li>
          <li>AI SDK v5 compatible streaming</li>
          <li>useChat() hook with DefaultChatTransport</li>
          <li>Agent selection and memory support</li>
          <li>Automatic message history management</li>
        </ul>
      </div>
    </div>
  );
}
