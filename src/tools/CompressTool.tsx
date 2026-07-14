import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, PDFName } from 'pdf-lib';
import { motion } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Zap,
  ShieldCheck,
  Gauge,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useLanguage } from '../components/LanguageContext';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CompressToolProps {
  file: File;
  onReset?: () => void;
}

type CompressionLevel = 'extreme' | 'recommended' | 'less' | 'custom';

// Helper to format file size cleanly
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Decode data URL back into a binary Uint8Array
const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
};

// Helper to safely dereference indirect objects in pdf-lib
const lookupVal = (context: any, val: any): any => {
  if (!val) return val;
  if (val.constructor && val.constructor.name === 'PDFIndirectReference') {
    return context.lookup(val);
  }
  return val;
};

const getResolvedDictVal = (context: any, dict: any, keyName: string): any => {
  const val = dict.get(PDFName.of(keyName));
  return lookupVal(context, val);
};

const getNumberVal = (val: any): number | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return val;
  if (typeof val.value === 'number') return val.value;
  if (typeof val.asNumber === 'function') {
    try { return val.asNumber(); } catch (_) {}
  }
  return null;
};

const hasFilter = (filterObj: any, filterName: string): boolean => {
  if (!filterObj) return false;
  if (filterObj === PDFName.of(filterName)) return true;
  if (filterObj.constructor && filterObj.constructor.name === 'PDFArray') {
    const array = filterObj as any;
    for (let i = 0; i < array.size(); i++) {
      const item = array.get(i);
      if (item === PDFName.of(filterName)) return true;
    }
  }
  return false;
};

const getColorSpace = (colorSpaceObj: any): string => {
  if (!colorSpaceObj) return 'DeviceRGB';
  if (colorSpaceObj === PDFName.of('DeviceRGB') || colorSpaceObj === PDFName.of('RGB')) {
    return 'DeviceRGB';
  }
  if (colorSpaceObj === PDFName.of('DeviceGray') || colorSpaceObj === PDFName.of('G')) {
    return 'DeviceGray';
  }
  if (colorSpaceObj === PDFName.of('DeviceCMYK') || colorSpaceObj === PDFName.of('CMYK')) {
    return 'DeviceCMYK';
  }
  if (colorSpaceObj.constructor && colorSpaceObj.constructor.name === 'PDFArray') {
    const arr = colorSpaceObj as any;
    const first = arr.get(0);
    if (first === PDFName.of('Indexed')) {
      return 'Indexed';
    }
    if (first === PDFName.of('DeviceRGB') || first === PDFName.of('RGB')) {
      return 'DeviceRGB';
    }
    if (first === PDFName.of('DeviceGray') || first === PDFName.of('G')) {
      return 'DeviceGray';
    }
    if (first === PDFName.of('DeviceCMYK') || first === PDFName.of('CMYK')) {
      return 'DeviceCMYK';
    }
  }
  return 'DeviceRGB';
};

