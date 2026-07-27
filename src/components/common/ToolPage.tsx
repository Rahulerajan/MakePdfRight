import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { LoadingOverlay } from './LoadingOverlay';
import { useLanguage } from '../LanguageContext';
import { SEO } from './SEO';
import { SEO_DATA } from '../../constants/seoData';

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

  const location = useLocation();
  const routeSeo = SEO_DATA[location.pathname];
  const seoTitle = routeSeo?.title || `${title} – Online Free | MakePDFRight`;
  const seoDesc = routeSeo?.description || description;

  return (
    <div className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors ${stage === 1 ? 'min-h-[calc(100dvh-72px)]' : 'h-[calc(100dvh-72px)] overflow-hidden'}`}>
      <SEO title={seoTitle} description={seoDesc} />
      <LoadingOverlay isVisible={isLoading} />

      {stage === 1 ? (
        <div className="flex-1 py-4 sm:py-6 md:py-10 px-4 md:px-6 flex flex-col justify-start md:justify-center">
          <div className="container-custom relative w-full pt-1 sm:pt-0">
            <div className="mb-4 sm:mb-0 sm:absolute sm:-top-10 sm:left-0 z-10">
              <Link 
                to="/"
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                {t('back_home')}
              </Link>
            </div>

            <motion.div
              key="stage1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 md:space-y-8 max-w-3xl mx-auto"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{displayTitle}</h1>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">{displayDesc}</p>
              </div>

              <FileUpload 
                onFilesSelected={handleFilesSelected} 
                multiple={multiple}
                accept={accept}
              />
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
          <motion.div
            key="stage2"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            {children(files, reset)}
          </motion.div>
        </div>
      )}
    </div>
  );
};

