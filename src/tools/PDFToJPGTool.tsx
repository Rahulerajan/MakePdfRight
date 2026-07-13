import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import { 
  Download, 
  CheckCircle2, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Archive
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFToJPGToolProps {
  file: File;
}

export const PDFToJPGTool: React.FC<PDFToJPGToolProps> = ({ file }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; count: number } | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [pages, setPages] = useState<string[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  useEffect(() => {
    const loadPreviews = async () => {
      setIsLoadingPreviews(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const thumbUrls: string[] = [];

        // Load first 10 pages for preview
        const count = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          thumbUrls.push(canvas.toDataURL());
        }
        setPages(thumbUrls);
      } catch (error) {
        console.error('Failed to load previews:', error);
      } finally {
        setIsLoadingPreviews(false);
      }
    };
    loadPreviews();
  }, [file]);

  const convertToJPG = async () => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const zip = new JSZip();

      for (let i = 1; i <= pdf.numPages; i++) {
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
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({ url, count: pdf.numPages });
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF converted to JPG!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            {result.count} images are ready for download in a ZIP file.
          </p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={result.url} 
            download={`${file.name.replace('.pdf', '')}_images.zip`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download ZIP file
          </a>
          <button 
            onClick={() => setResult(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Convert another PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <LoadingOverlay isVisible={isProcessing} message="Converting pages to JPG..." />
      <LoadingOverlay isVisible={isLoadingPreviews} message="Loading document..." />

      {/* Main Area: Previews */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">PDF to JPG</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{pages.length} pages loaded</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
          {pages.map((url, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-lg">
              <div className="aspect-[1/1.4] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900">
                <img src={url} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
              </div>
              <p className="text-center mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{index + 1}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar: Options */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">JPG Settings</h4>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-300">Image Quality</label>
                  <span className="text-primary font-bold">{Math.round(quality * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <Layers className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">All Pages</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">High Resolution</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={convertToJPG}
            className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3"
          >
            Convert to JPG
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
