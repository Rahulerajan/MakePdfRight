import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService';

export interface PageRotationInput {
  index: number;
  rotation: number;
}

export class RotateService {
  static async rotatePDF(filePath: string, rotations: PageRotationInput[]): Promise<Buffer> {
    LoggingService.info(`Starting server-side rotate for file: ${filePath}`);
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pdfPages = pdfDoc.getPages();
    
    for (const r of rotations) {
      if (r.index >= 0 && r.index < pdfPages.length) {
        const page = pdfPages[r.index];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + r.rotation) % 360));
      }
    }
    
    const rotatedBytes = await pdfDoc.save();
    return Buffer.from(rotatedBytes);
  }
}
