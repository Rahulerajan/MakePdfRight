import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { BackButton } from './BackButton';

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
  objectKey?: string;
  onDownload?: () => void;
  onReset: () => void;
  resetLabel: string;
  onBack?: () => void;
  backLabel?: string;
  children?: React.ReactNode;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  icon,
  title,
  subtitle,
  details,
  downloadUrl,
  downloadFileName,
  downloadLabel = 'DOWNLOAD COMPRESSED PDF ↓',
  objectKey,
  onDownload,
  onReset,
  resetLabel,
  onBack,
  backLabel = 'Back',
  children
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(downloadUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiredError, setExpiredError] = useState(false);

  useEffect(() => {
    setCurrentUrl(downloadUrl);
  }, [downloadUrl]);

  const triggerDownload = async (targetUrl: string) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setError(null);
    setExpiredError(false);

    let urlToFetch = targetUrl || currentUrl;

    try {
      // If no URL available initially, attempt to obtain a fresh signed URL
      if (!urlToFetch && objectKey) {
        const refreshRes = await fetch('/api/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: objectKey })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.success && data.downloadUrl) {
            urlToFetch = data.downloadUrl;
            setCurrentUrl(urlToFetch);
          }
        }
      }

      if (!urlToFetch) {
        setExpiredError(true);
        setError('Download link expired. Generate a new download link.');
        setIsDownloading(false);
        return;
      }

      // 1. Direct browser download for client-side Blob or Data URLs
      if (urlToFetch.startsWith('blob:') || urlToFetch.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = urlToFetch;
        a.download = downloadFileName || 'compressed_document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsDownloading(false);
        if (onDownload) onDownload();
        return;
      }

      // 2. Fetch binary payload from authorized signed download URL
      let res = await fetch(urlToFetch);

      // If status 403 or 404 (expired token), attempt auto-refresh once if objectKey is known
      if (!res.ok && (res.status === 403 || res.status === 404) && objectKey) {
        const refreshRes = await fetch('/api/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: objectKey })
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.downloadUrl) {
            urlToFetch = refreshData.downloadUrl;
            setCurrentUrl(urlToFetch);
            res = await fetch(urlToFetch);
          }
        }
      }

      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          setExpiredError(true);
          setError('Download link expired. Generate a new download link.');
        } else {
          setError('Unable to download the file. Please try again.');
        }
        setIsDownloading(false);
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadFileName || 'compressed_document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up temporary Blob URL after download trigger
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 200);

      setIsDownloading(false);
      if (onDownload) onDownload();

    } catch (err) {
      console.error('Download error:', err);
      setError('Unable to download the file. Please try again.');
      setIsDownloading(false);
    }
  };

  const handleRefreshDownloadUrl = async () => {
    if (!objectKey) return;
    setIsRefreshingUrl(true);
    setError(null);
    setExpiredError(false);

    try {
      const res = await fetch('/api/files/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: objectKey })
      });

      if (!res.ok) {
        throw new Error('Failed to refresh download URL');
      }

      const data = await res.json();
      if (data.success && data.downloadUrl) {
        setCurrentUrl(data.downloadUrl);
        await triggerDownload(data.downloadUrl);
      } else {
        setExpiredError(true);
        setError('Download link expired. Generate a new download link.');
      }
    } catch {
      setExpiredError(true);
      setError('Download link expired. Generate a new download link.');
    } finally {
      setIsRefreshingUrl(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 flex flex-col items-center text-center space-y-6 overflow-y-auto">
      {/* Top Header Navigation Bar inside Card */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 -mt-2 sm:-mt-4">
        <BackButton 
          onClick={onBack || onReset} 
          label={backLabel}
        />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Processing Complete
        </span>
      </div>

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

      {/* Children Slot (e.g. Optimization Summary) */}
      {children}

      {/* Download Error / Expired Link Notification Banner */}
      {error && (
        <div className="w-full max-w-md p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-bold flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{error}</span>
          </div>
          {expiredError && objectKey && (
            <button
              type="button"
              onClick={handleRefreshDownloadUrl}
              disabled={isRefreshingUrl}
              className="mt-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-extrabold text-xs transition-all cursor-pointer shadow-xs"
            >
              {isRefreshingUrl ? 'Generating new link...' : 'Generate a new download link'}
            </button>
          )}
        </div>
      )}

      {/* Primary Download CTA & Secondary Reset Action */}
      <div className="flex flex-col gap-3 w-full max-w-md justify-center items-center shrink-0">
        <button
          type="button"
          onClick={() => triggerDownload(currentUrl)}
          disabled={isDownloading || isRefreshingUrl}
          id="download-compressed-pdf-btn"
          className="bg-[#E5322D] hover:bg-[#c92824] text-white py-4 px-6 rounded-xl font-black text-base tracking-wide w-full shadow-lg shadow-red-500/20 hover:shadow-red-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Downloading PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-6 h-6 shrink-0" />
              <span>{downloadLabel || 'DOWNLOAD COMPRESSED PDF ↓'}</span>
            </>
          )}
        </button>

        {currentUrl && (
          <a
            href={currentUrl}
            download={downloadFileName || 'compressed_document.pdf'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-[#E5322D] dark:hover:text-red-400 font-medium underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Having trouble? Direct download link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        <button
          type="button"
          onClick={onReset}
          className="py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors cursor-pointer w-full text-center mt-1"
        >
          {resetLabel}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Files are encrypted and auto-deleted shortly after processing</span>
        </div>
      </div>
    </div>
  );
};
