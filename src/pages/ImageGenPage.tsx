import React, { Suspense, lazy } from 'react';
import { ToolPageShell } from '../components/common/ToolPageShell';
import { ToolSkeleton } from '../components/common/ToolSkeleton';

const ImageGenTool = lazy(() => import('../tools/ImageGenTool').then(m => ({ default: m.ImageGenTool })));

export const ImageGenPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100dvh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors py-4 md:py-10 px-3 md:px-6">
      <div className="container-custom !px-1 md:!px-6">
        <Suspense fallback={<ToolSkeleton toolName="AI Image Generator" />}>
          <ImageGenTool />
        </Suspense>
      </div>
    </div>
  );
};
