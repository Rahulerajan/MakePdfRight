import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { IStorageProvider, StorageObjectMetadata } from './IStorageProvider.js';
import { FileTokenService } from '../services/FileTokenService.js';
import { LoggingService } from '../services/LoggingService.js';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(os.tmpdir(), 'make-pdf-right', 'private_storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  private resolveKeyPath(key: string): string {
    // Sanitize key and prevent path traversal
    const cleanKey = key.replace(/\\/g, '/').replace(/\.\./g, '');
    const fullPath = path.resolve(this.baseDir, cleanKey);
    
    // Containment check
    const relative = path.relative(this.baseDir, fullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Security Violation: Invalid storage object key path.');
    }
    return fullPath;
  }

  private resolveMetaPath(key: string): string {
    return `${this.resolveKeyPath(key)}.meta.json`;
  }

  async upload(key: string, data: Buffer | Readable, metadata?: Record<string, string>): Promise<string> {
    const filePath = this.resolveKeyPath(key);
    const metaPath = this.resolveMetaPath(key);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data, { mode: 0o600 });
    } else {
      const writeStream = fs.createWriteStream(filePath, { mode: 0o600 });
      await new Promise<void>((resolve, reject) => {
        data.pipe(writeStream);
        data.on('error', reject);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });
    }

    const stats = fs.statSync(filePath);
    const metaObj: StorageObjectMetadata = {
      size: stats.size,
      contentType: metadata?.contentType || 'application/pdf',
      createdAt: new Date(),
      ownerId: metadata?.ownerId,
      originalFilename: metadata?.originalFilename
    };

    fs.writeFileSync(metaPath, JSON.stringify(metaObj), { mode: 0o600 });
    LoggingService.info(`[LocalStorageProvider] Uploaded object to ${key}`);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolveKeyPath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async readStream(key: string): Promise<Readable> {
    const filePath = this.resolveKeyPath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return fs.createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.resolveKeyPath(key);
      const metaPath = this.resolveMetaPath(key);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      LoggingService.info(`[LocalStorageProvider] Deleted object ${key}`);
    } catch (err) {
      LoggingService.error(`[LocalStorageProvider] Failed to delete object ${key}:`, err);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveKeyPath(key);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const metaPath = this.resolveMetaPath(key);
      if (fs.existsSync(metaPath)) {
        const raw = fs.readFileSync(metaPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt)
        };
      }
      const filePath = this.resolveKeyPath(key);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          size: stats.size,
          contentType: 'application/pdf',
          createdAt: stats.birthtime
        };
      }
      return null;
    } catch (err) {
      LoggingService.error(`[LocalStorageProvider] Failed to get metadata for ${key}:`, err);
      return null;
    }
  }

  async createSignedUploadUrl(key: string, contentType: string, expiresInSeconds: number = 900): Promise<string> {
    // Owner ID extracted from key structure: users/{ownerId}/...
    const parts = key.split('/');
    const ownerId = parts.length >= 2 && parts[0] === 'users' ? parts[1] : 'anonymous';
    const { token } = FileTokenService.generateToken(key, ownerId, 'upload', expiresInSeconds);
    return `/api/files/upload?key=${encodeURIComponent(key)}&token=${token}`;
  }

  async createSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const parts = key.split('/');
    const ownerId = parts.length >= 2 && parts[0] === 'users' ? parts[1] : 'anonymous';
    const { token } = FileTokenService.generateToken(key, ownerId, 'download', expiresInSeconds);
    return `/api/files/download?key=${encodeURIComponent(key)}&token=${token}`;
  }
}
