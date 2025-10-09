import { Artifact } from "../../extracted-components/create-artifact";
import { DocumentSkeleton } from "../../ui/document-skeleton";
import { ClockRewind, CopyIcon, RedoIcon, UndoIcon } from "../../ui/icons";

// Simple toast implementation - replace with your preferred toast library
const toast = {
  success: (message: string) => {
    console.log(`Success: ${message}`);
    // Replace with your toast implementation
  },
  error: (message: string) => {
    console.error(`Error: ${message}`);
    // Replace with your toast implementation
  },
};

interface CodeArtifactMetadata {
  language?: string;
}

const CodeEditor: React.FC<{
  content: string;
  language?: string;
  isCurrentVersion: boolean;
  status: "streaming" | "idle";
  onSaveContent: (content: string, debounce: boolean) => void;
}> = ({
  content,
  language = "javascript",
  isCurrentVersion,
  status,
  onSaveContent,
}) => {
  return (
    <div className="h-full w-full">
      <div className="border-b bg-muted p-2 text-sm">
        <span className="text-muted-foreground">Language: </span>
        <span className="font-mono">{language}</span>
      </div>
      <textarea
        className="h-full w-full resize-none border-none bg-background p-4 font-mono text-sm outline-none"
        disabled={!isCurrentVersion || status === "streaming"}
        onChange={(e) => onSaveContent(e.target.value, true)}
        placeholder="// Write your code here..."
        style={{ minHeight: "400px" }}
        value={content}
      />
    </div>
  );
};

export const codeArtifact = new Artifact<"code", CodeArtifactMetadata>({
  kind: "code",
  description: "Useful for code editing and programming tasks.",
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      language: "javascript",
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content:
            draftArtifact.content + (streamPart.data as unknown as string),
          isVisible:
            draftArtifact.content.length > 50 ? true : draftArtifact.isVisible,
          status: "streaming",
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    onSaveContent,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="code" />;
    }

    return (
      <CodeEditor
        content={content}
        isCurrentVersion={isCurrentVersion}
        language={metadata?.language}
        onSaveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "View changes",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "Previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "Next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy code",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Code copied to clipboard!");
      },
    },
  ],
  toolbar: [],
});
