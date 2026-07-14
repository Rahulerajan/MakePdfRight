import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { 
  Download, 
  CheckCircle2, 
  Table,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFToExcelToolProps {
  file: File;
}

export const PDFToExcelTool: React.FC<PDFToExcelToolProps> = ({ file }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertToExcel = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const allData: any[][] = [];

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
        
        sortedY.forEach(y => {
          const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
          
          // Heuristic for columns: group items that are close horizontally
          const row: string[] = [];
          let currentCell = '';
          let lastX = -1;

          lineItems.forEach((item, idx) => {
            const x = item.transform[4];
            if (lastX !== -1 && x - lastX > 20) { // Threshold for new column
              row.push(currentCell.trim());
              currentCell = '';
            }
            currentCell += ' ' + item.str;
            lastX = x + (item.width || 0);
            
            if (idx === lineItems.length - 1) {
              row.push(currentCell.trim());
            }
          });

          if (row.length > 0) allData.push(row);
        });
        
        // Add empty row between pages
        allData.push([]);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setIsProcessing(false);
      setTimeout(() => {
        setResultUrl(url);
      }, 1500);
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setError(err.message || 'An error occurred while converting the PDF to Excel. Please try again.');
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
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF converted to Excel!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Your data spreadsheet is ready for download.</p>
        </div>
        
        <div className="flex flex-col gap-6">
          <a 
            href={resultUrl} 
            download={`${file.name.replace('.pdf', '')}.xlsx`}
            className="btn-primary text-xl py-5 flex items-center justify-center gap-3"
          >
            <Download className="w-6 h-6" />
            Download Excel file
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
        message="Extracting data to Excel..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 shadow-xl flex flex-col items-center text-center gap-10">
        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500">
          <Table className="w-12 h-12" />
        </div>

        <div className="space-y-4">
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Convert PDF to Excel</h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Extract tables and structured data from your PDF into a clean Excel spreadsheet automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Accurate Extraction</span>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <Zap className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Instant Conversion</span>
          </div>
        </div>

        <button 
          onClick={convertToExcel}
          disabled={isProcessing}
          className="btn-primary w-full max-w-md py-5 text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Convert to Excel
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
