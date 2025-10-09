import {
  Artifact,
  type ArtifactKind,
  type Attachment,
  type ChatMessage,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
  TooltipProvider,
  textArtifact,
  type UIArtifact,
  useArtifact,
  type Vote,
} from "extracted-artifacts";
import type React from "react";
import { useState } from "react";

// Example API functions - replace with your actual implementations
const fetchDocuments = async (documentId: string) => {
  // Replace with your API call
  const response = await fetch(`/api/document?id=${documentId}`);
  return response.ok ? await response.json() : [];
};

const saveDocument = async (
  documentId: string,
  data: { title: string; content: string; kind: ArtifactKind }
) => {
  // Replace with your API call
  const response = await fetch(`/api/document?id=${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.ok ? await response.json() : null;
};

// Example chat component using the artifacts
const ExampleChatWithArtifacts: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I can help you create and edit documents. Try asking me to create a text document, write some code, or generate an image.",
      createdAt: new Date(),
    },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const votes: Vote[] = [];

  const { setArtifact } = useArtifact();

  const sendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);

    // Simulate AI response with artifact creation
    setStatus("streaming");
    setTimeout(() => {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I've created a document for you.",
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, response]);

      // Example: Create a text artifact
      if (
        message.content.toLowerCase().includes("text") ||
        message.content.toLowerCase().includes("document")
      ) {
        createTextArtifact();
      } else if (message.content.toLowerCase().includes("code")) {
        createCodeArtifact();
      } else if (message.content.toLowerCase().includes("image")) {
        createImageArtifact();
      } else if (
        message.content.toLowerCase().includes("spreadsheet") ||
        message.content.toLowerCase().includes("table")
      ) {
        createSheetArtifact();
      }

      setStatus("idle");
    }, 1000);
  };

  const createTextArtifact = () => {
    const newArtifact: UIArtifact = {
      documentId: `doc-${Date.now()}`,
      kind: "text",
      content:
        "This is a sample text document. You can edit this content and it will be automatically saved.",
      title: "Sample Text Document",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 100,
        left: 100,
        width: 300,
        height: 200,
      },
    };
    setArtifact(newArtifact);
  };

  const createCodeArtifact = () => {
    const newArtifact: UIArtifact = {
      documentId: `code-${Date.now()}`,
      kind: "code",
      content: `function greetUser(name) {\n  console.log(\`Hello, \${name}!\`);\n  return \`Welcome, \${name}\`;\n}\n\n// Call the function\ngreetUser('World');`,
      title: "Sample JavaScript Code",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 100,
        left: 100,
        width: 300,
        height: 200,
      },
    };
    setArtifact(newArtifact);
  };

  const createImageArtifact = () => {
    const newArtifact: UIArtifact = {
      documentId: `image-${Date.now()}`,
      kind: "image",
      content:
        "https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Sample+Image",
      title: "Sample Generated Image",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 100,
        left: 100,
        width: 300,
        height: 200,
      },
    };
    setArtifact(newArtifact);
  };

  const createSheetArtifact = () => {
    const newArtifact: UIArtifact = {
      documentId: `sheet-${Date.now()}`,
      kind: "sheet",
      content:
        "Name,Age,City\\nJohn Doe,30,New York\\nJane Smith,25,Los Angeles\\nBob Johnson,35,Chicago",
      title: "Sample Spreadsheet",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 100,
        left: 100,
        width: 300,
        height: 200,
      },
    };
    setArtifact(newArtifact);
  };

  const regenerate = () => {
    // Implement message regeneration logic
    console.log("Regenerate message");
  };

  const stop = () => {
    setStatus("idle");
  };

  return (
    <TooltipProvider>
      <div className="h-screen bg-background text-foreground">
        {/* Main chat interface */}
        <div className="mx-auto flex h-full max-w-4xl flex-col">
          <header className="border-border border-b p-4">
            <h1 className="font-semibold text-xl">
              Chat with Artifacts Example
            </h1>
            <p className="text-muted-foreground text-sm">
              Try asking to create a document, write code, generate an image, or
              make a spreadsheet.
            </p>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                key={message.id}
              >
                <div className="mb-1 font-medium text-sm capitalize">
                  {message.role}
                </div>
                <div>{message.content}</div>
              </div>
            ))}

            {status === "streaming" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-border border-t p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
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
              }}
            >
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2"
                disabled={status === "streaming"}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to create a document, code, image, or spreadsheet..."
                type="text"
                value={input}
              />
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                disabled={!input.trim() || status === "streaming"}
                type="submit"
              >
                Send
              </button>
            </form>

            {/* Quick action buttons */}
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                onClick={() =>
                  sendMessage({
                    id: Date.now().toString(),
                    role: "user",
                    content:
                      "Create a text document about artificial intelligence",
                  })
                }
              >
                📝 Text Doc
              </button>
              <button
                className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                onClick={() =>
                  sendMessage({
                    id: Date.now().toString(),
                    role: "user",
                    content:
                      "Write a JavaScript function to calculate fibonacci numbers",
                  })
                }
              >
                💻 Code
              </button>
              <button
                className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                onClick={() =>
                  sendMessage({
                    id: Date.now().toString(),
                    role: "user",
                    content: "Generate an image of a sunset over mountains",
                  })
                }
              >
                🖼️ Image
              </button>
              <button
                className="rounded-md bg-secondary px-3 py-1 text-secondary-foreground text-sm"
                onClick={() =>
                  sendMessage({
                    id: Date.now().toString(),
                    role: "user",
                    content: "Create a spreadsheet with sample employee data",
                  })
                }
              >
                📊 Spreadsheet
              </button>
            </div>
          </div>
        </div>

        {/* Artifact component */}
        <Artifact
          attachments={attachments}
          chatId="example-chat"
          input={input}
          isReadonly={false}
          isSidebarOpen={false}
          messages={messages}
          regenerate={regenerate}
          selectedVisibilityType="public"
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={stop}
          votes={votes}
        />
      </div>
    </TooltipProvider>
  );
};

export default ExampleChatWithArtifacts;
