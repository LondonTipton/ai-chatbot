import React from 'react';

// Types that need to be defined in your project
interface Vote {
  id: string;
  messageId: string;
  isUpvoted: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

interface ArtifactMessagesProps {
  chatId: string;
  status: 'idle' | 'loading' | 'streaming' | 'submitted';
  votes: Array<Vote> | undefined;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  regenerate: () => void;
  isReadonly: boolean;
  artifactStatus: 'streaming' | 'idle';
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
    <div className="flex flex-col gap-4 h-full items-center overflow-y-scroll px-4 pt-20">
      {messages.map((message, index) => (
        <div key={message.id} className="w-full max-w-2xl">
          <div className={`p-4 rounded-lg ${
            message.role === 'user' 
              ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' 
              : 'bg-muted'
          }`}>
            <div className="text-sm font-medium mb-1 capitalize">
              {message.role}
            </div>
            <div className="text-sm">
              {message.content}
            </div>
          </div>
        </div>
      ))}
      
      {status === 'streaming' && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          <span>AI is thinking...</span>
        </div>
      )}
    </div>
  );
};