import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { LoggingService } from './LoggingService';

export interface ThumbnailDetails {
  filename: string;
  pageCount: number;
  firstPagePreviewText: string;
  fileSize: number;
}

export class ThumbnailService {
  static async getDetails(filePath: string): Promise<ThumbnailDetails> {
    LoggingService.info(`Analyzing PDF for details & thumbnail metadata: ${filePath}`);
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    
    const pageCount = pdfDoc.getPageCount();
    const filename = path.basename(filePath);
    
    let firstPagePreviewText = 'Page 1 Contents';
    try {
      const page = pdfDoc.getPage(0);
      const title = pdfDoc.getTitle();
      if (title) {
        firstPagePreviewText = `Title: ${title}`;
      } else {
        firstPagePreviewText = `Document contains ${pageCount} page(s). Cover page size is ${Math.round(page.getWidth())}x${Math.round(page.getHeight())}pt.`;
      }
    } catch (e) {
      // Ignored
    }

    return {
      filename,
      pageCount,
      firstPagePreviewText,
      fileSize: bytes.length
    };
  }
}
