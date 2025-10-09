import type React from "react";

interface DiffViewProps {
  oldContent: string;
  newContent: string;
}

export const DiffView: React.FC<DiffViewProps> = ({
  oldContent,
  newContent,
}) => {
  // Simple diff implementation - you can replace with a more sophisticated diff library
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="flex h-full flex-row">
      <div className="flex-1 border-r p-4">
        <h3 className="mb-4 font-medium text-red-600">Previous Version</h3>
        <div className="space-y-1">
          {oldLines.map((line, index) => (
            <div className="font-mono text-sm" key={index}>
              <span className="mr-4 text-muted-foreground">{index + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <h3 className="mb-4 font-medium text-green-600">Current Version</h3>
        <div className="space-y-1">
          {newLines.map((line, index) => (
            <div className="font-mono text-sm" key={index}>
              <span className="mr-4 text-muted-foreground">{index + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
