import React, { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Type,
  Image as ImageIcon,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Save,
  ArrowRight,
  Plus
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface EditToolProps {
  file: File;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  pageIndex: number;
}

export const EditTool: React.FC<EditToolProps> = ({ file }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [elements, setElements] = useState<TextElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'text'>('select');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPDF = async () => {
      setIsProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const pageUrls: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          pageUrls.push(canvas.toDataURL());
        }
        setPages(pageUrls);
      } catch (error) {
        console.error('Failed to load PDF:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    loadPDF();
  }, [file]);

  const addText = (pageIndex: number, e: React.MouseEvent) => {
    if (mode !== 'text') return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newElement: TextElement = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'New Text',
      x,
      y,
      fontSize: 16,
      fontFamily: 'Helvetica',
      pageIndex
    };

    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setMode('select');
  };

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const savePDF = async () => {
    setIsSaving(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      elements.forEach(el => {
        const page = pages[el.pageIndex];
        const { height } = page.getSize();
        
        // Simplified coordinate mapping for the demo
        page.drawText(el.text, {
          x: el.x,
          y: height - el.y,
          size: el.fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (error) {
      console.error('Saving failed:', error);
    } finally {
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
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF edited successfully!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your modified document is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`edited_${file.name}`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download edited PDF
          </a>
          <button 
            onClick={() => setResultUrl(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Edit more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <LoadingOverlay isVisible={isProcessing} message="Loading editor..." />
      <LoadingOverlay isVisible={isSaving} message="Saving changes..." />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-8 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('select')}
            className={`p-3 rounded-xl transition-all ${mode === 'select' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            title="Select"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('text')}
            className={`p-3 rounded-xl transition-all ${mode === 'text' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          <div className="w-px h-8 bg-slate-100 dark:bg-slate-700 mx-2" />
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
            className="p-3 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
            className="p-3 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {selectedId && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <input 
                  type="text" 
                  value={elements.find(el => el.id === selectedId)?.text || ''}
                  onChange={(e) => updateElement(selectedId, { text: e.target.value })}
                  className="bg-transparent border-none outline-none px-2 text-sm font-bold text-slate-700 dark:text-slate-200 w-40"
                />
                <input 
                  type="number" 
                  value={elements.find(el => el.id === selectedId)?.fontSize || 16}
                  onChange={(e) => updateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                  className="w-16 bg-transparent border-none outline-none text-sm font-bold text-primary"
                />
                <button 
                  onClick={() => deleteElement(selectedId)}
                  className="p-2 text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={savePDF}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            <Save className="w-5 h-5" />
            Save PDF
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-slate-200/50 dark:bg-slate-900/50 rounded-3xl p-12 border border-slate-200 dark:border-slate-800">
        <div 
          ref={containerRef}
          className="flex flex-col items-center gap-12"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          {pages.map((url, index) => (
            <div 
              key={index}
              className="relative bg-white shadow-2xl"
              onClick={(e) => addText(index, e)}
            >
              <img src={url} alt={`Page ${index + 1}`} className="max-w-none" />
              
              {/* Elements Overlay */}
              {elements.filter(el => el.pageIndex === index).map(el => (
                <div
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(el.id);
                  }}
                  className={`absolute cursor-move p-1 border-2 transition-all ${
                    selectedId === el.id ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/30'
                  }`}
                  style={{ 
                    left: el.x, 
                    top: el.y, 
                    fontSize: el.fontSize,
                    fontFamily: el.fontFamily
                  }}
                >
                  {el.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
