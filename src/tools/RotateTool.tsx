import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  RotateCw,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface RotateToolProps {
  file: File;
}

interface PageRotation {
  index: number;
  rotation: number;
  url: string;
}

export const RotateTool: React.FC<RotateToolProps> = ({ file }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [pages, setPages] = useState<PageRotation[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      setIsProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const pageRotations: PageRotation[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          
          pageRotations.push({
            index: i - 1,
            rotation: 0,
            url: canvas.toDataURL()
          });
        }
        setPages(pageRotations);
      } catch (error) {
        console.error('Failed to load pages:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    loadPages();
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
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResultUrl(url);
    } catch (error) {
      console.error('Rotation failed:', error);
    } finally {
      setIsRotating(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF pages rotated!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your document has been updated and is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`rotated_${file.name}`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download rotated PDF
          </a>
          <button 
            onClick={() => setResultUrl(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Rotate another PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <LoadingOverlay isVisible={isProcessing} message="Loading document..." />
      <LoadingOverlay isVisible={isRotating} message="Rotating pages..." />

      {/* Main Area: Page Grid */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Rotate PDF Pages</h3>
          <button 
            onClick={rotateAll}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Rotate All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8">
          {pages.map((page) => (
            <div key={page.index} className="group relative">
              <div 
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer"
                onClick={() => rotatePage(page.index)}
              >
                <div className="aspect-[1/1.4] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                  <motion.img 
                    animate={{ rotate: page.rotation }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    src={page.url} 
                    alt={`Page ${page.index + 1}`} 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <p className="text-center mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{page.index + 1}</p>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-xl">
                    <RotateCw className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar: Options */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Rotation Options</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Permanent Rotation</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Fast Processing</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Click on individual pages to rotate them 90 degrees clockwise, or use the "Rotate All" button to rotate the entire document.
            </p>
          </div>

          <button 
            onClick={saveRotatedPDF}
            className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3"
          >
            Rotate PDF
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
