import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService.js';
import { ValidationService } from './ValidationService.js';

export interface OrganizePageItem {
  index: number;
  rotation?: number;
}

export class OrganizeService {
  static async organizePDF(filePath: string, pageItems: OrganizePageItem[]): Promise<Buffer> {
    LoggingService.info(`Starting server-side organize for file: ${filePath}`);
    const bytes = fs.readFileSync(filePath);
    await ValidationService.checkEncryptionAndIntegrity(bytes);
    const sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const organizedDoc = await PDFDocument.create();
    
    for (const item of pageItems) {
      if (item.index >= 0 && item.index < sourceDoc.getPageCount()) {
        const [copiedPage] = await organizedDoc.copyPages(sourceDoc, [item.index]);
        if (item.rotation !== undefined && item.rotation !== 0) {
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
        }
        organizedDoc.addPage(copiedPage);
      }
    }
    
    const organizedBytes = await organizedDoc.save();
    return Buffer.from(organizedBytes);
  }
}
