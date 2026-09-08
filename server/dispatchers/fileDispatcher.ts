import path from 'path';
import { getOwnerId, handleError } from '../apiUtils.js';
import { StorageService } from '../services/StorageService.js';
import { FileTokenService } from '../services/FileTokenService.js';
import { ValidationService } from '../services/ValidationService.js';
import { AppError } from '../services/ErrorHandler.js';
import { LoggingService } from '../services/LoggingService.js';
import { DistributedRateLimiter } from '../services/DistributedRateLimiter.js';

const MAX_PDF_BYTES = 150 * 1024 * 1024;
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export async function dispatchFileAction(req: any, res: any) {
  const reqPath = req.path || req.url || '';
  const action = req.query?.action;

  try {
    if (reqPath.includes('/upload-url') || action === 'upload-url') {
      return await handleUploadUrl(req, res);
    } else if (reqPath.includes('/purge-user-data') || action === 'purge-user-data') {
      return await handlePurgeUserData(req, res);
    } else if (reqPath.includes('/upload') || action === 'upload') {
      return await handleDirectUpload(req, res);
    } else if (reqPath.includes('/download-url') || action === 'download-url') {
      return await handleDownloadUrl(req, res);
    } else if (reqPath.includes('/download') || action === 'download') {
      return await handleDownload(req, res);
    } else if (reqPath.includes('/delete') || action === 'delete' || req.method === 'DELETE') {
      return await handleDeleteFile(req, res);
    } else {
      return res.status(404).json({ success: false, error: 'Unknown or unsupported file route action.' });
    }
  } catch (err: any) {
    handleError(res, err);
  }
}

async function handleUploadUrl(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const ownerId = getOwnerId(req, res);
  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'upload', 'upload-url');
  if (!rateCheck.allowed) return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);

  const { filename, contentType, size } = req.body || {};
  if (!filename || typeof filename !== 'string' || !filename.trim()) throw new AppError('Filename parameter is required and must be a non-empty string.', 400);
  if (size === undefined || size === null || isNaN(Number(size)) || Number(size) <= 0) throw new AppError('File size parameter is required and must be a positive number.', 400);

  const cleanFilename = ValidationService.sanitizeFilename(filename);
  const mime = (contentType || 'application/pdf').toLowerCase().trim();
  const isPdf = mime === 'application/pdf' || cleanFilename.toLowerCase().endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(cleanFilename);
  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(cleanFilename);
  if (!isPdf && !isImage && !isAudio) throw new AppError(`Unsupported file format (${contentType}). Only PDF documents, images, and audio files are supported.`, 400);

  const fileSize = Number(size);
  const maxAllowedSize = isPdf ? MAX_PDF_BYTES : MAX_MEDIA_BYTES;
  if (fileSize > maxAllowedSize) throw new AppError(`File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable upload threshold of ${maxAllowedSize / (1024 * 1024)}MB.`, 400);

  const ext = isPdf ? '.pdf' : isImage ? path.extname(cleanFilename) || '.png' : path.extname(cleanFilename) || '.mp3';
  const objectKey = StorageService.generateObjectKey(ownerId, 'uploads', ext);
  const provider = StorageService.getStorageProvider();
  const uploadUrl = await provider.createSignedUploadUrl(objectKey, mime, 900);

  LoggingService.info(`[UploadAuth] Granted upload authorization for ${objectKey} (Owner: ${ownerId})`);
  return res.status(200).json({ success: true, upload: { url: uploadUrl, objectKey, expiresAt: new Date(Date.now() + 900 * 1000).toISOString(), expectedSize: fileSize, maxAllowedSize } });
}

