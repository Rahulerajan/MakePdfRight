import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Layers,
  Archive,
  Check,
  Settings,
  X
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface PDFToJPGToolProps {
  file: File;
  onReset?: () => void;
}

const jpgThumbnailCache = new Map<string, string>();

export const PDFToJPGTool: React.FC<PDFToJPGToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; count: number } | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<{ url: string; count: number } | null>(null);

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

  useEffect(() => {
    let isMounted = true;
    const loadPreviews = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (!isMounted) return;

        const initialPages: (string | null)[] = [];
        const cacheBaseKey = `${file.name}-${file.size}`;
        let allCached = true;

        for (let i = 0; i < totalPages; i++) {
          const cachedUrl = jpgThumbnailCache.get(`${cacheBaseKey}-jpg-${i}`);
          if (!cachedUrl) {
            allCached = false;
          }
          initialPages.push(cachedUrl || null);
        }
        setPages(initialPages);
        setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i)));

        if (allCached) {
          return;
        }

        // Load preview thumbnails sequentially in background
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIndex = i - 1;
          const cacheKey = `${cacheBaseKey}-jpg-${pageIndex}`;

          if (jpgThumbnailCache.has(cacheKey)) {
            continue;
          }

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          const dataUrl = canvas.toDataURL();

          if (isMounted) {
            jpgThumbnailCache.set(cacheKey, dataUrl);
            setPages(prev => {
              const updated = [...prev];
              updated[pageIndex] = dataUrl;
              return updated;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load previews:', error);
      }
    };
    loadPreviews();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const togglePageSelection = (index: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPages(new Set(pages.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedPages(new Set());
  };

  const convertToJPG = async () => {
    if (selectedPages.size === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const zip = new JSZip();

      let convertedCount = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        const pageIndex = i - 1;
        if (!selectedPages.has(pageIndex)) {
          continue;
        }

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
        
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.split(',')[1];
        zip.file(`page-${i}.jpg`, base64Data, { base64: true });
        convertedCount++;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      HistoryService.addHistoryItem({
        toolId: 'pdf-to-jpg',
        toolName: 'PDF to JPG',
        fileName: `${file.name.replace('.pdf', '')}_images.zip`,
        outputSize: content.size,
        resultUrl: url,
        status: 'completed',
        details: `Converted ${convertedCount} page(s) to JPG images (ZIP archive)`
      });

      setIsProcessing(false);
      setResult({ url, count: convertedCount });
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the PDF to JPG. Please try again.');
      setIsProcessing(false);
    }
  };

  const isConvertDisabled = isProcessing || isLoadingPreviews || selectedPages.size === 0;

  if (result) {
    return (
      <ResultPanel
        title="PDF converted to JPG!"
        subtitle={`${result.count} ${result.count === 1 ? 'image is' : 'images are'} ready for download in a ZIP file.`}
        downloadUrl={result.url}
        downloadFileName={`${file.name.replace('.pdf', '')}_images.zip`}
        downloadLabel="Download ZIP file"
        onReset={() => {
          if (result?.url) {
            URL.revokeObjectURL(result.url);
          }
          setResult(null);
          if (onReset) onReset();
        }}
        resetLabel="Convert Another PDF"
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
        message="Converting pages to JPG..." 
        error={error}
        onCloseError={() => setError(null)}
      />
      <LoadingOverlay isVisible={isLoadingPreviews} message="Loading document..." />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onReset && (
            <BackButton onClick={onReset} label="" className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2" />
          )}
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
            PDF
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">PDF to JPG</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </span>
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: Page Previews */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-4 sm:p-6 md:p-8 overflow-y-auto relative flex flex-col">
          {/* PAGE SELECTION TOOLBAR ROW */}
          <div className="flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-800/80 p-3.5 px-4 rounded-xl backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {selectedPages.size} of {pages.length} pages selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-[#E5322D] hover:underline cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Deselect all
                </button>
              </div>
            </div>

            {/* Mobile Settings Icon Button */}
            <button
              onClick={() => setIsMobileOptionsOpen(true)}
              className="md:hidden shrink-0 bg-[#E5322D] text-white w-10 h-10 rounded-full shadow-lg hover:bg-[#c92824] active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20"
              aria-label="JPG Options"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {pages.map((url, index) => {
              const isSelected = selectedPages.has(index);
              return (
                <div 
                  key={index} 
                  onClick={() => togglePageSelection(index)}
                  className={`relative group bg-white dark:bg-slate-800 rounded-xl border p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center cursor-pointer select-none ${
                    isSelected 
                      ? 'border-[#E5322D] ring-2 ring-[#E5322D]/20' 
                      : 'border-slate-200 dark:border-slate-700 opacity-60 grayscale-[30%]'
                  }`}
                >
                  {/* Checkbox / Checkmark Toggle Overlay */}
                  <div 
                    className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#E5322D] text-white shadow-sm'
                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 border border-slate-300 dark:border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full" />
                    )}
                  </div>

                  <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    {url ? (
                      <img src={url} alt={`Page ${index + 1}`} className="max-w-full max-h-full object-contain p-1 animate-fadeIn" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-3 bg-slate-100 dark:bg-slate-900 animate-pulse">
                        <div className="w-10 h-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    )}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 rounded-lg" />
                    )}
                  </div>
                  <p className={`text-center mt-2 text-[11px] font-bold ${isSelected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    Page {index + 1}
                  </p>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Options (Desktop Only) */}
        <aside className="hidden md:flex w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex-col justify-between shrink-0 h-full min-h-0 z-20">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              JPG Quality
            </h2>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Image Quality</span>
                <span className="text-[#E5322D] font-extrabold">{Math.round(quality * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#E5322D]"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              ⚡ Selected pages will be extracted as individual JPG image files and bundled into a downloadable ZIP archive.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={convertToJPG}
              disabled={isConvertDisabled}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {selectedPages.size > 0 
                ? `Convert to JPG (${selectedPages.size} of ${pages.length} pages)`
                : 'Convert to JPG'}
              <ArrowRight className="w-5 h-5" />
            </button>
            {selectedPages.size === 0 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 text-center mt-2">
                Select at least one page
              </p>
            )}
          </div>
        </aside>

        {/* MOBILE PINNED BOTTOM ACTION BAR */}
        <div className="md:hidden shrink-0 p-3.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30 space-y-1.5 shadow-lg">
          <button
            onClick={convertToJPG}
            disabled={isConvertDisabled}
            className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer"
          >
            {isProcessing ? (
              <span className="animate-pulse">Converting to JPG...</span>
            ) : (
              <>
                {selectedPages.size > 0 
                  ? `Convert to JPG (${selectedPages.size} of ${pages.length} pages)`
                  : 'Convert to JPG'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          {selectedPages.size === 0 && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 text-center">
              Select at least one page
            </p>
          )}
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
                    <span>JPG Quality</span>
                  </div>
                  <button
                    onClick={() => setIsMobileOptionsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    aria-label="Close options"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pt-1 space-y-4">
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                      <span>Image Quality</span>
                      <span className="text-[#E5322D] font-extrabold">{Math.round(quality * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1" 
                      step="0.1"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#E5322D]"
                    />
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    ⚡ Selected pages will be extracted as individual JPG image files and bundled into a downloadable ZIP archive.
                  </p>
                </div>

                <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setIsMobileOptionsOpen(false);
                      convertToJPG();
                    }}
                    disabled={isConvertDisabled}
                    className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer"
                  >
                    {isProcessing ? (
                      <span className="animate-pulse">Converting to JPG...</span>
                    ) : (
                      <>
                        {selectedPages.size > 0 
                          ? `Convert to JPG (${selectedPages.size} of ${pages.length} pages)`
                          : 'Convert to JPG'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  {selectedPages.size === 0 && (
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 text-center mt-2">
                      Select at least one page
                    </p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
