import { Artifact } from '../../extracted-components/create-artifact';
import { DocumentSkeleton } from '../../ui/document-skeleton';
import {
  CopyIcon,
  RedoIcon,
  UndoIcon,
  ClockRewind,
} from '../../ui/icons';

// Simple toast implementation - replace with your preferred toast library
const toast = {
  success: (message: string) => {
    console.log(`Success: ${message}`);
    // Replace with your toast implementation
  },
  error: (message: string) => {
    console.error(`Error: ${message}`);
    // Replace with your toast implementation
  }
};

interface CodeArtifactMetadata {
  language?: string;
}

const CodeEditor: React.FC<{
  content: string;
  language?: string;
  isCurrentVersion: boolean;
  status: 'streaming' | 'idle';
  onSaveContent: (content: string, debounce: boolean) => void;
}> = ({ content, language = 'javascript', isCurrentVersion, status, onSaveContent }) => {
  return (
    <div className="h-full w-full">
      <div className="bg-muted p-2 text-sm border-b">
        <span className="text-muted-foreground">Language: </span>
        <span className="font-mono">{language}</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => onSaveContent(e.target.value, true)}
        className="w-full h-full p-4 font-mono text-sm bg-background border-none outline-none resize-none"
        placeholder="// Write your code here..."
        disabled={!isCurrentVersion || status === 'streaming'}
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export const codeArtifact = new Artifact<'code', CodeArtifactMetadata>({
  kind: 'code',
  description: 'Useful for code editing and programming tasks.',
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      language: 'javascript',
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'data-codeDelta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible: draftArtifact.content.length > 50 ? true : draftArtifact.isVisible,
          status: 'streaming',
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
        language={metadata?.language}
        isCurrentVersion={isCurrentVersion}
        status={status}
        onSaveContent={onSaveContent}
      />
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Code copied to clipboard!');
      },
    },
  ],
  toolbar: [],
});