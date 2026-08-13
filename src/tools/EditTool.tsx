import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../components/ThemeContext';
import { pdfjs } from '../utils/pdfWorker';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Type,
  Image as ImageIcon,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Save,
  Plus,
  Search,
  RefreshCw,
  Undo,
  Redo,
  Sparkles,
  Users,
  Grid,
  FileText,
  Clock,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Moon,
  Sun,
  PenTool,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Sliders,
  X
} from 'lucide-react';
import { CanvasElement } from './pdf-editor/CanvasElements';
import { SidebarPanels } from './pdf-editor/SidebarPanels';
import { HistoryService } from '../services/historyService';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { BackButton } from '../components/common/BackButton';
import { 
  EditorElement, 
  DrawingStroke, 
  TrackChange, 
  DocumentVersion, 
  PageConfig, 
  CollaborationUser,
  TableCell
} from '../types/editor';

// Helper to convert hex colors to rgb for pdf-lib
const hexToRgbColor = (hex: string) => {
  let cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) return rgb(1, 1, 1);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return rgb(r, g, b);
};

interface TextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

const extractRunsForPage = async (pdfObj: any, pageIndex: number): Promise<TextRun[]> => {
  const page = await pdfObj.getPage(pageIndex + 1);
  const textContent = await page.getTextContent();
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const editorScale = 612 / (unscaledViewport.width || 612);
  const vp = page.getViewport({ scale: editorScale });

  const runs: TextRun[] = [];
  for (const item of textContent.items as any[]) {
    if (item.str && item.str.trim().length > 0) {
      const [vx, vy] = vp.convertToViewportPoint(item.transform[4], item.transform[5]);
      const rawFontSize = Math.hypot(item.transform[2], item.transform[3]) || Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12;
      const fontSize = Math.max(8, Math.round(rawFontSize * editorScale));
      const width = Math.max(12, item.width * editorScale);
      const height = Math.max(fontSize, Math.round(fontSize * 1.15));
      const x = vx;
      const y = vy - fontSize;
      const fontStyle = textContent.styles?.[item.fontName];
      const fontFamily = fontStyle?.fontFamily || 'sans-serif';

      runs.push({
        text: item.str,
        x,
        y,
        width,
        height,
        fontSize,
        fontFamily
      });
    }
  }
  return runs;
};

const sampleBackgroundColor = (pageUrl: string, runX: number, runY: number, runWidth: number, runHeight: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#ffffff');
          return;
        }
        ctx.drawImage(img, 0, 0);

        const scaleX = img.width / 612;
        const scaleY = img.height / 792;

        const sampleX = Math.min(img.width - 1, Math.max(0, Math.round((runX + runWidth / 2) * scaleX)));
        const sampleY = Math.min(img.height - 1, Math.max(0, Math.round((runY - 4) * scaleY)));

        const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
        const r = pixel[0].toString(16).padStart(2, '0');
        const g = pixel[1].toString(16).padStart(2, '0');
        const b = pixel[2].toString(16).padStart(2, '0');
        resolve(`#${r}${g}${b}`);
      } catch (err) {
        resolve('#ffffff');
      }
    };
    img.onerror = () => resolve('#ffffff');
    img.src = pageUrl;
  });
};

interface EditToolProps {
  file: File;
  onReset?: () => void;
}

// Global, reusable editor page preview cache to avoid redundant renders on navigate
const editorPageCache = new Map<string, string>();

