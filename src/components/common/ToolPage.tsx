import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { LoadingOverlay } from './LoadingOverlay';

interface ToolPageProps {
  title: string;
  description: string;
  children: (files: File[]) => React.ReactNode;
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

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStage(2);
  };

  const reset = () => {
    setFiles([]);
    setStage(1);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors">
      <LoadingOverlay isVisible={isLoading} />

      <div className="flex-1 py-16 px-6">
        <div className="container-custom relative">
          {/* Back Button */}
          <div className="absolute -top-12 left-0">
            {stage === 1 ? (
              <Link 
                to="/"
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>
            ) : (
              <button 
                onClick={reset}
                className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to Upload
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
                  <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
                  <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">{description}</p>
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
                {children(files)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
