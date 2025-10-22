# Research Progress UI

## Overview

The Research Progress UI provides real-time visual feedback when the AI is performing deep research operations like searching, extracting content, and summarizing. This prevents the UI from appearing "dead" during long-running tool executions.

## How It Works

### 1. Tool Execution Tracking

When tools are executed during a chat session, the system tracks:

- Tool start events (when a tool begins execution)
- Tool completion events (when a tool finishes)
- Execution duration
- Tool-specific messages

### 2. Components

#### `ResearchProgress` Component

Located in `components/research-progress.tsx`

Displays an animated progress card showing:

- Active tools with pulsing icons
- Completion status with checkmarks
- Real-time duration counters
- Animated progress bars for running tools
- Summary when all tools complete

#### `useToolExecution` Hook

Located in `hooks/use-tool-execution.ts`

Manages tool execution state by:

- Listening to data stream events
- Tracking tool start/complete events
- Auto-clearing completed tools after 3 seconds
- Providing tool state to components

### 3. Data Flow

```
Chat Route (route.ts)
  ↓
  Monitors fullStream for tool-call and tool-result events
  ↓
  Writes toolStart/toolComplete data to dataStream
  ↓
  useToolExecution hook listens to dataStream
  ↓
  ResearchProgress component displays UI
```

### 4. Supported Tools

The system tracks these tools with custom messages:

- `tavilySearch` - "🔍 Searching legal databases"
- `tavilyExtract` - "📄 Extracting content from sources"
- `getWeather` - "🌤️ Getting weather information"
- `createDocument` - "📝 Creating document"
- `updateDocument` - "✏️ Updating document"
- `requestSuggestions` - "💡 Generating suggestions"

### 5. Visual Features

- **Animated Entry/Exit**: Tools fade and slide in/out smoothly
- **Status Icons**: Different icons for running vs completed tools
- **Progress Bars**: Animated bars show estimated progress
- **Duration Tracking**: Real-time counters show elapsed time
- **Auto-Dismiss**: Completed tools clear after 3 seconds

## Implementation Details

### Type Definitions

Added to `lib/types.ts`:

```typescript
toolStart: {
  id: string;
  tool: string;
  message: string;
}
toolComplete: {
  id: string;
}
```

### Stream Monitoring

The chat route monitors the AI SDK's `fullStream` to detect tool executions:

```typescript
for await (const part of result.fullStream) {
  if (part.type === "tool-call") {
    // Emit toolStart event
  } else if (part.type === "tool-result") {
    // Emit toolComplete event
  }
}
```

### Data Stream Events

Events are written to the data stream:

- `data-toolStart`: When a tool begins execution
- `data-toolComplete`: When a tool finishes execution

## Benefits

1. **User Confidence**: Users know the system is working, not frozen
2. **Transparency**: Clear visibility into what operations are happening
3. **No Model Streaming Required**: Works without Cerebras streaming issues
4. **Minimal Overhead**: Lightweight event tracking
5. **Smooth UX**: Animated transitions keep the interface feeling alive

## Future Enhancements

Potential improvements:

- Add tool-specific icons for more tools
- Show extracted content previews
- Display error states for failed tools
- Add estimated time remaining based on historical data
- Allow users to cancel long-running operations
