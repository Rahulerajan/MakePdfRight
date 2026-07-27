import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  GripVertical
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface OrganiseToolProps {
  file: File;
  onReset?: () => void;
}

interface PageItem {
  id: string;
  index: number;
  url: string | null;
}

const organizeThumbnailCache = new Map<string, string>();

export const OrganiseTool: React.FC<OrganiseToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPages = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (!isMounted) return;

        const initialPages: PageItem[] = [];
        const cacheBaseKey = `${file.name}-${file.size}`;
        let allCached = true;

        for (let i = 1; i <= totalPages; i++) {
          const cachedUrl = organizeThumbnailCache.get(`${cacheBaseKey}-${i - 1}`);
          if (!cachedUrl) {
            allCached = false;
          }
          initialPages.push({
            id: `page-${i}-${Math.random()}`,
            index: i - 1,
            url: cachedUrl || null
          });
        }
        setPages(initialPages);

        if (allCached) {
          return;
        }

        // Render thumbnails sequentially in the background
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIndex = i - 1;
          const cacheKey = `${cacheBaseKey}-${pageIndex}`;

          if (organizeThumbnailCache.has(cacheKey)) {
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
            organizeThumbnailCache.set(cacheKey, dataUrl);
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

  const deletePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const saveOrganizedPDF = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      for (const pageItem of pages) {
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageItem.index]);
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setIsSaving(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Organization failed:', err);
      setError(err.message || 'An error occurred while reorganizing the PDF pages. Please try again.');
      setIsSaving(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="h-full w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">PDF organized successfully!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your document has been reordered and is ready for download.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <a 
            href={resultUrl} 
            download={`organized_${file.name}`}
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
            Organize More
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
        isVisible={isSaving} 
        message="Saving changes..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-sm">
            PDF
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">Organize PDF Pages</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </span>
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
        {/* LEFT CANVAS: Page Reordering Canvas */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-6 md:p-8 overflow-y-auto">
          <Reorder.Group 
            axis="y" 
            values={pages} 
            onReorder={setPages}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {pages.map((page) => (
              <Reorder.Item 
                key={page.id} 
                value={page}
                className="group relative cursor-grab active:cursor-grabbing"
              >
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center">
                  <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    {page.url ? (
                      <img src={page.url} alt={`Page`} className="max-w-full max-h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-2 p-3 bg-slate-100 dark:bg-slate-900 animate-pulse">
                        <div className="w-10 h-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    )}
                    
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 p-1 bg-white/90 dark:bg-slate-800/90 rounded shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700 z-10">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {/* Delete Button */}
                    <button 
                      onClick={() => deletePage(page.id)}
                      className="absolute top-2 right-2 p-1 bg-[#E5322D] text-white rounded shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer z-10"
                      title="Delete page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-center mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">Page {page.index + 1}</p>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </main>

        {/* RIGHT SIDEBAR: Options */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Page Order
            </h2>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              ✋ Drag any page card to reorder sequence, or hover and click the trash icon to remove a page.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={saveOrganizedPDF}
              disabled={isSaving || isProcessing || pages.length === 0}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Organize PDF
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
