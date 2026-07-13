import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FileUpload } from '../components/common/FileUpload';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface ImageToPDFToolProps {
  initialFiles: File[];
}

interface ImageWithPreview {
  id: string;
  file: File;
  preview: string;
}

export const ImageToPDFTool: React.FC<ImageToPDFToolProps> = ({ initialFiles }) => {
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

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
    setImages(prev => [...prev, ...newImagesWithPreviews]);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (initialFiles.length > 0 && images.length === 0) {
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const convertToPDF = async () => {
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
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResultUrl(url);
    } catch (error) {
      console.error('Conversion failed:', error);
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
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Images converted to PDF!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your PDF document is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download="converted_images.pdf"
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download PDF
          </a>
          <button 
            onClick={() => {
              setResultUrl(null);
              setImages([]);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors"
          >
            Convert more images
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <LoadingOverlay isVisible={isProcessing} message="Converting images to PDF..." />

      {/* Main Area: Image Grid */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Image to PDF</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{images.length} images selected</p>
        </div>

        <Reorder.Group 
          axis="y" 
          values={images} 
          onReorder={setImages}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8"
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 shadow-lg transition-all duration-300 hover:shadow-xl group-hover:border-primary">
                  <div className="aspect-[1/1.4] overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    <img src={item.preview} alt={item.file.name} className="w-full h-full object-contain" />
                    
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>

                    {/* Delete Button */}
                    <button 
                      onClick={() => removeImage(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-center mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider truncate px-2">{item.file.name}</p>
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>

          <div className="flex items-center justify-center">
            <FileUpload 
              onFilesSelected={handleAddFiles} 
              multiple 
              compact 
              accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
            />
          </div>
        </Reorder.Group>
      </div>

      {/* Sidebar: Options */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">PDF Options</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">High Quality PDF</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Fast Conversion</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Images will be converted to PDF pages in the order they appear. Drag and drop to reorder.
            </p>
          </div>

          <button 
            onClick={convertToPDF}
            disabled={images.length === 0}
            className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Convert to PDF
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
