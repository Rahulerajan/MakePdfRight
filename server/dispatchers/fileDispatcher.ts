import path from 'path';
import { getOwnerId, handleError } from '../apiUtils.js';
import { StorageService } from '../services/StorageService.js';
import { FileTokenService } from '../services/FileTokenService.js';
import { ValidationService } from '../services/ValidationService.js';
import { AppError } from '../services/ErrorHandler.js';
import { LoggingService } from '../services/LoggingService.js';
import { DistributedRateLimiter } from '../services/DistributedRateLimiter.js';

export async function dispatchFileAction(req: any, res: any) {
  const reqPath = req.path || req.url || '';
  const action = req.query?.action;

  try {
    if (reqPath.includes('/upload-url') || action === 'upload-url') {
      return await handleUploadUrl(req, res);
    } else if (reqPath.includes('/upload') || action === 'upload') {
      return await handleDirectUpload(req, res);
    } else if (reqPath.includes('/download-url') || action === 'download-url') {
      return await handleDownloadUrl(req, res);
    } else if (reqPath.includes('/download') || action === 'download') {
      return await handleDownload(req, res);
    } else {
      return res.status(404).json({ success: false, error: 'Unknown or unsupported file route action.' });
    }
  } catch (err: any) {
    handleError(res, err);
  }
}

/**
 * Endpoint 1: POST /api/files/upload-url
 * Obtains a secure upload target object key and short-lived signed upload URL.
 */
async function handleUploadUrl(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const ownerId = getOwnerId(req);

  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'upload', 'upload-url');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }

  const { filename, contentType, size } = req.body || {};

  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    throw new AppError('Filename parameter is required and must be a non-empty string.', 400);
  }

  if (size === undefined || size === null || isNaN(Number(size)) || Number(size) <= 0) {
    throw new AppError('File size parameter is required and must be a positive number.', 400);
  }

  const cleanFilename = filename.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  const mime = (contentType || 'application/pdf').toLowerCase().trim();

  // Validate supported extensions and MIME types
  const isPdf = mime === 'application/pdf' || cleanFilename.toLowerCase().endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(cleanFilename);
  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(cleanFilename);

  if (!isPdf && !isImage && !isAudio) {
    throw new AppError(`Unsupported file format (${contentType}). Only PDF documents, images, and audio files are supported.`, 400);
  }

  const fileSize = Number(size);
  const MAX_ALLOWED_SIZE = isPdf ? 150 * 1024 * 1024 : 50 * 1024 * 1024; // 150MB PDF, 50MB media
  if (fileSize > MAX_ALLOWED_SIZE) {
    throw new AppError(`File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable upload threshold of ${MAX_ALLOWED_SIZE / (1024 * 1024)}MB.`, 400);
  }

  const ext = isPdf ? '.pdf' : isImage ? path.extname(cleanFilename) || '.png' : '.mp3';
  const objectKey = StorageService.generateObjectKey(ownerId, 'uploads', ext);

  const provider = StorageService.getStorageProvider();
  const uploadUrl = await provider.createSignedUploadUrl(objectKey, mime, 900); // 15 mins expiry

  LoggingService.info(`[UploadAuth] Granted upload authorization for ${objectKey} (Owner: ${ownerId})`);

  return res.status(200).json({
    success: true,
    upload: {
      url: uploadUrl,
      objectKey,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString()
    }
  });
}

/**
 * Endpoint 2: PUT/POST /api/files/upload
 * Handles direct binary payload uploads for signed upload URLs.
 */
async function handleDirectUpload(req: any, res: any) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const token = req.query?.token as string;
  const key = req.query?.key as string;

  if (!token || !key) {
    throw new AppError('Upload request missing required key or authorization token.', 400);
  }

  // Verify signed token
  const tokenPayload = FileTokenService.verifyToken(token, 'upload');
  if (!tokenPayload || tokenPayload.objectKey !== key) {
    throw new AppError('Invalid or expired upload authorization token.', 403);
  }

  const rateCheck = await DistributedRateLimiter.checkRateLimit(tokenPayload.ownerId, 'upload', 'upload');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }

  // Buffer raw binary body
  let buffer: Buffer;
  if (Buffer.isBuffer(req.body)) {
    buffer = req.body;
  } else {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    buffer = Buffer.concat(chunks);
  }

  if (!buffer || buffer.length === 0) {
    throw new AppError('Upload body payload is empty.', 400);
  }

  // Validate PDF magic bytes if PDF target
  if (key.endsWith('.pdf')) {
    ValidationService.validatePDFBuffer(buffer);
  }

  const provider = StorageService.getStorageProvider();
  await provider.upload(key, buffer, {
    ownerId: tokenPayload.ownerId,
    contentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
  });

  LoggingService.info(`[DirectUpload] Successfully saved object: ${key} (${buffer.length} bytes)`);

  return res.status(200).json({
    success: true,
    objectKey: key,
    size: buffer.length
  });
}

/**
 * Endpoint 3: GET /api/files/download
 * Serves private object files using short-lived download authorization tokens.
 */
async function handleDownload(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const key = req.query?.key as string;
  const token = req.query?.token as string;
  const ownerId = getOwnerId(req);

  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'download');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }

  if (!key) {
    throw new AppError('Missing object key parameter.', 400);
  }

  // Verify ownership or token signature
  let authorizedOwner = ownerId;
  if (token) {
    const tokenPayload = FileTokenService.verifyToken(token, 'download');
    if (!tokenPayload || tokenPayload.objectKey !== key) {
      throw new AppError('Invalid or expired download authorization token.', 403);
    }
    authorizedOwner = tokenPayload.ownerId;
  }
  await StorageService.verifyObjectOwnership(key, authorizedOwner);

  const provider = StorageService.getStorageProvider();
  const metadata = await provider.getMetadata(key);
  if (!metadata) {
    throw new AppError('Requested file does not exist or has expired.', 404);
  }

  const buffer = await provider.download(key);
  const originalFilename = metadata.originalFilename || path.basename(key);

  res.setHeader('Content-Type', metadata.contentType || 'application/pdf');
  res.setHeader('Content-Length', buffer.length.toString());
  res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  return res.status(200).send(buffer);
}

/**
 * Endpoint 4: POST /api/files/download-url
 * Obtains a fresh short-lived signed download URL for an owned storage object.
 */
async function handleDownloadUrl(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const ownerId = getOwnerId(req);

  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'download-url');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }

  const key = req.body?.key || req.query?.key || req.body?.objectKey || req.query?.objectKey;

  if (!key || typeof key !== 'string' || !key.trim()) {
    throw new AppError('Object key parameter is required.', 400);
  }

  // Verify ownership
  await StorageService.verifyObjectOwnership(key, ownerId);

  const provider = StorageService.getStorageProvider();
  const exists = await provider.exists(key);
  if (!exists) {
    throw new AppError('Requested file does not exist or has expired.', 404);
  }

  const downloadUrl = await provider.createSignedDownloadUrl(key, 1800); // 30 minutes signed URL

  LoggingService.info(`[DownloadAuth] Granted fresh download URL for ${key} (Owner: ${ownerId})`);

  return res.status(200).json({
    success: true,
    downloadUrl
  });
}

