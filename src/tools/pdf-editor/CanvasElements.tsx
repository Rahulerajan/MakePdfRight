import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  RotateCw, 
  Plus, 
  Minus, 
  CornerRightDown, 
  Check, 
  Calendar, 
  Edit3, 
  MessageSquare, 
  CheckSquare, 
  X,
  Sparkles,
  Columns
} from 'lucide-react';
import { EditorElement, TableCell, FormElement, CommentElement } from '../../types/editor';

interface CanvasElementProps {
  element: EditorElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<EditorElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveToFront: () => void;
  onMoveToBack: () => void;
  zoom: number;
  mode: string;
  searchQuery?: string;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMoveToFront,
  onMoveToBack,
  zoom,
  mode,
  searchQuery = ''
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  // Resize handling
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startXPos = element.x;
    const startYPos = element.y;

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;
      const deltaY = (moveEvent.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      if (direction.includes('e')) {
        newWidth = Math.max(20, startWidth + deltaX);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(20, startHeight + deltaY);
      }
      if (direction.includes('w')) {
        const potentialWidth = startWidth - deltaX;
        if (potentialWidth > 20) {
          newWidth = potentialWidth;
          newX = startXPos + deltaX;
        }
      }
      if (direction.includes('n')) {
        const potentialHeight = startHeight - deltaY;
        if (potentialHeight > 20) {
          newHeight = potentialHeight;
          newY = startYPos + deltaY;
        }
      }

      onChange({ width: newWidth, height: newHeight, x: newX, y: newY });
    };

