import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';

export class StorageService {
  private static tempDir = path.resolve(os.tmpdir(), 'make-pdf-right');

  static {
    try {
      // Ensure temp directory exists with restrictive directory permissions (0o700)
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
      } else {
        this.cleanupAll();
      }
      this.startScheduledCleanup();
    } catch (err) {
      LoggingService.error('Failed to initialize StorageService directory:', err);
    }
  }

  // Robust path containment check using path.resolve and path.relative comparison
  static isPathContained(targetPath: string, parentDir: string = this.tempDir): boolean {
    if (!targetPath || typeof targetPath !== 'string') return false;
    const resolvedTarget = path.resolve(targetPath);
    const resolvedParent = path.resolve(parentDir);
    const relative = path.relative(resolvedParent, resolvedTarget);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  static writeTempFile(buffer: Buffer, originalName: string = 'document.pdf'): string {
    const uuid = crypto.randomUUID();
    const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.resolve(this.tempDir, `${uuid}_${sanitizedName}`);
    
    if (!this.isPathContained(filePath)) {
      throw new Error('Security Error: Path traversal attempt detected.');
    }

    // Write file with restrictive permissions (0o600)
    fs.writeFileSync(filePath, buffer, { mode: 0o600 });
    LoggingService.info(`Wrote temporary file securely: ${filePath}`);
    return filePath;
  }

  static readTempFile(filePath: string): Buffer {
    if (!this.isPathContained(filePath)) {
      throw new Error('Access denied: Path traversal prevention.');
    }
    return fs.readFileSync(filePath);
  }

  static deleteTempFile(filePath: string) {
    try {
      if (!this.isPathContained(filePath)) {
        LoggingService.warn(`Skipped deleting untrusted file path: ${filePath}`);
        return;
      }
      if (fs.existsSync(filePath)) {
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
        const fullPath = path.resolve(this.tempDir, file);
        if (this.isPathContained(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            // File might be locked or already deleted
          }
        }
      }
      LoggingService.info('Cleaned up temporary storage files.');
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
          const filePath = path.resolve(this.tempDir, file);
          if (!this.isPathContained(filePath)) continue;

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
