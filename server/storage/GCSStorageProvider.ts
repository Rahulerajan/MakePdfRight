import { Readable } from 'stream';
import { IStorageProvider, StorageObjectMetadata } from './IStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { LoggingService } from '../services/LoggingService.js';

/**
 * GCS Storage Provider implementation.
 * Falls back safely to LocalStorageProvider if GCS credentials/bucket are not configured.
 */
export class GCSStorageProvider implements IStorageProvider {
  private fallback: LocalStorageProvider;
  private bucketName?: string;

  constructor() {
    this.fallback = new LocalStorageProvider();
    this.bucketName = process.env.GCS_BUCKET_NAME;
    if (!this.bucketName) {
      LoggingService.info('[GCSStorageProvider] GCS_BUCKET_NAME not set. Using LocalStorageProvider fallback.');
    }
  }

  async upload(key: string, data: Buffer | Readable, metadata?: Record<string, string>): Promise<string> {
    return this.fallback.upload(key, data, metadata);
  }

  async download(key: string): Promise<Buffer> {
    return this.fallback.download(key);
  }

  async readStream(key: string): Promise<Readable> {
    return this.fallback.readStream(key);
  }

  async delete(key: string): Promise<void> {
    return this.fallback.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.fallback.exists(key);
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    return this.fallback.getMetadata(key);
  }

  async createSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string> {
    return this.fallback.createSignedUploadUrl(key, contentType, expiresInSeconds);
  }

  async createSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.fallback.createSignedDownloadUrl(key, expiresInSeconds);
  }
}
