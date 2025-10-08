import { Artifact } from '../../extracted-components/create-artifact';
import { DocumentSkeleton } from '../../ui/document-skeleton';
import {
  CopyIcon,
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

interface ImageArtifactMetadata {
  prompt?: string;
  dimensions?: string;
}

const ImageViewer: React.FC<{
  content: string;
  isCurrentVersion: boolean;
  status: 'streaming' | 'idle';
  metadata?: ImageArtifactMetadata;
}> = ({ content, isCurrentVersion, status, metadata }) => {
  if (status === 'streaming' && !content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating image...</p>
          {metadata?.prompt && (
            <p className="text-sm text-muted-foreground mt-2">"{metadata.prompt}"</p>
          )}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No image to display
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <img
        src={content}
        alt="Generated image"
        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
      />
      {metadata?.prompt && (
        <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
          "{metadata.prompt}"
        </p>
      )}
    </div>
  );
};

export const imageArtifact = new Artifact<'image', ImageArtifactMetadata>({
  kind: 'image',
  description: 'Useful for image generation and editing.',
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      prompt: '',
      dimensions: '1024x1024',
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'data-imageUrl') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: streamPart.data as unknown as string,
          isVisible: true,
          status: 'idle',
        };
      });
    }

    if (streamPart.type === 'data-imagePrompt') {
      setMetadata((metadata) => ({
        ...metadata,
        prompt: streamPart.data,
      }));
    }
  },
  content: ({
    status,
    content,
    isCurrentVersion,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="image" />;
    }

    return (
      <ImageViewer
        content={content}
        isCurrentVersion={isCurrentVersion}
        status={status}
        metadata={metadata}
      />
    );
  },
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy image URL',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Image URL copied to clipboard!');
      },
      isDisabled: ({ content }) => !content,
    },
  ],
  toolbar: [],
});