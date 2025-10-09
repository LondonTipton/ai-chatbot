import { Artifact } from "../../extracted-components/create-artifact";
import { DocumentSkeleton } from "../../ui/document-skeleton";
import { CopyIcon } from "../../ui/icons";

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

interface ImageArtifactMetadata {
  prompt?: string;
  dimensions?: string;
}

const ImageViewer: React.FC<{
  content: string;
  isCurrentVersion: boolean;
  status: "streaming" | "idle";
  metadata?: ImageArtifactMetadata;
}> = ({ content, isCurrentVersion, status, metadata }) => {
  if (status === "streaming" && !content) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Generating image...</p>
          {metadata?.prompt && (
            <p className="mt-2 text-muted-foreground text-sm">
              "{metadata.prompt}"
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No image to display
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <img
        alt="Generated image"
        className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        src={content}
      />
      {metadata?.prompt && (
        <p className="mt-4 max-w-md text-center text-muted-foreground text-sm">
          "{metadata.prompt}"
        </p>
      )}
    </div>
  );
};

export const imageArtifact = new Artifact<"image", ImageArtifactMetadata>({
  kind: "image",
  description: "Useful for image generation and editing.",
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      prompt: "",
      dimensions: "1024x1024",
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-imageUrl") {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: streamPart.data as unknown as string,
          isVisible: true,
          status: "idle",
        };
      });
    }

    if (streamPart.type === "data-imagePrompt") {
      setMetadata((metadata) => ({
        ...metadata,
        prompt: streamPart.data as unknown as string,
      }));
    }
  },
  content: ({ status, content, isCurrentVersion, isLoading, metadata }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="image" />;
    }

    return (
      <ImageViewer
        content={content}
        isCurrentVersion={isCurrentVersion}
        metadata={metadata}
        status={status}
      />
    );
  },
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: "Copy image URL",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Image URL copied to clipboard!");
      },
      isDisabled: ({ content }) => !content,
    },
  ],
  toolbar: [],
});
