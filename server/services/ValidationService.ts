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

  /**
   * Pre-processing check for PDF integrity and encryption handling.
   */
  static async checkEncryptionAndIntegrity(buffer: Buffer): Promise<{ pageCount: number; isEncrypted: boolean }> {
    this.validatePDFBuffer(buffer);

    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      if (pdfDoc.isEncrypted) {
        throw new AppError('This PDF file is password-protected or encrypted. Please unlock or decrypt the file before processing.', 400);
      }

      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new AppError('The PDF document contains 0 pages.', 400);
      }
      if (pageCount > 2000) {
        throw new AppError(`PDF page count (${pageCount}) exceeds maximum allowable limit of 2000 pages.`, 400);
      }

      return { pageCount, isEncrypted: false };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      LoggingService.warn(`PDF pre-check failed: ${err.message}`);
      throw new AppError('Invalid, corrupted, or password-protected PDF document structure.', 400);
    }
  }

  /**
   * Strict post-processing validation for compressed/generated PDF outputs.
   */
  static async validateCompressedOutput(
    outputBuffer: Buffer,
    expectedPageCount: number
  ): Promise<boolean> {
    if (!outputBuffer || outputBuffer.length === 0) {
      throw new AppError('Compression validation failed: Output PDF buffer is empty.', 500);
    }

    // Verify PDF magic bytes
    this.validateMagicBytes(outputBuffer, 'pdf');

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(outputBuffer, { ignoreEncryption: true });
    } catch (err: any) {
      LoggingService.error(`Output PDF parse validation failed: ${err.message}`);
      throw new AppError('Compression validation failed: Generated output PDF is corrupted or unparseable.', 500);
    }

    const outputPageCount = pdfDoc.getPageCount();
    if (outputPageCount !== expectedPageCount) {
      LoggingService.error(`Output PDF page count mismatch: expected ${expectedPageCount}, got ${outputPageCount}`);
      throw new AppError(`Compression validation failed: Output page count (${outputPageCount}) does not match input (${expectedPageCount}).`, 500);
    }

    // Verify page dimensions (sampling strategy for large documents)
    const pages = pdfDoc.getPages();
    const sampleIndices = pages.length <= 5 
      ? pages.map((_, i) => i) 
      : [0, Math.floor(pages.length / 4), Math.floor(pages.length / 2), Math.floor((3 * pages.length) / 4), pages.length - 1];

    for (const idx of sampleIndices) {
      const { width, height } = pages[idx].getSize();
      if (!width || !height || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        throw new AppError(`Compression validation failed: Invalid page dimensions on page ${idx + 1}.`, 500);
      }
    }

    return true;
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
