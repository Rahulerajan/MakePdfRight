import React, { Suspense, lazy } from 'react';
import { ToolSkeleton } from '../components/common/ToolSkeleton';

const AudioTranscribeTool = lazy(() => import('../tools/AudioTranscribeTool').then(m => ({ default: m.AudioTranscribeTool })));

export const AudioTranscribePage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col justify-start bg-slate-50 dark:bg-slate-900/50 transition-colors py-4 md:py-8 px-4 md:px-8">
      <div className="max-w-6xl w-full mx-auto">
        <Suspense fallback={<ToolSkeleton toolName="Audio Transcribe" />}>
          <AudioTranscribeTool />
        </Suspense>
      </div>
    </div>
  );
};
