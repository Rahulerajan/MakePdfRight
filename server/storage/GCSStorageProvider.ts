import { Readable } from 'stream';
import { Storage as GCSClient } from '@google-cloud/storage';
import { IStorageProvider, StorageObjectMetadata, StorageConditionalOptions } from './IStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { FileTokenService } from '../services/FileTokenService.js';
import { LoggingService } from '../services/LoggingService.js';
import { AppError } from '../services/ErrorHandler.js';

/**
 * GCS Storage Provider implementation.
 * Uses native object generation preconditions (ifGenerationMatch) for atomic conditional writes across distributed instances.
 * Falls back safely to LocalStorageProvider in non-production local environments.
 */
export class GCSStorageProvider implements IStorageProvider {
  private fallback?: LocalStorageProvider;
  private gcsStorage?: GCSClient;
  private bucketName?: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME;
    if (this.bucketName) {
      try {
        this.gcsStorage = new GCSClient();
        LoggingService.info(`[GCSStorageProvider] Initialized GCS Storage Provider with bucket: ${this.bucketName}`);
      } catch (err) {
        LoggingService.error('[GCSStorageProvider] Failed to initialize GCS client:', err);
      }
    }

    if (!this.gcsStorage) {
      if (process.env.NODE_ENV === 'production') {
        LoggingService.warn('[GCSStorageProvider] GCS_BUCKET_NAME is not configured in production environment.');
      } else {
        this.fallback = new LocalStorageProvider();
        LoggingService.info('[GCSStorageProvider] Using LocalStorageProvider fallback for local development.');
      }
    }
  }

  supportsConditionalWrites(): boolean {
    if (this.gcsStorage) return true;
    if (this.fallback) return this.fallback.supportsConditionalWrites();
    return false; // Fail closed if no provider is active in production
  }

  async upload(
    key: string,
    data: Buffer | Readable,
    metadata?: Record<string, string>,
    conditionalOpts?: StorageConditionalOptions
  ): Promise<string> {
    if (this.gcsStorage && this.bucketName) {
      try {
        const bucket = this.gcsStorage.bucket(this.bucketName);
        const file = bucket.file(key);

        const options: any = {
          metadata: {
            contentType: metadata?.contentType || 'application/json',
            metadata: metadata || {}
          }
        };

        if (conditionalOpts?.ifDoesNotExist) {
          options.preconditionOpts = { ifGenerationMatch: 0 };
        } else if (conditionalOpts?.ifMatchVersion !== undefined) {
          options.preconditionOpts = { ifGenerationMatch: conditionalOpts.ifMatchVersion };
        }

        const buffer = Buffer.isBuffer(data)
          ? data
          : await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              data.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
              data.on('end', () => resolve(Buffer.concat(chunks)));
              data.on('error', reject);
            });

        await file.save(buffer, options);
        LoggingService.info(`[GCSStorageProvider] Uploaded object to GCS key ${key} with precondition check`);
        return key;
      } catch (err: any) {
        if (err.code === 412 || err.status === 412 || err.message?.includes('precondition')) {
          throw new AppError(`GCS conditional write failed for key ${key}: Precondition failed (generation mismatch).`, 412);
        }
        LoggingService.error(`[GCSStorageProvider] Upload failed for key ${key}:`, err);
        throw err;
      }
    }

    if (this.fallback) {
      return this.fallback.upload(key, data, metadata, conditionalOpts);
    }

    throw new AppError(
      'Configuration Error: Production distributed job claiming requires a storage provider with atomic conditional write support (GCS_BUCKET_NAME must be set).',
      500
    );
  }

  async download(key: string): Promise<Buffer> {
    if (this.gcsStorage && this.bucketName) {
      const bucket = this.gcsStorage.bucket(this.bucketName);
      const [contents] = await bucket.file(key).download();
      return contents;
    }
    if (this.fallback) return this.fallback.download(key);
    throw new AppError('Storage provider unconfigured.', 500);
  }

  async readStream(key: string): Promise<Readable> {
    if (this.gcsStorage && this.bucketName) {
      const bucket = this.gcsStorage.bucket(this.bucketName);
      return bucket.file(key).createReadStream();
    }
    if (this.fallback) return this.fallback.readStream(key);
    throw new AppError('Storage provider unconfigured.', 500);
  }

  async delete(key: string): Promise<void> {
    if (this.gcsStorage && this.bucketName) {
      const bucket = this.gcsStorage.bucket(this.bucketName);
      await bucket.file(key).delete({ ignoreNotFound: true }).catch(() => {});
      return;
    }
    if (this.fallback) return this.fallback.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    if (this.gcsStorage && this.bucketName) {
      const bucket = this.gcsStorage.bucket(this.bucketName);
      const [exists] = await bucket.file(key).exists();
      return exists;
    }
    if (this.fallback) return this.fallback.exists(key);
    return false;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    if (this.gcsStorage && this.bucketName) {
      try {
        const bucket = this.gcsStorage.bucket(this.bucketName);
        const [meta] = await bucket.file(key).getMetadata();
        return {
          size: Number(meta.size) || 0,
          contentType: meta.contentType || 'application/pdf',
          createdAt: new Date(meta.timeCreated || Date.now()),
          version: Number(meta.generation) || 1
        };
      } catch {
        return null;
      }
    }
    if (this.fallback) return this.fallback.getMetadata(key);
    return null;
  }

  async createSignedUploadUrl(key: string, contentType: string, expiresInSeconds: number = 900): Promise<string> {
    if (this.gcsStorage && this.bucketName) {
      try {
        const [url] = await this.gcsStorage.bucket(this.bucketName).file(key).getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + expiresInSeconds * 1000,
          contentType
        });
        return url;
      } catch (err) {
        LoggingService.warn('[GCSStorageProvider] GCS V4 signed upload URL generation unavailable, using signed token endpoint:', err);
      }
    }
    if (this.fallback) return this.fallback.createSignedUploadUrl(key, contentType, expiresInSeconds);

    const parts = key.split('/');
    const ownerId = parts.length >= 2 && parts[0] === 'users' ? parts[1] : 'anonymous';
    const { token } = FileTokenService.generateToken(key, ownerId, 'upload', expiresInSeconds);
    return `/api/files/upload?key=${encodeURIComponent(key)}&token=${token}`;
  }

  async createSignedDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    if (this.gcsStorage && this.bucketName) {
      try {
        const [url] = await this.gcsStorage.bucket(this.bucketName).file(key).getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresInSeconds * 1000
        });
        return url;
      } catch (err) {
        LoggingService.warn('[GCSStorageProvider] GCS V4 signed download URL generation unavailable, using signed token endpoint:', err);
      }
    }
    if (this.fallback) return this.fallback.createSignedDownloadUrl(key, expiresInSeconds);

    const parts = key.split('/');
    const ownerId = parts.length >= 2 && parts[0] === 'users' ? parts[1] : 'anonymous';
    const { token } = FileTokenService.generateToken(key, ownerId, 'download', expiresInSeconds);
    return `/api/files/download?key=${encodeURIComponent(key)}&token=${token}`;
  }
}
