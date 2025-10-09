import type React from "react";
import { Button } from "../ui/button";

interface Document {
  id: string;
  title: string;
  content: string | null;
  kind: string;
  createdAt: Date;
  userId: string;
}

interface VersionFooterProps {
  currentVersionIndex: number;
  documents: Document[] | undefined;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
}

export const VersionFooter: React.FC<VersionFooterProps> = ({
  currentVersionIndex,
  documents,
  handleVersionChange,
}) => {
  if (!documents || documents.length <= 1) {
    return null;
  }

  return (
    <div className="-translate-x-1/2 fixed bottom-4 left-1/2 flex transform items-center gap-2 rounded-lg border border-border bg-background p-2 shadow-lg">
      <Button
        disabled={currentVersionIndex === 0}
        onClick={() => handleVersionChange("prev")}
        size="sm"
        variant="outline"
      >
        ←
      </Button>

      <span className="px-2 text-sm">
        Version {currentVersionIndex + 1} of {documents.length}
      </span>

      <Button
        disabled={currentVersionIndex === documents.length - 1}
        onClick={() => handleVersionChange("next")}
        size="sm"
        variant="outline"
      >
        →
      </Button>

      <Button
        disabled={currentVersionIndex === documents.length - 1}
        onClick={() => handleVersionChange("latest")}
        size="sm"
        variant="outline"
      >
        Latest
      </Button>
    </div>
  );
};
