import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import { motion } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  FileText,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  FileSpreadsheet
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface PDFToWordToolProps {
  file: File;
  onReset?: () => void;
}

export const PDFToWordTool: React.FC<PDFToWordToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadPdfInfo = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (!isMounted) return;
        setPageCount(pdf.numPages);

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
        if (isMounted) {
          setPreviewUrl(canvas.toDataURL());
        }
      } catch (err) {
        console.error('Failed to render PDF preview:', err);
      }
    };
    loadPdfInfo();
    return () => { isMounted = false; };
  }, [file]);

  const convertToWord = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const sections = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by line (approximate Y coordinate)
        const lines: Record<number, any[]> = {};
        textContent.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item);
        });

        // Sort lines by Y (top to bottom)
        const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
        
        const paragraphs = sortedY.map(y => {
          const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const text = lineItems.map(item => item.str).join(' ');
          
          return new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24, // 12pt
                font: "Calibri"
              })
            ],
            spacing: {
              after: 200
            }
          });
        });

        sections.push({
          properties: {},
          children: paragraphs
        });
      }

      const doc = new Document({
        sections: sections
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      
      HistoryService.addHistoryItem({
        toolId: 'pdf-to-word',
        toolName: 'PDF to Word',
        fileName: `${file.name.replace('.pdf', '')}.docx`,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: 'Converted PDF to editable Word DOCX'
      });

      setIsProcessing(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the PDF to Word. Please try again.');
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <ResultPanel
        title="PDF converted to Word!"
        subtitle="Your editable DOCX document is ready for download."
        downloadUrl={resultUrl}
        downloadFileName={`${file.name.replace('.pdf', '')}.docx`}
        downloadLabel="Download Word"
        onBack={() => {
          if (resultUrl) {
            URL.revokeObjectURL(resultUrl);
          }
          setResultUrl(null);
        }}
        onReset={() => {
          if (resultUrl) {
            URL.revokeObjectURL(resultUrl);
          }
          setResultUrl(null);
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
        message="Converting PDF to Word (.docx)..." 
        error={error}
        onCloseError={() => setError(null)}
        onCancel={() => setIsProcessing(false)}
      />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onReset && (
            <BackButton onClick={onReset} label="" className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2" />
          )}
          <div className="bg-[#2B579A] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
            DOCX
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">PDF to Word</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {pageCount > 0 ? `${pageCount} ${pageCount === 1 ? 'Page' : 'Pages'}` : file.name}
          </span>
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: File Preview */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-6 md:p-8 overflow-y-auto flex flex-col items-center justify-center">
          <div className="w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-md flex flex-col items-center">
            <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="PDF Preview" className="max-w-full max-h-full object-contain p-1" />
              ) : (
                <FileText className="w-16 h-16 text-slate-300" />
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-full" title={file.name}>
              {file.name}
            </p>
            <p className="text-[11px] text-slate-400">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </main>

        {/* RIGHT SIDEBAR: Options */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Conversion Options
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              📝 Extract text from PDF into editable Word (.docx) paragraphs while preserving formatting.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={convertToWord}
              disabled={isProcessing}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Convert to Word
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
