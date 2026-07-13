import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Scissors,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface SplitToolProps {
  file: File;
}

export const SplitTool: React.FC<SplitToolProps> = ({ file }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('range');

  useEffect(() => {
    const loadThumbnails = async () => {
      setIsProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const thumbUrls: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          thumbUrls.push(canvas.toDataURL());
        }
        setPages(thumbUrls);
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    loadThumbnails();
  }, [file]);

  const togglePage = (index: number) => {
    setSelectedPages(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleRangeChange = (val: string) => {
    setRangeInput(val);
    const indices: number[] = [];
    const parts = val.split(',').map(p => p.trim());
    
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
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

  const splitPDF = async () => {
    const pagesToExtract = splitMode === 'all' ? pages.map((_, i) => i) : selectedPages;
    if (pagesToExtract.length === 0) return;

    setIsExporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(originalPdf, pagesToExtract.sort((a, b) => a - b));
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (error) {
      console.error('Splitting failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF has been split!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your extracted pages are ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`split_${file.name}`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download split PDF
          </a>
          <button 
            onClick={() => setResultUrl(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Split another PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <LoadingOverlay isVisible={isProcessing} message="Loading document pages..." />
      <LoadingOverlay isVisible={isExporting} message="Extracting pages..." />

      {/* Main Area: Page Previews */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Select Pages</h3>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedPages(pages.map((_, i) => i))}
              className="text-sm font-bold text-primary hover:underline"
            >
              Select All
            </button>
            <button 
              onClick={() => setSelectedPages([])}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8">
          {pages.map((url, index) => (
            <motion.div 
              key={index}
              whileHover={{ scale: 1.02 }}
              onClick={() => togglePage(index)}
              className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                selectedPages.includes(index) ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <img src={url} alt={`Page ${index + 1}`} className="w-full h-auto" />
              <div className="absolute top-3 right-3">
                {selectedPages.includes(index) ? (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Square className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-slate-900/5 dark:bg-white/5 py-2 text-center backdrop-blur-sm">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{index + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sidebar: Options */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8 sticky top-24">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Layers className="w-6 h-6" />
              <h4 className="text-lg font-bold">Split Options</h4>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSplitMode('range')}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  splitMode === 'range' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <span className="font-bold text-sm">Split by range</span>
                <div className={`w-4 h-4 rounded-full border-2 ${splitMode === 'range' ? 'border-primary bg-primary' : 'border-slate-300'}`} />
              </button>
              <button
                onClick={() => setSplitMode('all')}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  splitMode === 'all' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <span className="font-bold text-sm">Extract all pages</span>
                <div className={`w-4 h-4 rounded-full border-2 ${splitMode === 'all' ? 'border-primary bg-primary' : 'border-slate-300'}`} />
              </button>
            </div>

            {splitMode === 'range' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <label className="text-sm font-bold text-slate-500 dark:text-slate-400">Enter page ranges</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1-3, 5"
                  value={rangeInput}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-primary outline-none transition-all text-sm font-medium"
                />
                <div className="flex items-start gap-2 text-slate-400">
                  <Info className="w-4 h-4 mt-0.5" />
                  <p className="text-xs leading-relaxed">Example: 1-5, 8, 11-13. Use commas to separate ranges.</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Selected pages:</span>
              <span className="text-lg font-bold text-primary">{splitMode === 'all' ? pages.length : selectedPages.length}</span>
            </div>
            <button 
              onClick={splitPDF}
              disabled={splitMode === 'range' && selectedPages.length === 0}
              className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Split PDF
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
