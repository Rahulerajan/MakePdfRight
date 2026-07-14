import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { LoadingOverlay } from './LoadingOverlay';
import { useLanguage } from '../LanguageContext';

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
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStage(2);
  };

  const reset = () => {
    setFiles([]);
    setStage(1);
  };

  // Map English tool title to localized versions
  const keyMap: Record<string, string> = {
    'Merge PDF': 'merge',
    'Split PDF': 'split',
    'Compress PDF': 'compress',
    'PDF to JPG': 'pdf_to_jpg',
    'Image to PDF': 'image_to_pdf',
    'PDF to Word': 'pdf_to_word',
    'PDF to Excel': 'pdf_to_excel',
    'Edit PDF': 'edit',
    'Rotate PDF': 'rotate',
    'Organize PDF': 'organise'
  };
  const baseKey = keyMap[title];
  const displayTitle = baseKey ? t(`tool.${baseKey}.title`) : title;
  const displayDesc = baseKey ? t(`tool.${baseKey}.desc`) : description;

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors">
      <LoadingOverlay isVisible={isLoading} />

      <div className="flex-1 py-10 md:py-16 px-4 md:px-6">
        <div className="container-custom relative">
          {/* Back Button */}
          <div className="mb-8 sm:mb-0 sm:absolute sm:-top-12 sm:left-0 z-10">
            {stage === 1 ? (
              <Link 
                to="/"
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {t('back_home')}
              </Link>
            ) : (
              <button 
                onClick={reset}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {t('Back to Upload') !== 'Back to Upload' ? t('Back to Upload') : (t('back_home') === 'Back to Home' ? 'Back to Upload' : t('back_home'))}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {stage === 1 ? (
              <motion.div
                key="stage1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-16"
              >
                <div className="text-center space-y-6">
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{displayTitle}</h1>
                  <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">{displayDesc}</p>
                </div>

                <FileUpload 
                  onFilesSelected={handleFilesSelected} 
                  multiple={multiple}
                  accept={accept}
                />
              </motion.div>
            ) : (
              <motion.div
                key="stage2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {children(files, reset)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
