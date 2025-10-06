import React from 'react';
import { Button } from '../ui/button';

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
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
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
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg p-2 shadow-lg flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVersionChange('prev')}
        disabled={currentVersionIndex === 0}
      >
        ←
      </Button>
      
      <span className="text-sm px-2">
        Version {currentVersionIndex + 1} of {documents.length}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVersionChange('next')}
        disabled={currentVersionIndex === documents.length - 1}
      >
        →
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVersionChange('latest')}
        disabled={currentVersionIndex === documents.length - 1}
      >
        Latest
      </Button>
    </div>
  );
};