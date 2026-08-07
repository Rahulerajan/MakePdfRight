import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Scissors,
  CheckSquare,
  Square,
  ArrowRight,
  Info,
  ShieldCheck,
  ArrowLeft,
  RotateCcw,
  Check,
  Settings,
  X
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface SplitToolProps {
  file: File;
  onReset?: () => void;
}

const splitThumbnailCache = new Map<string, string>();

export const SplitTool: React.FC<SplitToolProps> = ({ file, onReset }) => {
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [fromPage, setFromPage] = useState<string>('1');
  const [toPage, setToPage] = useState<string>('');
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPageCount, setResultPageCount] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');
  const [error, setError] = useState<string | null>(null);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const optionsContainerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const resultUrlRef = useRef<string | null>(null);

  const cleanupResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  };

  const handleSplitModeChange = (mode: 'range' | 'all') => {
    setSplitMode(mode);
    if (mode === 'range') {
      setTimeout(() => {
        if (optionsContainerRef.current) {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          optionsContainerRef.current.scrollTo({
            top: optionsContainerRef.current.scrollHeight,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
          });
        }
      }, 50);
    }
  };

  useEffect(() => {
    console.log('[SplitTool] Component mounted');
    return () => {
      console.log('[SplitTool] Component unmounted');
      cleanupResultUrl();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadThumbnails = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (!isMounted) return;

        // Initialize state with null array to show skeleton previews immediately (0ms delay)
        const initialPages = new Array(totalPages).fill(null);
        
        // Populate any cached pages instantly
        const cacheBaseKey = `${file.name}-${file.size}`;
        let allCached = true;
        for (let i = 0; i < totalPages; i++) {
          const cachedUrl = splitThumbnailCache.get(`${cacheBaseKey}-${i}`);
          if (cachedUrl) {
            initialPages[i] = cachedUrl;
          } else {
            allCached = false;
          }
        }
        setPages(initialPages);

        if (!initializedRef.current && totalPages > 0) {
          initializedRef.current = true;
          // Default range to just Page 1 so default state never equals "select whole document"
          setFromPage('1');
          setToPage('1');
          setRangeInput('1');
          setSelectedPages([0]);
        }

        if (allCached) {
          console.log(`[SplitTool] Restored all ${totalPages} thumbnails from cache.`);
          return;
        }

        // Render remaining pages in background asynchronously
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIndex = i - 1;
          const cacheKey = `${cacheBaseKey}-${pageIndex}`;
          
          if (splitThumbnailCache.has(cacheKey)) {
            continue; // Already processed
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
            splitThumbnailCache.set(cacheKey, dataUrl);
            setPages(prev => {
              const updated = [...prev];
              updated[pageIndex] = dataUrl;
              return updated;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
      }
    };
    loadThumbnails();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const togglePage = (index: number) => {
    setSelectedPages(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const updateSelectedPagesFromRangeStr = (val: string) => {
    const indices: number[] = [];
    const parts = val.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            if (i > 0 && i <= pages.length) indices.push(i - 1);
          }
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num > 0 && num <= pages.length) indices.push(num - 1);
      }
    });
    setSelectedPages([...new Set(indices)]);
  };

  const handleFromToChange = (f: string, t: string) => {
    setFromPage(f);
    setToPage(t);
    const fromNum = parseInt(f, 10);
    const toNum = parseInt(t, 10);
    if (!isNaN(fromNum) && !isNaN(toNum) && fromNum > 0 && toNum >= fromNum) {
      const rangeStr = `${fromNum}-${toNum}`;
      setRangeInput(rangeStr);
      updateSelectedPagesFromRangeStr(rangeStr);
    } else if (!isNaN(fromNum) && fromNum > 0) {
      const rangeStr = `${fromNum}`;
      setRangeInput(rangeStr);
      updateSelectedPagesFromRangeStr(rangeStr);
    }
  };

  const handleCustomRangeInput = (val: string) => {
    setRangeInput(val);
    updateSelectedPagesFromRangeStr(val);
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d+)-(\d+)$/);
    if (match) {
      setFromPage(match[1]);
      setToPage(match[2]);
    } else {
      const singleMatch = trimmed.match(/^(\d+)$/);
      if (singleMatch) {
        setFromPage(singleMatch[1]);
        setToPage(singleMatch[1]);
      }
    }
  };

  // Group contiguous page indices into distinct ranges for compact preview
  const getRangesFromSelected = (sortedIndices: number[]) => {
    if (sortedIndices.length === 0) return [];
    const ranges: { start: number; end: number; indices: number[] }[] = [];
    let currentStart = sortedIndices[0];
    let currentPrev = sortedIndices[0];
    let currentIndices = [sortedIndices[0]];

    for (let i = 1; i < sortedIndices.length; i++) {
      const idx = sortedIndices[i];
      if (idx === currentPrev + 1) {
        currentPrev = idx;
        currentIndices.push(idx);
      } else {
        ranges.push({ start: currentStart, end: currentPrev, indices: currentIndices });
        currentStart = idx;
        currentPrev = idx;
        currentIndices = [idx];
      }
    }
    ranges.push({ start: currentStart, end: currentPrev, indices: currentIndices });
    return ranges;
  };

  const splitPDF = async () => {
    const pagesToExtract = splitMode === 'all' ? pages.map((_, i) => i) : selectedPages;
    if (pagesToExtract.length === 0) return;

    setError(null);
    setIsExporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(originalPdf, pagesToExtract.sort((a, b) => a - b));
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();

      // Confirm output page count directly on generated document
      const verifyPdf = await PDFDocument.load(pdfBytes);
      const actualCount = verifyPdf.getPageCount();

      // Revoke previous blob URL if any
      cleanupResultUrl();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      
      HistoryService.addHistoryItem({
        toolId: 'split',
        toolName: 'Split PDF',
        fileName: `split_${file.name}`,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Extracted ${actualCount} page(s) from document`
      });

      setIsExporting(false);
      setResultPageCount(actualCount);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Splitting failed:', err);
      setError(err.message || 'An error occurred while splitting the PDF. Please try again.');
      setIsExporting(false);
    }
  };

  const renderSplitOptionsContent = () => (
    <div className="space-y-4 sm:space-y-5">
      <h2 className="hidden md:block text-xs font-extrabold uppercase tracking-wider text-slate-400">
        Split Options
      </h2>

      {/* Single-line equal-height option buttons */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
        <button
          type="button"
          onClick={() => handleSplitModeChange('range')}
          className={`w-full py-3 px-3.5 rounded-xl border font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
            splitMode === 'range' 
              ? 'border-[#E5322D] bg-red-50/40 dark:bg-red-950/30 text-[#E5322D] ring-1 ring-[#E5322D]' 
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <span>Split by Range</span>
          {splitMode === 'range' && (
            <div className="w-4 h-4 bg-[#E5322D] text-white rounded-full flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSplitModeChange('all')}
          className={`w-full py-3 px-3.5 rounded-xl border font-bold text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${
            splitMode === 'all' 
              ? 'border-[#E5322D] bg-red-50/40 dark:bg-red-950/30 text-[#E5322D] ring-1 ring-[#E5322D]' 
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <span>Extract All Pages</span>
          {splitMode === 'all' && (
            <div className="w-4 h-4 bg-[#E5322D] text-white rounded-full flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </button>
      </div>

      {/* Dynamic info callout */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#E5322D] shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          {splitMode === 'range' ? (
            selectedPages.length > 0 ? (
              <span>
                Extracting <strong>{selectedPages.length}</strong> of <strong>{pages.length}</strong> pages into a new PDF document.
              </span>
            ) : (
              <span>
                Enter a page range below (e.g., 1-5) to extract specific pages from this {pages.length}-page PDF.
              </span>
            )
          ) : (
            <span>
              Each of the <strong>{pages.length}</strong> pages in this PDF will be extracted into your new document.
            </span>
          )}
        </div>
      </div>

      {/* From/To page number inputs */}
      {splitMode === 'range' && (
        <motion.div 
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                From Page
              </label>
              <input 
                type="number" 
                min={1}
                max={pages.length || 1}
                value={fromPage}
                onChange={(e) => handleFromToChange(e.target.value, toPage)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:border-[#E5322D] focus:ring-1 focus:ring-[#E5322D] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                To Page
              </label>
              <input 
                type="number" 
                min={1}
                max={pages.length || 1}
                value={toPage}
                onChange={(e) => handleFromToChange(fromPage, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:border-[#E5322D] focus:ring-1 focus:ring-[#E5322D] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Or Custom Range Expression
            </label>
            <input 
              type="text" 
              placeholder={`e.g. 1-${Math.min(pages.length, 3)}, ${Math.min(pages.length, 5)}`}
              value={rangeInput}
              onChange={(e) => handleCustomRangeInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-[#E5322D] focus:ring-1 focus:ring-[#E5322D] outline-none text-xs font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Use commas for non-consecutive pages (e.g. 1-3, 5)
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
        <span>Selected pages to extract:</span>
        <span className="text-sm text-[#E5322D] font-extrabold">
          {splitMode === 'all' ? pages.length : selectedPages.length}
        </span>
      </div>
    </div>
  );

  if (resultUrl) {
    return (
      <ResultPanel
        title="PDF has been split!"
        subtitle="Your extracted pages are ready for download."
        details={
          resultPageCount !== null
            ? [
                {
                  label: `Verified Output: ${resultPageCount} ${
                    resultPageCount === 1 ? 'page' : 'pages'
                  } extracted`,
                },
              ]
            : undefined
        }
        downloadUrl={resultUrl}
        downloadFileName={`split_${file.name}`}
        downloadLabel="Download Split PDF"
        onBack={() => setResultUrl(null)}
        backLabel="Back to Page Selection"
        onReset={() => {
          setResultUrl(null);
          if (onReset) onReset();
        }}
        resetLabel="Split another PDF"
      />
    );
  }

  const sortedSelectedPages = [...selectedPages].sort((a, b) => a - b);
  const activeRanges = getRangesFromSelected(sortedSelectedPages);

  return (
    <motion.div 
      key="workspace-view"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full w-full bg-[#f3f4f6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
    >
      <LoadingOverlay isVisible={isProcessing} message="Loading document pages..." onCancel={() => setIsProcessing(false)} />
      <LoadingOverlay 
        isVisible={isExporting} 
        message="Extracting & splitting pages..." 
        error={error}
        onCloseError={() => setError(null)}
        onCancel={() => setIsExporting(false)}
      />

      {/* 1. TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onReset && (
            <BackButton onClick={onReset} label="" className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2" />
          )}
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-base sm:text-lg tracking-wider shadow-sm">
            PDF
          </div>
          <span className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">Split PDF</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} total
          </span>
        </div>
      </header>

      {/* 2. MAIN SPLIT WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: Page Grid / Range Preview */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between relative">
          
          {/* Mobile Floating Settings Icon Button (Top Right of Canvas) */}
          <button
            onClick={() => setIsMobileOptionsOpen(true)}
            className="md:hidden absolute top-3.5 right-3.5 z-20 bg-[#E5322D] text-white w-11 h-11 rounded-full shadow-lg hover:bg-[#c92824] active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-white/20"
            aria-label="Split Options"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="space-y-6 pt-14 md:pt-0">
            {splitMode === 'all' ? (
              /* Extract All Pages Mode: Full Grid */
              <>
                <div className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 p-3 px-4 rounded-xl backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Extract All Pages Mode
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedPages(pages.map((_, i) => i))}
                      className="text-xs font-bold text-[#E5322D] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <button 
                      onClick={() => setSelectedPages([])}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-start gap-3 sm:gap-4 md:gap-6">
                  {pages.map((url, index) => {
                    const isSelected = selectedPages.includes(index);
                    return (
                      <motion.div 
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => togglePage(index)}
                        className={`relative group w-full md:w-44 bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 cursor-pointer transition-all border shadow-sm ${
                          isSelected 
                            ? 'border-[#E5322D] ring-2 ring-[#E5322D] bg-red-50/20 dark:bg-red-950/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="w-full h-44 sm:h-56 bg-slate-50 dark:bg-slate-900 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                          {url ? (
                            <img src={url} alt={`Page ${index + 1}`} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center space-y-2 animate-pulse">
                              <div className="w-10 h-14 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                          )}

                          <div className="absolute top-2 right-2">
                            {isSelected ? (
                              <div className="w-6 h-6 bg-[#E5322D] rounded-md flex items-center justify-center shadow-md">
                                <CheckSquare className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-white/80 dark:bg-slate-800/80 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-300 dark:border-slate-600">
                                <Square className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
                          Page {index + 1}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Split by Range Mode: Compact Range Preview */
              <>
                <div className="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 p-3 px-4 rounded-xl backdrop-blur-xs border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[#E5322D]" />
                    Page Range Preview
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedPages.length} {selectedPages.length === 1 ? 'page' : 'pages'} selected
                  </span>
                </div>

                {activeRanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md mx-auto my-8 space-y-3 shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-[#E5322D] flex items-center justify-center">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No page range selected</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap Options or enter a page range (e.g. 1-{pages.length || 5}) to preview the range.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-2xl mx-auto w-full">
                    {activeRanges.map((range, rangeIdx) => {
                      const firstIndex = range.start;
                      const lastIndex = range.end;
                      const totalInRange = range.indices.length;
                      const firstUrl = pages[firstIndex];
                      const lastUrl = pages[lastIndex];

                      return (
                        <div 
                          key={rangeIdx}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3"
                        >
                          {/* Range Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-[#E5322D]">
                                Range {rangeIdx + 1}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Page {firstIndex + 1} to Page {lastIndex + 1}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[#E5322D] bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-full border border-red-200/60 dark:border-red-900/40">
                              {totalInRange} {totalInRange === 1 ? 'page' : 'pages'}
                            </span>
                          </div>

                          {/* Compact Thumbnail Row */}
                          <div className="flex items-center justify-center gap-2 sm:gap-6 py-2">
                            {/* First Page Card */}
                            <div className="flex flex-col items-center">
                              <div className="w-24 sm:w-36 h-32 sm:h-48 bg-slate-50 dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center relative overflow-hidden">
                                {firstUrl ? (
                                  <img src={firstUrl} alt={`Page ${firstIndex + 1}`} className="max-w-full max-h-full object-contain" />
                                ) : (
                                  <div className="w-10 h-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                                Page {firstIndex + 1}
                              </span>
                            </div>

                            {/* Ellipsis / Intermediate pages indicator */}
                            {totalInRange > 2 && (
                              <div className="flex flex-col items-center justify-center px-1 sm:px-3">
                                <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600 font-black text-xl sm:text-2xl tracking-widest my-1">
                                  <span>•</span>
                                  <span>•</span>
                                  <span>•</span>
                                </div>
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                                  +{totalInRange - 2} pages
                                </span>
                              </div>
                            )}

                            {/* Last Page Card (if totalInRange >= 2) */}
                            {totalInRange >= 2 && (
                              <div className="flex flex-col items-center">
                                <div className="w-24 sm:w-36 h-32 sm:h-48 bg-slate-50 dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center relative overflow-hidden">
                                  {lastUrl ? (
                                    <img src={lastUrl} alt={`Page ${lastIndex + 1}`} className="max-w-full max-h-full object-contain" />
                                  ) : (
                                    <div className="w-10 h-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                                  Page {lastIndex + 1}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <p className="hidden md:block text-xs text-slate-400 text-center mt-8">
            Click pages to toggle selection or enter page ranges in the sidebar.
          </p>
        </main>

        {/* DESKTOP RIGHT SIDEBAR: Options & Controls */}
        <aside className="hidden md:flex w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex-col justify-between shrink-0 h-full min-h-0 z-20">
          <div ref={optionsContainerRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {renderSplitOptionsContent()}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
            <button
              onClick={splitPDF}
              disabled={(splitMode === 'range' && selectedPages.length === 0) || isExporting || isProcessing}
              className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all text-base tracking-wide cursor-pointer"
            >
              Split PDF
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Auto-deleted shortly after processing</span>
            </div>
          </div>
        </aside>

        {/* MOBILE PINNED BOTTOM ACTION BAR */}
        <div className="md:hidden shrink-0 p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30 space-y-1.5 shadow-lg">
          <button
            onClick={splitPDF}
            disabled={(splitMode === 'range' && selectedPages.length === 0) || isExporting || isProcessing}
            className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer"
          >
            Split PDF
            <ArrowRight className="w-4 h-4" />
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
                className="fixed bottom-0 inset-x-0 max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl z-50 overflow-y-auto p-5 pb-6 space-y-4 md:hidden border-t border-slate-200 dark:border-slate-700 flex flex-col"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                    <Settings className="w-5 h-5 text-[#E5322D]" />
                    <span>Split Options</span>
                  </div>
                  <button
                    onClick={() => setIsMobileOptionsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    aria-label="Close options"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pt-1">
                  {renderSplitOptionsContent()}
                </div>

                <button
                  onClick={() => setIsMobileOptionsOpen(false)}
                  className="w-full bg-[#E5322D] text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors mt-2 cursor-pointer shadow-md"
                >
                  Apply & Close Options
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
