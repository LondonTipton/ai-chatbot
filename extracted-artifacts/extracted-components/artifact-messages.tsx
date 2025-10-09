import type React from "react";

// Types that need to be defined in your project
interface Vote {
  id: string;
  messageId: string;
  isUpvoted: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface ArtifactMessagesProps {
  chatId: string;
  status: "idle" | "loading" | "streaming" | "submitted";
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void;
  regenerate: () => void;
  isReadonly: boolean;
  artifactStatus: "streaming" | "idle";
}

export const ArtifactMessages: React.FC<ArtifactMessagesProps> = ({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  artifactStatus,
}) => {
  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20">
      {messages.map((message, index) => (
        <div className="w-full max-w-2xl" key={message.id}>
          <div
            className={`rounded-lg p-4 ${
              message.role === "user"
                ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <div className="mb-1 font-medium text-sm capitalize">
              {message.role}
            </div>
            <div className="text-sm">{message.content}</div>
          </div>
        </div>
      ))}

      {status === "streaming" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>AI is thinking...</span>
        </div>
      )}
    </div>
  );
};
