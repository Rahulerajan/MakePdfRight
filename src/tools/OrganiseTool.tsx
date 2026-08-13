import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument, degrees } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  RotateCw, 
  RotateCcw, 
  Undo2, 
  Redo2, 
  GripVertical, 
  CheckSquare, 
  Square, 
  X,
  Plus,
  Eye,
  FilePlus,
  ZoomIn,
  ZoomOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface OrganiseToolProps {
  file: File;
  initialFiles?: File[];
  onReset?: () => void;
}

export interface PageItem {
  id: string;
  sourceFileId: string;
  sourceFileName: string;
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  url: string | null;
  type: 'pdf-page' | 'image' | 'blank';
  imageFile?: File;
  isBlankLandscape?: boolean;
}

export interface SourceFileMeta {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
}

const organizeThumbnailCache = new Map<string, string>();

export const OrganiseTool: React.FC<OrganiseToolProps> = ({ file, initialFiles, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Loading document pages...");
  const [isSaving, setIsSaving] = useState(false);
  
  // State
  const [pages, setPages] = useState<PageItem[]>([]);
  const [sourceFiles, setSourceFiles] = useState<SourceFileMeta[]>([]);

  // History for Undo/Redo
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Preview Inspector Modal
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Output results
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPageCount, setResultPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const resultUrlRef = useRef<string | null>(null);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  const cleanupResultUrl = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupResultUrl();
    };
  }, []);

  // Update pages and update undo/redo history
  const updatePages = useCallback((newPages: PageItem[], pushHistory = true) => {
    if (pushHistory) {
      setHistory(prevHist => {
        const sliced = prevHist.slice(0, historyIndex + 1);
        sliced.push(newPages);
        setHistoryIndex(sliced.length - 1);
        return sliced;
      });
    }
    setPages(newPages);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setPages(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setPages(history[nextIdx]);
    }
  };

  // Helper to load files into the canvas
  const appendFilesToWorkspace = async (filesToLoad: File[]) => {
    setIsProcessing(true);
    setProcessingMessage("Extracting PDF pages...");
    setError(null);

    try {
      const newSourceMetas: SourceFileMeta[] = [];
      const newPageItems: PageItem[] = [];

      for (let fIdx = 0; fIdx < filesToLoad.length; fIdx++) {
        const targetFile = filesToLoad[fIdx];
        const sourceId = `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        if (targetFile.type === 'application/pdf' || targetFile.name.toLowerCase().endsWith('.pdf')) {
          const arrayBuffer = await targetFile.arrayBuffer();
          const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          const numPages = pdf.numPages;

          if (numPages === 0) continue;

          newSourceMetas.push({
            id: sourceId,
            file: targetFile,
            name: targetFile.name,
            size: targetFile.size,
            pageCount: numPages
          });

          const cacheBaseKey = `${targetFile.name}-${targetFile.size}`;

          for (let pNum = 1; pNum <= numPages; pNum++) {
            const pageIdx = pNum - 1;
            const cachedUrl = organizeThumbnailCache.get(`${cacheBaseKey}-${pageIdx}`);
            
            newPageItems.push({
              id: `page-${sourceId}-${pageIdx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              sourceFileId: sourceId,
              sourceFileName: targetFile.name,
              originalIndex: pageIdx,
              rotation: 0,
              url: cachedUrl || null,
              type: 'pdf-page'
            });
          }

          // Generate thumbnails in background
          setTimeout(async () => {
            for (let pNum = 1; pNum <= numPages; pNum++) {
              const pageIdx = pNum - 1;
              const cacheKey = `${cacheBaseKey}-${pageIdx}`;
              if (!organizeThumbnailCache.has(cacheKey)) {
                try {
                  const pdfPage = await pdf.getPage(pNum);
                  const viewport = pdfPage.getViewport({ scale: 0.75 });
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await pdfPage.render({ canvasContext: ctx!, viewport, canvas: canvas as any }).promise;
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                  organizeThumbnailCache.set(cacheKey, dataUrl);

                  setPages(prev => prev.map(p => 
                    p.sourceFileId === sourceId && p.originalIndex === pageIdx 
                      ? { ...p, url: dataUrl } 
                      : p
                  ));
                } catch (e) {
                  console.warn(`Thumbnail generation failed for page ${pNum}`, e);
                }
              }
            }
          }, 30);

        } else if (targetFile.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(targetFile.name)) {
          const imageUrl = URL.createObjectURL(targetFile);
          newSourceMetas.push({
            id: sourceId,
            file: targetFile,
            name: targetFile.name,
            size: targetFile.size,
            pageCount: 1
          });

          newPageItems.push({
            id: `page-img-${sourceId}-${Date.now()}`,
            sourceFileId: sourceId,
            sourceFileName: targetFile.name,
            originalIndex: -1,
            rotation: 0,
            url: imageUrl,
            type: 'image',
            imageFile: targetFile
          });
        }
      }

      setSourceFiles(prev => [...prev, ...newSourceMetas]);
      
      setPages(prev => {
        const combined = [...prev, ...newPageItems];
        setHistory([combined]);
        setHistoryIndex(0);
        return combined;
      });

      setIsProcessing(false);
    } catch (err: any) {
      console.error("Failed to load document:", err);
      setError(err.message || "Failed to parse document pages.");
      setIsProcessing(false);
    }
  };

  // Initial load
  useEffect(() => {
    const filesToLoad = (initialFiles && initialFiles.length > 0) ? initialFiles : [file];
    appendFilesToWorkspace(filesToLoad);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) deleteSelectedPages();
      } else if (e.key === 'Escape') {
        if (previewPageId) setPreviewPageId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedIds, previewPageId]);

  // Selection Logic
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(pages.map(p => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // Page Operations
  const rotatePages = (angle: number, targetId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idsToRotate = targetId ? new Set([targetId]) : (selectedIds.size > 0 ? selectedIds : new Set(pages.map(p => p.id)));
    if (idsToRotate.size === 0) return;

    const updated = pages.map(p => {
      if (idsToRotate.has(p.id)) {
        return { ...p, rotation: (p.rotation + angle + 360) % 360 };
      }
      return p;
    });
    updatePages(updated);
  };

  const deleteSelectedPages = (targetId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idsToDelete = targetId ? new Set([targetId]) : selectedIds;
    if (idsToDelete.size === 0) return;

    if (pages.length - idsToDelete.size < 1) {
      setError("Cannot delete all pages. At least one page must remain.");
      return;
    }

    const updated = pages.filter(p => !idsToDelete.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.delete(id));
      return next;
    });
    updatePages(updated);
  };

  // Insert Blank Page
  const insertBlankPage = (landscape = false) => {
    let insertIndex = pages.length;
    if (selectedIds.size > 0) {
      const selectedIndices = pages.map((p, idx) => selectedIds.has(p.id) ? idx : -1).filter(idx => idx !== -1);
      if (selectedIndices.length > 0) {
        insertIndex = Math.max(...selectedIndices) + 1;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = landscape ? 300 : 212;
    canvas.height = landscape ? 212 : 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    const blankPageItem: PageItem = {
      id: `blank-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceFileId: 'blank-source',
      sourceFileName: landscape ? 'Blank Landscape' : 'Blank Portrait',
      originalIndex: -1,
      rotation: 0,
      url: canvas.toDataURL('image/jpeg', 0.9),
      type: 'blank',
      isBlankLandscape: landscape
    };

    const updated = [...pages];
    updated.splice(insertIndex, 0, blankPageItem);
    updatePages(updated);
  };

  // Drag and Drop Handler Functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...pages];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    updatePages(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save & Export PDF
  const saveOrganizedPDF = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (pages.length === 0) throw new Error("No pages in document.");

      const newDoc = await PDFDocument.create();

      const loadedPdfDocsMap = new Map<string, PDFDocument>();
      for (const sFile of sourceFiles) {
        if (sFile.file.type === 'application/pdf' || sFile.name.toLowerCase().endsWith('.pdf')) {
          const ab = await sFile.file.arrayBuffer();
          const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
          loadedPdfDocsMap.set(sFile.id, doc);
        }
      }

      for (const pageItem of pages) {
        if (pageItem.type === 'pdf-page') {
          const sourceDoc = loadedPdfDocsMap.get(pageItem.sourceFileId);
          if (sourceDoc) {
            const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageItem.originalIndex]);
            if (pageItem.rotation !== 0) {
              const currentAngle = copiedPage.getRotation().angle || 0;
              copiedPage.setRotation(degrees((currentAngle + pageItem.rotation) % 360));
            }
            newDoc.addPage(copiedPage);
          }
        } else if (pageItem.type === 'image' && pageItem.imageFile) {
          const imgBytes = await pageItem.imageFile.arrayBuffer();
          let embeddedImg;
          if (pageItem.imageFile.type.includes('png') || pageItem.imageFile.name.toLowerCase().endsWith('.png')) {
            embeddedImg = await newDoc.embedPng(imgBytes);
          } else {
            embeddedImg = await newDoc.embedJpg(imgBytes);
          }
          const page = newDoc.addPage([embeddedImg.width, embeddedImg.height]);
          page.drawImage(embeddedImg, { x: 0, y: 0, width: embeddedImg.width, height: embeddedImg.height });
          if (pageItem.rotation !== 0) {
            page.setRotation(degrees(pageItem.rotation));
          }
        } else if (pageItem.type === 'blank') {
          const width = pageItem.isBlankLandscape ? 841.89 : 595.28;
          const height = pageItem.isBlankLandscape ? 595.28 : 841.89;
          const blankPage = newDoc.addPage([width, height]);
          if (pageItem.rotation !== 0) {
            blankPage.setRotation(degrees(pageItem.rotation));
          }
        }
      }

      const pdfBytes = await newDoc.save();
      const actualCount = pages.length;

      cleanupResultUrl();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      const outputName = `organized_${file.name}`;

      HistoryService.addHistoryItem({
        toolId: 'organise',
        toolName: 'Organize PDF',
        fileName: outputName,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Saved ${actualCount} pages in exact sequence`
      });

      setIsSaving(false);
      setResultPageCount(actualCount);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'An error occurred while building the PDF.');
      setIsSaving(false);
    }
  };

  // Preview Inspector Navigation
  const currentPreviewIndex = pages.findIndex(p => p.id === previewPageId);
  const currentPreviewPage = currentPreviewIndex !== -1 ? pages[currentPreviewIndex] : null;

  // SUCCESS SCREEN
  if (resultUrl) {
    return (
      <ResultPanel
        title="PDF Organized Successfully!"
        subtitle="Your document pages have been reordered and saved in your desired arrangement."
        details={
          resultPageCount !== null
            ? [{ label: `Output Document: ${resultPageCount} pages` }]
            : undefined
        }
        downloadUrl={resultUrl}
        downloadFileName={`organized_${file.name}`}
        downloadLabel="Download Organized PDF"
        onBack={() => setResultUrl(null)}
        onReset={() => {
          setResultUrl(null);
          if (onReset) onReset();
        }}
        resetLabel="Organize Another File"
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      {/* Hidden File Input for Adding Extra PDFs or Images */}
      <input 
        type="file" 
        ref={addFileInputRef} 
        multiple 
        accept=".pdf,image/*,image/jpeg,image/png" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            appendFilesToWorkspace(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      <LoadingOverlay isVisible={isProcessing} message={processingMessage} onCancel={() => setIsProcessing(false)} />
      <LoadingOverlay 
        isVisible={isSaving} 
        message="Generating PDF..." 
        error={error}
        onCloseError={() => setError(null)}
        onCancel={() => setIsSaving(false)}
      />

      {/* TOP HEADER TOOLBAR */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          {onReset && (
            <BackButton 
              onClick={onReset} 
              label="" 
              className="min-w-[38px] min-h-[38px] p-2"
            />
          )}
          <div className="bg-[#E5322D] text-white font-black px-2 py-0.5 rounded text-sm tracking-wider">
            PDF
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
              Organize PDF
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} total • Drag thumbnails to rearrange
            </p>
          </div>
        </div>

        {/* TOP RIGHT MAIN ACTION */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveOrganizedPDF}
            disabled={pages.length === 0 || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5322D] hover:bg-red-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span>Organize PDF</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SECONDARY ACTION CONTROL BAR */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shrink-0 z-10">
        {/* Left Control Group */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Add Files */}
          <button
            type="button"
            onClick={() => addFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5322D]" />
            <span>Add Files</span>
          </button>

          {/* Add Blank Page */}
          <button
            type="button"
            onClick={() => insertBlankPage(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Insert a blank A4 page"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>+ Blank Page</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Select All Toggle */}
          <button
            type="button"
            onClick={selectedIds.size === pages.length ? deselectAll : selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {selectedIds.size === pages.length ? <CheckSquare className="w-3.5 h-3.5 text-[#E5322D]" /> : <Square className="w-3.5 h-3.5" />}
            <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
          </button>

          {/* Selected Count Indicator */}
          {selectedIds.size > 0 && (
            <span className="text-[#E5322D] font-extrabold bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900">
              {selectedIds.size} Selected
            </span>
          )}
        </div>

        {/* Right Action Group: Rotate, Delete, Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => rotatePages(-90)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => rotatePages(90)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteSelectedPages()}
            disabled={selectedIds.size === 0}
            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#E5322D] hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-30 transition-colors cursor-pointer"
            title="Delete Selected Page(s)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CANVAS: DRAG AND DROP GRID */}
      <main className="flex-1 min-h-0 bg-slate-100/70 dark:bg-slate-900/70 p-4 sm:p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-extrabold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Page Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {pages.map((page, idx) => {
            const isSelected = selectedIds.has(page.id);
            const isBeingDragged = draggedIndex === idx;
            const isDragTarget = dragOverIndex === idx && draggedIndex !== idx;

            return (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={(e) => toggleSelect(page.id, e)}
                className={`group relative bg-white dark:bg-slate-800 rounded-xl border-2 transition-all p-2 flex flex-col items-center select-none cursor-grab active:cursor-grabbing ${
                  isBeingDragged
                    ? 'opacity-30 scale-95 border-dashed border-slate-400'
                    : isDragTarget
                    ? 'border-[#E5322D] border-dashed ring-4 ring-[#E5322D]/20 bg-red-50/40 dark:bg-red-950/40 scale-105 z-10'
                    : isSelected
                    ? 'border-[#E5322D] ring-2 ring-[#E5322D]/20 shadow-md bg-red-50/10 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Checkbox at Top-Left */}
                <div className="absolute top-2.5 left-2.5 z-20">
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(page.id, e)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#E5322D] text-white shadow-xs' 
                        : 'bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 text-transparent group-hover:text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                {/* Top Quick Actions (Hover Overlay) */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreviewPageId(page.id); setPreviewZoom(1); }}
                    className="p-1 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-blue-600 rounded shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Inspect Page"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => rotatePages(90, page.id, e)}
                    className="p-1 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-[#E5322D] rounded shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Rotate Page"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => deleteSelectedPages(page.id, e)}
                    className="p-1 bg-[#E5322D] text-white hover:bg-red-700 rounded shadow-xs cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Page Thumbnail Canvas Container */}
                <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative border border-slate-100 dark:border-slate-800/60">
                  {page.url ? (
                    <motion.img 
                      animate={{ rotate: page.rotation }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      src={page.url} 
                      alt={`Page ${idx + 1}`} 
                      className="max-w-full max-h-full object-contain p-1" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
                      <div className="w-8 h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  )}

                  {/* Drag Handle Indicator */}
                  <div className="absolute bottom-1.5 left-1.5 p-1 bg-white/80 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 pointer-events-none opacity-60">
                    <GripVertical className="w-3 h-3 text-slate-500" />
                  </div>
                </div>

                {/* Page Number & Info Label */}
                <div className="w-full mt-2 flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300 px-1">
                  <span>Page {idx + 1}</span>
                  {page.rotation !== 0 && (
                    <span className="text-[#E5322D] font-black text-[11px]">{page.rotation}°</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* FULL-SCREEN PREVIEW INSPECTOR MODAL */}
      <AnimatePresence>
        {previewPageId && currentPreviewPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewPageId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900 dark:text-white">
                    Preview Page {currentPreviewIndex + 1} of {pages.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                    ({currentPreviewPage.sourceFileName})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-xs font-bold">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.25))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="px-2">{Math.round(previewZoom * 100)}%</span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(2.5, z + 0.25))}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => rotatePages(90, currentPreviewPage.id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="Rotate Page 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPreviewPageId(null)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 min-h-0 bg-slate-950 p-6 flex items-center justify-center overflow-auto relative">
                {currentPreviewPage.url && (
                  <motion.img
                    animate={{ rotate: currentPreviewPage.rotation, scale: previewZoom }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    src={currentPreviewPage.url}
                    alt={`Preview Page ${currentPreviewIndex + 1}`}
                    className="max-h-[65vh] object-contain shadow-2xl rounded"
                  />
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <button
                  disabled={currentPreviewIndex <= 0}
                  onClick={() => setPreviewPageId(pages[currentPreviewIndex - 1].id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 font-bold text-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Page {currentPreviewIndex + 1} / {pages.length}
                </span>

                <button
                  disabled={currentPreviewIndex >= pages.length - 1}
                  onClick={() => setPreviewPageId(pages[currentPreviewIndex + 1].id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 font-bold text-xs cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
