import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Plus, Lock, Loader2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguage } from '../LanguageContext';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
    Dropbox?: any;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function loadScript(src: string, id?: string, attributes?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    if (id) script.id = id;
    if (attributes) {
      Object.entries(attributes).forEach(([key, val]) => {
        script.setAttribute(key, val);
      });
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
}

const GoogleDriveIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 50h27.5c0-1.55-.4-3.1-1.2-4.5l-13.75-23.8c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8z" fill="#ffba00"/>
    <path d="m27.5 50 13.75 23.8c1.35.8 2.9 1.2 4.4 1.2h18.5c1.55 0 3.1-.4 4.45-1.2l-13.75-23.8z" fill="#2684fc"/>
  </svg>
);

const DropboxIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25l6-3.75 6 3.75-6 3.75-6-3.75zm24 0l-6-3.75-6 3.75 6 3.75 6-3.75zM6 18.25l6-3.75 6 3.75-6 3.75-6-3.75z"/>
  </svg>
);

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesSelected, 
  accept = { 'application/pdf': ['.pdf'] },
  multiple = false,
  compact = false
}) => {
  const { t } = useLanguage();
  const [loadingState, setLoadingState] = useState<'google' | 'dropbox' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const env = (import.meta as any).env || {};
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID;
  const googleApiKey = env.VITE_GOOGLE_API_KEY || '';
  const dropboxAppKey = env.VITE_DROPBOX_APP_KEY;

  const hasGoogle = Boolean(googleClientId);
  const hasDropbox = Boolean(dropboxAppKey);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const dropzoneOptions: any = {
    onDrop,
    accept,
    multiple
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  if (compact) {
    return (
      <div 
        {...getRootProps()} 
        className="flex items-center justify-center w-full h-full min-h-[200px] cursor-pointer self-center justify-self-center shrink-0"
        title={t('common.add_files') || "Add more files"}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-full bg-[#E5322D] hover:bg-[#c92824] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95">
          <Plus className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const openGooglePicker = (accessToken: string) => {
    try {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      const mimeTypes = Object.keys(accept).join(',');
      if (mimeTypes) {
        view.setMimeTypes(mimeTypes);
      }

      const builder = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            try {
              const docs = data.docs || [];
              const downloadedFiles: File[] = [];
              for (const doc of docs) {
                const fileId = doc.id;
                const fileName = doc.name || 'file';
                const mimeType = doc.mimeType || 'application/octet-stream';

                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) throw new Error(`Failed to download ${fileName} from Google Drive.`);
                const blob = await res.blob();
                const file = new File([blob], fileName, { type: mimeType });
                downloadedFiles.push(file);
              }
              if (downloadedFiles.length > 0) {
                onFilesSelected(downloadedFiles);
              }
            } catch (err: any) {
              setError(err?.message || 'Error downloading file from Google Drive.');
            } finally {
              setLoadingState(null);
            }
          } else if (data.action === window.google.picker.Action.CANCEL) {
            setLoadingState(null);
          }
        });

      if (googleApiKey) {
        builder.setDeveloperKey(googleApiKey);
      }
      if (multiple) {
        builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      }

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err: any) {
      setLoadingState(null);
      setError(err?.message || 'Error opening Google Drive picker.');
    }
  };

  const handleGoogleDriveImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setLoadingState('google');

    try {
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js', 'gapi-script'),
        loadScript('https://accounts.google.com/gsi/client', 'gsi-script'),
      ]);

      await new Promise<void>((resolve, reject) => {
        if (window.gapi) {
          window.gapi.load('picker', () => resolve());
        } else {
          reject(new Error('Google API client failed to initialize.'));
        }
      });

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services failed to load.');
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            setLoadingState(null);
            if (response.error !== 'popup_closed_by_user') {
              setError('Google Drive authentication failed or was cancelled.');
            }
            return;
          }
          const accessToken = response.access_token;
          openGooglePicker(accessToken);
        },
        error_callback: () => {
          setLoadingState(null);
          setError('Google Drive sign-in error.');
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      setLoadingState(null);
      setError(err?.message || 'Failed to initialize Google Drive import.');
    }
  };

  const handleDropboxImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    setLoadingState('dropbox');

    try {
      await loadScript(
        'https://www.dropbox.com/static/api/2/dropins.js',
        'dropboxjs',
        { 'data-app-key': dropboxAppKey || '' }
      );

      if (!window.Dropbox) {
        throw new Error('Dropbox Chooser API failed to load.');
      }

      const extensions = Object.values(accept)
        .flat()
        .filter((ext) => ext.startsWith('.'))
        .map((ext) => ext.toLowerCase());

      window.Dropbox.choose({
        success: async (files: any[]) => {
          try {
            const downloadedFiles: File[] = [];
            for (const dbFile of files) {
              const fileUrl = dbFile.link;
              const fileName = dbFile.name || 'file';

              const res = await fetch(fileUrl);
              if (!res.ok) throw new Error(`Failed to download ${fileName} from Dropbox.`);
              const blob = await res.blob();
              const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
              downloadedFiles.push(file);
            }
            if (downloadedFiles.length > 0) {
              onFilesSelected(downloadedFiles);
            }
          } catch (err: any) {
            setError(err?.message || 'Error downloading file from Dropbox.');
          } finally {
            setLoadingState(null);
          }
        },
        cancel: () => {
          setLoadingState(null);
        },
        linkType: 'direct',
        multiselect: multiple,
        ...(extensions.length > 0 ? { extensions } : {}),
      });
    } catch (err: any) {
      setLoadingState(null);
      setError(err?.message || 'Failed to initialize Dropbox import.');
    }
  };

  // Check if this dropzone accepts images or audio or PDFs
  const isImage = accept && Object.keys(accept).some(key => key.startsWith('image/'));
  const isAudio = accept && Object.keys(accept).some(key => key.startsWith('audio/'));

  let btnText = multiple ? 'Select PDF files' : 'Select PDF file';
  let dropText = multiple ? 'or drop PDFs here' : 'or drop PDF here';

  if (isImage) {
    btnText = multiple ? 'Select images' : 'Select image';
    dropText = 'or drop images here';
  } else if (isAudio) {
    btnText = 'Select audio file';
    dropText = 'or drop audio file here';
  } else {
    const localizedSelect = t('upload.select_button');
    if (localizedSelect && localizedSelect !== 'upload.select_button') {
      btnText = localizedSelect;
    }
    const localizedDrop = t('upload.or_drop');
    if (localizedDrop && localizedDrop !== 'upload.or_drop') {
      dropText = localizedDrop;
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-6">
      <div 
        {...getRootProps()} 
        className={cn(
          "relative group cursor-pointer transition-all duration-200",
          "p-6 sm:p-8 flex flex-col items-center justify-center gap-3 text-center rounded-3xl",
          isDragActive 
            ? "bg-primary/10 ring-2 ring-primary ring-dashed scale-[1.02]" 
            : "bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
        )}
      >
        <input {...getInputProps()} />

        {/* Solid, Prominent Primary Button */}
        <div className={cn(
          "relative z-10 inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5",
          "bg-[#E5322D] hover:bg-[#d42722] text-white font-bold text-lg sm:text-2xl rounded-2xl",
          "shadow-xl shadow-[#E5322D]/25 group-hover:scale-[1.03] active:scale-[0.98]",
          "transition-all duration-200 select-none pointer-events-none"
        )}>
          <FileUp className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.25] shrink-0" />
          <span>{btnText}</span>
        </div>

        {/* Small Subtext Below Button */}
        <p className="relative z-10 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-1">
          {isDragActive ? t('upload.drop_active') || 'Drop files here...' : dropText}
        </p>

        {/* Cloud Import Buttons (Google Drive / Dropbox) */}
        {(hasGoogle || hasDropbox) && (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 mt-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 w-full max-w-md">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-full text-center sm:w-auto">
              Or import from:
            </span>
            {hasGoogle && (
              <button
                type="button"
                onClick={handleGoogleDriveImport}
                disabled={loadingState !== null}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#E5322D] hover:text-[#E5322D] transition-all text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loadingState === 'google' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5322D]" />
                ) : (
                  <GoogleDriveIcon className="w-3.5 h-3.5" />
                )}
                <span>Google Drive</span>
              </button>
            )}
            {hasDropbox && (
              <button
                type="button"
                onClick={handleDropboxImport}
                disabled={loadingState !== null}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#0061FF] hover:text-[#0061FF] transition-all text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loadingState === 'dropbox' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0061FF]" />
                ) : (
                  <DropboxIcon className="w-3.5 h-3.5 text-[#0061FF]" />
                )}
                <span>Dropbox</span>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="relative z-10 flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{error}</span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setError(null); }} 
              className="hover:underline text-[10px] uppercase font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Security & Auto-deletion reassurance */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Auto-deleted after processing.</span>
        </div>
      </div>
    </div>
  );
};
