import type React from "react";
import { useEffect, useState } from "react";

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
  status: "streaming" | "idle";
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
    <div className="h-full w-full">
      <textarea
        className="h-full min-h-[400px] w-full resize-none border-none bg-transparent p-4 text-foreground outline-none"
        disabled={!isCurrentVersion || status === "streaming"}
        onChange={handleContentChange}
        placeholder="Start writing your document..."
        value={localContent}
      />
      {suggestions.length > 0 && (
        <div className="mt-4 border-t p-4">
          <h4 className="mb-2 font-medium">Suggestions:</h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <li className="text-muted-foreground text-sm" key={suggestion.id}>
                {suggestion.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
