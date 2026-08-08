import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Plus,
  Trash2,
  Image as ImageIcon,
  GripVertical,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FileUpload } from '../components/common/FileUpload';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface ImageToPDFToolProps {
  initialFiles: File[];
  onReset?: () => void;
}

interface ImageWithPreview {
  id: string;
  file: File;
  preview: string;
}

export const ImageToPDFTool: React.FC<ImageToPDFToolProps> = ({ initialFiles, onReset }) => {
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialFilesLoadedRef = useRef(false);
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

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddFiles = async (newFiles: File[]) => {
    setIsProcessing(true);
    const newImagesWithPreviews = await Promise.all(
      newFiles.map(async (f) => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        preview: await generatePreview(f)
      }))
    );
    
    setImages(prev => {
      // Deduplicate images based on name and size at commit-time
      const currentKeys = new Set(prev.map(item => `${item.file.name}-${item.file.size}`));
      const filteredNew = newImagesWithPreviews.filter(
        item => !currentKeys.has(`${item.file.name}-${item.file.size}`)
      );
      return [...prev, ...filteredNew];
    });
    setIsProcessing(false);
  };

  useEffect(() => {
    if (initialFiles.length > 0 && !initialFilesLoadedRef.current) {
      initialFilesLoadedRef.current = true;
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const convertToPDF = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const item of images) {
        const imageBytes = await item.file.arrayBuffer();
        let image;
        
        if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (item.file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          // Fallback or skip unsupported types
          continue;
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      HistoryService.addHistoryItem({
        toolId: 'image-to-pdf',
        toolName: 'Image to PDF',
        fileName: images[0]?.file.name ? `converted_${images[0].file.name.split('.')[0]}.pdf` : 'converted_images.pdf',
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Converted ${images.length} image(s) to PDF`
      });

      setIsProcessing(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the images to PDF. Please try again.');
      setIsProcessing(false);
    }
  };

  if (resultUrl) {
    return (
      <ResultPanel
        title="Images converted to PDF!"
        subtitle="Your PDF document is ready for download."
        downloadUrl={resultUrl}
        downloadFileName="converted_images.pdf"
        downloadLabel="Download PDF"
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
          setImages([]);
          if (onReset) onReset();
        }}
        resetLabel="Convert More"
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
        message="Converting images into PDF..." 
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
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
            JPG
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">JPG to PDF</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
            {images.length} {images.length === 1 ? 'Image' : 'Images'}
          </span>
        </div>
      </header>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: Images Reorder Canvas */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-3.5 sm:p-6 md:p-8 overflow-y-auto">
          <Reorder.Group 
            axis="y" 
            values={images} 
            onReorder={setImages}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            <AnimatePresence>
              {images.map((item) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group cursor-grab active:cursor-grabbing"
                >
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col items-center">
                    <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                      <img src={item.preview} alt={item.file.name} className="max-w-full max-h-full object-contain p-1" />
                      
                      {/* Drag Handle */}
                      <div className="absolute top-2 left-2 p-1 bg-white/90 dark:bg-slate-800/90 rounded shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700 z-10">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={() => removeImage(item.id)}
                        className="absolute top-2 right-2 p-1 bg-[#E5322D] text-white rounded shadow-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-700 cursor-pointer z-10"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-center mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate w-full px-1" title={item.file.name}>{item.file.name}</p>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>

            <div className="w-full h-full min-h-[200px] flex items-center justify-center self-center justify-self-center">
              <FileUpload 
                onFilesSelected={handleAddFiles} 
                multiple 
                compact 
                accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
              />
            </div>
          </Reorder.Group>
        </main>

        {/* RIGHT SIDEBAR: Options */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="hidden md:block flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              PDF Options
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
              🖼️ Images will be converted into PDF pages in the order displayed. Drag and drop cards to adjust page sequence.
            </p>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={convertToPDF}
              disabled={images.length === 0 || isProcessing}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Convert to PDF
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