const rawPixelsToCanvas = (
  bytes: Uint8Array,
  width: number,
  height: number,
  colorSpace: string
): HTMLCanvasElement | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    if (colorSpace === 'DeviceRGB') {
      let srcIdx = 0;
      let dstIdx = 0;
      const len = width * height * 4;
      for (; dstIdx < len; dstIdx += 4) {
        data[dstIdx] = bytes[srcIdx] !== undefined ? bytes[srcIdx] : 0;
        data[dstIdx + 1] = bytes[srcIdx + 1] !== undefined ? bytes[srcIdx + 1] : 0;
        data[dstIdx + 2] = bytes[srcIdx + 2] !== undefined ? bytes[srcIdx + 2] : 0;
        data[dstIdx + 3] = 255; // Alpha
        srcIdx += 3;
      }
    } else if (colorSpace === 'DeviceGray') {
      let srcIdx = 0;
      let dstIdx = 0;
      const len = width * height * 4;
      for (; dstIdx < len; dstIdx += 4) {
        const gray = bytes[srcIdx] !== undefined ? bytes[srcIdx] : 0;
        data[dstIdx] = gray;
        data[dstIdx + 1] = gray;
        data[dstIdx + 2] = gray;
        data[dstIdx + 3] = 255; // Alpha
        srcIdx += 1;
      }
    } else if (colorSpace === 'DeviceCMYK') {
      let srcIdx = 0;
      let dstIdx = 0;
      const len = width * height * 4;
      for (; dstIdx < len; dstIdx += 4) {
        const c = (bytes[srcIdx] !== undefined ? bytes[srcIdx] : 0) / 255;
        const m = (bytes[srcIdx + 1] !== undefined ? bytes[srcIdx + 1] : 0) / 255;
        const y = (bytes[srcIdx + 2] !== undefined ? bytes[srcIdx + 2] : 0) / 255;
        const k = (bytes[srcIdx + 3] !== undefined ? bytes[srcIdx + 3] : 0) / 255;
        
        data[dstIdx] = Math.round(255 * (1 - c) * (1 - k));
        data[dstIdx + 1] = Math.round(255 * (1 - m) * (1 - k));
        data[dstIdx + 2] = Math.round(255 * (1 - y) * (1 - k));
        data[dstIdx + 3] = 255; // Alpha
        srcIdx += 4;
      }
    } else {
      let srcIdx = 0;
      let dstIdx = 0;
      const len = width * height * 4;
      for (; dstIdx < len; dstIdx += 4) {
        data[dstIdx] = bytes[srcIdx] !== undefined ? bytes[srcIdx] : 0;
        data[dstIdx + 1] = bytes[srcIdx + 1] !== undefined ? bytes[srcIdx + 1] : 0;
        data[dstIdx + 2] = bytes[srcIdx + 2] !== undefined ? bytes[srcIdx + 2] : 0;
        data[dstIdx + 3] = 255;
        srcIdx += 3;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch (err) {
    console.error('Error in rawPixelsToCanvas:', err);
    return null;
  }
};

// Main function to compress a single image stream
const compressSingleImage = async (
  rawStream: any,
  context: any,
  level: CompressionLevel,
  customValue: number
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> => {
  return new Promise(async (resolve) => {
    try {
      const dict = rawStream.dict;
      if (!dict) {
        resolve(null);
        return;
      }
      
      const widthObj = getResolvedDictVal(context, dict, 'Width');
      const heightObj = getResolvedDictVal(context, dict, 'Height');
      const width = getNumberVal(widthObj);
      const height = getNumberVal(heightObj);
      
      if (!width || !height) {
        resolve(null);
        return;
      }
      
      let scale = 1.0;
      let quality = 0.80;
      let maxDimension = 2048;
      
      if (level === 'extreme') {
        scale = 0.5;
        quality = 0.50;
        maxDimension = 1100; // ~100-150 DPI limit
      } else if (level === 'recommended') {
        scale = 0.75;
        quality = 0.80;
        maxDimension = 1700; // ~200 DPI limit
      } else if (level === 'less') {
        scale = 1.0;
        quality = 0.95;
        maxDimension = 2550; // ~300 DPI limit
      } else if (level === 'custom') {
        const ratio = (100 - customValue) / 100;
        scale = Math.max(0.3, 0.3 + ratio * 0.7);
        quality = Math.max(0.2, 0.2 + ratio * 0.75);
        maxDimension = Math.round(1000 + ratio * 1550);
      }
      
      let newWidth = Math.round(width * scale);
      let newHeight = Math.round(height * scale);
      
      if (newWidth > maxDimension || newHeight > maxDimension) {
        const ratio = Math.min(maxDimension / newWidth, maxDimension / newHeight);
        newWidth = Math.round(newWidth * ratio);
        newHeight = Math.round(newHeight * ratio);
      }
      
      if (newWidth < 1) newWidth = 1;
      if (newHeight < 1) newHeight = 1;
      
      const filter = getResolvedDictVal(context, dict, 'Filter');
      const uncompressedBytes = rawStream.getUncompressedContents();
      
      let canvas: HTMLCanvasElement | null = null;
      
      if (hasFilter(filter, 'DCTDecode')) {
        canvas = await new Promise<HTMLCanvasElement | null>((res) => {
          const blob = new Blob([uncompressedBytes], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            URL.revokeObjectURL(url);
            const cvs = document.createElement('canvas');
            cvs.width = newWidth;
            cvs.height = newHeight;
            const ctx = cvs.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, newWidth, newHeight);
              res(cvs);
            } else {
              res(null);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            res(null);
          };
        });
      } else {
        const colorSpaceObj = getResolvedDictVal(context, dict, 'ColorSpace');
        const colorSpace = getColorSpace(colorSpaceObj);
        
        if (colorSpace === 'Indexed') {
          resolve(null);
          return;
        }
        
        const originalCanvas = rawPixelsToCanvas(uncompressedBytes, width, height, colorSpace);
        if (originalCanvas) {
          const cvs = document.createElement('canvas');
          cvs.width = newWidth;
          cvs.height = newHeight;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(originalCanvas, 0, 0, newWidth, newHeight);
            canvas = cvs;
          }
        }
      }
      
      if (!canvas) {
        resolve(null);
        return;
      }
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const compressedBytes = new Uint8Array(reader.result as ArrayBuffer);
          resolve({ bytes: compressedBytes, width: newWidth, height: newHeight });
        };
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', quality);
      
    } catch (err) {
      console.error('Error compressing single image:', err);
      resolve(null);
    }
  });
};

