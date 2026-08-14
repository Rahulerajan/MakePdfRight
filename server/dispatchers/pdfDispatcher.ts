import { getAI, getOwnerId, handleError } from '../apiUtils.js';
import { StorageService } from '../services/StorageService.js';
import { UploadService } from '../services/UploadService.js';
import { ValidationService } from '../services/ValidationService.js';
import { CompressionService } from '../services/CompressionService.js';
import { MergeService } from '../services/MergeService.js';
import { SplitService } from '../services/SplitService.js';
import { RotateService } from '../services/RotateService.js';
import { OrganizeService } from '../services/OrganizeService.js';
import { OCRService } from '../services/OCRService.js';
import { WatermarkService } from '../services/WatermarkService.js';
import { RepairService } from '../services/RepairService.js';
import { ThumbnailService } from '../services/ThumbnailService.js';
import { JobService } from '../services/JobService.js';
import { WorkerService } from '../services/WorkerService.js';
import { AppError } from '../services/ErrorHandler.js';
import { LoggingService } from '../services/LoggingService.js';
import { dispatchFileAction } from './fileDispatcher.js';

import { DistributedRateLimiter } from '../services/DistributedRateLimiter.js';

import { JobDispatcherFactory } from './JobDispatcherFactory.js';

export async function dispatchPdfAction(req: any, res: any) {
  const reqPath = req.path || req.url || '';
  let action = req.query?.action || req.body?.action;

  if (!action) {
    if (reqPath.includes('/job/create')) action = 'job-create';
    else if (reqPath.includes('/job/status')) action = 'job-status';
    else if (reqPath.includes('/job/cancel')) action = 'job-cancel';
    else if (reqPath.includes('/job/process')) action = 'job-process';
    else {
      const parts = reqPath.split('?')[0].split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'pdf-tools' && lastPart !== 'pdf') {
        action = lastPart;
      }
    }
  }

  const ownerId = getOwnerId(req);

  // Enforce Rate Limits by Category
  if (action === 'job-create') {
    const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'pdf', 'job-create');
    if (!rateCheck.allowed) {
      return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
    }
    const activeCheck = await DistributedRateLimiter.checkActiveJobLimit(ownerId);
    if (!activeCheck.allowed) {
      return res.status(429).json({
        success: false,
        status: 'error',
        statusCode: 429,
        error: {
          code: 'RATE_LIMITED',
          message: activeCheck.message,
          retryAfter: activeCheck.retryAfter
        }
      });
    }
  } else if (['compress', 'merge', 'split', 'rotate', 'organize', 'ocr', 'watermark', 'repair'].includes(action)) {
    const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'pdf', action);
    if (!rateCheck.allowed) {
      return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
    }
  } else if (['job-status', 'job-cancel', 'details'].includes(action)) {
    const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', action);
    if (!rateCheck.allowed) {
      return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
    }
  }
  
  try {
    switch (action) {
      case 'upload-url':
        return await dispatchFileAction(req, res);
      case 'download-url':
        return await dispatchFileAction(req, res);
      case 'compress':
        return await handleCompress(req, res);
      case 'merge':
        return await handleMerge(req, res);
      case 'split':
        return await handleSplit(req, res);
      case 'rotate':
        return await handleRotate(req, res);
      case 'organize':
        return await handleOrganize(req, res);
      case 'ocr':
        return await handleOCR(req, res);
      case 'watermark':
        return await handleWatermark(req, res);
      case 'repair':
        return await handleRepair(req, res);
      case 'details':
        return await handleDetails(req, res);
      case 'job-create':
        return await handleJobCreate(req, res);
      case 'job-status':
        return handleJobStatus(req, res);
      case 'job-cancel':
        return handleJobCancel(req, res);
      case 'job-process':
        return await handleJobProcess(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action '${action}'. Valid actions are compress, merge, split, rotate, organize, ocr, watermark, repair, details, upload-url, job-create, job-status, job-cancel.`
        });
    }
  } catch (err: any) {
    handleError(res, err);
  }
}

/**
 * Helper to fetch input PDF Buffer from either objectKey or legacy pdfBase64.
 * Enforces 5MB limit for legacy base64 strings.
 */
async function resolveInputPdfBuffer(req: any, ownerId: string, customObjectKey?: string): Promise<{ buffer: Buffer; filename: string }> {
  const { inputObjectKey, pdfBase64, filename } = req.body || {};
  const targetKey = customObjectKey || inputObjectKey;

  if (targetKey) {
    await StorageService.verifyObjectOwnership(targetKey, ownerId);
    const provider = StorageService.getStorageProvider();
    const buffer = await provider.download(targetKey);
    const meta = await provider.getMetadata(targetKey);
    return {
      buffer,
      filename: meta?.originalFilename || filename || 'document.pdf'
    };
  }

  if (pdfBase64) {
    // 5MB limit for base64 strings (~7MB string length with base64 overhead)
    if (pdfBase64.length > 7 * 1024 * 1024) {
      throw new AppError('Base64 payload exceeds 5MB threshold limit. Please use the object storage upload flow (/api/files/upload-url).', 413);
    }
    const cleanBase64 = ValidationService.validateStrictBase64(pdfBase64);
    const buffer = Buffer.from(cleanBase64, 'base64');
    ValidationService.validatePDFBuffer(buffer);
    return {
      buffer,
      filename: filename || 'document.pdf'
    };
  }

  throw new AppError('Request must provide either inputObjectKey or pdfBase64.', 400);
}

/**
 * Helper to save output PDF buffer to private storage and return signed download URL response object.
 */
async function saveOutputAndGetResult(ownerId: string, outputBuffer: Buffer, defaultName: string = 'output.pdf') {
  const provider = StorageService.getStorageProvider();
  const outputKey = StorageService.generateObjectKey(ownerId, 'outputs', '.pdf');

  await provider.upload(outputKey, outputBuffer, {
    ownerId,
    contentType: 'application/pdf',
    originalFilename: defaultName
  });

  const downloadUrl = await provider.createSignedDownloadUrl(outputKey, 1800);

  return {
    objectKey: outputKey,
    filename: defaultName,
    size: outputBuffer.length,
    downloadUrl
  };
}

async function handleCompress(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { level, customValue, pdfBase64 } = req.body || {};
    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);

    const compressionLevel = level || 'recommended';
    const customVal = customValue !== undefined ? Number(customValue) : 50;

    tempPath = StorageService.writeTempFile(buffer, filename);
    const result = await CompressionService.compressPDF(tempPath, compressionLevel, customVal);

    const outputObj = await saveOutputAndGetResult(ownerId, result.pdfBuffer, `compressed_${filename}`);

    return res.status(200).json({
      success: true,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      spaceSaved: result.spaceSaved,
      percentage: result.percentage,
      processingTime: result.processingTime,
      pages: result.pages,
      imagesOptimized: result.imagesOptimized,
      fontsOptimized: result.fontsOptimized,
      metadataRemoved: result.metadataRemoved,
      optimizationSummary: result.optimizationSummary,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${result.pdfBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleMerge(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  const tempPaths: string[] = [];

  try {
    const { files, inputObjectKeys } = req.body || {};

    if (inputObjectKeys && Array.isArray(inputObjectKeys) && inputObjectKeys.length > 0) {
      const provider = StorageService.getStorageProvider();
      for (const key of inputObjectKeys) {
        await StorageService.verifyObjectOwnership(key, ownerId);
        const buf = await provider.download(key);
        const path = StorageService.writeTempFile(buf, 'merge_input.pdf');
        tempPaths.push(path);
      }
    } else if (files && Array.isArray(files) && files.length > 0) {
      ValidationService.validateMergeFilesPayload(files);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.objectKey) {
          await StorageService.verifyObjectOwnership(file.objectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(file.objectKey);
          const path = StorageService.writeTempFile(buf, file.name || `doc_${i}.pdf`);
          tempPaths.push(path);
        } else if (file.data) {
          if (file.data.length > 7 * 1024 * 1024) {
            throw new AppError(`File at index ${i} exceeds 5MB Base64 limit. Please use storage upload workflow.`, 413);
          }
          ValidationService.validateStrictBase64(file.data);
          const path = await UploadService.handleBase64Upload(file.data, file.name || `doc_${i}.pdf`);
          tempPaths.push(path);
        }
      }
    } else {
      throw new AppError('Merge request requires either inputObjectKeys array or files array.', 400);
    }

    const mergedBuffer = await MergeService.mergePDFs(tempPaths);
    const outputObj = await saveOutputAndGetResult(ownerId, mergedBuffer, 'merged_document.pdf');

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: files && files.length > 0 ? `data:application/pdf;base64,${mergedBuffer.toString('base64')}` : undefined
    });
  } finally {
    tempPaths.forEach(p => StorageService.deleteTempFile(p));
  }
}

async function handleSplit(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { pageIndices, pdfBase64 } = req.body || {};
    ValidationService.validateSplitPayload(pageIndices);

    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);
    const splitBuffer = await SplitService.splitPDF(tempPath, pageIndices);

    const outputObj = await saveOutputAndGetResult(ownerId, splitBuffer, `split_${filename}`);

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${splitBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleRotate(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { rotations, pdfBase64 } = req.body || {};
    if (!rotations || !Array.isArray(rotations)) {
      return res.status(400).json({ success: false, error: 'rotations array is required' });
    }

    if (rotations.length > 2000) {
      throw new AppError('Rotations array length exceeds 2000 items limit.', 400);
    }

    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);
    const rotatedBuffer = await RotateService.rotatePDF(tempPath, rotations);

    const outputObj = await saveOutputAndGetResult(ownerId, rotatedBuffer, `rotated_${filename}`);

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${rotatedBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleOrganize(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { pageItems, pdfBase64 } = req.body || {};
    if (!pageItems || !Array.isArray(pageItems)) {
      return res.status(400).json({ success: false, error: 'pageItems array is required' });
    }

    if (pageItems.length > 2000) {
      throw new AppError('Page items array length exceeds 2000 items limit.', 400);
    }

    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);
    const organizedBuffer = await OrganizeService.organizePDF(tempPath, pageItems);

    const outputObj = await saveOutputAndGetResult(ownerId, organizedBuffer, `organized_${filename}`);

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${organizedBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleOCR(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  const { imageBase64, inputObjectKey } = req.body || {};

  let cleanBase64: string;

  if (inputObjectKey) {
    await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
    const buf = await StorageService.getStorageProvider().download(inputObjectKey);
    cleanBase64 = buf.toString('base64');
  } else if (imageBase64) {
    ValidationService.validateImageUpload(imageBase64, 'image/png');
    cleanBase64 = ValidationService.validateStrictBase64(imageBase64);
  } else {
    return res.status(400).json({ success: false, error: 'imageBase64 or inputObjectKey is required' });
  }

  const client = getAI();
  const blocks = await OCRService.performOCR(cleanBase64, client);
  return res.status(200).json({ success: true, blocks });
}

async function handleWatermark(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { text, fontSize, opacity, color, rotation, pdfBase64 } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'Watermark text is required' });

    ValidationService.validateWatermarkText(text);

    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);

    const watermarkedBuffer = await WatermarkService.addWatermark(tempPath, {
      text,
      fontSize: fontSize ? Number(fontSize) : undefined,
      opacity: opacity !== undefined ? Number(opacity) : undefined,
      color,
      rotation: rotation !== undefined ? Number(rotation) : undefined
    });

    const outputObj = await saveOutputAndGetResult(ownerId, watermarkedBuffer, `watermarked_${filename}`);

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${watermarkedBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleRepair(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { pdfBase64 } = req.body || {};
    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);

    const repairedBuffer = await RepairService.repairPDF(tempPath);
    const outputObj = await saveOutputAndGetResult(ownerId, repairedBuffer, `repaired_${filename}`);

    return res.status(200).json({
      success: true,
      output: outputObj,
      pdfBase64: pdfBase64 && pdfBase64.length <= 7 * 1024 * 1024 ? `data:application/pdf;base64,${repairedBuffer.toString('base64')}` : undefined
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleDetails(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const ownerId = getOwnerId(req);
  let tempPath: string | null = null;

  try {
    const { buffer, filename } = await resolveInputPdfBuffer(req, ownerId);
    tempPath = StorageService.writeTempFile(buffer, filename);

    const details = await ThumbnailService.getDetails(tempPath);

    return res.status(200).json({
      success: true,
      ...details
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleJobCreate(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const { type, payload } = req.body || {};
  if (!type || !payload) return res.status(400).json({ success: false, error: 'Job type and payload are required.' });

  const ownerId = getOwnerId(req);
  const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey;

  const job = await JobService.createJob(type, ownerId, payload, idempotencyKey);

  // Dispatch job processing via durable/local dispatcher
  const dispatcher = JobDispatcherFactory.getDispatcher();
  await dispatcher.dispatch({
    jobId: job.id,
    ownerId,
    operation: type,
    payload
  });

  return res.status(200).json({
    success: true,
    job
  });
}

async function handleJobProcess(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const isProd = process.env.NODE_ENV === 'production';
  const workerSecret = process.env.WORKER_SECRET;

  if (isProd && !workerSecret) {
    return res.status(500).json({ success: false, error: 'Server configuration error: WORKER_SECRET must be set in production.' });
  }

  if (workerSecret) {
    const providedSecret = req.headers['x-worker-secret'] || req.body?.workerSecret;
    if (!providedSecret || providedSecret !== workerSecret) {
      return res.status(401).json({ success: false, error: 'Unauthorized worker trigger request.' });
    }
  }

  const { jobId, ownerId } = req.body || {};
  if (!jobId || !ownerId) {
    return res.status(400).json({ success: false, error: 'jobId and ownerId are required.' });
  }

  const processedJob = await WorkerService.processJob(jobId, ownerId);
  return res.status(200).json({
    success: true,
    jobId: processedJob?.id || jobId,
    status: processedJob?.status || 'processed'
  });
}

async function handleJobStatus(req: any, res: any) {
  const jobId = req.query?.id || req.body?.id || req.query?.jobId || req.params?.jobId;
  if (!jobId) return res.status(400).json({ success: false, error: 'Job ID is required.' });

  const ownerId = getOwnerId(req);
  const job = await JobService.getJob(jobId, ownerId);

  if (!job) {
    throw new AppError(`Job not found: ${jobId}`, 404);
  }

  return res.status(200).json({
    success: true,
    job
  });
}

async function handleJobCancel(req: any, res: any) {
  const jobId = req.query?.id || req.body?.id || req.query?.jobId || req.params?.jobId;
  if (!jobId) return res.status(400).json({ success: false, error: 'Job ID is required.' });

  const ownerId = getOwnerId(req);
  const success = await JobService.cancelJob(jobId, ownerId);

  if (!success) {
    throw new AppError(`Could not cancel job ${jobId}. Job may not exist or is already completed.`, 400);
  }

  return res.status(200).json({
    success: true,
    message: `Job ${jobId} cancellation requested.`
  });
}
