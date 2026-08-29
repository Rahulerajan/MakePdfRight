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
  X,
  FileImage,
  ExternalLink,
  RotateCw
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';

interface PDFToJPGToolProps {
  file: File;
  onReset?: () => void;
}

interface ConvertedImage {
  pageNum: number;
  url: string;
  blob: Blob;
  size: number;
  fileName: string;
  dataUrl: string;
}

interface ResultState {
  images: ConvertedImage[];
  zipUrl: string;
  zipSize: number;
  zipFileName: string;
  count: number;
}

const jpgThumbnailCache = new Map<string, string>();

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const PDFToJPGTool: React.FC<PDFToJPGToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [quality, setQuality] = useState(0.85);
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingIndividual, setIsDownloadingIndividual] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  const resultRef = useRef<ResultState | null>(null);

  const cleanupResultUrls = (res: ResultState | null) => {
    if (!res) return;
    if (res.zipUrl) {
      try { URL.revokeObjectURL(res.zipUrl); } catch (_) {}
    }
    res.images.forEach(img => {
      if (img.url) {
        try { URL.revokeObjectURL(img.url); } catch (_) {}
      }
    });
  };

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    return () => {
      cleanupResultUrls(resultRef.current);
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
      const convertedImages: ConvertedImage[] = [];

      const baseName = file.name.replace(/\.[^/.]+$/, '');

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
        
        const imageFileName = `${baseName}_page_${i}.jpg`;
        zip.file(imageFileName, base64Data, { base64: true });

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error(`Failed to render page ${i} to JPG`));
          }, 'image/jpeg', quality);
        });

        const imageUrl = URL.createObjectURL(blob);

        convertedImages.push({
          pageNum: i,
          url: imageUrl,
          blob,
          size: blob.size,
          fileName: imageFileName,
          dataUrl
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipFileName = `${baseName}_images.zip`;
      
      HistoryService.addHistoryItem({
        toolId: 'pdf-to-jpg',
        toolName: 'PDF to JPG',
        fileName: zipFileName,
        outputSize: zipBlob.size,
        resultUrl: zipUrl,
        status: 'completed',
        details: `Converted ${convertedImages.length} page(s) to JPG images`
      });

      // Cleanup any previous result URLs
      cleanupResultUrls(resultRef.current);

      setIsProcessing(false);
      setResult({
        images: convertedImages,
        zipUrl,
        zipSize: zipBlob.size,
        zipFileName,
        count: convertedImages.length
      });
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the PDF to JPG. Please try again.');
      setIsProcessing(false);
    }
  };

  const downloadAllIndividualJPGs = async () => {
    if (!result || isDownloadingIndividual) return;
    setIsDownloadingIndividual(true);
    setDownloadProgress({ current: 0, total: result.images.length });

    try {
      for (let i = 0; i < result.images.length; i++) {
        const img = result.images[i];
        const a = document.createElement('a');
        a.href = img.url;
        a.download = img.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress({ current: i + 1, total: result.images.length });

        // Stagger individual downloads slightly so the browser handles them reliably
        if (i < result.images.length - 1) {
          await new Promise(res => setTimeout(res, 250));
        }
      }
    } catch (e) {
      console.error('Error downloading individual JPGs:', e);
    } finally {
      setTimeout(() => {
        setIsDownloadingIndividual(false);
        setDownloadProgress(null);
      }, 500);
    }
  };

  const downloadSingleJPG = (img: ConvertedImage) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = img.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadZip = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.zipUrl;
    a.download = result.zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    cleanupResultUrls(result);
    setResult(null);
    if (onReset) onReset();
  };

  const handleBackToEditor = () => {
    cleanupResultUrls(result);
    setResult(null);
  };

  const isConvertDisabled = isProcessing || isLoadingPreviews || selectedPages.size === 0;

  if (result) {
    return (
      <motion.div 
        key="result-view"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-8 flex flex-col items-center overflow-y-auto"
      >
        {/* Top Header Navigation */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <BackButton onClick={handleBackToEditor} label="Back to Pages" />
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conversion Complete
          </span>
        </div>

        <div className="w-full max-w-4xl flex flex-col items-center space-y-6 py-6 sm:py-8">
          {/* Success Badge */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          {/* Heading */}
          <div className="text-center space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              PDF Converted to JPG!
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
              {result.count} {result.count === 1 ? 'image is' : 'images are'} ready. Choose whether to download individual JPG image files directly or as a single ZIP archive.
            </p>
          </div>

          {/* DUAL DOWNLOAD OPTIONS CARDS */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* OPTION 1: Direct JPG Images */}
            <div className="bg-gradient-to-b from-red-50/50 to-white dark:from-red-950/20 dark:to-slate-800/80 rounded-2xl border-2 border-[#E5322D] p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#E5322D]/10 dark:bg-[#E5322D]/20 text-[#E5322D] flex items-center justify-center">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E5322D] bg-[#E5322D]/10 px-2.5 py-1 rounded-full">
                    Direct JPGs
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Direct JPG Files
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Download {result.count === 1 ? 'the JPG image directly' : `all ${result.count} selected pages as separate individual JPG image files without archiving`}.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadAllIndividualJPGs}
                disabled={isDownloadingIndividual}
                className="w-full bg-[#E5322D] hover:bg-[#c92824] active:scale-[0.98] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all text-sm tracking-wide cursor-pointer"
              >
                {isDownloadingIndividual ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>
                      {downloadProgress 
                        ? `Downloading ${downloadProgress.current} of ${downloadProgress.total}...` 
                        : 'Starting downloads...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0" />
                    <span>
                      {result.count === 1 
                        ? 'Download JPG Image' 
                        : `Download All JPGs (${result.count} files)`}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* OPTION 2: ZIP Archive */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                    <Archive className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
                    Bundled ZIP
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    ZIP Archive
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Download all {result.count} {result.count === 1 ? 'image' : 'images'} bundled together into a single compressed ZIP archive ({formatFileSize(result.zipSize)}).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadZip}
                className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm tracking-wide cursor-pointer"
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span>Download as ZIP ({formatFileSize(result.zipSize)})</span>
              </button>
            </div>
          </div>

          {/* INDIVIDUAL IMAGES GRID & DIRECT DOWNLOAD */}
          <div className="w-full space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#E5322D]" />
                <span>Individual Image Previews ({result.count})</span>
              </h3>
              <span className="text-xs text-slate-400">
                Click any page to download individually
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.images.map((img) => (
                <div
                  key={img.pageNum}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-[#E5322D]/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-14 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNum}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        Page {img.pageNum}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {formatFileSize(img.size)} • JPG
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadSingleJPG(img)}
                    className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-[#E5322D] text-slate-700 hover:text-white dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-[#E5322D] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title={`Download Page ${img.pageNum} as JPG`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JPG</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reset / Bottom CTA */}
          <div className="w-full max-w-md pt-4 flex flex-col items-center space-y-3">
            <button
              type="button"
              onClick={handleReset}
              className="py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors cursor-pointer w-full text-center"
            >
              Convert Another PDF
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Converted in-browser for complete privacy and instant download</span>
            </div>
          </div>
        </div>
      </motion.div>
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
        message="Converting pages to JPG images..." 
        error={error}
        onCloseError={() => setError(null)}
        onCancel={() => setIsProcessing(false)}
      />
      <LoadingOverlay isVisible={isLoadingPreviews} message="Loading document..." onCancel={() => setIsLoadingPreviews(false)} />

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
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#E5322D]"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              ⚡ Selected pages will be rendered in high resolution (300 DPI equivalent) and made available as direct JPG downloads or a single ZIP file.
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
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#E5322D]"
                    />
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    ⚡ Selected pages will be rendered in high resolution (300 DPI equivalent) and made available as direct JPG downloads or a single ZIP file.
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

