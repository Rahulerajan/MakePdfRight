import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { pdfjs } from '../utils/pdfWorker';
import { motion } from 'framer-motion';
import { 
  FileText,
  ArrowRight,
  ScanLine,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers
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
  const [hasTextLayer, setHasTextLayer] = useState<boolean | null>(null);
  const [isScannedDetected, setIsScannedDetected] = useState(false);

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

        // Check if there is an extractable text layer across the document
        let totalChars = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          for (const item of textContent.items as any[]) {
            if (item.str && typeof item.str === 'string') {
              totalChars += item.str.trim().length;
            }
          }
        }

        if (isMounted) {
          setHasTextLayer(totalChars > 0);
        }

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
        console.error('Failed to render PDF preview or detect text layer:', err);
      }
    };
    loadPdfInfo();
    return () => { isMounted = false; };
  }, [file]);

  const convertToWord = async () => {
    if (hasTextLayer === false) {
      setIsScannedDetected(true);
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      // Detect if there is any extractable text in the PDF
      let totalExtractableChars = 0;
      const pageTextData: Array<{ items: any[] }> = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pageTextData.push({ items: textContent.items });

        for (const item of textContent.items as any[]) {
          if (item.str && typeof item.str === 'string') {
            totalExtractableChars += item.str.trim().length;
          }
        }
      }

      // If document is scanned / image-based with no real text objects
      if (totalExtractableChars === 0) {
        setHasTextLayer(false);
        setIsProcessing(false);
        setIsScannedDetected(true);
        return;
      }

      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const sections = [];

      for (let i = 0; i < pageTextData.length; i++) {
        const items = pageTextData[i].items;
        
        // Group items by line (approximate Y coordinate)
        const lines: Record<number, any[]> = {};
        items.forEach((item: any) => {
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

  if (isScannedDetected) {
    return (
      <motion.div 
        key="scanned-notice"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-2xl mx-auto my-auto p-6 sm:p-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-6"
      >
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-xs">
          <ScanLine className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Scanned Document Detected
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
            This looks like a scanned document. OCR support is coming soon. In the meantime, try our Image to PDF tool, or check back shortly for OCR support.
          </p>
        </div>

        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This file contains images without an embedded selectable text layer. Converting directly without Optical Character Recognition (OCR) would result in a blank document.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/image-to-pdf"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#2B579A] hover:bg-[#204276] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Try Image to PDF
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setIsScannedDetected(false);
              if (onReset) onReset();
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Upload Another PDF
          </button>
        </div>
      </motion.div>
    );
  }

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
        message="Analyzing and converting PDF to Word (.docx)..." 
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
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Conversion Options
            </h2>

            {hasTextLayer === false ? (
              <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ScanLine className="w-4 h-4 text-amber-600" />
                  <span>Scanned Document Detected</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  This PDF does not have selectable text. OCR conversion is coming soon.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                📝 Extract text from PDF into editable Word (.docx) paragraphs while preserving formatting.
              </p>
            )}

            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Text Layer: {hasTextLayer === null ? 'Analyzing...' : hasTextLayer ? 'Detected' : 'Scanned / Image Only'}</span>
              </div>
            </div>
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

