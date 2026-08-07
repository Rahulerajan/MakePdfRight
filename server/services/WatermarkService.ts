import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import { LoggingService } from './LoggingService.js';

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number;
  color?: { r: number; g: number; b: number };
  rotation?: number;
}

export class WatermarkService {
  static async addWatermark(filePath: string, options: WatermarkOptions): Promise<Buffer> {
    LoggingService.info(`Adding watermark to PDF file: ${filePath}`);
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    
    const text = options.text || 'CONFIDENTIAL';
    const fontSize = options.fontSize || 50;
    const opacity = options.opacity !== undefined ? options.opacity : 0.3;
    const color = options.color || { r: 0.7, g: 0.7, b: 0.7 };
    const rotation = options.rotation !== undefined ? options.rotation : 45;

    for (const page of pages) {
      const { width, height } = page.getSize();
      
      page.drawText(text, {
        x: width / 4,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation),
      });
    }

    const watermarkedBytes = await pdfDoc.save();
    return Buffer.from(watermarkedBytes);
  }
}
