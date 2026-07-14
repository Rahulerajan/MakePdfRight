import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Plus,
  Trash2,
  FileText,
  GripVertical,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { FileUpload } from '../components/common/FileUpload';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useLanguage } from '../components/LanguageContext';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MergeToolProps {
  initialFiles: File[];
}

interface FileWithPreview {
  id: string;
  file: File;
  preview: string;
}

export const MergeTool: React.FC<MergeToolProps> = ({ initialFiles }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Processing your PDFs...");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialFilesLoadedRef = useRef(false);

  const generatePreview = async (file: File): Promise<string> => {
    try {
      console.log(`[MergeTool] Attempting preview generation for: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      if (pdf.numPages === 0) {
        throw new Error("This PDF document contains zero pages.");
      }
      
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
      console.log(`[MergeTool] Successfully generated preview for: ${file.name}`);
      return canvas.toDataURL();
    } catch (err: any) {
      console.warn(`[MergeTool] Could not generate preview for: ${file.name}. Falling back to default icon. Error:`, err);
      return 'placeholder';
    }
  };

  const handleAddFiles = async (newFiles: File[]) => {
    setErrorMsg(null);
    setProcessingMessage("Generating document previews...");
    setIsProcessing(true);
    
    console.log(`[MergeTool] Raw files uploaded:`, newFiles.map(f => f.name));

    try {
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const duplicateFiles: string[] = [];

      // Snapshot current file keys to check synchronous duplicates
      const existingFileKeys = new Set(files.map(item => `${item.file.name}-${item.file.size}`));

      for (const f of newFiles) {
        // 1. File Type Validation
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
          invalidFiles.push(f.name);
          continue;
        }

        // 2. Duplicate Check
        const key = `${f.name}-${f.size}`;
        if (existingFileKeys.has(key)) {
          duplicateFiles.push(f.name);
          continue;
        }

        validFiles.push(f);
      }

      // Handle warnings/errors
      if (invalidFiles.length > 0) {
        setErrorMsg(`Only PDF files are allowed. Skipped invalid file(s): ${invalidFiles.join(', ')}`);
        console.warn(`[MergeTool] Rejected non-PDF files:`, invalidFiles);
      } else if (duplicateFiles.length > 0) {
        setErrorMsg(`Skipped duplicate file(s) already in the list: ${duplicateFiles.join(', ')}`);
        console.warn(`[MergeTool] Prevented duplicates:`, duplicateFiles);
      }

      if (validFiles.length === 0) {
        setIsProcessing(false);
        return;
      }

      const newFilesWithPreviews = await Promise.all(
        validFiles.map(async (f) => ({
          id: Math.random().toString(36).substr(2, 9),
          file: f,
          preview: await generatePreview(f)
        }))
      );
      
      setFiles(prev => {
        // Deduplicate at state update commit-time for absolute concurrency safety
        const currentKeys = new Set(prev.map(item => `${item.file.name}-${item.file.size}`));
        const filteredNew = newFilesWithPreviews.filter(
          item => !currentKeys.has(`${item.file.name}-${item.file.size}`)
        );
        return [...prev, ...filteredNew];
      });
      console.log(`[MergeTool] Added ${newFilesWithPreviews.length} files successfully.`);
    } catch (err: any) {
      console.error("[MergeTool] Error during file loading:", err);
      setErrorMsg("An unexpected error occurred while loading your PDFs. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (initialFiles.length > 0 && !initialFilesLoadedRef.current) {
      initialFilesLoadedRef.current = true;
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  const removeFile = (id: string) => {
    console.log(`[MergeTool] Removing file with ID: ${id}`);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const mergePDFs = async () => {
    setErrorMsg(null);
    setProcessingMessage("Merging your PDF files in sequence...");
    setIsProcessing(true);
    console.log(`[MergeTool] Starting merge operation on ${files.length} documents.`);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        console.log(`[MergeTool] Merging [${i + 1}/${files.length}]: ${item.file.name}`);
        const arrayBuffer = await item.file.arrayBuffer();
        
        // Load the PDF ignoring encryption if possible to maximize compatibility
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setIsProcessing(false);
      setTimeout(() => {
        setResultUrl(url);
      }, 1500);
      console.log(`[MergeTool] Merged file successfully created.`);
    } catch (error: any) {
      console.error('[MergeTool] Merging failed:', error);
      setErrorMsg(error.message || 'An error occurred during merging. Please make sure none of your files are password-protected or corrupted.');
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{t('merge.merged_title')}</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{t('merge.merged_desc')}</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download="merged_document.pdf"
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            {t('merge.download_btn')}
          </a>
          <button 
            onClick={() => {
              setResultUrl(null);
              setFiles([]);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors cursor-pointer"
          >
            {t('merge.more_btn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <LoadingOverlay 
        isVisible={isProcessing} 
        message={processingMessage} 
        error={errorMsg}
        onCloseError={() => setErrorMsg(null)}
      />

      <div className="flex flex-col items-center gap-12 w-full">
        {/* Reorder and Upload Wrapper */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mx-auto">
          
          {/* Reorder Group (Horizontal Layout for true Single-Axis scrollable drag and drop) */}
          <div className="flex-1 max-w-full overflow-x-auto py-6 px-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 rounded-3xl bg-slate-100/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 min-h-[300px] flex items-center justify-center">
            {files.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                {t('merge.no_files')}
              </div>
            ) : (
              <Reorder.Group 
                axis="x" 
                values={files} 
                onReorder={setFiles}
                className="flex flex-row gap-6 select-none"
              >
                <AnimatePresence>
                  {files.map((item) => (
                    <Reorder.Item 
                      key={item.id} 
                      value={item}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group cursor-grab active:cursor-grabbing flex-shrink-0"
                    >
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-md hover:shadow-xl transition-all duration-300 group-hover:border-primary/50">
                        <div className="w-52 h-72 bg-slate-50 dark:bg-slate-950/40 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-850 flex items-center justify-center relative">
                          {item.preview && item.preview !== 'placeholder' ? (
                            <img src={item.preview} alt={item.file.name} className="w-full h-full object-contain p-2" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-3 p-4">
                              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[160px]" title={item.file.name}>
                                  {item.file.name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                                  {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Hover Overlay indicating can be dragged */}
                          <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                              Drag to Reorder
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2.5 px-1">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => removeFile(item.id)}
                        className="absolute -top-3 -right-3 w-10 h-10 lg:w-8 lg:h-8 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 shadow-lg transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer z-10"
                        title="Remove PDF"
                      >
                        <Trash2 className="w-5 h-5 lg:w-4 lg:h-4" />
                      </button>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>

          {/* Compact File Upload trigger */}
          <div className="flex-shrink-0 flex items-center justify-center py-4">
            <FileUpload onFilesSelected={handleAddFiles} multiple compact />
          </div>
        </div>

        {/* Info Helper Note */}
        {files.length >= 2 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-md text-center leading-relaxed">
            {t('merge.info_helper')}
          </p>
        )}

        {/* Merge Trigger Button */}
        <button 
          onClick={mergePDFs}
          disabled={files.length < 2 || isProcessing}
          className="btn-primary flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] py-4 px-8 text-lg font-black"
        >
          <span>{t('tools.merge.name')}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
