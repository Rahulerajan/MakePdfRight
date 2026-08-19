import React from 'react';

interface ToolSkeletonProps {
  stage?: 1 | 2;
  toolName?: string;
  variant?: 'workspace' | 'form' | 'default';
}

export const ToolSkeleton: React.FC<ToolSkeletonProps> = ({ 
  stage = 2, 
  toolName = 'Tool',
  variant = 'workspace'
}) => {
  return (
    <div 
      className="w-full h-full min-h-[500px] flex flex-col items-stretch justify-start p-4 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading {toolName} workspace and processing engine...</span>
      
      {/* Top Workspace Toolbar Skeleton */}
      <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
          <div className="h-5 w-32 sm:w-48 rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 sm:w-28 rounded-lg bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
          <div className="h-8 w-8 sm:w-24 rounded-lg bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Main Workspace Body Skeleton */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[360px]">
        {/* Left/Main Stage Canvas/Preview */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 min-h-[300px]">
          <div className="w-16 h-20 rounded-md bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse mb-4 shadow-sm" />
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse mb-2" />
          <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800/60 motion-safe:animate-pulse" />
        </div>

        {/* Right Settings & Action Sidebar Skeleton */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-6 p-5 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
            <div className="h-8 w-3/4 rounded-lg bg-slate-100 dark:bg-slate-800/50 motion-safe:animate-pulse" />
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <div className="h-12 w-full rounded-xl bg-primary/20 dark:bg-primary/30 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
