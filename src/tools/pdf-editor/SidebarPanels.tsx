import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Bot, 
  Trash2, 
  Undo, 
  Redo, 
  Image as ImageIcon, 
  Type, 
  Grid, 
  CheckSquare, 
  Calendar, 
  Layers, 
  Smile, 
  RotateCw, 
  FolderPlus, 
  Sliders, 
  Eye, 
  Plus, 
  Minus, 
  CornerDownRight, 
  Check, 
  X,
  FileText,
  UserCheck,
  RotateCcw,
  RefreshCw,
  Search,
  MessageSquare
} from 'lucide-react';
import { EditorElement, TableCell, FormElement, CommentElement, TrackChange, DocumentVersion } from '../../types/editor';

interface SidebarPanelsProps {
  selectedElement: EditorElement | null;
  onChangeElement: (updates: Partial<EditorElement>) => void;
  onAddElement: (type: 'text' | 'image' | 'shape' | 'table' | 'signature' | 'form' | 'comment', extra?: any) => void;
  onAddComment: (text: string) => void;
  comments: CommentElement[];
  trackChanges: TrackChange[];
  onAcceptChange: (id: string) => void;
  onRejectChange: (id: string) => void;
  versions: DocumentVersion[];
  onRestoreVersion: (id: string) => void;
  onTriggerOCR: (pageIndex: number) => void;
  onTriggerAI: (promptType: string, customPrompt?: string) => void;
  aiResponse: string;
  isAiLoading: boolean;
  isOcrLoading: boolean;
  currentPageIndex: number;
  onClose?: () => void;
}

