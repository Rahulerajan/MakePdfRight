import { Readable } from 'stream';

export interface StorageObjectMetadata {
  size: number;
  contentType: string;
  createdAt: Date;
  ownerId?: string;
  originalFilename?: string;
  version?: number;
}

export interface StorageConditionalOptions {
  ifMatchVersion?: number;
  ifDoesNotExist?: boolean;
}

export interface IStorageProvider {
  /**
   * Check if the storage provider supports atomic conditional write operations.
   */
  supportsConditionalWrites(): boolean;

  /**
   * Write binary data to storage at specified key with optional conditional options.
   */
  upload(
    key: string,
    data: Buffer | Readable,
    metadata?: Record<string, string>,
    conditionalOpts?: StorageConditionalOptions
  ): Promise<string>;

  /**
   * Download object bytes from storage.
   */
  download(key: string): Promise<Buffer>;

  /**
   * Get readable stream for object.
   */
  readStream(key: string): Promise<Readable>;

  /**
   * Delete object from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Check if object exists in storage.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Retrieve metadata for object.
   */
  getMetadata(key: string): Promise<StorageObjectMetadata | null>;

  /**
   * Create short-lived signed upload target URL or endpoint path.
   */
  createSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Create short-lived signed download URL or endpoint path.
   */
  createSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