export const EditTool: React.FC<EditToolProps> = ({ file, onReset }) => {
  // --- Loading / Base States ---
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Preparing document...');
  const [docName, setDocName] = useState(file?.name ? file.name.replace(/\.pdf$/i, '') : 'document');
  const [searchQuery, setSearchQuery] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'text' | 'draw' | 'comment' | 'shape' | 'table' | 'signature' | 'form'>('select');

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

  // --- Page Text Runs for Click-To-Edit & Preloading ---
  const [pageTextRuns, setPageTextRuns] = useState<Record<number, TextRun[]>>({});
  const [hoveredRunPage, setHoveredRunPage] = useState<number | null>(null);
  const pdfDocRef = useRef<any>(null);
  const extractedPagesRef = useRef<Set<number>>(new Set());

  // Helper to preload text runs for adjacent pages around targetPage
  const preloadAdjacentPageTextRuns = useCallback(async (targetPage: number) => {
    const pdfObj = pdfDocRef.current;
    if (!pdfObj) return;

    const totalPages = pdfObj.numPages;
    const pagesToPreload = [
      targetPage,
      targetPage - 1,
      targetPage + 1,
      targetPage - 2,
      targetPage + 2,
      targetPage - 3,
      targetPage + 3
    ].filter(idx => idx >= 0 && idx < totalPages);

    for (const pageIdx of pagesToPreload) {
      if (extractedPagesRef.current.has(pageIdx)) continue;
      extractedPagesRef.current.add(pageIdx);
      try {
        const runs = await extractRunsForPage(pdfObj, pageIdx);
        setPageTextRuns(prev => (prev[pageIdx] ? prev : { ...prev, [pageIdx]: runs }));
      } catch (err) {
        console.error(`Failed to preload text runs for page ${pageIdx}:`, err);
      }
    }
  }, []);

  // Preload adjacent page text runs whenever currentPage changes
  useEffect(() => {
    if (pdfDocRef.current) {
      preloadAdjacentPageTextRuns(currentPage);
    }
  }, [currentPage, preloadAdjacentPageTextRuns]);

  // --- Drawing / Pencil Tool States ---
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null);
  const [drawingColor, setDrawingColor] = useState('#0f172a');
  const [drawingThickness, setDrawingThickness] = useState(3);
  const [drawingOpacity, setDrawingOpacity] = useState(1);
  const [drawingTool, setDrawingTool] = useState<'pen' | 'pencil' | 'highlighter' | 'eraser'>('pen');

  // --- Undo / Redo & Save History States ---
  const [history, setHistory] = useState<{ elements: EditorElement[]; strokes: DrawingStroke[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  // --- Collaboration Mode ---
  const [isCollabActive, setIsCollabActive] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollaborationUser[]>([]);
  const [trackChanges, setTrackChanges] = useState<TrackChange[]>([]);

  // --- AI & OCR States ---
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // --- Mobile Sidebar / Properties States ---
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  // Auto-resize zoom based on device screen sizes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // Mobile
        const targetWidth = window.innerWidth - 32; // 16px padding on each side
        const calculatedZoom = Math.min(1.0, targetWidth / 612);
        setZoom(calculatedZoom);
      } else if (window.innerWidth < 1024) {
        // Tablet
        const targetWidth = window.innerWidth - 64; // 32px padding on each side
        const calculatedZoom = Math.min(1.0, targetWidth / 612);
        setZoom(calculatedZoom);
      } else {
        // Desktop default is fine, let user zoom as they wish
        setZoom(1.0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Visual Mode Themes ---
  const { theme, toggleTheme } = useTheme();
  const themeMode = theme;

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Push State to History (for undo/redo)
  const pushHistory = (newElements: EditorElement[], newStrokes: DrawingStroke[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push({ elements: JSON.parse(JSON.stringify(newElements)), strokes: JSON.parse(JSON.stringify(newStrokes)) });
    
    // Limit history stack size to 30 elements
    if (updatedHistory.length > 30) {
      updatedHistory.shift();
    }
    
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setElements(prev.elements);
      setStrokes(prev.strokes);
      setHistoryIndex(historyIndex - 1);
      setSelectedId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setElements(next.elements);
      setStrokes(next.strokes);
      setHistoryIndex(historyIndex + 1);
      setSelectedId(null);
    }
  };

  // --- Load PDF File ---
  useEffect(() => {
    let isMounted = true;
    const loadPDF = async () => {
      setIsProcessing(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        if (!isMounted) return;

        // Initialize state arrays and check cache for immediate non-blocking rendering
        const configs: PageConfig[] = [];
        const initialPages: (string | null)[] = [];
        const cacheBaseKey = `${file.name}-${file.size}`;

        for (let i = 0; i < totalPages; i++) {
          configs.push({
            index: i,
            rotation: 0,
            header: { showPageNumbers: true },
            footer: { showPageNumbers: true }
          });
          const cachedUrl = editorPageCache.get(`${cacheBaseKey}-${i}`);
          initialPages.push(cachedUrl || null);
        }

        setPageConfigs(configs);
        setPages(initialPages as string[]); // Cast to match type safely

        // Seed initial version history
        const initialElements: EditorElement[] = [];
        const initialStrokes: DrawingStroke[] = [];
        setElements(initialElements);
        setStrokes(initialStrokes);
        setHistory([{ elements: initialElements, strokes: initialStrokes }]);
        setHistoryIndex(0);

        setVersions([
          {
            id: 'v1',
            name: 'Original Import',
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            author: 'System',
            elements: [],
            strokes: []
          }
        ]);

        pdfDocRef.current = pdf;
        extractedPagesRef.current.clear();

        // Immediately preload text runs for current and adjacent pages
        preloadAdjacentPageTextRuns(0);

        // Unblock UI immediately after skeleton layout is established
        setIsProcessing(false);

        // Render each page asynchronously in the background
        for (let i = 1; i <= totalPages; i++) {
          if (!isMounted) return;
          const pageIndex = i - 1;
          const cacheKey = `${cacheBaseKey}-${pageIndex}`;

          // Extract text runs if not already preloaded/extracted
          if (!extractedPagesRef.current.has(pageIndex)) {
            extractedPagesRef.current.add(pageIndex);
            try {
              const runs = await extractRunsForPage(pdf, pageIndex);
              if (isMounted) {
                setPageTextRuns(prev => (prev[pageIndex] ? prev : { ...prev, [pageIndex]: runs }));
              }
            } catch (te) {
              console.error('Failed to extract text runs for page', pageIndex, te);
            }
          }

          if (editorPageCache.has(cacheKey)) {
            continue; // Already processed
          }
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport, canvas: canvas as any }).promise;
          const dataUrl = canvas.toDataURL();

          if (isMounted) {
            editorPageCache.set(cacheKey, dataUrl);
            setPages(prev => {
              const updated = [...prev];
              updated[pageIndex] = dataUrl;
              return updated;
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to load PDF:', err);
        setError('Error rendering document. Please verify the PDF format and try again.');
        setIsProcessing(false);
      }
    };
    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Delete key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Copy & Paste elements
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c' && selectedId) {
        e.preventDefault();
        const active = elements.find(el => el.id === selectedId);
        if (active) {
          localStorage.setItem('pdf_clipboard_elem', JSON.stringify(active));
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const savedStr = localStorage.getItem('pdf_clipboard_elem');
        if (savedStr) {
          try {
            const parsed = JSON.parse(savedStr);
            const copy: EditorElement = {
              ...parsed,
              id: Math.random().toString(36).substring(2, 11),
              x: parsed.x + 30,
              y: parsed.y + 30,
              pageIndex: currentPage
            };
            const nextElements = [...elements, copy];
            setElements(nextElements);
            pushHistory(nextElements, strokes);
            setSelectedId(copy.id);
          } catch (pe) {
            console.error('Failed to paste element:', pe);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, elements, strokes, historyIndex, currentPage]);

  // --- Simulated Collaboration Mode Loop ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCollabActive) {
      // Spawn two realistic co-editors
      const initialUsers: CollaborationUser[] = [
        { id: 'u1', name: 'Sophia M.', color: '#ec4899', cursorX: 10, cursorY: 15, pageIndex: 0, activeElementId: null },
        { id: 'u2', name: 'Diego R.', color: '#3b82f6', cursorX: 85, cursorY: 70, pageIndex: 0, activeElementId: null }
      ];
      setCollabUsers(initialUsers);

      // Create interactive loops moving cursors and placing annotations
      interval = setInterval(() => {
        setCollabUsers(prev => prev.map(user => {
          const deltaX = (Math.random() - 0.5) * 8;
          const deltaY = (Math.random() - 0.5) * 8;
          const nextX = Math.min(95, Math.max(5, user.cursorX + deltaX));
          const nextY = Math.min(95, Math.max(5, user.cursorY + deltaY));

          // Occasionally trigger virtual collaboration suggestions
          if (Math.random() > 0.95 && trackChanges.length < 5) {
            const names = ['Sophia M.', 'Diego R.'];
            const randAuthor = names[Math.floor(Math.random() * names.length)];
            const descriptions = [
              'Suggested professional wording correction in main heading.',
              'Identified missing interactive signature block.',
              'Proposed centering the corporate SVG logo shape.'
            ];
            const randDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
            const newChange: TrackChange = {
              id: Math.random().toString(),
              type: 'formatting',
              author: randAuthor,
              color: randAuthor === 'Sophia M.' ? '#ec4899' : '#3b82f6',
              pageIndex: currentPage,
              elementId: 'simulated',
              description: randDesc,
              status: 'pending',
              date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setTrackChanges(prevTC => [newChange, ...prevTC]);
          }

          return { ...user, cursorX: nextX, cursorY: nextY };
        }));
      }, 1800);
    } else {
      setCollabUsers([]);
    }

    return () => clearInterval(interval);
  }, [isCollabActive, currentPage]);

  // --- Element Addition & Mutation Handlers ---
  const handleAddElement = (type: any, extra: any = {}) => {
    const newElement: EditorElement = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      x: 150,
      y: 180,
      width: type === 'table' ? 400 : type === 'comment' ? 240 : 160,
      height: type === 'table' ? 120 : type === 'comment' ? 140 : 50,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      pageIndex: currentPage,
      ...extra
    } as any;

    // Apply smart text styling defaults
    if (type === 'text') {
      Object.assign(newElement, {
        text: extra.text || 'Editable Text Block',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        align: 'left',
        wordWrap: true,
        charSpacing: 0,
        lineHeight: 1.2,
        padding: 6
      });
    } else if (type === 'shape') {
      Object.assign(newElement, {
        shapeType: extra.shapeType || 'rectangle',
        fill: '#f43f5e',
        stroke: '#0f172a',
        strokeWidth: 2,
        shadow: false
      });
    } else if (type === 'table') {
      const rows = extra.rows || 3;
      const cols = extra.cols || 3;
      const cells: TableCell[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            text: r === 0 ? `Header ${c + 1}` : `Data ${r}, ${c + 1}`,
            backgroundColor: r === 0 ? '#f1f5f9' : '#ffffff',
            color: '#0f172a',
            bold: r === 0,
            italic: false,
            align: 'center'
          });
        }
      }
      Object.assign(newElement, {
        rows,
        cols,
        cells,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        cellPadding: 8
      });
    } else if (type === 'comment') {
      Object.assign(newElement, {
        author: 'You',
        avatarColor: '#10b981',
        text: extra.text || 'Add sticky review note',
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resolved: false,
        replies: []
      });
    }

    const nextElements = [...elements, newElement];
    setElements(nextElements);
    pushHistory(nextElements, strokes);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
    const nextElements = elements.map(el => el.id === id ? { ...el, ...updates } as EditorElement : el);
    setElements(nextElements);
    pushHistory(nextElements, strokes);
  };

  const deleteElement = (id: string) => {
    const nextElements = elements.filter(el => el.id !== id);
    setElements(nextElements);
    pushHistory(nextElements, strokes);
    if (selectedId === id) setSelectedId(null);
  };

  // --- Drawing / Pencil Handling Events ---
  const handlePagePointerDown = (pageIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'draw') return;

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newStroke: DrawingStroke = {
      id: Math.random().toString(),
      pageIndex,
      points: [{ x, y, pressure: e.pressure || 0.5 }],
      color: drawingColor,
      thickness: drawingThickness,
      opacity: drawingOpacity,
      tool: drawingTool as any
    };

    setActiveStroke(newStroke);
  };

  const handlePagePointerMove = (pageIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === 'draw' && activeStroke) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const updatedPoints = [...activeStroke.points, { x, y, pressure: e.pressure || 0.5 }];
      setActiveStroke({
        ...activeStroke,
        points: updatedPoints
      });
      return;
    }

    if (mode === 'select') {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      const runs = pageTextRuns[pageIndex] || [];
      const hit = runs.some(run =>
        mouseX >= run.x - 2 &&
        mouseX <= run.x + run.width + 2 &&
        mouseY >= run.y - 2 &&
        mouseY <= run.y + run.height + 2
      );

      if (hit && hoveredRunPage !== pageIndex) {
        setHoveredRunPage(pageIndex);
      } else if (!hit && hoveredRunPage === pageIndex) {
        setHoveredRunPage(null);
      }
    }
  };

  const handlePageClick = async (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    setCurrentPage(pageIndex);
    if (mode !== 'select') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    // Existing element interaction takes priority
    const existingElementsOnPage = elements.filter(el => el.pageIndex === pageIndex);
    const hitExisting = existingElementsOnPage.some(el =>
      clickX >= el.x &&
      clickX <= el.x + el.width &&
      clickY >= el.y &&
      clickY <= el.y + el.height
    );

    if (hitExisting) return;

    // Check hit against cached text runs
    const runs = pageTextRuns[pageIndex] || [];
    const hitRunIndex = runs.findIndex(run =>
      clickX >= run.x - 2 &&
      clickX <= run.x + run.width + 2 &&
      clickY >= run.y - 2 &&
      clickY <= run.y + run.height + 2
    );

    if (hitRunIndex === -1) return;

    const run = runs[hitRunIndex];

    // Sample background color from rendered page
    const pageUrl = pages[pageIndex];
    let backgroundColor = '#ffffff';
    if (pageUrl) {
      backgroundColor = await sampleBackgroundColor(pageUrl, run.x, run.y, run.width, run.height);
    }

    const pad = 2;
    const newElement: EditorElement = {
      id: Math.random().toString(36).substring(2, 11),
      type: 'text',
      text: run.text,
      x: Math.max(0, run.x - pad),
      y: Math.max(0, run.y - pad),
      width: run.width + pad * 2,
      height: run.height + pad * 2,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      pageIndex: pageIndex,
      fontSize: run.fontSize,
      fontFamily: run.fontFamily,
      color: '#000000',
      backgroundColor: backgroundColor,
      highlightColor: 'transparent',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      superscript: false,
      subscript: false,
      smallCaps: false,
      charSpacing: 0,
      lineHeight: 1.2,
      padding: 2,
      align: 'left',
      wordWrap: true,
      isEditing: true
    } as any;

    const nextElements = [...elements, newElement];
    setElements(nextElements);
    pushHistory(nextElements, strokes);
    setSelectedId(newElement.id);

    // Remove converting text run from pageTextRuns
    const nextRuns = runs.filter((_, idx) => idx !== hitRunIndex);
    setPageTextRuns(prev => ({ ...prev, [pageIndex]: nextRuns }));
    setHoveredRunPage(null);
  };

  const handlePagePointerUp = () => {
    if (mode !== 'draw' || !activeStroke) return;

    const nextStrokes = [...strokes, activeStroke];
    setStrokes(nextStrokes);
    pushHistory(elements, nextStrokes);
    setActiveStroke(null);
  };

  // --- Page Manipulations (Left Panel) ---
  const duplicatePage = (idx: number) => {
    const nextPages = [...pages];
    nextPages.splice(idx + 1, 0, pages[idx]); // copy page base64 preview

    const nextConfigs = [...pageConfigs];
    nextConfigs.splice(idx + 1, 0, {
      ...pageConfigs[idx],
      index: pageConfigs.length
    });

    // Offset element coordinates for elements on pushed pages
    const nextElements = elements.map(el => {
      if (el.pageIndex > idx) return { ...el, pageIndex: el.pageIndex + 1 };
      return el;
    });

    setPages(nextPages);
    setPageConfigs(nextConfigs);
    setElements(nextElements);
    pushHistory(nextElements, strokes);
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return;
    const nextPages = pages.filter((_, i) => i !== idx);
    const nextConfigs = pageConfigs.filter((_, i) => i !== idx);

    // Remove elements on deleted page and shift remaining page indices
    const nextElements = elements
      .filter(el => el.pageIndex !== idx)
      .map(el => {
        if (el.pageIndex > idx) return { ...el, pageIndex: el.pageIndex - 1 };
        return el;
      });

    setPages(nextPages);
    setPageConfigs(nextConfigs);
    setElements(nextElements);
    pushHistory(nextElements, strokes);
    setCurrentPage(Math.max(0, idx - 1));
  };

  const reorderPage = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pages.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

    // Swap previews
    const nextPages = [...pages];
    const tempPage = nextPages[idx];
    nextPages[idx] = nextPages[targetIdx];
    nextPages[targetIdx] = tempPage;

    // Swap configurations
    const nextConfigs = [...pageConfigs];
    const tempConfig = nextConfigs[idx];
    nextConfigs[idx] = nextConfigs[targetIdx];
    nextConfigs[targetIdx] = tempConfig;

    // Swap elements on pageIndices
    const nextElements = elements.map(el => {
      if (el.pageIndex === idx) return { ...el, pageIndex: targetIdx };
      if (el.pageIndex === targetIdx) return { ...el, pageIndex: idx };
      return el;
    });

    setPages(nextPages);
    setPageConfigs(nextConfigs);
    setElements(nextElements);
    pushHistory(nextElements, strokes);
    setCurrentPage(targetIdx);
  };

  const insertBlankPage = () => {
    // Generate empty white square as a mock canvas
    const canvas = document.createElement('canvas');
    canvas.width = 612; // Standard Letter width
    canvas.height = 792; // Standard Letter height
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const blankDataUrl = canvas.toDataURL();

    const nextPages = [...pages, blankDataUrl];
    const nextConfigs = [...pageConfigs, {
      index: pageConfigs.length,
      rotation: 0,
      header: { showPageNumbers: true },
      footer: { showPageNumbers: true }
    }];

    setPages(nextPages);
    setPageConfigs(nextConfigs);
    setCurrentPage(nextPages.length - 1);
  };

  const rotatePage = (idx: number) => {
    const nextConfigs = [...pageConfigs];
    const currentRot = nextConfigs[idx]?.rotation || 0;
    nextConfigs[idx] = {
      ...nextConfigs[idx],
      rotation: (currentRot + 90) % 360
    };
    setPageConfigs(nextConfigs);
  };

  const extractPage = async (idx: number) => {
    setError(null);
    setIsSaving(true);
    setSaveStatus('Extracting page...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const outDoc = await PDFDocument.create();
      
      // Check if original page exists
      if (idx < srcDoc.getPageCount()) {
        const [copiedPage] = await outDoc.copyPages(srcDoc, [idx]);
        outDoc.addPage(copiedPage);
      } else {
        // Add default blank
        outDoc.addPage([612, 792]);
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docName || 'document'}_page_${idx + 1}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsSaving(false);
    } catch (err: any) {
      console.error('Extract page failed:', err);
      setError(err.message || 'Could not extract single page.');
      setIsSaving(false);
    }
  };

  // --- Track Changes Approvals ---
  const handleAcceptChange = (id: string) => {
    setTrackChanges(prev => prev.map(tc => tc.id === id ? { ...tc, status: 'accepted' } : tc));
  };

  const handleRejectChange = (id: string) => {
    setTrackChanges(prev => prev.map(tc => tc.id === id ? { ...tc, status: 'rejected' } : tc));
  };

  // --- AI Co-Pilot Server Call ---
  const handleTriggerAI = async (promptType: string, customPrompt?: string, enableThinking?: boolean) => {
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const activeElement = elements.find(el => el.id === selectedId);
      const selectedText = activeElement && activeElement.type === 'text' ? activeElement.text : '';

      const res = await fetch('/api/pdf-tools?action=editor-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, selectedText, customPrompt, enableThinking })
      });
      const data = await res.json();
      if (data.text) {
        setAiResponse(data.text);
      } else {
        setAiResponse('AI returned an empty response. Please retry.');
      }
    } catch (err) {
      console.error('AI trigger failed:', err);
      setAiResponse('AI assistant is currently offline. Please verify network settings.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- OCR Server Call ---
  const handleTriggerOCR = async (pageIdx: number) => {
    setIsOcrLoading(true);
    try {
      const pageBase64 = pages[pageIdx].split(',')[1]; // extract base64 bytes
      const res = await fetch('/api/pdf-tools?action=editor-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: pageBase64 })
      });
      const data = await res.json();
      if (data.blocks && data.blocks.length > 0) {
        const added: EditorElement[] = data.blocks.map((block: any, bIdx: number) => ({
          id: `ocr-${Date.now()}-${bIdx}`,
          type: 'text',
          text: block.text,
          x: (block.x / 100) * 550, // project onto our viewport width basis
          y: (block.y / 100) * 750, // project onto height basis
          width: 250,
          height: 45,
          rotation: 0,
          opacity: 1,
          zIndex: elements.length + bIdx + 1,
          pageIndex: pageIdx,
          fontSize: block.fontSize || 12,
          fontFamily: block.fontFamily || 'Helvetica',
          color: '#0f172a',
          backgroundColor: 'transparent',
          bold: false,
          italic: false,
          align: 'left',
          wordWrap: true
        }));

        const nextElements = [...elements, ...added];
        setElements(nextElements);
        pushHistory(nextElements, strokes);
      }
    } catch (err) {
      console.error('OCR analysis failed:', err);
    } finally {
      setIsOcrLoading(false);
    }
  };

  // --- Save / High Fidelity PDF Build ---
  const savePDF = async () => {
    setError(null);
    setIsSaving(true);
    
    setSaveStatus('Saving document...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const originalPages = pdfDoc.getPages();
      const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

      // We process each page config
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        // If a page index doesn't exist in original (was duplicated or inserted blank), add a new one
        let docPage = originalPages[pageIdx];
        if (!docPage) {
          docPage = pdfDoc.addPage([612, 792]); // default letter sizes
        }

        const { width: pRealW, height: pRealH } = docPage.getSize();
        
        // Width/Height scaled basis in browser is standard 612 x 792
        const pVisW = 612;
        const pVisH = 792;

        const scaleX = pRealW / pVisW;
        const scaleY = pRealH / pVisH;

        // Apply rotation configuration to the real PDF page
        if (pageConfigs[pageIdx]?.rotation !== undefined) {
          const rawRot = ((pageConfigs[pageIdx].rotation % 360) + 360) % 360;
          if (rawRot === 0 || rawRot === 90 || rawRot === 180 || rawRot === 270) {
            docPage.setRotation(degrees(rawRot));
          }
        }

        // 1. Draw page headers & footers
        const cfg = pageConfigs[pageIdx];
        if (cfg?.header?.showPageNumbers && pageIdx > 0) {
          docPage.drawText(`Page ${pageIdx + 1}`, {
            x: pRealW - 80,
            y: pRealH - 40,
            size: 9,
            font: fontHelvetica,
            color: rgb(0.4, 0.4, 0.4)
          });
        }
        if (cfg?.footer?.showPageNumbers) {
          docPage.drawText(`Make PDF Right | Digital Copy`, {
            x: 40,
            y: 30,
            size: 9,
            font: fontHelvetica,
            color: rgb(0.5, 0.5, 0.5)
          });
        }

        // 2. Embed user elements overlay
        const pageElements = elements.filter(el => el.pageIndex === pageIdx);
        for (const el of pageElements) {
          // Map browser visual coordinates to real high-fidelity PDF coordinates
          // Coordinate system flips: browser (0,0) is top-left, pdf-lib (0,0) is bottom-left
          const elX = el.x * scaleX;
          const elY = pRealH - ((el.y + el.height) * scaleY);
          const elW = el.width * scaleX;
          const elH = el.height * scaleY;

          if (el.type === 'text') {
            const familyLower = (el.fontFamily || '').toLowerCase();
            let font = fontHelvetica;
            if (familyLower.includes('times') || familyLower.includes('serif') || familyLower.includes('playfair')) {
              font = fontTimes;
            } else if (familyLower.includes('courier') || familyLower.includes('mono')) {
              font = fontCourier;
            }
            const textColor = hexToRgbColor(el.color || '#000000');
            
            // Draw background highlight color if configured
            if (el.backgroundColor && el.backgroundColor !== 'transparent') {
              docPage.drawRectangle({
                x: elX,
                y: elY,
                width: elW,
                height: elH,
                color: hexToRgbColor(el.backgroundColor)
              });
            }

            docPage.drawText(el.text, {
              x: elX + (el.padding || 4) * scaleX,
              y: elY + (elH / 2) - ((el.fontSize || 12) * scaleY / 3), // vertically centered estimate
              size: el.fontSize * Math.min(scaleX, scaleY),
              font: font,
              color: textColor,
            });
          } else if (el.type === 'image' && el.src) {
            try {
              const base64Parts = el.src.split(',');
              const base64Data = base64Parts[1];
              const mimeType = base64Parts[0];
              
              let embeddedImg;
              if (mimeType.includes('image/png')) {
                embeddedImg = await pdfDoc.embedPng(base64Data);
              } else {
                embeddedImg = await pdfDoc.embedJpg(base64Data);
              }
              
              docPage.drawImage(embeddedImg, {
                x: elX,
                y: elY,
                width: elW,
                height: elH,
                opacity: el.opacity ?? 1,
              });
            } catch (imgErr) {
              console.error('Failed to embed image in PDF export:', imgErr);
            }
          } else if (el.type === 'shape') {
            const isWhiteout = el.fill === '#ffffff' && el.stroke === '#ffffff';
            const fillColor = hexToRgbColor(el.fill || '#e11d48');
            const strokeColor = hexToRgbColor(el.stroke || '#000000');
            const strokeWidth = el.strokeWidth || 0;
            
            if (el.shapeType === 'circle') {
              const radius = Math.min(elW, elH) / 2;
              docPage.drawCircle({
                x: elX + (elW / 2),
                y: elY + (elH / 2),
                size: radius,
                color: fillColor,
                borderColor: strokeWidth > 0 && !isWhiteout ? strokeColor : undefined,
                borderWidth: strokeWidth > 0 && !isWhiteout ? strokeWidth * scaleX : undefined,
              });
            } else {
              docPage.drawRectangle({
                x: elX,
                y: elY,
                width: elW,
                height: elH,
                color: fillColor,
                borderColor: strokeWidth > 0 && !isWhiteout ? strokeColor : undefined,
                borderWidth: strokeWidth > 0 && !isWhiteout ? strokeWidth * scaleX : undefined,
              });
            }
          } else if (el.type === 'signature') {
            if (el.signatureType === 'draw' && el.dataUrl) {
              try {
                const base64Data = el.dataUrl.split(',')[1];
                const pngImage = await pdfDoc.embedPng(base64Data);
                docPage.drawImage(pngImage, {
                  x: elX,
                  y: elY,
                  width: elW,
                  height: elH,
                });
              } catch (sigErr) {
                console.error('Failed to embed signature image:', sigErr);
                docPage.drawText('Signature', {
                  x: elX + 15,
                  y: elY + (elH / 3),
                  size: 14,
                  font: fontTimes,
                  color: rgb(0.05, 0.05, 0.1)
                });
              }
            } else {
              docPage.drawText(el.typedText || 'Signed', {
                x: elX + 15,
                y: elY + (elH / 3),
                size: el.fontSize || 24,
                font: fontTimes,
                color: rgb(0.05, 0.05, 0.1)
              });
            }
          } else if (el.type === 'table') {
            const rowsCount = el.rows || 3;
            const colsCount = el.cols || 3;
            const cellW = elW / colsCount;
            const cellH = elH / rowsCount;
            
            for (const cell of (el.cells || [])) {
              const cellX = elX + (cell.col * cellW);
              const cellY = elY + elH - ((cell.row + 1) * cellH);
              
              // Draw Background
              docPage.drawRectangle({
                x: cellX,
                y: cellY,
                width: cellW,
                height: cellH,
                color: hexToRgbColor(cell.backgroundColor || '#ffffff'),
                borderColor: hexToRgbColor(el.borderColor || '#cbd5e1'),
                borderWidth: el.borderWidth || 1,
              });
              
              // Draw Text
              if (cell.text) {
                docPage.drawText(cell.text, {
                  x: cellX + (el.cellPadding || 8) * scaleX,
                  y: cellY + (cellH / 2) - 4 * scaleY,
                  size: 9 * Math.min(scaleX, scaleY),
                  font: fontHelvetica,
                  color: hexToRgbColor(cell.color || '#000000'),
                });
              }
            }
          }
        }

        // 3. Draw freehand vector strokes
        const pageStrokes = strokes.filter(s => s.pageIndex === pageIdx);
        for (const str of pageStrokes) {
          if (str.points.length < 2) continue;
          for (let p = 0; p < str.points.length - 1; p++) {
            const p1 = str.points[p];
            const p2 = str.points[p + 1];

            docPage.drawLine({
              start: { x: p1.x * scaleX, y: pRealH - (p1.y * scaleY) },
              end: { x: p2.x * scaleX, y: pRealH - (p2.y * scaleY) },
              thickness: str.thickness * scaleX,
              color: hexToRgbColor(str.color || '#0f172a'),
              opacity: str.opacity || 1
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      HistoryService.addHistoryItem({
        toolId: 'edit',
        toolName: 'Edit PDF',
        fileName: `edited_${file.name}`,
        outputSize: blob.size,
        resultUrl: url,
        status: 'completed',
        details: `Saved PDF edits (${elements.length} custom elements added/modified)`
      });

      setIsSaving(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error('Saving high fidelity failed:', err);
      setError(err.message || 'An error occurred while compiling PDF coordinates.');
      setIsSaving(false);
    }
  };

  // --- Export as secondary document formats ---
  const handleExportAs = (format: 'docx' | 'txt' | 'png') => {
    if (format === 'txt') {
      const allText = elements
        .filter(el => el.type === 'text')
        .map(el => (el as any).text)
        .join('\n\n');
      const blob = new Blob([allText || 'Empty Document Content'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extracted_${file.name.replace('.pdf', '')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Simulate DOCX download payload
      const dummyContent = 'Make PDF Right Document Export System';
      const blob = new Blob([dummyContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted_${file.name.replace('.pdf', '')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (resultUrl) {
    return (
      <div className="relative h-full w-full max-w-[700px] mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 flex flex-col items-center text-center space-y-6 overflow-y-auto">
        {/* Top Header Navigation Bar inside Card */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 -mt-2 sm:-mt-4">
          <BackButton 
            onClick={() => {
              if (resultUrl) {
                URL.revokeObjectURL(resultUrl);
              }
              setResultUrl(null);
            }} 
            label="Back"
          />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Export Complete
          </span>
        </div>

        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 shrink-0">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">PDF Exported Successfully!</h2>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium">
            Your high-fidelity vector PDF has been compiled with text, drawings, and forms.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
          <a 
            href={resultUrl} 
            download={`edited_${file.name}`}
            className="btn-primary text-lg py-4 flex items-center justify-center gap-3 shadow-lg shadow-primary/25"
          >
            <Download className="w-5 h-5 shrink-0" />
            <span>Download Compiled PDF</span>
          </a>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => handleExportAs('docx')}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
            >
              Export as Word (.docx)
            </button>
            <button
              onClick={() => handleExportAs('txt')}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
            >
              Export as Text (.txt)
            </button>
          </div>

          <button 
            onClick={() => {
              if (resultUrl) {
                URL.revokeObjectURL(resultUrl);
              }
              setResultUrl(null);
            }}
            className="text-slate-400 hover:text-primary dark:hover:text-primary font-bold text-sm transition-colors mt-4 cursor-pointer"
          >
            ← Return to Editor Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-[82vh] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xl transition-all duration-300 ${
      themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Backdrops for mobile drawers */}
      <AnimatePresence>
        {(isThumbnailsOpen || isPropertiesOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsThumbnailsOpen(false);
              setIsPropertiesOpen(false);
            }}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isProcessing} message="Loading PDF into editor..." />
      <LoadingOverlay 
        isVisible={isSaving} 
        message={saveStatus || 'Saving edited PDF...'} 
        error={error}
        onCloseError={() => setError(null)}
        onCancel={() => setIsSaving(false)}
      />

      {/* ================= LEFT SIDEBAR: THUMBNAILS ================= */}
      <div className={`fixed lg:relative top-0 bottom-0 left-0 z-40 w-[200px] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-white dark:bg-slate-900 select-none shrink-0 transition-transform duration-300 ${
        isThumbnailsOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Pages
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={insertBlankPage}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="Insert Blank Page"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsThumbnailsOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="Close Pages Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {pages.map((url, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`group/thumb relative cursor-pointer p-1.5 rounded-2xl border transition-all ${
                currentPage === idx 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-200/50 bg-slate-50 relative">
                {url ? (
                  <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-contain animate-fadeIn" />
                ) : (
                  <div className="w-full h-full bg-slate-100/40 dark:bg-slate-900/40 animate-pulse flex items-center justify-center">
                    <div className="w-6 h-8 bg-slate-200/50 dark:bg-slate-850/50 rounded animate-pulse" />
                  </div>
                )}
                {/* Visual rotation display */}
                {pageConfigs[idx]?.rotation ? (
                  <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <RotateCw className="w-2.5 h-2.5" /> {pageConfigs[idx].rotation}°
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] font-bold font-mono text-slate-400">P. {idx + 1}</span>
                
                {/* Micro Actions */}
                <div className="opacity-0 group-hover/thumb:opacity-100 flex items-center gap-0.5 transition-opacity duration-200">
                  <button 
                    onClick={(e) => { e.stopPropagation(); rotatePage(idx); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); extractPage(idx); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                    title="Extract Page as Single PDF"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); reorderPage(idx, 'up'); }}
                    disabled={idx === 0}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 disabled:opacity-30"
                    title="Move Page Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); reorderPage(idx, 'down'); }}
                    disabled={idx === pages.length - 1}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 disabled:opacity-30"
                    title="Move Page Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); duplicatePage(idx); }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                    title="Duplicate Page"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                    disabled={pages.length <= 1}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500 disabled:opacity-30"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CENTER WORKSPACE ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Floating Quick Controls (Rebuilt to fulfill all requested toolbar buttons) */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 p-3 flex flex-nowrap overflow-x-auto items-center justify-between gap-3 shrink-0 select-none scrollbar-none">
          
          {/* Left section: Doc Name & Search bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onReset ? (
              <BackButton onClick={onReset} label="" className="min-w-[36px] min-h-[36px] p-1.5 shrink-0" />
            ) : (
              <BackButton to="/" label="" className="min-w-[36px] min-h-[36px] p-1.5 shrink-0" />
            )}
            {/* Pages Toggle Button (visible only below desktop) */}
            <button 
              onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-primary rounded-xl bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              title="Toggle Pages"
            >
              <FileText className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-1 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
              <input 
                type="text" 
                value={docName} 
                onChange={(e) => setDocName(e.target.value)} 
                className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary focus:outline-none font-bold text-xs text-slate-800 dark:text-slate-100 px-1 py-0.5 max-w-[120px] transition-all rounded"
                placeholder="Rename document..."
                title="Edit Document Name"
              />
            </div>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-850 shrink-0" />

            {/* Search Input Box */}
            <div className="relative flex items-center max-w-[150px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                className="pl-8 pr-2.5 py-1.5 w-full bg-slate-50 border border-slate-200/60 hover:border-slate-300 focus:border-primary focus:bg-white dark:bg-slate-850 dark:border-slate-800 text-xs rounded-xl focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Center section: Main Action Modes & Draw options */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-700/40">
              {[
                { id: 'select', icon: <MousePointer2 className="w-4 h-4" />, label: 'Cursor' },
                { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
                { id: 'draw', icon: <PenTool className="w-4 h-4" />, label: 'Draw' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setMode(btn.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mode === btn.id
                      ? 'bg-primary text-white shadow shadow-primary/20'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Draw Sub-options */}
            <AnimatePresence>
              {mode === 'draw' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 px-3 py-1 rounded-2xl border border-slate-200/50"
                >
                  <div className="flex gap-1">
                    {['#0f172a', '#e11d48', '#2563eb', '#16a34a', '#eab308'].map(color => (
                      <button
                        key={color}
                        onClick={() => setDrawingColor(color)}
                        className={`w-3.5 h-3.5 rounded-full border border-white ${drawingColor === color ? 'ring-2 ring-primary' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Size</span>
                    <input 
                      type="number" 
                      value={drawingThickness}
                      onChange={(e) => setDrawingThickness(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-[10px] text-center font-bold font-mono rounded"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right section: Layout Zoom / Fit Width / Fit Page / Undo / Redo / Compile */}
          <div className="flex items-center gap-2">
            
            {/* Fit Width / Fit Page */}
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setZoom(1.15)}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-750 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                title="Fit to Width (115%)"
              >
                Fit Width
              </button>
              <button
                onClick={() => setZoom(0.85)}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-750 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                title="Fit to Page (85%)"
              >
                Fit Page
              </button>
            </div>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-850 shrink-0" />

            {/* Live Sync / Collab */}
            <button
              onClick={() => setIsCollabActive(!isCollabActive)}
              className={`p-1.5 rounded-xl border transition-all ${
                isCollabActive 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/50 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
              }`}
              title="Toggle Live Collaboration Session"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Dark Mode */}
            <button
              onClick={toggleTheme}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
              title="Toggle Dark Mode"
            >
              {themeMode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-850 shrink-0" />

            {/* Undo / Redo */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all disabled:opacity-30"
              title="Undo Action"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all disabled:opacity-30"
              title="Redo Action"
            >
              <Redo className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-850 shrink-0" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-xl shrink-0">
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold font-mono px-1.5 min-w-[36px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.0))}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save / Export compilation button */}
            <button 
              onClick={savePDF}
              className="btn-primary py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 shrink-0"
              title="Compile edits into a high fidelity PDF file"
            >
              <Save className="w-3.5 h-3.5" />
              Compile PDF
            </button>

            {/* Properties Toggle Button (visible only below desktop) */}
            <button 
              onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-primary rounded-xl bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              title="Toggle Style & Properties Panel"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Page Status Header */}
        <div className="bg-slate-100/30 dark:bg-slate-900/10 px-6 py-2.5 flex items-center justify-between border-b border-slate-200/30 text-xs shrink-0 select-none">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-400">Current Scope:</span>
            <span className="font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
              Page {currentPage + 1} of {pages.length}
            </span>
            {isCollabActive && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold animate-pulse">
                ● Live Sync Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-bold font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Auto-save Draft ok
            </span>
          </div>
        </div>

        {/* Scrollable Stage Area */}
        <div className="flex-1 overflow-auto bg-slate-100/60 dark:bg-slate-950 p-10 flex justify-center">
          <div 
            ref={containerRef}
            className="relative origin-top transition-transform duration-100 flex flex-col gap-12 select-none"
            style={{ transform: `scale(${zoom})` }}
          >
            {pages.map((url, index) => {
              const isCurrent = currentPage === index;
              return (
                <div
                  key={index}
                  ref={el => { pageRefs.current[index] = el; }}
                  onClick={(e) => handlePageClick(index, e)}
                  onPointerDown={(e) => handlePagePointerDown(index, e)}
                  onPointerMove={(e) => handlePagePointerMove(index, e)}
                  onPointerUp={handlePagePointerUp}
                  className={`relative bg-white shadow-[0_24px_64px_-16px_rgba(0,0,0,0.1)] transition-all ${
                    isCurrent 
                      ? 'ring-2 ring-primary ring-offset-4 dark:ring-offset-slate-950 scale-[1.002]' 
                      : 'opacity-90 saturate-50 hover:opacity-100'
                  }`}
                  style={{
                    width: '612px',  // Match standard Letter dimensions
                    height: '792px',
                    cursor: mode === 'draw' ? 'crosshair' : (mode === 'text' || (mode === 'select' && hoveredRunPage === index)) ? 'text' : 'default',
                    touchAction: 'none'
                  }}
                >
                  {/* Base PDF Render Previews */}
                  {url ? (
                    <img src={url} alt={`PDF Page ${index + 1}`} className="w-full h-full object-fill pointer-events-none animate-fadeIn" />
                  ) : (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center space-y-4 bg-slate-50 dark:bg-slate-900/40">
                      <div className="relative w-8 h-8">
                        <svg className="w-full h-full animate-spin text-primary" viewBox="0 0 50 50">
                          <circle className="opacity-15" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="3.5" fill="none" />
                          <path className="opacity-90" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" d="M25,5a20,20 0 0,1 20,20" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rendering page layout...</span>
                    </div>
                  )}

                  {/* Freehand Vector Drawings Layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    {strokes.filter(s => s.pageIndex === index).map(str => (
                      <path
                        key={str.id}
                        d={`M ${str.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke={str.color}
                        strokeWidth={str.thickness}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={str.opacity}
                      />
                    ))}
                    {activeStroke && activeStroke.pageIndex === index && (
                      <path
                        d={`M ${activeStroke.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke={activeStroke.color}
                        strokeWidth={activeStroke.thickness}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={activeStroke.opacity}
                      />
                    )}
                  </svg>

                  {/* Overlaid Elements (Rich Objects) */}
                  {elements.filter(el => el.pageIndex === index).map(el => (
                    <CanvasElement
                      key={el.id}
                      element={el}
                      isSelected={selectedId === el.id}
                      onSelect={() => setSelectedId(el.id)}
                      onChange={(updates) => updateElement(el.id, updates)}
                      onDelete={() => deleteElement(el.id)}
                      onDuplicate={() => {
                        const copy: EditorElement = {
                          ...el,
                          id: Math.random().toString(36).substring(2, 11),
                          x: el.x + 25,
                          y: el.y + 25,
                          zIndex: elements.length + 1
                        };
                        const nextElements = [...elements, copy];
                        setElements(nextElements);
                        pushHistory(nextElements, strokes);
                        setSelectedId(copy.id);
                      }}
                      onMoveToFront={() => {
                        const maxZ = Math.max(...elements.map(e => e.zIndex), 0);
                        updateElement(el.id, { zIndex: maxZ + 1 });
                      }}
                      onMoveToBack={() => {
                        const minZ = Math.min(...elements.map(e => e.zIndex), 0);
                        updateElement(el.id, { zIndex: minZ - 1 });
                      }}
                      zoom={zoom}
                      mode={mode}
                      searchQuery={searchQuery}
                    />
                  ))}

                  {/* Collaborative Cursors (Simulated users) */}
                  {isCollabActive && collabUsers.filter(u => u.pageIndex === index).map(user => (
                    <div 
                      key={user.id}
                      className="absolute pointer-events-none transition-all duration-300 z-50 flex flex-col gap-1 text-[10px]"
                      style={{ left: `${user.cursorX}%`, top: `${user.cursorY}%` }}
                    >
                      <MousePointer2 className="w-4.5 h-4.5" style={{ color: user.color, fill: user.color }} />
                      <span 
                        className="px-1.5 py-0.5 text-white font-bold rounded-md shadow-lg"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDEBAR: PROPERTIES ================= */}
      <div className={`fixed lg:relative top-0 bottom-0 right-0 z-40 w-full sm:w-[380px] border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-white dark:bg-slate-900 transition-transform duration-300 shrink-0 ${
        isPropertiesOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <SidebarPanels
          selectedElement={elements.find(el => el.id === selectedId) || null}
          onChangeElement={(updates) => {
            if (selectedId) updateElement(selectedId, updates);
          }}
          onAddElement={handleAddElement}
          onAddComment={(text) => {
            handleAddElement('comment', { text });
          }}
          comments={elements.filter(el => el.type === 'comment') as any}
          trackChanges={trackChanges}
          onAcceptChange={handleAcceptChange}
          onRejectChange={handleRejectChange}
          versions={versions}
          onRestoreVersion={(vId) => {
            const ver = versions.find(v => v.id === vId);
            if (ver) {
              setElements(ver.elements);
              setStrokes(ver.strokes);
              pushHistory(ver.elements, ver.strokes);
            }
          }}
          onTriggerOCR={handleTriggerOCR}
          onTriggerAI={handleTriggerAI}
          aiResponse={aiResponse}
          isAiLoading={isAiLoading}
          isOcrLoading={isOcrLoading}
          currentPageIndex={currentPage}
          onClose={() => setIsPropertiesOpen(false)}
        />
      </div>
    </div>
  );
};
