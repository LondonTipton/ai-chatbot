import React, { useState } from 'react';
import { Button } from '../ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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
  status: 'idle' | 'loading' | 'streaming' | 'submitted';
  stop: () => void;
  attachments: Attachment[];
  setAttachments: (attachments: Attachment[]) => void;
  messages: ChatMessage[];
  sendMessage: (message: ChatMessage) => void;
  className?: string;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  selectedVisibilityType: 'public' | 'private';
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
  className = '',
  setMessages,
  selectedVisibilityType,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
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
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document..."
          className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground"
          disabled={status === 'streaming'}
        />
        <Button 
          type="submit" 
          disabled={!input.trim() || status === 'streaming'}
          size="sm"
        >
          {status === 'streaming' ? 'Stop' : 'Send'}
        </Button>
      </form>
      
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="text-xs bg-muted px-2 py-1 rounded">
              {attachment.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};