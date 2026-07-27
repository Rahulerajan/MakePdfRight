import { PDFDocument } from 'pdf-lib';
import { AppError } from './ErrorHandler';
import { LoggingService } from './LoggingService';

export class ValidationService {
  // Validate that a buffer represents a healthy PDF format and size
  static validatePDFBuffer(buffer: Buffer) {
    if (!buffer || buffer.length === 0) {
      throw new AppError('The uploaded file is empty.', 400);
    }

    // Check PDF header standard %PDF-
    const header = buffer.toString('ascii', 0, 5);
    if (header !== '%PDF-') {
      LoggingService.warn(`Invalid file header detected: ${header}`);
      throw new AppError('Invalid PDF format. File must begin with %PDF-', 400);
    }

    // Prevent malicious files by checking size limits (150MB maximum)
    const MAX_SIZE = 150 * 1024 * 1024; // 150MB
    if (buffer.length > MAX_SIZE) {
      throw new AppError(`File exceeds maximum size limit of 150MB.`, 400);
    }
  }

  // Reject PDFs with unreasonable page counts (>2000 pages) to prevent resource-exhaustion attacks
  static async validatePDFPageCount(buffer: Buffer, maxPages: number = 2000) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      if (pageCount > maxPages) {
        throw new AppError(`PDF page count (${pageCount}) exceeds maximum allowable limit of ${maxPages} pages.`, 400);
      }
      return pageCount;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      LoggingService.warn(`PDF page count validation error: ${err.message}`);
      throw new AppError(`Invalid or corrupted PDF file: ${err.message || 'Unable to parse PDF structure.'}`, 400);
    }
  }

  static async validateBase64(base64: string): Promise<Buffer> {
    if (!base64) {
      throw new AppError('No PDF data provided.', 400);
    }

    try {
      // Remove data URL prefix if exists
      const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      this.validatePDFBuffer(buffer);
      await this.validatePDFPageCount(buffer, 2000);
      return buffer;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError('Failed to decode file data. Please upload a valid base64 encoded PDF.', 400);
    }
  }

  // Validate image uploads going to Gemini or OCR
  static validateImageUpload(imageBase64: string, mimeType: string) {
    if (!imageBase64) {
      throw new AppError('imageBase64 is required.', 400);
    }
    if (!mimeType) {
      throw new AppError('mimeType is required.', 400);
    }

    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/gif', 'image/bmp'
    ];
    
    const cleanMime = mimeType.toLowerCase().trim();
    if (!allowedMimeTypes.includes(cleanMime) && !cleanMime.startsWith('image/')) {
      throw new AppError(`Unsupported image MIME type: ${mimeType}. Allowed formats include JPG, PNG, WEBP, GIF, HEIC, BMP.`, 400);
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new AppError('Uploaded image exceeds maximum size limit of 25MB.', 400);
    }
  }

  // Validate audio uploads going to Gemini audio transcription
  static validateAudioUpload(audioBase64: string, mimeType: string) {
    if (!audioBase64) {
      throw new AppError('audioBase64 is required.', 400);
    }
    if (!mimeType) {
      throw new AppError('mimeType is required.', 400);
    }

    const allowedMimeTypes = [
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm',
      'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/aac',
      'audio/flac', 'audio/x-m4a', 'audio/x-wav'
    ];

    const cleanMime = mimeType.toLowerCase().trim();
    if (!allowedMimeTypes.includes(cleanMime) && !cleanMime.startsWith('audio/')) {
      throw new AppError(`Unsupported audio MIME type: ${mimeType}. Allowed formats include MP3, WAV, WEBM, M4A, OGG, AAC, FLAC.`, 400);
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
    if (buffer.length > MAX_AUDIO_SIZE) {
      throw new AppError('Uploaded audio exceeds maximum size limit of 50MB.', 400);
    }
  }
}
