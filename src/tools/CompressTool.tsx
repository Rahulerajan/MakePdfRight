import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument } from 'pdf-lib';
import { 
  FileText, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  AlertTriangle,
  ShieldCheck,
  Settings,
  X,
  ChevronDown
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useLanguage } from '../components/LanguageContext';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface CompressToolProps {
  file?: File;
  initialFiles?: File[];
  onReset?: () => void;
}

type CompressionLevel = 'extreme' | 'recommended' | 'less';

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number | null;
  previewUrl: string | null;
  previewLoading: boolean;
  error?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
  const commaIdx = dataUrl.indexOf(',');
  const bstr = atob(commaIdx >= 0 ? dataUrl.substring(commaIdx + 1) : dataUrl);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
};

const loadFileDetails = async (f: File): Promise<FileItem> => {
  const item: FileItem = {
    id: Math.random().toString(36).substring(2, 9),
    file: f,
    name: f.name,
    size: f.size,
    pages: null,
    previewUrl: null,
    previewLoading: true,
  };

  try {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File is not a PDF document.');
    }
    const arrayBuffer = await f.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    item.pages = pdf.numPages;

    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport,
          canvas: canvas as any
        }).promise;
        item.previewUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } catch (err: any) {
    console.error('Error loading PDF preview:', err);
    item.error = err.message || 'Failed to load PDF preview';
  } finally {
    item.previewLoading = false;
  }
  return item;
};

