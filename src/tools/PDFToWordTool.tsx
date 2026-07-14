import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { 
  Download, 
  CheckCircle2, 
  FileText,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFToWordToolProps {
  file: File;
}

export const PDFToWordTool: React.FC<PDFToWordToolProps> = ({ file }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertToWord = async () => {
    setError(null);
    setIsProcessing(true);
    try {
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
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIsProcessing(false);
      setTimeout(() => {
        setResultUrl(url);
      }, 1500);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the PDF to Word. Please try again.');
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-12 py-12">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF converted to Word!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your editable document is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`${file.name.replace('.pdf', '')}.docx`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download Word file
          </a>
          <button 
            onClick={() => setResultUrl(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Convert another PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-12">
      <LoadingOverlay 
        isVisible={isProcessing} 
        message="Converting to Word..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 shadow-xl flex flex-col items-center text-center gap-10">
        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500">
          <FileText className="w-12 h-12" />
        </div>

        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Convert PDF to Word</h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Our advanced converter will transform your PDF into an editable Word document while preserving the original layout.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Secure & Private</span>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <Zap className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Fast Processing</span>
          </div>
        </div>

        <button 
          onClick={convertToWord}
          disabled={isProcessing}
          className="btn-primary w-full max-w-md py-5 text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Convert to Word
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
