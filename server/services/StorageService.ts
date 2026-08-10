import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';
import { IStorageProvider } from '../storage/IStorageProvider.js';
import { LocalStorageProvider } from '../storage/LocalStorageProvider.js';
import { GCSStorageProvider } from '../storage/GCSStorageProvider.js';
import { AppError } from './ErrorHandler.js';

export class StorageService {
  private static tempDir = path.resolve(os.tmpdir(), 'make-pdf-right');
  private static providerInstance: IStorageProvider;

  static {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
      } else {
        this.cleanupAll();
      }
      this.startScheduledCleanup();

      // Instantiate active storage provider based on environment config
      const providerType = process.env.STORAGE_PROVIDER || 'local';
      if (providerType === 'gcs') {
        this.providerInstance = new GCSStorageProvider();
      } else {
        this.providerInstance = new LocalStorageProvider();
      }
      LoggingService.info(`[StorageService] Initialized with provider: ${providerType}`);
    } catch (err) {
      LoggingService.error('Failed to initialize StorageService:', err);
    }
  }

  /**
   * Return the active StorageProvider instance.
   */
  static getStorageProvider(): IStorageProvider {
    if (!this.providerInstance) {
      this.providerInstance = new LocalStorageProvider();
    }
    return this.providerInstance;
  }

  /**
   * Generate a secure private object key.
   * Path structure: users/{ownerId}/{type}/{uuid}.pdf
   */
  static generateObjectKey(ownerId: string, type: 'uploads' | 'outputs' = 'uploads', extension: string = '.pdf'): string {
    const sanitizedOwner = (ownerId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomId = crypto.randomUUID();
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
    return `users/${sanitizedOwner}/${type}/${randomId}${cleanExt}`;
  }

  /**
   * Verify file ownership and existence to prevent IDOR attacks.
   */
  static async verifyObjectOwnership(objectKey: string, ownerId: string): Promise<void> {
    if (!objectKey || typeof objectKey !== 'string') {
      throw new AppError('Invalid object key.', 400);
    }

    const provider = this.getStorageProvider();
    const exists = await provider.exists(objectKey);
    if (!exists) {
      throw new AppError(`Object not found: ${objectKey}`, 404);
    }

    // Verify key path owner ID matches or check metadata ownerId
    const keyParts = objectKey.split('/');
    const keyOwner = keyParts.length >= 2 && keyParts[0] === 'users' ? keyParts[1] : null;

    if (keyOwner && keyOwner !== ownerId && ownerId !== 'admin') {
      LoggingService.warn(`[Security Alert] IDOR attempt blocked. Key owner ${keyOwner} != ${ownerId}`);
      throw new AppError('Access denied: You do not have permission to access this storage object.', 403);
    }

    const metadata = await provider.getMetadata(objectKey);
    if (metadata?.ownerId && metadata.ownerId !== ownerId && ownerId !== 'admin') {
      throw new AppError('Access denied: Ownership verification failed.', 403);
    }
  }

  // --- Legacy / Direct Temp File Utilities ---

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
          continue;
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
