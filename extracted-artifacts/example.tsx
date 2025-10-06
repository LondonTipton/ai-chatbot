import React, { useState } from 'react';
import {
  Artifact,
  useArtifact,
  TooltipProvider,
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
  type ChatMessage,
  type Attachment,
  type Vote,
  type UIArtifact,
  type ArtifactKind,
} from 'extracted-artifacts';

// Example API functions - replace with your actual implementations
const fetchDocuments = async (documentId: string) => {
  // Replace with your API call
  const response = await fetch(`/api/document?id=${documentId}`);
  return response.ok ? await response.json() : [];
};

const saveDocument = async (documentId: string, data: { title: string; content: string; kind: ArtifactKind }) => {
  // Replace with your API call
  const response = await fetch(`/api/document?id=${documentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.ok ? await response.json() : null;
};

// Example chat component using the artifacts
const ExampleChatWithArtifacts: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you create and edit documents. Try asking me to create a text document, write some code, or generate an image.',
      createdAt: new Date(),
    },
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<'idle' | 'streaming'>('idle');
  const votes: Vote[] = [];

  const { setArtifact } = useArtifact();

  const sendMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    
    // Simulate AI response with artifact creation
    setStatus('streaming');
    setTimeout(() => {
      const response: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I\'ve created a document for you.',
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, response]);
      
      // Example: Create a text artifact
      if (message.content.toLowerCase().includes('text') || message.content.toLowerCase().includes('document')) {
        createTextArtifact();
      } else if (message.content.toLowerCase().includes('code')) {
        createCodeArtifact();
      } else if (message.content.toLowerCase().includes('image')) {
        createImageArtifact();
      } else if (message.content.toLowerCase().includes('spreadsheet') || message.content.toLowerCase().includes('table')) {
        createSheetArtifact();
      }
      
      setStatus('idle');
    }, 1000);
  };

  const createTextArtifact = () => {
    const newArtifact: UIArtifact = {
      documentId: `doc-${Date.now()}`,
      kind: 'text',
      content: 'This is a sample text document. You can edit this content and it will be automatically saved.',
      title: 'Sample Text Document',
      isVisible: true,
      status: 'idle',
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
      kind: 'code',
      content: `function greetUser(name) {\n  console.log(\`Hello, \${name}!\`);\n  return \`Welcome, \${name}\`;\n}\n\n// Call the function\ngreetUser('World');`,
      title: 'Sample JavaScript Code',
      isVisible: true,
      status: 'idle',
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
      kind: 'image',
      content: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Sample+Image',
      title: 'Sample Generated Image',
      isVisible: true,
      status: 'idle',
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
      kind: 'sheet',
      content: 'Name,Age,City\\nJohn Doe,30,New York\\nJane Smith,25,Los Angeles\\nBob Johnson,35,Chicago',
      title: 'Sample Spreadsheet',
      isVisible: true,
      status: 'idle',
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
    console.log('Regenerate message');
  };

  const stop = () => {
    setStatus('idle');
  };

  return (
    <TooltipProvider>
      <div className="h-screen bg-background text-foreground">
        {/* Main chat interface */}
        <div className="flex flex-col h-full max-w-4xl mx-auto">
          <header className="p-4 border-b border-border">
            <h1 className="text-xl font-semibold">Chat with Artifacts Example</h1>
            <p className="text-sm text-muted-foreground">
              Try asking to create a document, write code, generate an image, or make a spreadsheet.
            </p>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm font-medium mb-1 capitalize">
                  {message.role}
                </div>
                <div>{message.content}</div>
              </div>
            ))}
            
            {status === 'streaming' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim() || status === 'streaming') return;
                
                const newMessage: ChatMessage = {
                  id: Date.now().toString(),
                  role: 'user',
                  content: input,
                  createdAt: new Date(),
                };
                
                sendMessage(newMessage);
                setInput('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to create a document, code, image, or spreadsheet..."
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                disabled={status === 'streaming'}
              />
              <button
                type="submit"
                disabled={!input.trim() || status === 'streaming'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              >
                Send
              </button>
            </form>

            {/* Quick action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => sendMessage({
                  id: Date.now().toString(),
                  role: 'user',
                  content: 'Create a text document about artificial intelligence',
                })}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
              >
                📝 Text Doc
              </button>
              <button
                onClick={() => sendMessage({
                  id: Date.now().toString(),
                  role: 'user',
                  content: 'Write a JavaScript function to calculate fibonacci numbers',
                })}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
              >
                💻 Code
              </button>
              <button
                onClick={() => sendMessage({
                  id: Date.now().toString(),
                  role: 'user',
                  content: 'Generate an image of a sunset over mountains',
                })}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
              >
                🖼️ Image
              </button>
              <button
                onClick={() => sendMessage({
                  id: Date.now().toString(),
                  role: 'user',
                  content: 'Create a spreadsheet with sample employee data',
                })}
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md"
              >
                📊 Spreadsheet
              </button>
            </div>
          </div>
        </div>

        {/* Artifact component */}
        <Artifact
          chatId="example-chat"
          input={input}
          setInput={setInput}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          setMessages={setMessages}
          votes={votes}
          sendMessage={sendMessage}
          regenerate={regenerate}
          isReadonly={false}
          selectedVisibilityType="public"
          isSidebarOpen={false}
        />
      </div>
    </TooltipProvider>
  );
};

export default ExampleChatWithArtifacts;