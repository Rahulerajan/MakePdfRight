import React, { useState, useEffect, useRef } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument, degrees } from 'pdf-lib';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Trash2, 
  RotateCw, 
  RotateCcw, 
  Copy, 
  Undo2, 
  Redo2, 
  GripVertical, 
  ArrowRight, 
  CheckSquare, 
  Square, 
  Maximize2, 
  AlertCircle, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Move,
  MapPin,
  X
} from 'lucide-react';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { HistoryService } from '../services/historyService';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

interface OrganiseToolProps {
  file: File;
  onReset?: () => void;
}

interface PageItem {
  id: string;
  originalIndex: number;
  rotation: number;
  url: string | null;
}

const organizeThumbnailCache = new Map<string, string>();

export const OrganiseTool: React.FC<OrganiseToolProps> = ({ file, onReset }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pages, setPages] = useState<PageItem[]>([]);
  
  // Undo / Redo history
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Touch Staging & Relocation Logic
  const [stagedPageId, setStagedPageId] = useState<string | null>(null);
  const [jumpPosition, setJumpPosition] = useState<string>('');

  // Preview Modal
  const [previewPage, setPreviewPage] = useState<PageItem | null>(null);

  // Output results
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPageCount, setResultPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

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

  // Update history helper
  const updatePages = (newPages: PageItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPages);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPages(newPages);
  };

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

  // Load and Parse PDF
  useEffect(() => {
    let isMounted = true;
    const loadPDF = async () => {
      setIsProcessing(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        if (totalPages === 0) {
          throw new Error("This PDF document contains zero pages.");
        }

        if (!isMounted) return;

        const cacheBaseKey = `${file.name}-${file.size}`;
        const initialPages: PageItem[] = [];

        for (let i = 1; i <= totalPages; i++) {
          const pageIdx = i - 1;
          const cachedUrl = organizeThumbnailCache.get(`${cacheBaseKey}-${pageIdx}`);
          initialPages.push({
            id: `page-${pageIdx}-${Date.now()}-${i}`,
            originalIndex: pageIdx,
            rotation: 0,
            url: cachedUrl || null
          });
        }

        setPages(initialPages);
        setHistory([initialPages]);
        setHistoryIndex(0);
        setIsProcessing(false);

        // Background progressive thumbnail rendering
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIdx = i - 1;
          const cacheKey = `${cacheBaseKey}-${pageIdx}`;

          if (!organizeThumbnailCache.has(cacheKey)) {
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 0.7 });
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: ctx!, viewport, canvas: canvas as any }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              organizeThumbnailCache.set(cacheKey, dataUrl);

              if (isMounted) {
                setPages(prev => prev.map(p => p.originalIndex === pageIdx ? { ...p, url: dataUrl } : p));
                setHistory(prevHist => prevHist.map(hList => hList.map(p => p.originalIndex === pageIdx ? { ...p, url: dataUrl } : p)));
              }
            } catch (pErr) {
              console.warn(`Failed rendering thumbnail for page ${i}:`, pErr);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to parse PDF:", err);
        let msg = "Failed to open PDF document. Please make sure it is a valid PDF file.";
        if (err.name === 'PasswordException' || err.message?.includes('password')) {
          msg = "This PDF is password-protected. Please unlock or remove password protection before organizing.";
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
        setIsProcessing(false);
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Selection Logic
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pages.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectOdd = () => {
    setSelectedIds(new Set(pages.filter((_, idx) => idx % 2 === 0).map(p => p.id)));
  };

  const selectEven = () => {
    setSelectedIds(new Set(pages.filter((_, idx) => idx % 2 === 1).map(p => p.id)));
  };

  // Reorder Logic
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= pages.length) return;
    const updated = [...pages];
    const [removed] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, removed);
    updatePages(updated);
  };

  const stagePage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStagedPageId(prev => (prev === id ? null : id));
  };

  const moveStagedToTarget = (targetId: string, position: 'before' | 'after', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!stagedPageId || stagedPageId === targetId) return;

    const fromIdx = pages.findIndex(p => p.id === stagedPageId);
    if (fromIdx === -1) return;

    const updated = [...pages];
    const [stagedItem] = updated.splice(fromIdx, 1);

    let targetIdx = updated.findIndex(p => p.id === targetId);
    if (targetIdx === -1) return;

    if (position === 'after') {
      targetIdx = targetIdx + 1;
    }

    updated.splice(targetIdx, 0, stagedItem);
    updatePages(updated);
    setStagedPageId(null);
  };

  const movePageToPosition = (pageId: string, targetPositionOneBased: number) => {
    const fromIdx = pages.findIndex(p => p.id === pageId);
    if (fromIdx === -1) return;

    let toIdx = targetPositionOneBased - 1;
    if (toIdx < 0) toIdx = 0;
    if (toIdx >= pages.length) toIdx = pages.length - 1;
    if (fromIdx === toIdx) return;

    moveItem(fromIdx, toIdx);
  };

  // Page Actions (Bulk or Single)
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

  const deletePages = (targetId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idsToDelete = targetId ? new Set([targetId]) : selectedIds;
    if (idsToDelete.size === 0) return;

    if (pages.length - idsToDelete.size < 1) {
      setError("Cannot delete all pages. At least one page must remain in the document.");
      return;
    }

    if (stagedPageId && idsToDelete.has(stagedPageId)) {
      setStagedPageId(null);
    }

    const updated = pages.filter(p => !idsToDelete.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      idsToDelete.forEach(id => next.delete(id));
      return next;
    });
    updatePages(updated);
  };

  const duplicatePages = (targetId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const idsToDuplicate = targetId ? new Set([targetId]) : selectedIds;
    if (idsToDuplicate.size === 0) return;

    const updated: PageItem[] = [];
    pages.forEach(p => {
      updated.push(p);
      if (idsToDuplicate.has(p.id)) {
        updated.push({
          ...p,
          id: `page-${p.originalIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        });
      }
    });
    updatePages(updated);
  };

  // Export & Save Organized PDF
  const saveOrganizedPDF = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      for (const pageItem of pages) {
        const [copiedPage] = await newDoc.copyPages(sourceDoc, [pageItem.originalIndex]);
        if (pageItem.rotation !== 0) {
          const currentAngle = copiedPage.getRotation().angle || 0;
          copiedPage.setRotation(degrees((currentAngle + pageItem.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();

      // Verify page count
      const verifyPdf = await PDFDocument.load(pdfBytes);
      const actualCount = verifyPdf.getPageCount();

      cleanupResultUrl();

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      HistoryService.addHistoryItem({
        toolId: 'organise',
        toolName: 'Organize PDF',
        fileName: `organized_${file.name}`,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Reordered & saved ${actualCount} page(s)`
      });

      setIsSaving(false);
      setResultPageCount(actualCount);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Organization export failed:', err);
      setError(err.message || 'An error occurred while building the organized PDF. Please try again.');
      setIsSaving(false);
    }
  };

  // SUCCESS SCREEN
  if (resultUrl) {
    return (
      <ResultPanel
        title="PDF organized successfully!"
        subtitle="Your document pages have been reordered and saved in exact sequence."
        details={
          resultPageCount !== null
            ? [
                {
                  label: `Verified Output: ${resultPageCount} ${
                    resultPageCount === 1 ? 'page' : 'pages'
                  } in new structure`,
                },
              ]
            : undefined
        }
        downloadUrl={resultUrl}
        downloadFileName={`organized_${file.name}`}
        downloadLabel="Download PDF"
        onReset={() => {
          setResultUrl(null);
          if (onReset) onReset();
        }}
        resetLabel="Organize More"
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
      className="flex flex-col h-full w-full bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
    >
      <LoadingOverlay isVisible={isProcessing} message="Parsing & preparing document..." />
      <LoadingOverlay 
        isVisible={isSaving} 
        message="Generating organized PDF..." 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* TOP NAVBAR */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onReset && (
            <BackButton 
              onClick={onReset} 
              label="" 
              className="min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] p-2"
            />
          )}
          <div className="bg-[#E5322D] text-white font-black px-2.5 py-1 rounded text-lg tracking-wider shadow-xs">
            PDF
          </div>
          <span className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white truncate">
            Organize PDF Pages
          </span>
        </div>

        {/* TOP TOOLBAR: UNDO / REDO / PAGE COUNT */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </span>
        </div>
      </header>

      {/* SECONDARY TOOLBAR FOR BULK OPERATIONS */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shrink-0 z-10">
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={selectedIds.size === pages.length ? deselectAll : selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {selectedIds.size === pages.length ? <CheckSquare className="w-4 h-4 text-[#E5322D]" /> : <Square className="w-4 h-4" />}
            <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
          </button>

          <button
            onClick={selectOdd}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Select Odd
          </button>
          <button
            onClick={selectEven}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Select Even
          </button>

          {selectedIds.size > 0 && (
            <span className="text-[#E5322D] font-extrabold bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900">
              {selectedIds.size} Selected
            </span>
          )}
        </div>

        {/* BULK ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => rotatePages(-90)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Rotate Left 90° (Selected / All)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => rotatePages(90)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Rotate Right 90° (Selected / All)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => duplicatePages()}
            disabled={selectedIds.size === 0}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
            title="Duplicate Selected Page(s)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => deletePages()}
            disabled={selectedIds.size === 0}
            className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#E5322D] hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-40 transition-colors cursor-pointer"
            title="Delete Selected Page(s)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANEL WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT CANVAS: Interactive Thumbnail Grid */}
        <main className="flex-1 min-h-0 bg-[#eef0f3] dark:bg-slate-900/80 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-extrabold cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Touch Staging Active Banner */}
          {stagedPageId && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                  {pages.findIndex(p => p.id === stagedPageId) + 1}
                </div>
                <div>
                  <p className="text-xs font-extrabold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Page {pages.findIndex(p => p.id === stagedPageId) + 1} is Staged for Relocation</span>
                  </p>
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Tap <strong>"Before"</strong> or <strong>"After"</strong> on any page card to move it there.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStagedPageId(null)}
                className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-xs font-bold text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Staging</span>
              </button>
            </motion.div>
          )}

          <Reorder.Group 
            axis="y" 
            values={pages} 
            onReorder={updatePages}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {pages.map((page, idx) => {
              const isSelected = selectedIds.has(page.id);
              const isStaged = stagedPageId === page.id;
              const stagedIndex = pages.findIndex(p => p.id === stagedPageId);

              return (
                <Reorder.Item
                  key={page.id}
                  value={page}
                  onClick={(e) => {
                    if (stagedPageId && !isStaged) {
                      moveStagedToTarget(page.id, 'before', e);
                    } else {
                      toggleSelect(page.id, e);
                    }
                  }}
                  className={`group relative bg-white dark:bg-slate-800 rounded-xl border-2 transition-all p-2.5 flex flex-col items-center select-none cursor-pointer ${
                    isStaged
                      ? 'border-amber-500 dark:border-amber-400 ring-4 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/30 shadow-lg scale-[1.02] z-10'
                      : isSelected
                      ? 'border-[#E5322D] ring-2 ring-[#E5322D]/20 shadow-md bg-red-50/20 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <button
                      type="button"
                      onClick={(e) => toggleSelect(page.id, e)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#E5322D] text-white shadow-xs' 
                          : 'bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 text-transparent group-hover:text-slate-400'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Top Action Bar Overlay */}
                  <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => stagePage(page.id, e)}
                      className={`p-1.5 rounded shadow-xs border cursor-pointer transition-colors ${
                        isStaged 
                          ? 'bg-amber-500 text-white border-amber-600' 
                          : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-amber-600 hover:border-amber-400 border-slate-200 dark:border-slate-700'
                      }`}
                      title={isStaged ? "Cancel Staging" : "Stage Page for Moving (Touch/Click)"}
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => rotatePages(90, page.id, e)}
                      className="p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-[#E5322D] rounded shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Rotate Page"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => duplicatePages(page.id, e)}
                      className="p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-[#E5322D] rounded shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deletePages(page.id, e)}
                      className="p-1.5 bg-[#E5322D] text-white hover:bg-red-700 rounded shadow-xs cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Staged Target Overlay */}
                  {stagedPageId && !isStaged && (
                    <div className="absolute inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-2 p-2">
                      <span className="text-[10px] font-black tracking-wider uppercase text-white bg-slate-900/80 px-2 py-0.5 rounded-full shadow-xs">
                        Relocate Page {stagedIndex + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => moveStagedToTarget(page.id, 'before', e)}
                          className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          ← Before
                        </button>
                        <button
                          type="button"
                          onClick={(e) => moveStagedToTarget(page.id, 'after', e)}
                          className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          After →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thumbnail Image Frame */}
                  <div className="w-full aspect-[1/1.414] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative">
                    {page.url ? (
                      <motion.img 
                        animate={{ rotate: page.rotation }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        src={page.url} 
                        alt={`Page ${idx + 1}`} 
                        className="max-w-full max-h-full object-contain p-1" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-100 dark:bg-slate-900 animate-pulse">
                        <div className="w-10 h-14 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    )}

                    {/* Staged Badge */}
                    {isStaged && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-amber-500 text-white font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Staged</span>
                      </div>
                    )}

                    {/* Drag Handle Icon */}
                    <div className="absolute bottom-2 left-2 p-1 bg-white/80 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700 pointer-events-none opacity-60">
                      <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                    </div>

                    {/* Quick Move Arrows */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveItem(idx, idx - 1); }}
                          className="p-1 bg-white/90 dark:bg-slate-800/90 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < pages.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveItem(idx, idx + 1); }}
                          className="p-1 bg-white/90 dark:bg-slate-800/90 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Page Meta Label */}
                  <div className="w-full mt-2 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
                    <span>Page {idx + 1}</span>
                    {page.rotation !== 0 && (
                      <span className="text-[#E5322D] font-extrabold">{page.rotation}°</span>
                    )}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </main>

        {/* RIGHT SIDEBAR: Controls */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 max-h-[45vh] md:max-h-none md:h-full min-h-0 z-20">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Document Summary
            </h2>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Original Pages:</span>
                <span className="text-slate-900 dark:text-white font-extrabold">{file.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Current Layout:</span>
                <span className="text-[#E5322D] font-extrabold">{pages.length} Pages</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Instructions & Touch Controls</div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <p>📍 <strong>Stage & Move:</strong> Tap the <Move className="w-3 h-3 inline-block mx-0.5 text-amber-500" /> icon on any page card to stage it, then tap "Before" or "After" on any target page to relocate it.</p>
                <p>✋ <strong>Drag cards</strong> to reorder pages directly.</p>
                <p>☑ <strong>Select pages</strong> to bulk rotate, duplicate, or delete.</p>
              </div>
            </div>

            {/* Jump to Position Control */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                Move Page to Position #
              </label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  min={1}
                  max={pages.length}
                  placeholder={`Position (1 - ${pages.length})`}
                  value={jumpPosition}
                  onChange={(e) => setJumpPosition(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E5322D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const pos = parseInt(jumpPosition, 10);
                    if (!isNaN(pos)) {
                      const targetId = stagedPageId || (selectedIds.size === 1 ? Array.from(selectedIds)[0] : null);
                      if (targetId) {
                        movePageToPosition(targetId, pos);
                        setJumpPosition('');
                        if (stagedPageId) setStagedPageId(null);
                      } else {
                        setError("Please stage or select a page first to move it to a specific position.");
                      }
                    }
                  }}
                  className="px-3.5 py-2 bg-[#E5322D] text-white font-extrabold text-xs rounded-lg hover:bg-red-700 transition-colors cursor-pointer shrink-0"
                >
                  Move
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button 
              onClick={saveOrganizedPDF}
              disabled={isSaving || isProcessing || pages.length === 0}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
            >
              <span>Organize & Save PDF</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
