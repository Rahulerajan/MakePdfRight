import React from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

export interface ResultDetail {
  icon?: React.ReactNode;
  label: string;
}

export interface ResultPanelProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  details?: ResultDetail[];
  downloadUrl: string;
  downloadFileName: string;
  downloadLabel?: string;
  onReset: () => void;
  resetLabel: string;
  children?: React.ReactNode;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  icon,
  title,
  subtitle,
  details,
  downloadUrl,
  downloadFileName,
  downloadLabel = 'Download',
  onReset,
  resetLabel,
  children
}) => {
  return (
    <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6">
      {/* Icon Badge */}
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
        {icon || <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" />}
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-2 max-w-md">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Details List */}
      {details && details.length > 0 && (
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 max-w-xl">
          {details.map((detail, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl text-sm font-extrabold shadow-xs"
            >
              {detail.icon || <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />}
              <span>{detail.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Children Slot */}
      {children}

      {/* Buttons Container */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <a
          href={downloadUrl}
          download={downloadFileName}
          className="btn-primary flex-1 py-4 px-6 flex items-center justify-center gap-2 text-base font-extrabold"
        >
          <Download className="w-5 h-5 shrink-0" />
          <span>{downloadLabel}</span>
        </a>
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm transition-colors cursor-pointer shrink-0"
        >
          {resetLabel}
        </button>
      </div>
    </div>
  );
};
