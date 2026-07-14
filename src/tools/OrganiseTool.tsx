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
  ShieldCheck,
  Zap,
  GripVertical
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface OrganiseToolProps {
  file: File;
}

interface PageItem {
  id: string;
  index: number;
  url: string;
}

export const OrganiseTool: React.FC<OrganiseToolProps> = ({ file }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      setIsProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const pageItems: PageItem[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          
          pageItems.push({
            id: `page-${i}-${Math.random()}`,
            index: i - 1,
            url: canvas.toDataURL()
          });
        }
        setPages(pageItems);
      } catch (error) {
        console.error('Failed to load pages:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    loadPages();
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
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSaving(false);
      setTimeout(() => {
        setResultUrl(url);
      }, 1500);
    } catch (err: any) {
      console.error('Organization failed:', err);
      setError(err.message || 'An error occurred while reorganizing the PDF pages. Please try again.');
      setIsSaving(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF organized successfully!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your document has been reordered and is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`organized_${file.name}`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download organized PDF
          </a>
          <button 
            onClick={() => setResultUrl(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Organize more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <LoadingOverlay isVisible={isProcessing} message="Loading document..." />
      <LoadingOverlay 
        isVisible={isSaving} 
        message="Saving changes..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* Main Area: Page Reordering */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Organize PDF Pages</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Drag to reorder, click trash to delete</p>
        </div>

        <Reorder.Group 
          axis="y" 
          values={pages} 
          onReorder={setPages}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8"
        >
          {pages.map((page) => (
            <Reorder.Item 
              key={page.id} 
              value={page}
              className="group relative"
            >
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-3 shadow-md hover:shadow-xl transition-all duration-300">
                <div className="aspect-[1/1.414] overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-950/40 flex items-center justify-center relative">
                  <img src={page.url} alt={`Page`} className="w-full h-full object-contain p-2" />
                  
                  {/* Drag Handle */}
                  <div className="absolute top-2 left-2 p-1.5 bg-white/95 dark:bg-slate-800/95 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing border border-slate-200/50 dark:border-slate-700">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                  </div>
 
                  {/* Delete Button */}
                  <button 
                    onClick={() => deletePage(page.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-center mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">Page {page.index + 1}</p>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Sidebar: Options */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Organization Options</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Secure Processing</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Instant Preview</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-primary font-medium leading-relaxed">
                You can reorder pages by dragging them or remove unwanted pages using the trash icon.
              </p>
            </div>
          </div>

          <button 
            onClick={saveOrganizedPDF}
            disabled={isSaving || isProcessing}
            className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Organize PDF
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
