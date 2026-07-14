import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguage } from '../LanguageContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
        className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white cursor-pointer hover:bg-primary-hover transition-colors shadow-lg"
      >
        <input {...getInputProps()} />
        <Plus className="w-6 h-6" />
      </div>
    );
  }

  // Check if this dropzone accepts images or audio or PDFs
  const isImage = accept && Object.keys(accept).some(key => key.startsWith('image/'));
  const isAudio = accept && Object.keys(accept).some(key => key.startsWith('audio/'));

  let titleText = t('upload.choose');
  let dropText = t('upload.or_drop');
  let btnText = t('upload.select_button');

  if (isImage) {
    titleText = t('ai.prompt_placeholder') !== 'ai.prompt_placeholder' ? 'Choose images' : 'Choose images';
    dropText = 'or drop images here';
    btnText = 'Select images';
  } else if (isAudio) {
    titleText = t('ai.upload_audio');
    dropText = 'or drop audio file here';
    btnText = 'Select audio file';
  }

  return (
    <div className="max-w-[800px] mx-auto w-full py-6 md:py-12">
      <div 
        {...getRootProps()} 
        className={cn(
          "relative group cursor-pointer transition-all duration-500",
          "bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed p-8 sm:p-12 md:p-20 flex flex-col items-center justify-center gap-6 md:gap-8",
          isDragActive 
            ? "border-primary bg-primary/5 dark:bg-primary/10" 
            : "border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-700/30"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="w-20 h-20 md:w-32 md:h-32 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <FileUp className="w-10 h-10 md:w-16 md:h-16 text-primary" />
        </div>
 
        <div className="text-center space-y-3">
          <h2 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {isDragActive ? t('upload.drop_active') : titleText}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            {isDragActive ? '' : dropText}
          </p>
        </div>
 
        <button className="btn-primary mt-2 md:mt-4 pointer-events-none px-6 py-3 text-sm md:text-base md:px-8 md:py-3.5">
          {btnText}
        </button>
      </div>
    </div>
  );
};