    const handleResizeUp = () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeUp);
  };

  // Rotation handling
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleRotateMove = (moveEvent: MouseEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let degree = angle * (180 / Math.PI) + 90; // offset so zero is up
      if (degree < 0) degree += 360;
      onChange({ rotation: Math.round(degree) });
    };

    const handleRotateUp = () => {
      window.removeEventListener('mousemove', handleRotateMove);
      window.removeEventListener('mouseup', handleRotateUp);
    };

    window.addEventListener('mousemove', handleRotateMove);
    window.addEventListener('mouseup', handleRotateUp);
  };

  // Manual drag handling for smooth and precise positioning
  const handleDragStart = (e: React.MouseEvent) => {
    if (mode !== 'select' && element.type !== 'comment') return;
    if (isEditingText || activeCellId) return;

    e.stopPropagation();
    onSelect();

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: element.x,
      top: element.y
    };

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const deltaY = (moveEvent.clientY - dragStartRef.current.y) / zoom;

      onChange({
        x: dragStartRef.current.left + deltaX,
        y: dragStartRef.current.top + deltaY
      });
    };

    const handleDragUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragUp);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragUp);
  };

  const getElementStyle = () => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      zIndex: element.zIndex,
    };
    return style;
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div 
            className="w-full h-full"
            style={{
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              color: element.color,
              backgroundColor: element.backgroundColor || 'transparent',
              padding: `${element.padding || 4}px`,
              textAlign: element.align || 'left',
              fontWeight: element.bold ? 'bold' : 'normal',
              fontStyle: element.italic ? 'italic' : 'normal',
              textDecoration: `${element.underline ? 'underline' : ''} ${element.strikethrough ? 'line-through' : ''}`.trim() || undefined,
              lineHeight: element.lineHeight || 1.2,
              letterSpacing: `${element.charSpacing || 0}px`,
              fontVariant: element.smallCaps ? 'small-caps' : 'normal',
              verticalAlign: element.superscript ? 'super' : element.subscript ? 'sub' : 'baseline',
              whiteSpace: element.wordWrap ? 'normal' : 'nowrap',
              wordBreak: 'break-word',
            }}
            onDoubleClick={() => setIsEditingText(true)}
          >
            {isEditingText ? (
              <textarea
                value={element.text}
                onChange={(e) => onChange({ text: e.target.value })}
                onBlur={() => setIsEditingText(false)}
                autoFocus
                className="w-full h-full bg-slate-50 dark:bg-slate-900 border border-primary outline-none p-1 rounded resize-none"
              />
            ) : (
              <div className="w-full h-full overflow-hidden">
                {element.bullets === 'checklist' && element.listItems ? (
                  <div className="space-y-1">
                    {element.listItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={item.checked} 
                          onChange={(e) => {
                            const newList = [...(element.listItems || [])];
                            newList[idx] = { ...newList[idx], checked: e.target.checked };
                            onChange({ listItems: newList });
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : element.text || 'Double click to edit text'}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div 
            className="w-full h-full relative group/image overflow-hidden"
            style={{
              filter: `brightness(${element.brightness || 1}) contrast(${element.contrast || 1}) saturate(${element.saturation || 1}) blur(${element.blur || 0}px)`,
              boxShadow: element.shadow ? '0 10px 25px -5px rgba(0,0,0,0.3)' : 'none',
              border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#000'}` : 'none',
              borderRadius: `${element.borderRadius || 0}px`,
              transform: `scaleX(${element.flipH ? -1 : 1}) scaleY(${element.flipV ? -1 : 1})`,
            }}
          >
            <img src={element.src} alt="PDF edit" className="w-full h-full object-cover" />
          </div>
        );

      case 'shape':
        const isWhiteout = element.fill === '#ffffff' && element.stroke === '#ffffff';
        const fill = element.fill || '#e11d48';
        const stroke = isWhiteout
          ? (isSelected ? '#cbd5e1' : 'transparent')
          : (element.stroke || '#000000');
        const strokeW = isWhiteout
          ? (isSelected ? 1 : 0)
          : (element.strokeWidth || 0);
        
        const svgContent = () => {
          switch (element.shapeType) {
            case 'circle':
              return <circle cx="50" cy="50" r={50 - strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            case 'ellipse':
              return <ellipse cx="50" cy="50" rx={50 - strokeW} ry={30 - strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            case 'triangle':
              return <polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            case 'diamond':
              return <polygon points="50,5 95,50 50,95 5,50" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            case 'arrow':
              return (
                <g fill={fill} stroke={stroke} strokeWidth={strokeW}>
                  <path d="M 10 40 L 60 40 L 60 20 L 95 50 L 60 80 L 60 60 L 10 60 Z" strokeDasharray={isWhiteout ? "2" : undefined} />
                </g>
              );
            case 'line':
              return <line x1="10" y1="50" x2="90" y2="50" stroke={fill} strokeWidth={Math.max(4, strokeW)} strokeLinecap="round" />;
            case 'star':
              return <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            case 'rounded-rect':
              return <rect x={strokeW/2} y={strokeW/2} width={100 - strokeW} height={100 - strokeW} rx="15" fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
            default: // rectangle
              return <rect x={strokeW/2} y={strokeW/2} width={100 - strokeW} height={100 - strokeW} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeDasharray={isWhiteout ? "2" : undefined} />;
          }
        };

        return (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {svgContent()}
          </svg>
        );

      case 'table':
        return (
          <div 
            className="w-full h-full overflow-auto bg-white dark:bg-slate-900 border border-collapse"
            style={{
              borderColor: element.borderColor || '#cbd5e1',
              borderWidth: `${element.borderWidth || 1}px`,
            }}
          >
            <table className="w-full h-full border-collapse">
              <tbody>
                {Array.from({ length: element.rows || 2 }).map((_, rIdx) => (
                  <tr key={rIdx}>
                    {Array.from({ length: element.cols || 2 }).map((_, cIdx) => {
                      const cell = element.cells?.find(c => c.row === rIdx && c.col === cIdx) || {
                        id: `${rIdx}-${cIdx}`,
                        row: rIdx,
                        col: cIdx,
                        text: '',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        bold: false,
                        italic: false,
                        align: 'left'
                      };
                      return (
                        <td 
                          key={cIdx} 
                          className="border border-slate-200 dark:border-slate-800 p-2 text-xs relative min-w-[50px] align-middle"
                          style={{
                            backgroundColor: cell.backgroundColor,
                            color: cell.color,
                            fontWeight: cell.bold ? 'bold' : 'normal',
                            fontStyle: cell.italic ? 'italic' : 'normal',
                            textAlign: cell.align || 'left',
                            padding: `${element.cellPadding || 8}px`,
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setActiveCellId(cell.id);
                          }}
                        >
                          {activeCellId === cell.id ? (
                            <input
                              type="text"
                              value={cell.text}
                              onChange={(e) => {
                                const newCells = element.cells.map(c => 
                                  c.id === cell.id ? { ...c, text: e.target.value } : c
                                );
                                onChange({ cells: newCells });
                              }}
                              onBlur={() => setActiveCellId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setActiveCellId(null);
                              }}
                              autoFocus
                              className="w-full bg-slate-100 dark:bg-slate-800 border-none outline-none p-0.5"
                            />
                          ) : (
                            <div className="min-h-[16px] empty:after:content-['...'] empty:after:text-slate-300">
                              {cell.text}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'signature':
        return (
          <div className="w-full h-full flex items-center justify-center p-2">
            {element.signatureType === 'type' ? (
              <span 
                className="text-center select-none"
                style={{
                  fontFamily: element.fontFamily || 'Dancing Script, cursive',
                  fontSize: `${element.fontSize || 36}px`,
                  color: '#0f172a'
                }}
              >
                {element.typedText}
              </span>
            ) : (
              <img src={element.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
            )}
          </div>
        );

      case 'form':
        const form = element as FormElement;
        return (
          <div className="w-full h-full flex flex-col justify-center px-2 py-1 bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-400 rounded">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-0.5 truncate select-none">
              {form.fieldName} {form.required && <span className="text-red-500">*</span>}
            </span>
            {form.fieldType === 'text-field' && (
              <input
                type="text"
                placeholder={form.placeholder || 'Text field'}
                value={form.value}
                onChange={(e) => onChange({ value: e.target.value })}
                className="w-full bg-white dark:bg-slate-850 text-xs py-0.5 px-1.5 rounded border border-slate-200 dark:border-slate-800 pointer-events-auto"
              />
            )}
            {form.fieldType === 'checkbox' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.value === 'true'}
                  onChange={(e) => onChange({ value: e.target.checked ? 'true' : 'false' })}
                  className="rounded border-slate-300 text-primary focus:ring-primary pointer-events-auto"
                />
                <span className="text-xs text-slate-600 dark:text-slate-350 select-none">Checkbox</span>
              </div>
            )}
            {form.fieldType === 'radio-group' && (
              <div className="flex flex-wrap gap-2 text-xs">
                {(form.options || ['Yes', 'No']).map((opt, oIdx) => (
                  <label key={oIdx} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={form.id}
                      checked={form.value === opt}
                      onChange={() => onChange({ value: opt })}
                      className="text-primary focus:ring-primary pointer-events-auto"
                    />
                    <span className="text-slate-600 dark:text-slate-350 select-none">{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {form.fieldType === 'dropdown' && (
              <select
                value={form.value}
                onChange={(e) => onChange({ value: e.target.value })}
                className="w-full bg-white dark:bg-slate-850 text-xs py-0.5 px-1.5 rounded border border-slate-200 dark:border-slate-800 pointer-events-auto"
              >
                <option value="">Select option...</option>
                {(form.options || ['Option 1', 'Option 2']).map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {form.fieldType === 'datepicker' && (
              <div className="relative w-full flex items-center pointer-events-auto">
                <input
                  type="date"
                  value={form.value}
                  onChange={(e) => onChange({ value: e.target.value })}
                  className="w-full bg-white dark:bg-slate-850 text-xs py-0.5 px-1.5 pr-6 rounded border border-slate-200 dark:border-slate-800"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
              </div>
            )}
            {form.fieldType === 'signature-field' && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 text-[10px] py-1 text-center font-bold text-slate-500 rounded border border-dashed border-slate-300 flex items-center justify-center gap-1 select-none">
                <Edit3 className="w-3 h-3" />
                Digital Signature Field
              </div>
            )}
          </div>
        );

      case 'comment':
        const comm = element as CommentElement;
        return (
          <div className="w-full h-full bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-850 rounded-2xl shadow-lg p-3.5 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase select-none"
                  style={{ backgroundColor: comm.avatarColor }}
                >
                  {comm.author.substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{comm.author}</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">{comm.date}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-amber-100/30 dark:bg-slate-950/20 p-2 rounded-xl">
                {comm.text}
              </p>
              
              {comm.replies.length > 0 && (
                <div className="mt-2.5 pl-3 border-l border-amber-200 dark:border-slate-850 space-y-2 max-h-16 overflow-y-auto">
                  {comm.replies.map(rep => (
                    <div key={rep.id} className="text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-slate-350">{rep.author}: </span>
                      <span className="text-slate-500 dark:text-slate-450">{rep.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <input 
                type="text" 
                placeholder="Reply..."
                className="flex-1 text-[10px] bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-800 p-1 rounded-lg outline-none pointer-events-auto"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    const newReplies = [...comm.replies, {
                      id: Math.random().toString(),
                      author: 'You',
                      text: e.currentTarget.value,
                      date: 'Just now'
                    }];
                    onChange({ replies: newReplies });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ resolved: true });
                }}
                className="p-1 hover:bg-emerald-100 text-emerald-500 rounded-lg pointer-events-auto"
                title="Resolve Thread"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const matchesSearch = searchQuery && searchQuery.trim().length > 0 && element.type === 'text' && element.text.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div
      ref={elementRef}
      style={getElementStyle()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={handleDragStart}
      className={`group absolute select-none ${
        isSelected 
          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 cursor-move' 
          : matchesSearch
            ? 'ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-slate-950 animate-pulse cursor-pointer shadow-xl z-[100]'
            : 'hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500 cursor-pointer'
      }`}
    >
      {/* Visual Content */}
      <div className="w-full h-full relative">
        {renderContent()}
      </div>

      {/* Control Handles (Only when element is selected) */}
      {isSelected && (
        <>
          {/* Resize Anchors */}
          <div 
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-primary border-2 border-white dark:border-slate-950 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
          />
          <div 
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary border-2 border-white dark:border-slate-950 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
          />
          <div 
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-primary border-2 border-white dark:border-slate-950 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
          />
          <div 
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary border-2 border-white dark:border-slate-950 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
          />

          {/* Rotation Handle */}
          <div 
            onMouseDown={handleRotateStart}
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center cursor-alias shadow-md hover:text-primary transition-colors"
            title="Rotate Element"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Inline Action Bar */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 z-50 pointer-events-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveToFront(); }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
              title="Bring to Front"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveToBack(); }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full transition-colors"
              title="Send to Back"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
