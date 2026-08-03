export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  fileName: string;
  fileSize?: number;
  outputSize?: number;
  resultUrl?: string;
  status: 'completed' | 'failed' | 'processing';
  timestamp: number;
  details?: string;
}

const STORAGE_KEY = 'make_pdf_history_v1';

export class HistoryService {
  static getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('[HistoryService] Error loading history from localStorage:', e);
      return [];
    }
  }

  static addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
    const history = this.getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      timestamp: Date.now()
    };
    
    // Store up to 50 recent items
    const updated = [newItem, ...history].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[HistoryService] Could not save history to localStorage:', e);
    }
    return newItem;
  }

  static removeHistoryItem(id: string): void {
    const history = this.getHistory();
    const updated = history.filter(item => item.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[HistoryService] Error deleting history item:', e);
    }
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[HistoryService] Error clearing history:', e);
    }
  }
}
