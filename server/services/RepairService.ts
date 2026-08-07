import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService.js';

export class RepairService {
  static async repairPDF(filePath: string): Promise<Buffer> {
    LoggingService.info(`Repairing PDF file: ${filePath}...`);
    const bytes = fs.readFileSync(filePath);
    
    // Attempt loose parsing
    const pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false
    });
    
    // Save with packed object streams to rebuild offsets and fix cross-reference pointer issues
    const repairedBytes = await pdfDoc.save({ useObjectStreams: true });
    LoggingService.info(`Successfully repaired and optimized PDF structure for: ${filePath}`);
    return Buffer.from(repairedBytes);
  }
}
