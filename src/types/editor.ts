export type ElementType = 'text' | 'image' | 'shape' | 'table' | 'signature' | 'form' | 'comment';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // Percentage-based or absolute viewport coordinates (we will use relative/absolute coordinates for responsive alignment)
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  pageIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  highlightColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  charSpacing: number; // in px
  lineHeight: number; // multiplier e.g. 1.2
  padding: number; // in px
  align: 'left' | 'center' | 'right' | 'justify';
  wordWrap: boolean;
  bullets?: 'none' | 'bullet' | 'number' | 'checklist';
  listItems?: { text: string; checked?: boolean }[];
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  brightness: number; // multiplier e.g. 1.0
  contrast: number; // multiplier
  saturation: number; // multiplier
  blur: number; // in px
  shadow: boolean;
  borderWidth: number;
  borderColor: string;
  borderRadius: number; // in px
  flipH: boolean;
  flipV: boolean;
  crop?: { x: number; y: number; width: number; height: number };
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'arrow' | 'line' | 'star' | 'polygon' | 'rounded-rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadow: boolean;
}

export interface TableCell {
  id: string;
  row: number;
  col: number;
  text: string;
  backgroundColor: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  rowSpan?: number;
  colSpan?: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  cols: number;
  cells: TableCell[];
  borderWidth: number;
  borderColor: string;
  cellPadding: number;
}

export interface SignatureElement extends BaseElement {
  type: 'signature';
  signatureType: 'draw' | 'type' | 'upload';
  dataUrl: string; // contains the SVG path, text string, or base64 image
  typedText?: string;
  fontFamily?: string;
}

export interface FormElement extends BaseElement {
  type: 'form';
  fieldType: 'text-field' | 'checkbox' | 'radio-group' | 'dropdown' | 'datepicker' | 'signature-field';
  fieldName: string;
  value: string;
  options?: string[]; // for dropdown or radio group
  required: boolean;
  placeholder?: string;
}

export interface CommentElement extends BaseElement {
  type: 'comment';
  author: string;
  avatarColor: string;
  text: string;
  date: string;
  resolved: boolean;
  replies: {
    id: string;
    author: string;
    text: string;
    date: string;
  }[];
}

export type EditorElement = 
  | TextElement 
  | ImageElement 
  | ShapeElement 
  | TableElement 
  | SignatureElement 
  | FormElement 
  | CommentElement;

export interface DrawingStroke {
  id: string;
  pageIndex: number;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  thickness: number;
  opacity: number;
  tool: 'pen' | 'pencil' | 'highlighter' | 'marker' | 'brush' | 'eraser';
}

export interface TrackChange {
  id: string;
  type: 'insertion' | 'deletion' | 'formatting';
  author: string;
  color: string;
  pageIndex: number;
  elementId: string;
  originalText?: string;
  newText?: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  date: string;
}

export interface DocumentVersion {
  id: string;
  name: string;
  date: string;
  author: string;
  elements: EditorElement[];
  strokes: DrawingStroke[];
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursorX: number; // percentage of current page
  cursorY: number;
  pageIndex: number;
  activeElementId: string | null;
}

export interface PageConfig {
  index: number;
  rotation: number; // 0, 90, 180, 270
  header?: {
    leftText?: string;
    centerText?: string;
    rightText?: string;
    showPageNumbers?: boolean;
    differentFirstPage?: boolean;
    differentOddEven?: boolean;
  };
  footer?: {
    leftText?: string;
    centerText?: string;
    rightText?: string;
    showPageNumbers?: boolean;
  };
}
