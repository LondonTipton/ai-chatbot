import type React from "react";
import { useState } from "react";
import { Button } from "../ui/button";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface Attachment {
  name: string;
  contentType: string;
  url: string;
}

interface MultimodalInputProps {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  status: "idle" | "loading" | "streaming" | "submitted";
  stop: () => void;
  attachments: Attachment[];
  setAttachments: (attachments: Attachment[]) => void;
  messages: ChatMessage[];
  sendMessage: (message: ChatMessage) => void;
  className?: string;
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  selectedVisibilityType: "public" | "private";
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  sendMessage,
  className = "",
  setMessages,
  selectedVisibilityType,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date(),
    };

    sendMessage(newMessage);
    setInput("");
  };

  return (
    <div className={`w-full ${className}`}>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground"
          disabled={status === "streaming"}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document..."
          type="text"
          value={input}
        />
        <Button
          disabled={!input.trim() || status === "streaming"}
          size="sm"
          type="submit"
        >
          {status === "streaming" ? "Stop" : "Send"}
        </Button>
      </form>

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div className="rounded bg-muted px-2 py-1 text-xs" key={index}>
              {attachment.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