export const CompressTool: React.FC<CompressToolProps> = ({ file, onReset }) => {
  const { t } = useLanguage();
  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const [customValue, setCustomValue] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation and Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  // Result Preview States & Processing Stats
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [resultPreviewLoading, setResultPreviewLoading] = useState(false);
  const [processingTime, setProcessingTime] = useState<string>('0.00');

  // Load and Validate PDF & Generate First Page Thumbnail
  useEffect(() => {
    let active = true;
    const validateAndLoadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      setValidationError(null);
      setPageCount(null);
      setPreviewUrl(null);
      
      try {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error('Selected file is not a PDF. Please upload a valid PDF document.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        
        let pdf;
        try {
          pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        } catch (jsErr: any) {
          if (jsErr.name === 'PasswordException') {
            throw new Error('This PDF is password-protected or encrypted. Please remove password protection before compressing.');
          }
          throw new Error('The PDF file is corrupted or invalid. Please upload a healthy PDF document.');
        }
        
        if (!pdf || pdf.numPages === 0) {
          throw new Error('The PDF file is empty or invalid.');
        }
        
        if (!active) return;
        setPageCount(pdf.numPages);
        
        try {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ 
            canvasContext: context!, 
            viewport,
            canvas: canvas as any
          }).promise;
          
          if (!active) return;
          setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
        } catch (renderErr) {
          console.error('Failed to render PDF thumbnail preview:', renderErr);
          if (active) {
            setPreviewError('Failed to generate thumbnail preview');
          }
        }
      } catch (err: any) {
        console.error('PDF Validation error:', err);
        if (active) {
          setValidationError(err.message || 'Validation failed');
          setError(err.message || 'Invalid PDF file');
        }
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };
    
    validateAndLoadPreview();
    
    return () => {
      active = false;
    };
  }, [file]);

  const compressPDF = async () => {
    if (validationError) return;
    setError(null);
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Clear metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');

      // Extra metadata cleanup: remove metadata streams
      const catalog = pdfDoc.catalog;
      if (catalog && typeof catalog.delete === 'function') {
        catalog.delete(PDFName.of('Metadata'));
        catalog.delete(PDFName.of('PieceInfo'));
      }

      // Find and compress image streams
      const indirectObjects = pdfDoc.context.enumerateIndirectObjects();
      const imagePromises: { 
        obj: any; 
        promise: Promise<{ bytes: Uint8Array; width: number; height: number } | null>; 
        dict: any;
      }[] = [];

      for (const [ref, obj] of indirectObjects) {
        if (obj && obj.constructor.name === 'PDFRawStream') {
          const rawStream = obj as any;
          const dict = rawStream.dict;
          if (dict) {
            const subtypeObj = getResolvedDictVal(pdfDoc.context, dict, 'Subtype');
            const isImage = subtypeObj === PDFName.of('Image');
            
            if (isImage) {
              const filterObj = getResolvedDictVal(pdfDoc.context, dict, 'Filter');
              // Skip CCITTFaxDecode and JBIG2Decode as they are 1-bit highly optimized black and white formats
              if (!hasFilter(filterObj, 'CCITTFaxDecode') && !hasFilter(filterObj, 'JBIG2Decode')) {
                const promise = compressSingleImage(rawStream, pdfDoc.context, level, customValue);
                imagePromises.push({ obj: rawStream, promise, dict });
              }
            }
          }
        }
      }

      // Concurrently compress all collected image streams
      const compressedResults = await Promise.all(
        imagePromises.map(async (item) => {
          try {
            const result = await item.promise;
            return { ...item, result };
          } catch (e) {
            console.error('Failed to compress an individual PDF image:', e);
            return { ...item, result: null };
          }
        })
      );

      // Write compressed image bytes back into PDFRawStreams
      for (const item of compressedResults) {
        if (item.result) {
          const { bytes, width, height } = item.result;
          
          const originalBytesLength = item.obj.contents.length;
          const filterObj = getResolvedDictVal(pdfDoc.context, item.dict, 'Filter');
          const isOriginallyDCT = hasFilter(filterObj, 'DCTDecode');
          
          if (bytes.length < originalBytesLength || !isOriginallyDCT) {
            item.obj.contents = bytes;
            item.dict.set(PDFName.of('Length'), pdfDoc.context.obj(bytes.length));
            item.dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            item.dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
            item.dict.set(PDFName.of('BitsPerComponent'), pdfDoc.context.obj(8));
            
            item.dict.set(PDFName.of('Width'), pdfDoc.context.obj(width));
            item.dict.set(PDFName.of('Height'), pdfDoc.context.obj(height));
            
            // Delete DecodeParms since it's no longer FlateDecode
            if (typeof item.dict.delete === 'function') {
              item.dict.delete(PDFName.of('DecodeParms'));
            }
          }
        }
      }

      // Save document with object streams enabled
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const originalSize = file.size;
      
      // Safeguard: Ensure final file size is never larger than the original
      let finalBytes = pdfBytes;
      let finalSize = pdfBytes.length;
      if (finalSize > originalSize) {
        finalBytes = new Uint8Array(arrayBuffer);
        finalSize = originalSize;
      }

      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const endTime = performance.now();
      
      setProcessingTime(((endTime - startTime) / 1000).toFixed(2));
      
      // Render compressed PDF preview
      setResultPreviewLoading(true);
      setResultPreviewUrl(null);
      try {
        const compressedBuffer = finalBytes.buffer.slice(finalBytes.byteOffset, finalBytes.byteOffset + finalBytes.byteLength);
        const compressedPdf = await pdfjs.getDocument({ data: compressedBuffer }).promise;
        const page = await compressedPdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
        setResultPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
      } catch (previewErr) {
        console.error('Failed to render compressed preview:', previewErr);
      } finally {
        setResultPreviewLoading(false);
      }

      setIsProcessing(false);
      setResult({ url, size: finalSize });
    } catch (err: any) {
      console.error('Compression failed:', err);
      setError(err.message || 'An error occurred while compressing the PDF. Please try again.');
      setIsProcessing(false);
    }
  };

  const getLevelName = (lvl: CompressionLevel, val: number) => {
    if (lvl === 'less') return 'Low Compression';
    if (lvl === 'recommended') return 'Balanced';
    if (lvl === 'extreme') return 'Maximum Compression';
    return `Custom (${val}%)`;
  };

  if (validationError) {
    return (
      <div className="max-w-[600px] mx-auto text-center space-y-8 py-12">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto shadow-md">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Invalid PDF File</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium px-4">
            {validationError}
          </p>
        </div>
        <p className="text-sm text-slate-400">
          Please click the 'Back to Upload' button at the top-left to select a healthy, unencrypted PDF.
        </p>
      </div>
    );
  }

  if (result) {
    const originalSize = file.size;
    const savedSize = originalSize - result.size;
    const percentage = Math.round((savedSize / originalSize) * 100);

    return (
      <div className="max-w-[800px] mx-auto text-center space-y-12 py-12">
        {/* Back button at the top-left */}
        <div className="flex justify-start">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back
          </button>
        </div>

        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('compress.compressed_title') || 'PDF has been compressed!'}
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
            Your file is now <span className="text-emerald-500 font-bold">{percentage}%</span> smaller.
          </p>
        </div>

        {/* Process Summary Board */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-[700px] mx-auto text-left">
          {/* Compressed PDF Thumbnail */}
          <div className="w-[140px] h-[190px] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative shadow-sm flex-shrink-0">
            {resultPreviewLoading ? (
              <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-xs">Loading...</p>
              </div>
            ) : resultPreviewUrl ? (
              <img 
                src={resultPreviewUrl} 
                alt="Compressed PDF Preview" 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Ready</p>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 w-full space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
                Compression Summary
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Original Size</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{formatFileSize(originalSize)}</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Compressed Size</p>
                <p className="text-base font-bold text-emerald-500">{formatFileSize(result.size)}</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Space Saved</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{formatFileSize(Math.max(0, originalSize - result.size))}</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reduction</p>
                <p className="text-base font-bold text-emerald-500">{percentage}%</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Level Used</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{getLevelName(level, customValue)}</p>
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Processing Time</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{processingTime}s</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-6 max-w-[500px] mx-auto w-full">
          <a 
            href={result.url} 
            download={`compressed_${file.name}`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3 w-full"
          >
            <Download className="w-6 h-6" />
            {t('compress.download_btn') || 'Download compressed PDF'}
          </a>
          <button 
            onClick={onReset}
            className="w-full bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-lg py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            Compress Another PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-12">
      <LoadingOverlay 
        isVisible={isProcessing} 
        message={t('compress.processing_msg') || 'Optimizing and compressing your PDF...'} 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* Uploaded PDF Information Card & First Page Thumbnail */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-md flex flex-col sm:flex-row gap-6 items-center sm:items-start text-left">
        {/* First Page Thumbnail Preview Area */}
        <div className="w-[140px] h-[190px] bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative shadow-sm flex-shrink-0">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-xs">Generating preview...</p>
            </div>
          ) : previewError || !previewUrl ? (
            <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <FileText className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Preview unavailable</p>
            </div>
          ) : (
            <img 
              src={previewUrl} 
              alt="PDF Preview" 
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
        
        {/* Document Metadata Details */}
        <div className="flex-1 space-y-4 text-center sm:text-left w-full">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Document Details</h4>
            <p className="text-lg font-bold text-slate-900 dark:text-white break-all">{file.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages</p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                {pageCount !== null ? pageCount : 'Loading...'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Size</p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('compress.level_label') || 'Choose Compression Level'}
        </h3>
        <p className="text-slate-500 dark:text-slate-400">Select the best balance between file size and quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            id: 'extreme', 
            name: 'Maximum Compression', 
            desc: t('compress.extreme_label') || 'Less quality, high compression', 
            impact: '50% image quality, maximum size reduction. Perfect for email attachments and fast loading.',
            icon: <Zap className="w-6 h-6" />,
            color: 'text-red-500 bg-red-50 dark:bg-red-500/10'
          },
          { 
            id: 'recommended', 
            name: 'Balanced', 
            desc: t('compress.recommended_label') || 'Good quality, good compression', 
            impact: '80% image quality, medium size reduction. Highly recommended balance for reading and sharing.',
            icon: <ShieldCheck className="w-6 h-6" />,
            color: 'text-primary bg-primary/5'
          },
          { 
            id: 'less', 
            name: 'Low Compression', 
            desc: t('compress.less_label') || 'High quality, less compression', 
            impact: '95% image quality, minimal size reduction. Excellent for maintaining perfect vector and image sharpness.',
            icon: <Gauge className="w-6 h-6" />,
            color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'
          }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setLevel(item.id as CompressionLevel)}
            className={`flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all duration-300 ${
              level === item.id 
                ? 'border-primary bg-white dark:bg-slate-800 shadow-xl shadow-primary/10' 
                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${item.color}`}>
              {item.icon}
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.name}</h4>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{item.desc}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">{item.impact}</p>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-10 shadow-xl space-y-8 text-left">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Custom Compression</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fine-tune the compression level manually.</p>
          </div>
          <div className="px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-bold">{customValue}%</span>
          </div>
        </div>

        <input 
          type="range" 
          min="1" 
          max="100" 
          value={customValue}
          onChange={(e) => {
            setCustomValue(parseInt(e.target.value));
            setLevel('custom');
          }}
          className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>High Quality</span>
          <span>Small Size</span>
        </div>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed italic">
          Estimated quality: {100 - customValue}% | Estimated size: ~{Math.round(100 - customValue / 2)}% of original
        </p>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={compressPDF}
          disabled={isProcessing || previewLoading}
          className="btn-primary px-12 py-5 text-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('compress.submit_btn') || 'Compress PDF'}
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
