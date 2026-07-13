import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Plus,
  Trash2,
  FileText,
  GripVertical,
  ArrowRight
} from 'lucide-react';
import { FileUpload } from '../components/common/FileUpload';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface MergeToolProps {
  initialFiles: File[];
}

interface FileWithPreview {
  id: string;
  file: File;
  preview: string;
}

export const MergeTool: React.FC<MergeToolProps> = ({ initialFiles }) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const generatePreview = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
    return canvas.toDataURL();
  };

  const handleAddFiles = async (newFiles: File[]) => {
    setIsProcessing(true);
    const newFilesWithPreviews = await Promise.all(
      newFiles.map(async (f) => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        preview: await generatePreview(f)
      }))
    );
    setFiles(prev => [...prev, ...newFilesWithPreviews]);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (initialFiles.length > 0 && files.length === 0) {
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const mergePDFs = async () => {
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (error) {
      console.error('Merging failed:', error);
    } finally {
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
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDFs have been merged!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your combined document is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download="merged_document.pdf"
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download merged PDF
          </a>
          <button 
            onClick={() => {
              setResultUrl(null);
              setFiles([]);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Merge more files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <LoadingOverlay isVisible={isProcessing} message="Processing your PDFs..." />

      <div className="flex flex-col items-center gap-12">
        <Reorder.Group 
          axis="x" 
          values={files} 
          onReorder={setFiles}
          className="flex flex-wrap justify-center gap-8"
        >
          <AnimatePresence>
            {files.map((item) => (
              <Reorder.Item 
                key={item.id} 
                value={item}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group cursor-grab active:cursor-grabbing"
              >
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:border-primary">
                  <div className="w-40 h-56 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                    <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{item.file.name}</p>
                    <GripVertical className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                
                <button 
                  onClick={() => removeFile(item.id)}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary shadow-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Reorder.Item>
            ))}
          </AnimatePresence>

          <div className="flex items-center justify-center">
            <FileUpload onFilesSelected={handleAddFiles} multiple compact />
          </div>
        </Reorder.Group>

        <button 
          onClick={mergePDFs}
          disabled={files.length < 2}
          className="btn-primary flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Merge PDF
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
