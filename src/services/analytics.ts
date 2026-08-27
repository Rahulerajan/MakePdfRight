/**
 * Analytics & Usage Telemetry Service
 * Respects user privacy: Tracks ONLY anonymous functional events (e.g. tool open, process complete).
 * NEVER tracks document content, text data, or personal details.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

class AnalyticsService {
  private initialized = false;
  private measurementId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) || (typeof process !== 'undefined' ? process.env?.VITE_GA_MEASUREMENT_ID : '') || '';

  constructor() {
    this.initGA();
  }

  private initGA() {
    if (typeof window === 'undefined' || this.initialized || !this.measurementId) return;

    try {
      // Dynamically load Google Analytics script if measurement ID provided
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', this.measurementId, {
        anonymize_ip: true,
        send_page_view: true
      });

      this.initialized = true;
    } catch (err) {
      console.warn('[Analytics] Failed to initialize GA:', err);
    }
  }

  public trackEvent(eventName: string, params: Record<string, any> = {}) {
    if (typeof window === 'undefined') return;

    // Log to console in dev mode
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.log(`[Analytics Event] ${eventName}:`, params);
    }

    if (window.gtag) {
      window.gtag('event', eventName, {
        ...params,
        timestamp: new Date().toISOString()
      });
    }
  }

  public trackPageView(path: string, title?: string) {
    this.trackEvent('page_view', {
      page_path: path,
      page_title: title || document.title
    });
  }

  public trackToolOpened(toolName: string) {
    this.trackEvent('Tool Opened', { tool_name: toolName });
  }

  public trackUploadStarted(toolName: string, fileCount: number = 1) {
    this.trackEvent('Upload Started', { tool_name: toolName, file_count: fileCount });
  }

  public trackUploadCompleted(toolName: string, totalSizeBytes?: number) {
    this.trackEvent('Upload Completed', { tool_name: toolName, file_size_bytes: totalSizeBytes });
  }

  public trackProcessingStarted(toolName: string) {
    this.trackEvent('Processing Started', { tool_name: toolName });
  }

  public trackProcessingCompleted(toolName: string, durationMs?: number) {
    this.trackEvent('Processing Completed', { tool_name: toolName, duration_ms: durationMs });
  }

  public trackDownloadCompleted(toolName: string) {
    this.trackEvent('Download Completed', { tool_name: toolName });
  }

  public trackProcessingFailed(toolName: string, errorMessage?: string) {
    this.trackEvent('Processing Failed', { tool_name: toolName, error_type: errorMessage });
  }
}

export const analytics = new AnalyticsService();