export const CompressTool: React.FC<CompressToolProps> = ({ file, initialFiles, onReset }) => {
  const { t } = useLanguage();
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualProgress, setManualProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  const [result, setResult] = useState<{
    url: string;
    size: number;
    originalSize: number;
    savedSize: number;
    percentage: number;
    totalPages: number;
    timeSeconds: string;
    optimizationSummary?: string;
  } | null>(null);

  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<typeof result>(null);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    return () => {
      if (resultRef.current?.url) {
        URL.revokeObjectURL(resultRef.current.url);
      }
    };
  }, []);

  const handleLevelChange = (newLevel: CompressionLevel) => {
    setLevel(newLevel);
  };

  const renderCompressionOptionsContent = () => (
    <div className="space-y-4">
      <h2 className="hidden md:block text-xs font-extrabold uppercase tracking-wider text-slate-400">
        Compression Level
      </h2>

      <div className="space-y-3">
        {[
          { 
            id: 'extreme', 
            title: 'Extreme Compression', 
            desc: 'Less quality, high compression' 
          },
          { 
            id: 'recommended', 
            title: 'Recommended Compression', 
            desc: 'Good quality, good compression' 
          },
          { 
            id: 'less', 
            title: 'Less Compression', 
            desc: 'High quality, less compression' 
          }
        ].map((option) => {
          const active = level === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleLevelChange(option.id as CompressionLevel)}
              className={`w-full text-left p-4 rounded-xl border transition-all relative flex items-start justify-between cursor-pointer ${
                active 
                  ? 'border-[#E5322D] bg-red-50/40 dark:bg-red-950/30 ring-1 ring-[#E5322D]' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${active ? 'text-[#E5322D]' : 'text-slate-800 dark:text-slate-100'}`}>
                  {option.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {option.desc}
                </p>
              </div>
              {active && (
                <div className="w-5 h-5 bg-[#E5322D] text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  useEffect(() => {
    const incoming: File[] = initialFiles && initialFiles.length > 0 
      ? initialFiles 
      : (file ? [file] : []);

    if (incoming.length === 0) return;

    let active = true;
    
    const loadAll = async () => {
      const loaded = await Promise.all(incoming.map((f: File) => loadFileDetails(f)));
      if (active) {
        setFileItems(loaded);
      }
    };

    loadAll();

    return () => { active = false; };
  }, [file, initialFiles]);

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFileList: File[] = Array.from(e.target.files);
    const loaded = await Promise.all(newFileList.map((f: File) => loadFileDetails(f)));
    setFileItems(prev => [...prev, ...loaded]);
    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setFileItems(prev => {
      const next = prev.filter(item => item.id !== id);
      if (next.length === 0 && onReset) {
        onReset();
      }
      return next;
    });
  };

  const cancelCompression = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setManualProgress(undefined);
  };

  const compressAllPDFs = async () => {
    if (fileItems.length === 0) return;
    setError(null);
    setIsProcessing(true);
    isCancelledRef.current = false;
    setManualProgress(10);
    const startTime = performance.now();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Try Server-Side High-Efficiency Sharp Image Compression Endpoint first
      const validItems = fileItems.filter(i => !i.error);
      if (validItems.length === 0) {
        throw new Error('No valid PDF files selected.');
      }

      let pdfToProcess: Uint8Array;
      if (validItems.length === 1) {
        pdfToProcess = new Uint8Array(await validItems[0].file.arrayBuffer());
      } else {
        // Merge multiple files before sending to server compression service
        const mergedDoc = await PDFDocument.create();
        for (const item of validItems) {
          if (isCancelledRef.current) return;
          const docBytes = await item.file.arrayBuffer();
          const doc = await PDFDocument.load(docBytes, { ignoreEncryption: true });
          const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach(p => mergedDoc.addPage(p));
        }
        pdfToProcess = await mergedDoc.save();
      }

      if (isCancelledRef.current) return;

      // Convert PDF to Base64
      let binaryStr = '';
      const len = pdfToProcess.byteLength;
      for (let i = 0; i < len; i++) {
        binaryStr += String.fromCharCode(pdfToProcess[i]);
      }
      const pdfBase64 = btoa(binaryStr);

      setManualProgress(30);

      // Call server endpoint
      const response = await fetch('/api/pdf-tools?action=compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          pdfBase64,
          level
        })
      });

      if (isCancelledRef.current) return;

      if (response.ok) {
        const data = await response.json();
        if (isCancelledRef.current) return;
        if (data.success && data.pdfBase64) {
          setManualProgress(100);
          const endTime = performance.now();
          const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

          HistoryService.addHistoryItem({
            toolId: 'compress',
            toolName: 'Compress PDF',
            fileName: fileItems[0]?.file.name ? `compressed_${fileItems[0].file.name}` : 'compressed_document.pdf',
            fileSize: data.originalSize,
            outputSize: data.compressedSize,
            resultUrl: data.pdfBase64,
            status: 'completed',
            details: `Reduced size by ${data.percentage}% (${((data.spaceSaved || 0) / (1024 * 1024)).toFixed(2)} MB saved)`
          });

          setResult({
            url: data.pdfBase64,
            size: data.compressedSize,
            originalSize: data.originalSize,
            savedSize: data.spaceSaved,
            percentage: data.percentage,
            totalPages: data.pages || 1,
            timeSeconds: data.processingTime || elapsedSeconds,
            optimizationSummary: data.optimizationSummary
          });
          return;
        }
      }

      console.warn('Server compression endpoint returned non-success, falling back to client-side rendering...');

      // 2. Client-Side Canvas Fallback Pipeline
      let scale = 1.5;
      let quality = 0.70;

      if (level === 'extreme') {
        scale = 1.0;
        quality = 0.35;
      } else if (level === 'recommended') {
        scale = 1.5;
        quality = 0.70;
      } else if (level === 'less') {
        scale = 2.0;
        quality = 0.90;
      }

      const newPdfDoc = await PDFDocument.create();

      let totalPagesAcrossAll = 0;
      const parsedPdfs: any[] = [];

      for (const item of fileItems) {
        if (item.error) continue;
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        parsedPdfs.push(pdf);
        totalPagesAcrossAll += pdf.numPages;
      }

      if (totalPagesAcrossAll === 0) {
        throw new Error('No valid pages found across selected PDF files.');
      }

      let processedPages = 0;

      for (const pdf of parsedPdfs) {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (isCancelledRef.current) {
            throw new Error('Compression cancelled by user.');
          }

          const page = await pdf.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const renderViewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(renderViewport.width);
          canvas.height = Math.floor(renderViewport.height);
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            throw new Error(`Failed to create canvas context for page ${pageNum}.`);
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: ctx,
            viewport: renderViewport,
            canvas: canvas as any
          }).promise;

          if (isCancelledRef.current) {
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
            throw new Error('Compression cancelled by user.');
          }

          const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
          const jpegBytes = dataURLToUint8Array(jpegDataUrl);
          const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);

          const newPage = newPdfDoc.addPage([
            unscaledViewport.width,
            unscaledViewport.height
          ]);

          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: unscaledViewport.width,
            height: unscaledViewport.height
          });

          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();

          processedPages++;
          setManualProgress(Math.round((processedPages / totalPagesAcrossAll) * 100));
        }
      }

      if (isCancelledRef.current) {
        throw new Error('Compression cancelled by user.');
      }

      const compressedPdfBytes = await newPdfDoc.save();
      const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
      const compressedUrl = URL.createObjectURL(compressedBlob);

      const endTime = performance.now();
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

      const originalTotalSize = fileItems.reduce((acc, item) => acc + item.size, 0);
      const compressedSize = compressedBlob.size;
      const savedSize = Math.max(0, originalTotalSize - compressedSize);
      const percentage = originalTotalSize > 0 ? Math.round((savedSize / originalTotalSize) * 100) : 0;

      HistoryService.addHistoryItem({
        toolId: 'compress',
        toolName: 'Compress PDF',
        fileName: fileItems[0]?.file.name ? `compressed_${fileItems[0].file.name}` : 'compressed_document.pdf',
        fileSize: originalTotalSize,
        outputSize: compressedSize,
        resultUrl: compressedUrl,
        status: 'completed',
        details: `Compressed client-side by ${percentage}% (${(savedSize / (1024 * 1024)).toFixed(2)} MB saved)`
      });

      setResult({
        url: compressedUrl,
        size: compressedSize,
        originalSize: originalTotalSize,
        savedSize,
        percentage,
        totalPages: totalPagesAcrossAll,
        timeSeconds: elapsedSeconds,
        optimizationSummary: `Client-side canvas rasterization compressed ${totalPagesAcrossAll} page(s) into lightweight JPG page overlays.`
      });

    } catch (err: any) {
      console.error('Compression error:', err);
      if (!isCancelledRef.current) {
        setError(err.message || 'An error occurred while compressing PDF.');
      }
    } finally {
      setIsProcessing(false);
      setManualProgress(undefined);
    }
  };

  return (
    <div className="w-full">
      <LoadingOverlay 
        isVisible={isProcessing} 
        message={t('compress.processing_msg') || 'Compressing PDF pages client-side...'} 
        progress={manualProgress}
        cancelable={true}
        onCancel={cancelCompression}
      />

      <AnimatePresence mode="wait">
        {result ? (
          <ResultPanel
            title="PDF compressed!"
            subtitle={`Your file is now ${result.percentage}% smaller (Saved ${formatFileSize(result.savedSize)}).`}
            details={[
              { label: `Original: ${formatFileSize(result.originalSize)}` },
              { label: `Compressed: ${formatFileSize(result.size)}` },
              { label: `Saved: ${formatFileSize(result.savedSize)}` },
              { label: `Pages: ${result.totalPages}` },
            ]}
            downloadUrl={result.url}
            downloadFileName={
              fileItems.length === 1 ? `compressed_${fileItems[0].name}` : 'compressed_documents.pdf'
            }
            downloadLabel="Download Compressed PDF"
            onBack={() => setResult(null)}
            backLabel="Back to Options"
            onReset={() => {
              if (result?.url) {
                URL.revokeObjectURL(result.url);
              }
              setResult(null);
              setFileItems([]);
              setIsSummaryExpanded(false);
              if (onReset) onReset();
            }}
            resetLabel="Compress another file"
          >
            {result.optimizationSummary && (
              <div className="w-full max-w-sm text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-left">
                <span className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Optimization Summary:
                </span>
                {result.optimizationSummary}
              </div>
            )}
          </ResultPanel>
        ) : (
          <motion.div 
            key="workspace-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col h-full w-full bg-[#f3f4f6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            {/* 1. TOP NAVBAR */}
            <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                {onReset && (
                  <BackButton onClick={onReset} label="" className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2" />
                )}
                <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
                  PDF
                </div>
                <span className="font-bold text-xl text-slate-900 dark:text-white">Compress PDF</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
                  {fileItems.length} {fileItems.length === 1 ? 'file' : 'files'} selected
                </span>
              </div>
            </header>

            {/* Error Banner if any */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-800 p-3 text-center text-xs text-red-600 dark:text-red-400 font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* 2. MAIN SPLIT WORKSPACE */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".pdf" 
                multiple 
                onChange={handleAddFiles} 
                className="hidden" 
              />

              {/* LEFT CANVAS: Document Grid View */}
              <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between relative">
                {/* Mobile Floating Settings Icon Button (Top Right of Canvas) */}
                <button
                  onClick={() => setIsMobileOptionsOpen(true)}
                  className="md:hidden absolute top-3.5 right-3.5 z-20 bg-[#E5322D] text-white w-11 h-11 rounded-full shadow-lg hover:bg-[#c92824] active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20"
                  aria-label="Compression Options"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <div className="pt-2 md:pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-start gap-4 md:gap-6">
                    {fileItems.map((f) => (
                      <motion.div 
                        key={f.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group w-full md:w-48 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 p-3 transition-all flex flex-col items-center"
                      >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                          <button 
                            onClick={() => handleRemoveFile(f.id)}
                            className="p-1.5 bg-[#E5322D] hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-full h-56 bg-slate-50 dark:bg-slate-900 rounded-lg mb-3 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute top-2 left-2 bg-red-100 dark:bg-red-950/60 text-[#E5322D] font-bold text-[10px] px-1.5 py-0.5 rounded">
                            PDF
                          </div>

                          {f.previewLoading ? (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E5322D] mb-2"></div>
                              <span className="text-[10px]">Loading...</span>
                            </div>
                          ) : f.previewUrl ? (
                            <img 
                              src={f.previewUrl} 
                              alt={f.name} 
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-2" />
                          )}

                          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-slate-800/80 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                            {f.pages !== null ? `${f.pages} Pages` : 'PDF'}
                          </span>
                        </div>

                        <p className="w-full text-xs font-bold text-slate-800 dark:text-slate-100 truncate text-center">{f.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(f.size)}</p>
                      </motion.div>
                    ))}

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-full bg-[#E5322D] hover:bg-[#c92824] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95 self-center justify-self-center cursor-pointer"
                      title="Add more PDFs"
                    >
                      <Plus className="w-8 h-8" />
                    </button>
                  </div>
                </div>

                <p className="hidden md:block text-xs text-slate-400 text-center mt-8">
                  Drag and drop additional PDF files to batch compress.
                </p>
              </main>

              {/* DESKTOP RIGHT SIDEBAR: Options & Controls */}
              <aside className="hidden md:flex w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex-col justify-between shrink-0 h-full min-h-0 z-20">
                <div ref={optionsContainerRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                  {renderCompressionOptionsContent()}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    onClick={compressAllPDFs}
                    disabled={isProcessing || fileItems.length === 0}
                    className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-base tracking-wide cursor-pointer"
                  >
                    {isProcessing ? (
                      <span className="animate-pulse">Compressing PDF...</span>
                    ) : (
                      <>
                        Compress PDF <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </aside>

              {/* MOBILE PINNED BOTTOM ACTION BAR */}
              <div className="md:hidden shrink-0 p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30 space-y-1.5 shadow-lg">
                <button
                  onClick={compressAllPDFs}
                  disabled={isProcessing || fileItems.length === 0}
                  className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Compressing PDF...</span>
                  ) : (
                    <>
                      Compress PDF <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Auto-deleted shortly after processing</span>
                </div>
              </div>

              {/* MOBILE SLIDE-IN PANEL OVERLAY */}
              <AnimatePresence>
                {isMobileOptionsOpen && (
                  <>
                    {/* Semi-transparent backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={() => setIsMobileOptionsOpen(false)}
                      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
                    />

                    {/* Slide-Up Bottom Drawer */}
                    <motion.div
                      initial={{ y: '100%', opacity: 0.8 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '100%', opacity: 0.8 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="fixed bottom-0 inset-x-0 max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl z-50 p-5 pb-6 space-y-4 md:hidden border-t border-slate-200 dark:border-slate-700 flex flex-col"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                          <Settings className="w-5 h-5 text-[#E5322D]" />
                          <span>Compression Level</span>
                        </div>
                        <button
                          onClick={() => setIsMobileOptionsOpen(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          aria-label="Close options"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto pt-1">
                        {renderCompressionOptionsContent()}
                      </div>

                      <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          onClick={() => {
                            setIsMobileOptionsOpen(false);
                            compressAllPDFs();
                          }}
                          disabled={isProcessing || fileItems.length === 0}
                          className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer"
                        >
                          {isProcessing ? (
                            <span className="animate-pulse">Compressing PDF...</span>
                          ) : (
                            <>
                              Compress PDF <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