export const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  selectedElement,
  onChangeElement,
  onAddElement,
  onAddComment,
  comments,
  trackChanges,
  onAcceptChange,
  onRejectChange,
  versions,
  onRestoreVersion,
  onTriggerOCR,
  onTriggerAI,
  aiResponse,
  isAiLoading,
  isOcrLoading,
  currentPageIndex,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'insert' | 'ai' | 'track' | 'comments'>('format');
  
  // Table state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Form state
  const [formName, setFormName] = useState('text_field_1');
  const [formType, setFormType] = useState<'text-field' | 'checkbox' | 'radio-group' | 'dropdown' | 'datepicker' | 'signature-field'>('text-field');
  const [formOptions, setFormOptions] = useState('Option 1, Option 2, Option 3');

  // Signature state
  const [sigType, setSigType] = useState<'draw' | 'type'>('draw');
  const [sigText, setSigText] = useState('Your Signature');
  const [sigFont, setSigFont] = useState('Dancing Script, cursive');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');

  // AI custom prompt
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  // Drawing Canvas for Signatures
  useEffect(() => {
    if (sigType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  }, [sigType, activeTab]);

  const startSigDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopSigDrawing = () => {
    setIsDrawing(false);
  };

  const clearSigCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleInsertSignature = () => {
    if (sigType === 'draw' && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      onAddElement('signature', { signatureType: 'draw', dataUrl });
      clearSigCanvas();
    } else {
      onAddElement('signature', {
        signatureType: 'type',
        typedText: sigText,
        fontFamily: sigFont,
        fontSize: 32
      });
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col shadow-2xl shrink-0 overflow-hidden">
      {/* Tab Navigation */}
      <div className={`grid ${onClose ? 'grid-cols-6' : 'grid-cols-5'} border-b border-slate-100 dark:border-slate-800 shrink-0`}>
        {[
          { id: 'format', icon: <Sliders className="w-4 h-4" />, label: 'Style' },
          { id: 'insert', icon: <FolderPlus className="w-4 h-4" />, label: 'Insert' },
          { id: 'ai', icon: <Bot className="w-4 h-4" />, label: 'AI & Vision' },
          { id: 'track', icon: <UserCheck className="w-4 h-4" />, label: 'Track' },
          { id: 'comments', icon: <MessageSquare className="w-4 h-4" />, label: 'Chats' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 border-b-2 text-[11px] font-bold tracking-wide transition-all ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 border-b-2 border-transparent text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* ================= STYLE TAB ================= */}
        {activeTab === 'format' && (
          <div className="space-y-6">
            {!selectedElement ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Sliders className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-350">No Element Selected</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-[240px] mx-auto">
                    Select any text, image, shape, table, signature, or form element to customize its properties.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Properties: {selectedElement.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {selectedElement.id.substring(0, 6)}</span>
                </div>

                {/* Layer / Dimension Controls for All Elements */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Dimensions & Layering</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Opacity</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        value={selectedElement.opacity}
                        onChange={(e) => onChangeElement({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-primary h-1.5 bg-slate-100 dark:bg-slate-800 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Rotation</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={selectedElement.rotation}
                          onChange={(e) => onChangeElement({ rotation: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-1.5 rounded-lg font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TEXT SPECIFIC PROPERTIES */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Font Family</label>
                      <select 
                        value={selectedElement.fontFamily}
                        onChange={(e) => onChangeElement({ fontFamily: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-xs font-semibold"
                      >
                        <option value="Inter, sans-serif">Inter (Modern Sans)</option>
                        <option value="Space Grotesk, sans-serif">Space Grotesk (Tech Heading)</option>
                        <option value="Playfair Display, serif">Playfair Display (Editorial Serif)</option>
                        <option value="JetBrains Mono, monospace">JetBrains Mono (Technical)</option>
                        <option value="Helvetica, sans-serif">Helvetica</option>
                        <option value="Georgia, serif">Georgia</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Font Size (px)</label>
                        <input 
                          type="number" 
                          value={selectedElement.fontSize}
                          onChange={(e) => onChangeElement({ fontSize: parseInt(e.target.value) || 12 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl font-bold font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Line Height</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={selectedElement.lineHeight || 1.2}
                          onChange={(e) => onChangeElement({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl font-bold font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Color controls */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Text Color</label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                          <input 
                            type="color" 
                            value={selectedElement.color}
                            onChange={(e) => onChangeElement({ color: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none"
                          />
                          <span className="font-mono text-[10px] font-bold uppercase">{selectedElement.color}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Highlight Color</label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                          <input 
                            type="color" 
                            value={selectedElement.backgroundColor || '#ffffff'}
                            onChange={(e) => onChangeElement({ backgroundColor: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none"
                          />
                          <span className="font-mono text-[10px] font-bold uppercase">{selectedElement.backgroundColor || 'NONE'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Spacing & Formatting buttons */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Text Styling & Alignment</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: 'bold', label: 'B', active: selectedElement.bold, updates: { bold: !selectedElement.bold } },
                          { key: 'italic', label: 'I', active: selectedElement.italic, updates: { italic: !selectedElement.italic } },
                          { key: 'underline', label: 'U', active: selectedElement.underline, updates: { underline: !selectedElement.underline } },
                          { key: 'strikethrough', label: 'S', active: selectedElement.strikethrough, updates: { strikethrough: !selectedElement.strikethrough } },
                          { key: 'smallCaps', label: 'sc', active: selectedElement.smallCaps, updates: { smallCaps: !selectedElement.smallCaps } },
                          { key: 'superscript', label: 'x²', active: selectedElement.superscript, updates: { superscript: !selectedElement.superscript, subscript: false } },
                          { key: 'subscript', label: 'x₂', active: selectedElement.subscript, updates: { subscript: !selectedElement.subscript, superscript: false } },
                        ].map((btn) => (
                          <button
                            key={btn.key}
                            onClick={() => onChangeElement(btn.updates)}
                            className={`w-9 h-9 font-bold rounded-xl text-xs transition-all ${
                              btn.active 
                                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                                : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/60'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-1.5 mt-2">
                        {[
                          { key: 'left', label: 'Left' },
                          { key: 'center', label: 'Center' },
                          { key: 'right', label: 'Right' },
                          { key: 'justify', label: 'Justify' }
                        ].map((align) => (
                          <button
                            key={align.key}
                            onClick={() => onChangeElement({ align: align.key as any })}
                            className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                              selectedElement.align === align.key
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                                : 'bg-slate-50 border-slate-200/60 dark:border-slate-800/60 dark:bg-slate-850 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {align.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Word Wrap</label>
                        <button
                          onClick={() => onChangeElement({ wordWrap: !selectedElement.wordWrap })}
                          className={`w-full py-2 rounded-xl text-xs font-bold border transition-all ${
                            selectedElement.wordWrap
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                              : 'bg-slate-50 border-slate-200/60 dark:border-slate-800/60 text-slate-500'
                          }`}
                        >
                          {selectedElement.wordWrap ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Char Spacing</label>
                        <input 
                          type="number" 
                          value={selectedElement.charSpacing || 0}
                          onChange={(e) => onChangeElement({ charSpacing: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl font-bold font-mono text-center text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* IMAGE SPECIFIC PROPERTIES */}
                {selectedElement.type === 'image' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Adjustments</h4>
                      {[
                        { label: 'Brightness', key: 'brightness', min: 0.5, max: 1.5, step: 0.1 },
                        { label: 'Contrast', key: 'contrast', min: 0.5, max: 1.5, step: 0.1 },
                        { label: 'Saturation', key: 'saturation', min: 0, max: 2, step: 0.1 },
                        { label: 'Blur', key: 'blur', min: 0, max: 10, step: 1 }
                      ].map((item) => (
                        <div key={item.key} className="space-y-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">{item.label}</span>
                            <span className="font-mono text-slate-400">{(selectedElement as any)[item.key] || (item.key === 'blur' ? 0 : 1)}</span>
                          </div>
                          <input 
                            type="range" 
                            min={item.min} 
                            max={item.max} 
                            step={item.step}
                            value={(selectedElement as any)[item.key] ?? (item.key === 'blur' ? 0 : 1)}
                            onChange={(e) => onChangeElement({ [item.key]: parseFloat(e.target.value) })}
                            className="w-full accent-primary h-1 bg-slate-100 dark:bg-slate-800 rounded"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Borders & Styling</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">Border Width (px)</label>
                          <input 
                            type="number" 
                            value={(selectedElement as any).borderWidth || 0}
                            onChange={(e) => onChangeElement({ borderWidth: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">Rounded Corners (px)</label>
                          <input 
                            type="number" 
                            value={(selectedElement as any).borderRadius || 0}
                            onChange={(e) => onChangeElement({ borderRadius: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Flip Image</label>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => onChangeElement({ flipH: !(selectedElement as any).flipH })}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                              (selectedElement as any).flipH ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200/60 dark:bg-slate-850 text-slate-600'
                            }`}
                          >
                            Flip Horizontal
                          </button>
                          <button
                            onClick={() => onChangeElement({ flipV: !(selectedElement as any).flipV })}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                              (selectedElement as any).flipV ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-slate-200/60 dark:bg-slate-850 text-slate-600'
                            }`}
                          >
                            Flip Vertical
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SHAPE SPECIFIC PROPERTIES */}
                {selectedElement.type === 'shape' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Fill Color</label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                          <input 
                            type="color" 
                            value={(selectedElement as any).fill || '#ffffff'}
                            onChange={(e) => onChangeElement({ fill: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none"
                          />
                          <span className="font-mono text-[10px] font-bold uppercase">{(selectedElement as any).fill}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Stroke Color</label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                          <input 
                            type="color" 
                            value={(selectedElement as any).stroke || '#000000'}
                            onChange={(e) => onChangeElement({ stroke: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border-none"
                          />
                          <span className="font-mono text-[10px] font-bold uppercase">{(selectedElement as any).stroke}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400">Stroke Width (px)</label>
                        <input 
                          type="number" 
                          value={(selectedElement as any).strokeWidth || 0}
                          onChange={(e) => onChangeElement({ strokeWidth: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wide">Drop Shadow</label>
                        <button
                          onClick={() => onChangeElement({ shadow: !(selectedElement as any).shadow })}
                          className={`w-full py-2 rounded-xl text-xs font-bold border transition-all ${
                            (selectedElement as any).shadow
                              ? 'bg-primary border-primary text-white shadow-md'
                              : 'bg-slate-50 border-slate-200/60 dark:border-slate-800/60 text-slate-500'
                          }`}
                        >
                          {(selectedElement as any).shadow ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TABLE SPECIFIC PROPERTIES */}
                {selectedElement.type === 'table' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Table Grid Options</h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400">Row Padding (px)</label>
                        <input 
                          type="number" 
                          value={(selectedElement as any).cellPadding || 8}
                          onChange={(e) => onChangeElement({ cellPadding: parseInt(e.target.value) || 4 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Grid Border (px)</label>
                        <input 
                          type="number" 
                          value={(selectedElement as any).borderWidth || 1}
                          onChange={(e) => onChangeElement({ borderWidth: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800/60 p-2 rounded-xl text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Modify Table Rows / Cols</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newRows = (selectedElement as any).rows + 1;
                            const newCells = [...(selectedElement as any).cells];
                            for (let c = 0; c < (selectedElement as any).cols; c++) {
                              newCells.push({
                                id: `${newRows - 1}-${c}`,
                                row: newRows - 1,
                                col: c,
                                text: '',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                bold: false,
                                italic: false,
                                align: 'left'
                              });
                            }
                            onChangeElement({ rows: newRows, cells: newCells });
                          }}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/65 rounded-xl text-[10px] font-bold"
                        >
                          + Add Row
                        </button>
                        <button
                          onClick={() => {
                            const newCols = (selectedElement as any).cols + 1;
                            const newCells = [...(selectedElement as any).cells];
                            for (let r = 0; r < (selectedElement as any).rows; r++) {
                              newCells.push({
                                id: `${r}-${newCols - 1}`,
                                row: r,
                                col: newCols - 1,
                                text: '',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                bold: false,
                                italic: false,
                                align: 'left'
                              });
                            }
                            onChangeElement({ cols: newCols, cells: newCells });
                          }}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/65 rounded-xl text-[10px] font-bold"
                        >
                          + Add Col
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= INSERT TAB ================= */}
        {activeTab === 'insert' && (
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-100 dark:border-slate-850 pb-2">
              Insert Document Objects
            </h3>

            {/* Main Object Triggers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onAddElement('text')}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 font-bold text-xs"
              >
                <Type className="w-5 h-5 text-primary" />
                Text Box
              </button>
              <button
                onClick={() => {
                  // Simulate image select
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        onAddElement('image', { src: re.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 font-bold text-xs"
              >
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                Local Image
              </button>
            </div>

            {/* Shape Insert */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Shapes</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'rectangle', label: 'Square' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'triangle', label: 'Triangle' },
                  { id: 'star', label: 'Star' },
                  { id: 'diamond', label: 'Diamond' },
                  { id: 'rounded-rect', label: 'Round' },
                  { id: 'arrow', label: 'Arrow' },
                  { id: 'line', label: 'Line' }
                ].map((shp) => (
                  <button
                    key={shp.id}
                    onClick={() => onAddElement('shape', { shapeType: shp.id })}
                    className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-800/60 rounded-xl text-[10px] font-bold truncate text-slate-600 dark:text-slate-300"
                  >
                    {shp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Generator */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold flex items-center gap-1">
                <Grid className="w-3.5 h-3.5 text-indigo-500" />
                Insert Rich Table
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400">Rows</label>
                  <input 
                    type="number" 
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1 rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Columns</label>
                  <input 
                    type="number" 
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1 rounded text-center font-bold"
                  />
                </div>
              </div>
              <button
                onClick={() => onAddElement('table', { rows: tableRows, cols: tableCols })}
                className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow shadow-indigo-500/10"
              >
                Generate Table
              </button>
            </div>

            {/* Interactive Form Field Builder */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                Interactive Form Fields
              </label>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400">Field Label</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Field Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-semibold"
                  >
                    <option value="text-field">Text Input Field</option>
                    <option value="checkbox">Checkbox Check</option>
                    <option value="radio-group">Radio Buttons</option>
                    <option value="dropdown">Dropdown Select</option>
                    <option value="datepicker">Date Picker</option>
                    <option value="signature-field">Interactive Signature Box</option>
                  </select>
                </div>
                {['radio-group', 'dropdown'].includes(formType) && (
                  <div>
                    <label className="text-[10px] text-slate-400">Comma Separated Options</label>
                    <input 
                      type="text" 
                      value={formOptions}
                      onChange={(e) => setFormOptions(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => onAddElement('form', {
                  fieldType: formType,
                  fieldName: formName,
                  options: ['radio-group', 'dropdown'].includes(formType) ? formOptions.split(',').map(o => o.trim()) : [],
                  value: '',
                  required: false
                })}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow shadow-amber-500/10"
              >
                Add Form Field
              </button>
            </div>

            {/* Digital Signature Manager */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
                Digital Signature Board
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setSigType('draw')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                    sigType === 'draw' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600'
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  onClick={() => setSigType('type')}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                    sigType === 'type' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600'
                  }`}
                >
                  Type Script
                </button>
              </div>

              {sigType === 'draw' ? (
                <div className="space-y-2">
                  <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden h-28">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={112}
                      onMouseDown={startSigDrawing}
                      onMouseMove={drawSig}
                      onMouseUp={stopSigDrawing}
                      onMouseLeave={stopSigDrawing}
                      className="w-full h-full cursor-crosshair bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={clearSigCanvas}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-bold transition-all"
                    >
                      Clear Board
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={sigText}
                    onChange={(e) => setSigText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs"
                    placeholder="Type name..."
                  />
                  <select
                    value={sigFont}
                    onChange={(e) => setSigFont(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs"
                  >
                    <option value="Dancing Script, cursive">Cursive (Dancing Script)</option>
                    <option value="Great Vibes, cursive">Elegant (Great Vibes)</option>
                    <option value="Pacifico, cursive">Playful (Pacifico)</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleInsertSignature}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                Insert Signature
              </button>
            </div>
          </div>
        )}

        {/* ================= AI & VISION TAB ================= */}
        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-100 dark:border-slate-850 pb-2">
                Gemini AI Co-Pilot
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                Unlock generative rewrite, summarize, translate, and structured text actions right on your selected element.
              </p>
            </div>

            {/* OCR Vision Extraction */}
            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20 text-xs space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <h4 className="font-bold text-violet-700">OCR Page Analyzer</h4>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                Detect scanned content or images on the current page to extract text and overlay editable elements.
              </p>
              <button
                onClick={() => onTriggerOCR(currentPageIndex)}
                disabled={isOcrLoading}
                className="w-full py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-lg shadow-violet-500/15 disabled:opacity-40"
              >
                {isOcrLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Page...
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    Extract Editable Text (OCR)
                  </>
                )}
              </button>
            </div>

            {/* AI Generator Prompts */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <h4 className="font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-primary" />
                Smart Assist Prompts
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'rewrite', label: 'Rewrite Text' },
                  { id: 'summarize', label: 'Summarize' },
                  { id: 'translate', label: 'Translate' },
                  { id: 'grammar', label: 'Grammar Fix' },
                  { id: 'expand', label: 'Expand Info' },
                  { id: 'shorten', label: 'Shorten Info' }
                ].map((act) => (
                  <button
                    key={act.id}
                    onClick={() => onTriggerAI(act.id)}
                    disabled={isAiLoading || !selectedElement}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200/50 rounded-xl font-bold text-xs text-slate-700 shadow-sm flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Custom AI Instruction</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    placeholder="e.g. Turn into bullet points..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs"
                  />
                  <button
                    onClick={() => onTriggerAI('custom', customAiPrompt)}
                    disabled={isAiLoading || !customAiPrompt}
                    className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Output Preview */}
            {(aiResponse || isAiLoading) && (
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-150 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Assist Result</span>
                  <button 
                    onClick={() => {
                      if (selectedElement && selectedElement.type === 'text') {
                        onChangeElement({ text: aiResponse });
                      } else {
                        onAddElement('text', { text: aiResponse });
                      }
                    }}
                    disabled={!aiResponse}
                    className="text-[10px] text-primary hover:text-primary-hover font-bold flex items-center gap-0.5 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Inject Into Doc
                  </button>
                </div>
                {isAiLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    Gemini composing...
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 dark:text-slate-350 whitespace-pre-line leading-relaxed font-medium font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/50 max-h-40 overflow-y-auto">
                    {aiResponse}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TRACK CHANGES & HISTORY TAB ================= */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-100 dark:border-slate-850 pb-2">
                Document Audit: Track Changes
              </h3>

              {trackChanges.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No pending formatting or element changes detected.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {trackChanges.map((change) => (
                    <div 
                      key={change.id} 
                      className={`p-3 rounded-2xl border text-xs space-y-2 ${
                        change.status === 'accepted' 
                          ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10' 
                          : change.status === 'rejected'
                          ? 'bg-red-50/40 border-red-200 dark:bg-red-950/10'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{change.author}</span>
                        <span className="text-[10px] text-slate-400">{change.date}</span>
                      </div>
                      <p className="text-slate-500 leading-normal">{change.description}</p>
                      {change.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => onAcceptChange(change.id)}
                            className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 shadow-sm"
                          >
                            <Check className="w-3 h-3" /> Accept
                          </button>
                          <button 
                            onClick={() => onRejectChange(change.id)}
                            className="flex-1 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 shadow-sm"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Version History Backups
              </h3>
              <div className="space-y-2">
                {versions.map((ver) => (
                  <div 
                    key={ver.id}
                    className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs cursor-pointer transition-all"
                    onClick={() => onRestoreVersion(ver.id)}
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">{ver.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{ver.date} by {ver.author}</p>
                    </div>
                    <RotateCcw className="w-4 h-4 text-slate-400 hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= COMMENTS & CHATS TAB ================= */}
        {activeTab === 'comments' && (
          <div className="space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-100 dark:border-slate-850 pb-2">
              Conversations & sticky notes
            </h3>

            <div className="space-y-2.5">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Post a sticky note / query to page..."
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200/60 p-2.5 rounded-2xl text-xs resize-none h-20 outline-none"
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(commentText);
                    setCommentText('');
                  }
                }}
                disabled={!commentText.trim()}
                className="w-full py-2 bg-primary text-white font-bold text-xs rounded-xl shadow shadow-primary/25 hover:bg-primary-hover transition-all disabled:opacity-40"
              >
                Add Sticky Comment
              </button>
            </div>

            <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Document Comments Thread</span>
              
              {comments.filter(c => !c.resolved).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No active comments in document.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {comments.filter(c => !c.resolved).map((c) => (
                    <div key={c.id} className="p-3.5 bg-amber-50/50 dark:bg-slate-850/50 border border-amber-100 dark:border-slate-800 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase select-none"
                          style={{ backgroundColor: c.avatarColor }}
                        >
                          {c.author.substring(0, 2)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-850 dark:text-slate-200">{c.author}</h4>
                          <p className="text-[9px] text-slate-400">{c.date}</p>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-normal pl-0.5">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
