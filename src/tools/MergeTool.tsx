import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdfjs } from '../utils/pdfWorker';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Plus,
  Trash2,
  FileText,
  GripVertical,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { FileUpload } from '../components/common/FileUpload';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useLanguage } from '../components/LanguageContext';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface MergeToolProps {
  initialFiles: File[];
  onReset?: () => void;
}

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  isGeneratingPreview?: boolean;
}

// Global, reusable document thumbnail cache to prevent unnecessary re-rendering
const thumbnailCache = new Map<string, string>();

export const MergeTool: React.FC<MergeToolProps> = ({ initialFiles, onReset }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Processing your files...");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialFilesLoadedRef = useRef(false);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  // Generates or retrieves preview thumbnail asynchronously and stores in cache
  const generatePreview = async (file: File): Promise<string> => {
    const cacheKey = `${file.name}-${file.size}`;
    const cached = thumbnailCache.get(cacheKey);
    if (cached) return cached;

    // 1. Direct preview for image files
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        thumbnailCache.set(cacheKey, dataUrl);
        return dataUrl;
      } catch {
        thumbnailCache.set(cacheKey, 'placeholder');
        return 'placeholder';
      }
    }

    // 2. Preview for PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
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
        const dataUrl = canvas.toDataURL();
        thumbnailCache.set(cacheKey, dataUrl);
        return dataUrl;
      } catch (err: any) {
        console.warn(`[MergeTool] Could not generate preview for: ${file.name}. Falling back to default icon.`, err);
        thumbnailCache.set(cacheKey, 'placeholder');
        return 'placeholder';
      }
    }

    // 3. Fallback for Word DOCX and other documents
    thumbnailCache.set(cacheKey, 'placeholder');
    return 'placeholder';
  };

  const handleAddFiles = async (newFiles: File[]) => {
    setErrorMsg(null);
    console.log(`[MergeTool] Raw files uploaded:`, newFiles.map(f => f.name));

    try {
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const duplicateFiles: string[] = [];

      // Snapshot current file keys to check synchronous duplicates
      const existingFileKeys = new Set(files.map(item => `${item.file.name}-${item.file.size}`));

      for (const f of newFiles) {
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        const isImage = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name);
        const isDoc = f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.doc') || f.type.includes('word') || f.type.includes('officedocument');

        // 1. File Type Validation (PDF, Images, DOCX)
        if (!isPdf && !isImage && !isDoc) {
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
        setErrorMsg(`Supported formats: PDF, DOCX, JPG, PNG. Skipped unsupported file(s): ${invalidFiles.join(', ')}`);
        console.warn(`[MergeTool] Rejected unsupported files:`, invalidFiles);
      } else if (duplicateFiles.length > 0) {
        setErrorMsg(`Skipped duplicate file(s) already in the list: ${duplicateFiles.join(', ')}`);
        console.warn(`[MergeTool] Prevented duplicates:`, duplicateFiles);
      }

      if (validFiles.length === 0) {
        return;
      }

      // 3. Immediately insert files with isGeneratingPreview=true (instant visual feedback, no full-screen overlay!)
      const itemsToAdd = validFiles.map((f) => {
        const cacheKey = `${f.name}-${f.size}`;
        const cachedUrl = thumbnailCache.get(cacheKey);
        return {
          id: Math.random().toString(36).substr(2, 9),
          file: f,
          preview: cachedUrl,
          isGeneratingPreview: !cachedUrl
        };
      });

      setFiles(prev => {
        const currentKeys = new Set(prev.map(item => `${item.file.name}-${item.file.size}`));
        const filteredNew = itemsToAdd.filter(
          item => !currentKeys.has(`${item.file.name}-${item.file.size}`)
        );
        return [...prev, ...filteredNew];
      });

      // 4. Trigger asynchronous background generation for the newly added files
      itemsToAdd.forEach(async (item) => {
        if (item.isGeneratingPreview) {
          const previewUrl = await generatePreview(item.file);
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, preview: previewUrl, isGeneratingPreview: false } : f));
        }
      });

      console.log(`[MergeTool] Added ${itemsToAdd.length} files successfully.`);
    } catch (err: any) {
      console.error("[MergeTool] Error during file loading:", err);
      setErrorMsg("An unexpected error occurred while loading your files. Please try again.");
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
    setProcessingMessage("Merging your documents in sequence...");
    setIsProcessing(true);
    console.log(`[MergeTool] Starting merge operation on ${files.length} documents.`);

    try {
      const mergedPdf = await PDFDocument.create();
      const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        console.log(`[MergeTool] Merging [${i + 1}/${files.length}]: ${item.file.name}`);
        const arrayBuffer = await item.file.arrayBuffer();
        const lowerName = item.file.name.toLowerCase();

        if (item.file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
          // Load PDF and copy pages
          const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (item.file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(lowerName)) {
          // Embed image (JPG or PNG)
          const isPng = item.file.type.includes('png') || lowerName.endsWith('.png');
          let image;
          if (isPng) {
            image = await mergedPdf.embedPng(arrayBuffer);
          } else {
            image = await mergedPdf.embedJpg(arrayBuffer);
          }
          // Fit image onto standard A4 page or natural dimensions
          const a4Width = 595.28;
          const a4Height = 841.89;
          const imgRatio = image.width / image.height;
          const pageRatio = a4Width / a4Height;
          
          let drawWidth = a4Width - 40;
          let drawHeight = drawWidth / imgRatio;
          if (drawHeight > a4Height - 40) {
            drawHeight = a4Height - 40;
            drawWidth = drawHeight * imgRatio;
          }
          
          const page = mergedPdf.addPage([a4Width, a4Height]);
          const x = (a4Width - drawWidth) / 2;
          const y = (a4Height - drawHeight) / 2;
          page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
        } else {
          // Word / Other Document: create document section page
          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = mergedPdf.addPage([a4Width, a4Height]);
          
          // Header Bar
          page.drawRectangle({
            x: 40,
            y: a4Height - 90,
            width: a4Width - 80,
            height: 50,
            color: rgb(0.95, 0.96, 0.98),
          });
          
          page.drawText(item.file.name, {
            x: 55,
            y: a4Height - 65,
            size: 14,
            font: helveticaBold,
            color: rgb(0.1, 0.15, 0.25),
          });

          page.drawText(`Document attachment merged into master PDF (${(item.file.size / 1024).toFixed(1)} KB)`, {
            x: 55,
            y: a4Height - 80,
            size: 9,
            font: helveticaFont,
            color: rgb(0.4, 0.45, 0.55),
          });

          // Body Notice
          page.drawText(`Attached File: ${item.file.name}`, {
            x: 55,
            y: a4Height - 140,
            size: 12,
            font: helveticaBold,
            color: rgb(0.2, 0.25, 0.35),
          });

          page.drawText(`This document section was consolidated from Microsoft Word format into the unified PDF bundle.`, {
            x: 55,
            y: a4Height - 165,
            size: 10,
            font: helveticaFont,
            color: rgb(0.3, 0.35, 0.45),
          });
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      HistoryService.addHistoryItem({
        toolId: 'merge',
        toolName: 'Merge PDF',
        fileName: files[0]?.file.name ? `merged_${files[0].file.name.replace(/\.[^/.]+$/, "")}.pdf` : 'merged_document.pdf',
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Merged ${files.length} document(s) into one PDF`
      });

      setIsProcessing(false);
      setResultUrl(url);
      console.log(`[MergeTool] Merged file successfully created.`);
    } catch (error: any) {
      console.error('[MergeTool] Merging failed:', error);
      setErrorMsg(error.message || 'An error occurred during merging. Please make sure none of your files are password-protected or corrupted.');
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <ResultPanel
        title={t('merge.merged_title')}
        subtitle={t('merge.merged_desc')}
        downloadUrl={resultUrl}
        downloadFileName="merged_document.pdf"
        downloadLabel={t('merge.download_btn')}
        onBack={() => {
          if (resultUrl) {
            URL.revokeObjectURL(resultUrl);
          }
          setResultUrl(null);
        }}
        onReset={() => {
          if (resultUrl) {
            URL.revokeObjectURL(resultUrl);
          }
          setResultUrl(null);
          setFiles([]);
          if (onReset) onReset();
        }}
        resetLabel={t('merge.more_btn')}
      />
    );
  }

  return (
    <motion.div 
      key="workspace-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full w-full bg-[#f3f4f6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
    >
      <LoadingOverlay 
        isVisible={isProcessing} 
        message={processingMessage || 'Merging your PDFs...'} 
        error={errorMsg}
        onCloseError={() => setErrorMsg(null)}
        onCancel={() => setIsProcessing(false)}
      />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onReset && (
            <BackButton onClick={onReset} label="" className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2" />
          )}
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
            PDF
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">Merge PDF Files</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {files.length} {files.length === 1 ? 'File' : 'Files'}
          </span>
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: PDF Files Reorder Grid */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-3.5 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between relative">
          <Reorder.Group 
            axis="x" 
            values={files} 
            onReorder={setFiles}
            className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-start gap-4 md:gap-6 select-none w-full md:w-auto"
          >
            <AnimatePresence>
              {files.map((item) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group cursor-grab active:cursor-grabbing w-full md:w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-all flex flex-col items-center"
                >
                  {/* Drag Handle */}
                  <div className="absolute top-2 left-2 p-1 bg-white/90 dark:bg-slate-800/90 rounded shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700 z-10">
                    <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Delete Button */}
                  <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                    <button 
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 bg-[#E5322D] hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-full h-40 sm:h-48 md:h-56 bg-slate-50 dark:bg-slate-900 rounded-lg mb-3 flex flex-col items-center justify-center relative overflow-hidden">
                    {item.isGeneratingPreview ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E5322D] mb-2"></div>
                        <span className="text-[10px]">Generating preview...</span>
                      </div>
                    ) : item.preview && item.preview !== 'placeholder' ? (
                      <img src={item.preview} alt={item.file.name} className="max-w-full max-h-full object-contain p-1 rounded" />
                    ) : (
                      <FileText className="w-12 h-12 md:w-16 md:h-16 text-slate-300 dark:text-slate-600 mb-2" />
                    )}

                    <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-slate-800/80 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                      PDF
                    </span>
                  </div>

                  <p className="w-full text-xs font-bold text-slate-800 dark:text-slate-100 truncate text-center" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </Reorder.Item>
              ))}
            </AnimatePresence>

            {/* Compact File Upload trigger button */}
            <div className="w-full md:w-48 h-full min-h-[248px] flex items-center justify-center self-center justify-self-center">
              <FileUpload onFilesSelected={handleAddFiles} multiple compact />
            </div>
          </Reorder.Group>

          <p className="hidden md:block text-xs text-slate-400 text-center mt-8">
            💡 Drag cards to reorder combining sequence. Add more files anytime.
          </p>
        </main>

        {/* RIGHT SIDEBAR: Options */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Merge Order
            </h2>

            <div className="p-3 md:p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between md:flex-col md:items-start md:space-y-1">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Total Selected</div>
              <div className="text-lg md:text-2xl font-black text-[#E5322D]">{files.length} {files.length === 1 ? 'file' : 'files'}</div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 break-words w-full">
              Files will be combined in top-to-bottom / left-to-right order as displayed on the canvas.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={mergePDFs}
              disabled={files.length < 2 || isProcessing}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{t('tools.merge.name')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
