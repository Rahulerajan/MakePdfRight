export type ToolId = 
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'pdf-to-word' 
  | 'pdf-to-excel' 
  | 'pdf-to-jpg' 
  | 'edit' 
  | 'organise';

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: string; // URL to premium icon
  category: 'convert' | 'edit' | 'organise' | 'optimize';
}

export interface AppState {
  theme: 'light' | 'dark';
  language: string;
}
