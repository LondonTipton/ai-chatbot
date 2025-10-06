# Extracted Artifacts - Portable Document Side Panel

A portable implementation of the artifact/document side panel feature from the Vercel AI Chatbot, extracted for use in other projects.

## Features

- **Side Panel Document Editor**: Full-screen overlay with chat interface on the left and document editor on the right
- **Multiple Artifact Types**: Support for text, code, image, and spreadsheet artifacts
- **Version Control**: Built-in document versioning with diff viewing
- **Real-time Collaboration**: Live content updates and auto-save functionality
- **Extensible Architecture**: Easy to add new artifact types
- **Animation Support**: Smooth transitions using Framer Motion
- **Responsive Design**: Works on desktop and mobile devices

## Installation

```bash
npm install extracted-artifacts
# or
yarn add extracted-artifacts
# or
pnpm add extracted-artifacts
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install react react-dom @radix-ui/react-slot @radix-ui/react-tooltip class-variance-authority clsx date-fns fast-deep-equal framer-motion swr tailwind-merge usehooks-ts
```

## Required CSS Setup

This package uses Tailwind CSS for styling. You'll need to:

1. Install and configure Tailwind CSS in your project
2. Add the following CSS variables to your global CSS:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --ring: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --ring: 212.7 26.8% 83.9%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
}
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { 
  Artifact, 
  useArtifact, 
  TooltipProvider,
  type ChatMessage,
  type Attachment,
  type Vote 
} from 'extracted-artifacts';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<'idle' | 'streaming'>('idle');
  const votes: Vote[] = [];

  const sendMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    // Your message sending logic here
  };

  const regenerate = () => {
    // Your regeneration logic here
  };

  const stop = () => {
    setStatus('idle');
  };

  return (
    <TooltipProvider>
      <div className="app">
        {/* Your main app content */}
        
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
}

export default App;
```

## Triggering Artifacts

To show an artifact, you need to update the artifact state:

```tsx
import { useArtifact } from 'extracted-artifacts';

function YourComponent() {
  const { setArtifact } = useArtifact();

  const showArtifact = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    setArtifact({
      documentId: 'your-document-id',
      kind: 'text',
      content: 'Your document content here',
      title: 'Document Title',
      isVisible: true,
      status: 'idle',
      boundingBox: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <button onClick={showArtifact}>
      Show Document
    </button>
  );
}
```

## Backend Integration

You'll need to implement the following API endpoints:

### Document API (`/api/document`)

```typescript
// GET /api/document?id={documentId}
// Returns: Document[]

// POST /api/document?id={documentId}
// Body: { title: string, content: string, kind: ArtifactKind }
// Returns: Document
```

### Suggestions API (`/api/suggestions`) (Optional)

```typescript
// GET /api/suggestions?documentId={documentId}
// Returns: Suggestion[]
```

## Creating Custom Artifact Types

You can create custom artifact types by extending the Artifact class:

```tsx
import { Artifact, ArtifactClass } from 'extracted-artifacts';

interface MyCustomMetadata {
  customData: string;
}

export const myCustomArtifact = new ArtifactClass<'custom', MyCustomMetadata>({
  kind: 'custom',
  description: 'My custom artifact type',
  initialize: async ({ documentId, setMetadata }) => {
    // Initialize metadata
    setMetadata({ customData: 'initial value' });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    // Handle streaming updates
    if (streamPart.type === 'my-custom-stream') {
      setArtifact(prev => ({
        ...prev,
        content: prev.content + streamPart.data,
      }));
    }
  },
  content: ({ content, mode, status, onSaveContent, metadata }) => {
    // Render your custom content component
    return (
      <div>
        <h1>Custom Content</h1>
        <p>{content}</p>
        <p>Custom Data: {metadata?.customData}</p>
      </div>
    );
  },
  actions: [
    {
      icon: <span>🎨</span>,
      description: 'Custom action',
      onClick: ({ content }) => {
        console.log('Custom action clicked', content);
      },
    },
  ],
  toolbar: [],
});
```

Then register it in your artifact definitions:

```tsx
import { textArtifact } from 'extracted-artifacts';
import { myCustomArtifact } from './my-custom-artifact';

export const artifactDefinitions = [
  textArtifact,
  myCustomArtifact,
  // ... other artifacts
];
```

## Configuration Options

### Artifact Props

| Prop | Type | Description |
|------|------|-------------|
| `chatId` | string | Unique identifier for the chat session |
| `input` | string | Current input value |
| `setInput` | function | Function to update input value |
| `status` | string | Current chat status ('idle', 'streaming', etc.) |
| `stop` | function | Function to stop streaming |
| `attachments` | Attachment[] | Current attachments |
| `setAttachments` | function | Function to update attachments |
| `messages` | ChatMessage[] | Chat messages |
| `setMessages` | function | Function to update messages |
| `votes` | Vote[] | Message votes (optional) |
| `sendMessage` | function | Function to send new messages |
| `regenerate` | function | Function to regenerate responses |
| `isReadonly` | boolean | Whether the artifact is readonly |
| `selectedVisibilityType` | string | Visibility type ('public' or 'private') |
| `isSidebarOpen` | boolean | Whether the sidebar is open (optional) |

## Styling and Theming

The package uses Tailwind CSS classes and CSS custom properties for theming. You can customize the appearance by:

1. Overriding the CSS custom properties shown above
2. Adding custom Tailwind classes
3. Using your own component variants

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All interfaces and types are exported for use in your project.

## Browser Support

- Modern browsers with ES2015+ support
- React 18+ or 19+
- Supports both SSR and client-side rendering

## Contributing

This package was extracted from the Vercel AI Chatbot project. For contributions and improvements, please refer to the original project or create issues/PRs in your implementation.

## License

MIT License - see the original Vercel AI Chatbot project for more details.

## Troubleshooting

### Common Issues

1. **Missing CSS Variables**: Make sure you've added the required CSS variables to your global styles
2. **Tailwind Classes Not Working**: Ensure Tailwind CSS is properly configured in your project
3. **Animation Issues**: Check that Framer Motion is properly installed and configured
4. **SWR Cache Issues**: Make sure you have a single SWR configuration provider at your app root

### Getting Help

- Check the example implementation in the repository
- Refer to the original Vercel AI Chatbot documentation
- Create issues for bugs or feature requests