// Main Artifact Components
export { Artifact, artifactDefinitions } from "./extracted-components/artifact";
export type { UIArtifact, ArtifactKind } from "./extracted-components/artifact";
export { ArtifactActions } from "./extracted-components/artifact-actions";
export { ArtifactCloseButton } from "./extracted-components/artifact-close-button";
export { ArtifactMessages } from "./extracted-components/artifact-messages";
export { MultimodalInput } from "./extracted-components/multimodal-input";
export { Toolbar } from "./extracted-components/toolbar";
export { VersionFooter } from "./extracted-components/version-footer";

// Artifact Creation Framework
export { Artifact as ArtifactClass } from "./extracted-components/create-artifact";
export type {
  ArtifactActionContext,
  ArtifactToolbarContext,
  ArtifactToolbarItem,
} from "./extracted-components/create-artifact";

// Hooks
export {
  useArtifact,
  useArtifactSelector,
  initialArtifactData,
} from "./extracted-hooks/use-artifact";

// Artifact Type Implementations
export { textArtifact } from "./extracted-artifacts/text/client";
export { codeArtifact } from "./extracted-artifacts/code/client";
export { imageArtifact } from "./extracted-artifacts/image/client";
export { sheetArtifact } from "./extracted-artifacts/sheet/client";

// UI Components
export { Button } from "./ui/button";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./ui/tooltip";
export {
  DocumentSkeleton,
  InlineDocumentSkeleton,
} from "./ui/document-skeleton";
export { Editor } from "./ui/text-editor";
export { DiffView } from "./ui/diffview";
export * from "./ui/icons";

// Utilities
export { cn, fetcher } from "./extracted-utils/utils";

// Types
export type {
  Document,
  Vote,
  ChatMessage,
  Attachment,
  VisibilityType,
  Suggestion,
  CustomUIDataTypes,
} from "./extracted-components/artifact";
