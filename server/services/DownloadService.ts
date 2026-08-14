import { Response } from 'express';
import fs from 'fs';
import { ValidationService } from './ValidationService.js';

export class DownloadService {
  static sendAsAttachment(res: Response, filePath: string, clientFilename: string) {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found or expired.' });
    }
    
    res.setHeader('Content-Disposition', ValidationService.formatContentDisposition(clientFilename));
    res.setHeader('Content-Type', 'application/pdf');
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
  
  static sendAsBase64(res: Response, filePath: string, metadata: object = {}) {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }
    
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    
    res.json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${base64}`,
      size: buffer.length,
      ...metadata
    });
  }
}
