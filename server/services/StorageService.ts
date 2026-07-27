import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService';

export class StorageService {
  private static tempDir = path.join(os.tmpdir(), 'make-pdf-right');

  static {
    // Ensure temp directory exists and cleanup startup orphans
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    } else {
      this.cleanupAll();
    }
    this.startScheduledCleanup();
  }

  static writeTempFile(buffer: Buffer, originalName: string = 'document.pdf'): string {
    const uuid = crypto.randomUUID();
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(this.tempDir, `${uuid}_${sanitizedName}`);
    
    // Prevent directory traversal
    if (!filePath.startsWith(this.tempDir)) {
      throw new Error('Invalid file path: path traversal detected.');
    }

    fs.writeFileSync(filePath, buffer);
    LoggingService.info(`Wrote temporary file: ${filePath}`);
    return filePath;
  }

  static readTempFile(filePath: string): Buffer {
    if (!filePath.startsWith(this.tempDir)) {
      throw new Error('Access denied: path traversal prevention.');
    }
    return fs.readFileSync(filePath);
  }

  static deleteTempFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        if (!filePath.startsWith(this.tempDir)) {
          throw new Error('Access denied: path traversal prevention.');
        }
        fs.unlinkSync(filePath);
        LoggingService.info(`Deleted temporary file: ${filePath}`);
      }
    } catch (err) {
      LoggingService.error(`Failed to delete temp file: ${filePath}`, err);
    }
  }

  static cleanupAll() {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        if (file.endsWith('.db') || file.endsWith('.db-journal') || file.endsWith('.db-wal')) {
          continue; // Preserve database files
        }
        const fullPath = path.join(this.tempDir, file);
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          // Ignore unlinking errors if file locked or gone
        }
      }
      LoggingService.info('Cleaned up all temporary storage files on startup.');
    } catch (err) {
      LoggingService.error('Failed to cleanup temp directory', err);
    }
  }

  static startScheduledCleanup(intervalMs: number = 10 * 60 * 1000, maxAgeMs: number = 15 * 60 * 1000) {
    setInterval(() => {
      try {
        if (!fs.existsSync(this.tempDir)) return;
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        let cleanedCount = 0;

        for (const file of files) {
          if (file.endsWith('.db') || file.endsWith('.db-journal') || file.endsWith('.db-wal')) {
            continue;
          }
          const filePath = path.join(this.tempDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAgeMs) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          } catch (e) {
            // File might have been deleted concurrently
          }
        }
        if (cleanedCount > 0) {
          LoggingService.info(`Scheduled cleanup removed ${cleanedCount} orphaned temp file(s).`);
        }
      } catch (err) {
        LoggingService.error('Error running scheduled temp file cleanup:', err);
      }
    }, intervalMs);
  }
}
