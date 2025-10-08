import { Artifact } from '../../extracted-components/create-artifact';
import { DocumentSkeleton } from '../../ui/document-skeleton';
import {
  CopyIcon,
  RedoIcon,
  UndoIcon,
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

interface SheetArtifactMetadata {
  rows?: number;
  cols?: number;
}

const SpreadsheetEditor: React.FC<{
  content: string;
  isCurrentVersion: boolean;
  status: 'streaming' | 'idle';
  onSaveContent: (content: string, debounce: boolean) => void;
}> = ({ content, isCurrentVersion, status, onSaveContent }) => {
  // Parse CSV content into rows and columns
  const parseCSV = (csvContent: string) => {
    if (!csvContent.trim()) {
      // Default empty spreadsheet
      return Array(10).fill(null).map(() => Array(5).fill(''));
    }
    
    return csvContent.split('\n').map(row => 
      row.split(',').map(cell => cell.trim())
    );
  };

  const data = parseCSV(content);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    
    // Convert back to CSV
    const csvContent = newData.map(row => row.join(',')).join('\n');
    onSaveContent(csvContent, true);
  };

  const maxCols = Math.max(...data.map(row => row.length), 5);

  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="inline-block min-w-full">
        <table className="border-collapse border border-border">
          <thead>
            <tr>
              <th className="w-12 border border-border bg-muted text-center text-sm font-medium p-2">
                #
              </th>
              {Array(maxCols).fill(null).map((_, colIndex) => (
                <th key={colIndex} className="border border-border bg-muted text-center text-sm font-medium p-2 min-w-[100px]">
                  {String.fromCharCode(65 + colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-border bg-muted text-center text-sm font-medium p-2">
                  {rowIndex + 1}
                </td>
                {Array(maxCols).fill(null).map((_, colIndex) => (
                  <td key={colIndex} className="border border-border p-0">
                    <input
                      type="text"
                      value={row[colIndex] || ''}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="w-full h-full p-2 border-none outline-none bg-transparent text-sm"
                      disabled={!isCurrentVersion || status === 'streaming'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const sheetArtifact = new Artifact<'sheet', SheetArtifactMetadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets and tabular data.',
  initialize: async ({ documentId, setMetadata }) => {
    setMetadata({
      rows: 10,
      cols: 5,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'data-sheetDelta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: streamPart.data as string,
          isVisible: true,
          status: 'streaming',
        };
      });
    }
  },
  content: ({
    status,
    content,
    isCurrentVersion,
    onSaveContent,
    isLoading,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="sheet" />;
    }

    return (
      <SpreadsheetEditor
        content={content}
        isCurrentVersion={isCurrentVersion}
        status={status}
        onSaveContent={onSaveContent}
      />
    );
  },
  actions: [
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
      description: 'Copy as CSV',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Spreadsheet copied to clipboard as CSV!');
      },
    },
  ],
  toolbar: [],
});