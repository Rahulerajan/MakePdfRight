import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument, degrees } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  RotateCw,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';

interface RotateToolProps {
  file: File;
  onReset?: () => void;
}

interface PageRotation {
  index: number;
  rotation: number;
  url: string | null;
}

const rotateThumbnailCache = new Map<string, string>();

export const RotateTool: React.FC<RotateToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [pages, setPages] = useState<PageRotation[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPageCount, setResultPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const cleanupResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupResultUrl();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadPages = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (!isMounted) return;

        const initialPages: PageRotation[] = [];
        const cacheBaseKey = `${file.name}-${file.size}`;
        let allCached = true;

        for (let i = 1; i <= totalPages; i++) {
          const cachedUrl = rotateThumbnailCache.get(`${cacheBaseKey}-${i - 1}`);
          if (!cachedUrl) {
            allCached = false;
          }
          initialPages.push({
            index: i - 1,
            rotation: 0,
            url: cachedUrl || null
          });
        }
        setPages(initialPages);

        if (allCached) {
          return;
        }

        // Render thumbnails sequentially in background
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIndex = i - 1;
          const cacheKey = `${cacheBaseKey}-${pageIndex}`;

          if (rotateThumbnailCache.has(cacheKey)) {
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
            rotateThumbnailCache.set(cacheKey, dataUrl);
            setPages(prev => prev.map(p => p.index === pageIndex ? { ...p, url: dataUrl } : p));
          }
        }
      } catch (error) {
        console.error('Failed to load pages:', error);
      }
    };
    loadPages();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const rotatePage = (index: number) => {
    setPages(prev => prev.map(p => 
      p.index === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p
    ));
  };

  const rotateAll = () => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + 90) % 360 })));
  };

  const saveRotatedPDF = async () => {
    setError(null);
    setIsRotating(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pdfPages = pdfDoc.getPages();

      pages.forEach(p => {
        const page = pdfPages[p.index];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + p.rotation));
      });

      const pdfBytes = await pdfDoc.save();

      // Verify actual output page count
      const verifyPdf = await PDFDocument.load(pdfBytes);
      const actualCount = verifyPdf.getPageCount();

      // Revoke previous blob URL if any
      cleanupResultUrl();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      
      HistoryService.addHistoryItem({
        toolId: 'rotate',
        toolName: 'Rotate PDF',
        fileName: `rotated_${file.name}`,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Rotated pages in document`
      });

      setIsRotating(false);
      setResultPageCount(actualCount);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Rotation failed:', err);
      setError(err.message || 'An error occurred while rotating the PDF pages. Please try again.');
      setIsRotating(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">PDF pages rotated!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your document has been updated and is ready for download.</p>
        </div>

        {resultPageCount !== null && (
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl text-sm font-extrabold shadow-xs">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <span>Verified Output: {resultPageCount} {resultPageCount === 1 ? 'page' : 'pages'} with custom rotations applied</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <a 
            href={resultUrl} 
            download={`rotated_${file.name}`}
            className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 text-base font-extrabold"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </a>
          <button 
            onClick={() => {
              setResultUrl(null);
              if (onReset) onReset();
            }}
            className="px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm transition-colors cursor-pointer"
          >
            Rotate Another
          </button>
        </div>
      </div>
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
      <LoadingOverlay isVisible={isProcessing} message="Loading document..." />
      <LoadingOverlay 
        isVisible={isRotating} 
        message="Rotating pages..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-sm">
            PDF
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">Rotate PDF Pages</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </span>
          <button 
            onClick={rotateAll}
            className="flex items-center gap-1.5 text-xs font-bold text-[#E5322D] hover:text-red-700 bg-red-50 dark:bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotate All
          </button>
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: Interactive Thumbnail Grid */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-6 md:p-8 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {pages.map((page) => (
              <div key={page.index} className="group relative">
                <div 
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-sm hover:shadow-md hover:border-[#E5322D] transition-all cursor-pointer flex flex-col items-center"
                  onClick={() => rotatePage(page.index)}
                >
                  <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    {page.url ? (
                      <motion.img 
                        animate={{ rotate: page.rotation }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        src={page.url} 
                        alt={`Page ${page.index + 1}`} 
                        className="max-w-full max-h-full object-contain p-1" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-3 bg-slate-100 dark:bg-slate-900 animate-pulse">
                        <div className="w-10 h-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-[#E5322D]/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow border border-slate-200 dark:border-slate-700">
                        <RotateCw className="w-5 h-5 text-[#E5322D]" />
                      </div>
                    </div>
                  </div>
                  <p className="text-center mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">Page {page.index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Controls */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Rotation Controls
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={rotateAll}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#E5322D] bg-white dark:bg-slate-800 flex items-center gap-3 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-[#E5322D] shrink-0">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Rotate All Pages</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Turn all document pages 90° clockwise</p>
                </div>
              </button>
            </div>

            <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              💡 Click any individual page thumbnail on the left to rotate only that page.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={saveRotatedPDF}
              disabled={isRotating || isProcessing}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Rotate PDF
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
