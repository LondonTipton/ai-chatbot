import React, { useState, useEffect } from 'react';

interface Suggestion {
  id: string;
  documentId: string;
  content: string;
  isResolved: boolean;
  createdAt: Date;
}

interface EditorProps {
  content: string;
  suggestions?: Suggestion[];
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: 'streaming' | 'idle';
  onSaveContent: (content: string, debounce: boolean) => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  suggestions = [],
  isCurrentVersion,
  currentVersionIndex,
  status,
  onSaveContent,
}) => {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onSaveContent(newContent, true); // Debounced save
  };

  return (
    <div className="w-full h-full">
      <textarea
        value={localContent}
        onChange={handleContentChange}
        className="w-full h-full min-h-[400px] p-4 border-none outline-none resize-none bg-transparent text-foreground"
        placeholder="Start writing your document..."
        disabled={!isCurrentVersion || status === 'streaming'}
      />
      {suggestions.length > 0 && (
        <div className="mt-4 p-4 border-t">
          <h4 className="font-medium mb-2">Suggestions:</h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="text-sm text-muted-foreground">
                {suggestion.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};