async function handleDirectUpload(req: any, res: any) {
  if (req.method !== 'PUT' && req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const token = req.query?.token as string;
  const key = req.query?.key as string;
  if (!token || !key) throw new AppError('Upload request missing required key or authorization token.', 400);

  const tokenPayload = FileTokenService.verifyToken(token, 'upload');
  if (!tokenPayload || tokenPayload.objectKey !== key) throw new AppError('Invalid or expired upload authorization token.', 403);

  const rateCheck = await DistributedRateLimiter.checkRateLimit(tokenPayload.ownerId, 'upload', 'upload');
  if (!rateCheck.allowed) return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);

  const maxBytes = key.toLowerCase().endsWith('.pdf') ? MAX_PDF_BYTES : MAX_MEDIA_BYTES;
  const declaredLength = Number(req.headers?.['content-length'] || 0);
  if (declaredLength > maxBytes) throw new AppError('Upload exceeds the maximum allowed file size.', 413);

  let buffer: Buffer;
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > maxBytes) throw new AppError('Upload exceeds the maximum allowed file size.', 413);
    buffer = req.body;
  } else {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy(new AppError('Upload exceeds the maximum allowed file size.', 413));
        return;
      }
      chunks.push(chunk);
    });
    await new Promise((resolve, reject) => { req.on('end', resolve); req.on('error', reject); });
    buffer = Buffer.concat(chunks);
  }

  if (!buffer || buffer.length === 0) throw new AppError('Upload body payload is empty.', 400);
  if (key.endsWith('.pdf')) ValidationService.validatePDFBuffer(buffer);

  const provider = StorageService.getStorageProvider();
  await provider.upload(key, buffer, { ownerId: tokenPayload.ownerId, contentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream' });
  LoggingService.info(`[DirectUpload] Successfully saved object: ${key} (${buffer.length} bytes)`);
  return res.status(200).json({ success: true, objectKey: key, size: buffer.length });
}

async function handleDownload(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const key = req.query?.key as string;
  const token = req.query?.token as string;
  const ownerId = getOwnerId(req, res);
  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'download');
  if (!rateCheck.allowed) return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  if (!key) throw new AppError('Missing object key parameter.', 400);

  let authorizedOwner = ownerId;
  if (token) {
    const tokenPayload = FileTokenService.verifyToken(token, 'download');
    if (!tokenPayload || tokenPayload.objectKey !== key) throw new AppError('Invalid or expired download authorization token.', 403);
    authorizedOwner = tokenPayload.ownerId;
  }
  await StorageService.verifyObjectOwnership(key, authorizedOwner);

  const provider = StorageService.getStorageProvider();
  const metadata = await provider.getMetadata(key);
  if (!metadata) throw new AppError('Requested file does not exist or has expired.', 404);

  const maxBytes = key.toLowerCase().endsWith('.pdf') ? MAX_PDF_BYTES : MAX_MEDIA_BYTES;
  if (metadata.size > maxBytes) {
    // Delete oversized direct-to-cloud objects before they enter processing/download paths.
    try { await provider.delete(key); } catch {}
    throw new AppError('Uploaded file exceeds the maximum allowed file size and was removed.', 413);
  }

  const buffer = await provider.download(key);
  const originalFilename = ValidationService.sanitizeFilename(metadata.originalFilename || path.basename(key));
  res.setHeader('Content-Type', metadata.contentType || 'application/pdf');
  res.setHeader('Content-Length', buffer.length.toString());
  res.setHeader('Content-Disposition', ValidationService.formatContentDisposition(originalFilename));
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return res.status(200).send(buffer);
}

async function handleDownloadUrl(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req, res);
  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'download-url');
  if (!rateCheck.allowed) return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);

  const key = req.body?.key || req.query?.key || req.body?.objectKey || req.query?.objectKey;
  if (!key || typeof key !== 'string' || !key.trim()) throw new AppError('Object key parameter is required.', 400);
  await StorageService.verifyObjectOwnership(key, ownerId);

  const provider = StorageService.getStorageProvider();
  const metadata = await provider.getMetadata(key);
  if (!metadata) throw new AppError('Requested file does not exist or has expired.', 404);
  const maxBytes = key.toLowerCase().endsWith('.pdf') ? MAX_PDF_BYTES : MAX_MEDIA_BYTES;
  if (metadata.size > maxBytes) {
    try { await provider.delete(key); } catch {}
    throw new AppError('Uploaded file exceeds the maximum allowed file size and was removed.', 413);
  }

  const downloadUrl = await provider.createSignedDownloadUrl(key, 1800);
  LoggingService.info(`[DownloadAuth] Granted fresh download URL for ${key} (Owner: ${ownerId})`);
  return res.status(200).json({ success: true, downloadUrl });
}

async function handleDeleteFile(req: any, res: any) {
  const ownerId = getOwnerId(req, res);
  const key = req.body?.key || req.query?.key || req.body?.objectKey || req.query?.objectKey;
  if (!key || typeof key !== 'string' || !key.trim()) throw new AppError('Object key parameter is required for deletion.', 400);
  await StorageService.verifyObjectOwnership(key, ownerId);
  const provider = StorageService.getStorageProvider();
  await provider.delete(key);
  LoggingService.info(`[UserRightDelete] Owner ${ownerId} explicitly deleted file key: ${key}`);
  return res.status(200).json({ success: true, message: 'File successfully deleted.' });
}

async function handlePurgeUserData(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });
  getOwnerId(req, res);

  // IMPORTANT: the previous implementation called StorageService.cleanupAll(), which
  // deleted temporary files belonging to every active user. Until an owner-scoped
  // object index/prefix purge is implemented end-to-end, this endpoint is fail-closed.
  LoggingService.warn('[UserRightPurge] Owner-wide purge requested but disabled because global deletion is unsafe.');
  return res.status(501).json({
    success: false,
    error: 'Owner-wide purge is temporarily unavailable. Individual files can still be deleted securely from your session.'
  });
}
