import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService.js';
import { ValidationService } from './ValidationService.js';

export class SplitService {
  static async splitPDF(filePath: string, pageIndices: number[]): Promise<Buffer> {
    LoggingService.info(`Starting server-side split/extract for file: ${filePath} on pages: ${pageIndices}`);
    const bytes = fs.readFileSync(filePath);
    await ValidationService.checkEncryptionAndIntegrity(bytes);
    const sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const splitDoc = await PDFDocument.create();
    
    const copiedPages = await splitDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => splitDoc.addPage(page));
    
    const splitBytes = await splitDoc.save();
    return Buffer.from(splitBytes);
  }
}
