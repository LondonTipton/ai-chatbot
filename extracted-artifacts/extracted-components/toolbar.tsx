import React from 'react';
import { ArtifactKind } from './artifact';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

interface ToolbarProps {
  isToolbarVisible: boolean;
  setIsToolbarVisible: (visible: boolean) => void;
  sendMessage: (message: ChatMessage) => void;
  status: 'idle' | 'loading' | 'streaming' | 'submitted';
  stop: () => void;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
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
        onClick={() => setIsToolbarVisible(true)}
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
      >
        ⚡
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Quick Actions</span>
        <button
          onClick={() => setIsToolbarVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="flex flex-col gap-2">
        <button
          onClick={() => {
            sendMessage({
              id: Date.now().toString(),
              role: 'user',
              content: 'Please improve this document',
            });
          }}
          className="text-left text-sm px-2 py-1 hover:bg-muted rounded"
          disabled={status === 'streaming'}
        >
          Improve Document
        </button>
        
        <button
          onClick={() => {
            sendMessage({
              id: Date.now().toString(),
              role: 'user',
              content: 'Please add suggestions for this document',
            });
          }}
          className="text-left text-sm px-2 py-1 hover:bg-muted rounded"
          disabled={status === 'streaming'}
        >
          Add Suggestions
        </button>
      </div>
    </div>
  );
};