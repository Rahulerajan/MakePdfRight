import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService';

export class MergeService {
  static async mergePDFs(filePaths: string[]): Promise<Buffer> {
    LoggingService.info(`Starting server-side merge for ${filePaths.length} PDFs...`);
    const mergedDoc = await PDFDocument.create();
    
    for (const filePath of filePaths) {
      const bytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }
    
    const mergedBytes = await mergedDoc.save();
    return Buffer.from(mergedBytes);
  }
}
