export interface AppSettings {
  namingTemplate: string;
  compressionDefault: 'recommended' | 'extreme' | 'less';
  aiThinkingDefault: boolean;
  historyRetentionDays: number;
  autoClearHistoryOnExit: boolean;
  enableKeyboardShortcuts: boolean;
}

const STORAGE_KEY = 'make_pdf_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  namingTemplate: '{filename}_processed',
  compressionDefault: 'recommended',
  aiThinkingDefault: false,
  historyRetentionDays: 30,
  autoClearHistoryOnExit: false,
  enableKeyboardShortcuts: true,
};

export class SettingsService {
  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      console.error('[SettingsService] Error loading settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static updateSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[SettingsService] Error saving settings:', e);
    }
    return updated;
  }

  static formatOutputFilename(originalName: string, defaultSuffix = 'processed'): string {
    const settings = this.getSettings();
    const cleanOriginal = originalName.replace(/\.[^/.]+$/, '');
    const extension = originalName.includes('.') ? originalName.split('.').pop() : 'pdf';
    
    let template = settings.namingTemplate || '{filename}_processed';
    template = template.replace('{filename}', cleanOriginal);
    template = template.replace('{suffix}', defaultSuffix);
    template = template.replace('{date}', new Date().toISOString().split('T')[0]);
    
    return `${template}.${extension}`;
  }
}
