import React, { useState, useEffect, Suspense } from 'react';
import { FileUpload } from './FileUpload';
import { ToolPageShell } from './ToolPageShell';
import { ToolSkeleton } from './ToolSkeleton';
import { analytics } from '../../services/analytics';

interface ToolPageProps {
  title: string;
  description: string;
  children: (files: File[], onReset?: () => void) => React.ReactNode;
  multiple?: boolean;
  accept?: Record<string, string[]>;
}

export const ToolPage: React.FC<ToolPageProps> = ({ 
  title, 
  description, 
  children, 
  multiple = false,
  accept
}) => {
  const [stage, setStage] = useState<1 | 2>(1);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    analytics.trackToolOpened(title);
  }, [title]);

  useEffect(() => {
    if (stage === 2) {
      document.body.setAttribute('data-workspace', 'true');
    } else {
      document.body.removeAttribute('data-workspace');
    }
    return () => {
      document.body.removeAttribute('data-workspace');
    };
  }, [stage]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    analytics.trackUploadStarted(title, selectedFiles.length);
    setFiles(selectedFiles);
    setStage(2);
    analytics.trackUploadCompleted(title);
  };

  const reset = () => {
    setFiles([]);
    setStage(1);
  };

  return (
    <ToolPageShell 
      title={title} 
      description={description} 
      isWorkspaceActive={stage === 2}
    >
      {stage === 1 ? (
        <FileUpload 
          onFilesSelected={handleFilesSelected} 
          multiple={multiple}
          accept={accept}
        />
      ) : (
        <Suspense fallback={<ToolSkeleton stage={2} toolName={title} />}>
          {children(files, reset)}
        </Suspense>
      )}
    </ToolPageShell>
  );
};
