import { PDFDocument } from 'pdf-lib';
import { AppError } from './ErrorHandler.js';
import { LoggingService } from './LoggingService.js';

export class ValidationService {
  // Validate Base64 string strictly
  static validateStrictBase64(base64: string): string {
    if (!base64 || typeof base64 !== 'string') {
      throw new AppError('Invalid Base64 payload: data must be a non-empty string.', 400);
    }

    // Strip prefix if present
    const cleanBase64 = base64.replace(/^data:[a-zA-Z0-9-]+\/[a-zA-Z0-9.-]+;base64,/, '');

    if (cleanBase64.length === 0) {
      throw new AppError('Empty Base64 payload provided.', 400);
    }

    // Validate Base64 character set and padding
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    if (!base64Regex.test(cleanBase64) || cleanBase64.length % 4 !== 0) {
      throw new AppError('Invalid Base64 encoding. Payload contains invalid characters or padding.', 400);
    }

    return cleanBase64;
  }

  // Magic Byte Validation
  static validateMagicBytes(buffer: Buffer, expectedType: 'pdf' | 'image' | 'audio'): void {
    if (!buffer || buffer.length < 4) {
      throw new AppError('File payload is too small to determine valid magic bytes.', 400);
    }

    if (expectedType === 'pdf') {
      const header = buffer.toString('ascii', 0, 5);
      if (header !== '%PDF-') {
        LoggingService.warn(`Invalid PDF header detected: ${header}`);
        throw new AppError('Invalid PDF file. Header must begin with %PDF-', 400);
      }
    } else if (expectedType === 'image') {
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isGif = buffer.toString('ascii', 0, 3) === 'GIF';
      const isBmp = buffer[0] === 0x42 && buffer[1] === 0x4d;
      const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

      if (!isPng && !isJpeg && !isGif && !isBmp && !isWebp) {
        throw new AppError('Invalid image content. File signature does not match allowed image formats (PNG, JPEG, GIF, BMP, WEBP).', 400);
      }
    } else if (expectedType === 'audio') {
      const isMp3 = (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
      const isWav = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
      const isOgg = buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS';
      const isFlac = buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'fLaC';
      const isM4a = buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp';

      if (!isMp3 && !isWav && !isOgg && !isFlac && !isM4a) {
        throw new AppError('Invalid audio content. File signature does not match allowed audio formats (MP3, WAV, OGG, FLAC, M4A).', 400);
      }
    }
  }

  // Validate that a buffer represents a healthy PDF format and size
  static validatePDFBuffer(buffer: Buffer) {
    if (!buffer || buffer.length === 0) {
      throw new AppError('The uploaded PDF file is empty.', 400);
    }

    this.validateMagicBytes(buffer, 'pdf');

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
      throw new AppError('Invalid or corrupted PDF file structure.', 400);
    }
  }

  static async validateBase64(base64: string): Promise<Buffer> {
    const cleanBase64 = this.validateStrictBase64(base64);
    const buffer = Buffer.from(cleanBase64, 'base64');
    this.validatePDFBuffer(buffer);
    await this.validatePDFPageCount(buffer, 2000);
    return buffer;
  }

  // Validate image uploads going to Gemini or OCR with explicit allowlist and magic byte checks
  static validateImageUpload(imageBase64: string, mimeType: string) {
    if (!imageBase64) {
      throw new AppError('imageBase64 payload is required.', 400);
    }
    if (!mimeType) {
      throw new AppError('mimeType is required.', 400);
    }

    const ALLOWED_IMAGE_MIMES = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp'
    ]);
    
    const cleanMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_IMAGE_MIMES.has(cleanMime)) {
      throw new AppError(`Unsupported image format (${mimeType}). Allowed formats are JPG, PNG, WEBP, GIF, BMP.`, 400);
    }

    const cleanBase64 = this.validateStrictBase64(imageBase64);
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new AppError('Uploaded image exceeds maximum size limit of 25MB.', 400);
    }

    this.validateMagicBytes(buffer, 'image');
  }

  // Validate audio uploads going to Gemini audio transcription with explicit allowlist and magic byte checks
  static validateAudioUpload(audioBase64: string, mimeType: string) {
    if (!audioBase64) {
      throw new AppError('audioBase64 payload is required.', 400);
    }
    if (!mimeType) {
      throw new AppError('mimeType is required.', 400);
    }

    const ALLOWED_AUDIO_MIMES = new Set([
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a',
      'audio/mp4',
      'audio/aac',
      'audio/flac',
      'audio/x-m4a',
      'audio/x-wav'
    ]);

    const cleanMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_AUDIO_MIMES.has(cleanMime)) {
      throw new AppError(`Unsupported audio format (${mimeType}). Allowed formats are MP3, WAV, WEBM, OGG, AAC, FLAC, M4A.`, 400);
    }

    const cleanBase64 = this.validateStrictBase64(audioBase64);
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
    if (buffer.length > MAX_AUDIO_SIZE) {
      throw new AppError('Uploaded audio exceeds maximum size limit of 50MB.', 400);
    }

    this.validateMagicBytes(buffer, 'audio');
  }

  // Endpoint Payload Parameter Limits Validation
  static validateMergeFilesPayload(files: any[]) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new AppError('files array is required and must not be empty.', 400);
    }
    if (files.length > 20) {
      throw new AppError('Cannot merge more than 20 PDF documents in a single request.', 400);
    }
  }

  static validateSplitPayload(pageIndices: number[]) {
    if (!Array.isArray(pageIndices) || pageIndices.length === 0) {
      throw new AppError('pageIndices array is required and must not be empty.', 400);
    }
    if (pageIndices.length > 2000) {
      throw new AppError('Page indices array exceeds maximum length of 2000 pages.', 400);
    }
  }

  static validateWatermarkText(text: string) {
    if (!text || typeof text !== 'string') {
      throw new AppError('Watermark text is required.', 400);
    }
    if (text.length > 200) {
      throw new AppError('Watermark text must not exceed 200 characters.', 400);
    }
  }

  static validateTextPrompt(prompt: string, maxLen: number = 2000) {
    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('Prompt string is required.', 400);
    }
    if (prompt.length > maxLen) {
      throw new AppError(`Prompt length exceeds maximum allowable limit of ${maxLen} characters.`, 400);
    }
  }
}
