import type React from "react";
import type { ArtifactKind } from "./artifact";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface ToolbarProps {
  isToolbarVisible: boolean;
  setIsToolbarVisible: (visible: boolean) => void;
  sendMessage: (message: ChatMessage) => void;
  status: "idle" | "loading" | "streaming" | "submitted";
  stop: () => void;
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  artifactKind: ArtifactKind;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isToolbarVisible,
  setIsToolbarVisible,
  sendMessage,
  status,
  stop,
  setMessages,
  artifactKind,
}) => {
  if (!isToolbarVisible) {
    return (
      <button
        className="fixed right-4 bottom-4 rounded-full bg-primary p-2 text-primary-foreground shadow-lg"
        onClick={() => setIsToolbarVisible(true)}
      >
        ⚡
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 rounded-lg border border-border bg-background p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-sm">Quick Actions</span>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setIsToolbarVisible(false)}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="rounded px-2 py-1 text-left text-sm hover:bg-muted"
          disabled={status === "streaming"}
          onClick={() => {
            sendMessage({
              id: Date.now().toString(),
              role: "user",
              content: "Please improve this document",
            });
          }}
        >
          Improve Document
        </button>

        <button
          className="rounded px-2 py-1 text-left text-sm hover:bg-muted"
          disabled={status === "streaming"}
          onClick={() => {
            sendMessage({
              id: Date.now().toString(),
              role: "user",
              content: "Please add suggestions for this document",
            });
          }}
        >
          Add Suggestions
        </button>
      </div>
    </div>
  );
};
