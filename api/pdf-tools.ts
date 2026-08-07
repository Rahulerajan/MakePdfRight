import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ThinkingLevel } from '@google/genai';
import { applyCors, verifyAuth, getAI, getOwnerId, handleError } from '../server/apiUtils';
import { ValidationService } from '../server/services/ValidationService';
import { UploadService } from '../server/services/UploadService';
import { CompressionService } from '../server/services/CompressionService';
import { MergeService } from '../server/services/MergeService';
import { SplitService } from '../server/services/SplitService';
import { RotateService } from '../server/services/RotateService';
import { OrganizeService } from '../server/services/OrganizeService';
import { OCRService } from '../server/services/OCRService';
import { WatermarkService } from '../server/services/WatermarkService';
import { RepairService } from '../server/services/RepairService';
import { ThumbnailService } from '../server/services/ThumbnailService';
import { JobService } from '../server/services/JobService';
import { StorageService } from '../server/services/StorageService';
import { LoggingService } from '../server/services/LoggingService';
import { AppError } from '../server/services/ErrorHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  const rawAction = (req.query.action as string) || (req.body?.action as string) || '';
  const action = rawAction.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  try {
    switch (action) {
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
      case 'jobcreate':
      case 'job_create':
        return await handleJobCreate(req, res);
      case 'job-status':
      case 'jobstatus':
      case 'job_status':
        return await handleJobStatus(req, res);
      case 'job-cancel':
      case 'jobcancel':
      case 'job_cancel':
        return await handleJobCancel(req, res);
      case 'editor-ai':
      case 'pdf-editor-ai':
      case 'editorai':
        return await handleEditorAI(req, res);
      case 'editor-ocr':
      case 'pdf-editor-ocr':
      case 'editorocr':
        return await handleEditorOCR(req, res);
      default:
        return res.status(400).json({ error: `Invalid or missing action parameter: '${rawAction}'` });
    }
  } catch (err: any) {
    handleError(res, err);
  }
}

async function handleCompress(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64, level, customValue } = req.body || {};
    if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 is required' });

    ValidationService.validateStrictBase64(pdfBase64);
    const compressionLevel = level || 'recommended';
    const customVal = customValue !== undefined ? Number(customValue) : 50;

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'document.pdf');
    const result = await CompressionService.compressPDF(tempPath, compressionLevel, customVal);
    const base64 = result.pdfBuffer.toString('base64');

    res.status(200).json({
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
      pdfBase64: `data:application/pdf;base64,${base64}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleMerge(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const tempPaths: string[] = [];
  try {
    const { files } = req.body || {};
    ValidationService.validateMergeFilesPayload(files);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.data) {
        throw new AppError(`File item at index ${i} is missing base64 data.`, 400);
      }
      ValidationService.validateStrictBase64(file.data);
      const path = await UploadService.handleBase64Upload(file.data, file.name || `doc_${i}.pdf`);
      tempPaths.push(path);
    }

    const mergedBuffer = await MergeService.mergePDFs(tempPaths);
    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${mergedBuffer.toString('base64')}`
    });
  } finally {
    tempPaths.forEach(p => StorageService.deleteTempFile(p));
  }
}

async function handleSplit(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64, pageIndices } = req.body || {};
    if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 is required' });

    ValidationService.validateStrictBase64(pdfBase64);
    ValidationService.validateSplitPayload(pageIndices);

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'split.pdf');
    const splitBuffer = await SplitService.splitPDF(tempPath, pageIndices);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${splitBuffer.toString('base64')}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleRotate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64, rotations } = req.body || {};
    if (!pdfBase64 || !rotations || !Array.isArray(rotations)) {
      return res.status(400).json({ error: 'pdfBase64 and rotations array are required' });
    }

    if (rotations.length > 2000) {
      throw new AppError('Rotations array length exceeds 2000 items limit.', 400);
    }

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'rotate.pdf');
    const rotatedBuffer = await RotateService.rotatePDF(tempPath, rotations);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${rotatedBuffer.toString('base64')}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleOrganize(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64, pageItems } = req.body || {};
    if (!pdfBase64 || !pageItems || !Array.isArray(pageItems)) {
      return res.status(400).json({ error: 'pdfBase64 and pageItems array are required' });
    }

    if (pageItems.length > 2000) {
      throw new AppError('Page items array length exceeds 2000 items limit.', 400);
    }

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'organize.pdf');
    const organizedBuffer = await OrganizeService.organizePDF(tempPath, pageItems);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${organizedBuffer.toString('base64')}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleOCR(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

  ValidationService.validateImageUpload(imageBase64, 'image/png');
  const cleanBase64 = ValidationService.validateStrictBase64(imageBase64);

  const client = getAI();
  const blocks = await OCRService.performOCR(cleanBase64, client);
  res.status(200).json({ success: true, blocks });
}

async function handleWatermark(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64, text, fontSize, opacity, color, rotation } = req.body || {};
    if (!pdfBase64 || !text) return res.status(400).json({ error: 'pdfBase64 and text are required' });

    ValidationService.validateStrictBase64(pdfBase64);
    ValidationService.validateWatermarkText(text);

    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'watermark.pdf');
    const watermarkedBuffer = await WatermarkService.addWatermark(tempPath, {
      text,
      fontSize: fontSize ? Number(fontSize) : undefined,
      opacity: opacity !== undefined ? Number(opacity) : undefined,
      color,
      rotation: rotation !== undefined ? Number(rotation) : undefined
    });

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${watermarkedBuffer.toString('base64')}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleRepair(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64 } = req.body || {};
    if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 is required' });

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'repair.pdf');
    const repairedBuffer = await RepairService.repairPDF(tempPath);

    res.status(200).json({
      success: true,
      pdfBase64: `data:application/pdf;base64,${repairedBuffer.toString('base64')}`
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleDetails(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let tempPath: string | null = null;
  try {
    const { pdfBase64 } = req.body || {};
    if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 is required' });

    ValidationService.validateStrictBase64(pdfBase64);
    tempPath = await UploadService.handleBase64Upload(pdfBase64, 'details.pdf');
    const details = await ThumbnailService.getDetails(tempPath);

    res.status(200).json({
      success: true,
      ...details
    });
  } finally {
    if (tempPath) StorageService.deleteTempFile(tempPath);
  }
}

async function handleJobCreate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { type, payload } = req.body || {};
  if (!type || !payload) return res.status(400).json({ error: 'Job type and payload are required.' });

  const ownerId = getOwnerId(req);
  const job = JobService.createJob(type, ownerId);

  const processJob = async () => {
    let tempPath: string | null = null;
    try {
      JobService.updateJob(job.id, ownerId, { status: 'processing', progress: 10 });

      if (type === 'compress') {
        const { pdfBase64, level, customValue } = payload;
        ValidationService.validateStrictBase64(pdfBase64);
        tempPath = await UploadService.handleBase64Upload(pdfBase64, 'compress_async.pdf');

        JobService.updateJob(job.id, ownerId, { progress: 30 });
        if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');

        const result = await CompressionService.compressPDF(tempPath, level, customValue);
        if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');

        JobService.updateJob(job.id, ownerId, { progress: 90 });
        const base64 = result.pdfBuffer.toString('base64');

        JobService.updateJob(job.id, ownerId, {
          status: 'completed',
          progress: 100,
          result: {
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
            pdfBase64: `data:application/pdf;base64,${base64}`
          }
        });
      } else if (type === 'merge') {
        const { files } = payload;
        ValidationService.validateMergeFilesPayload(files);
        const tempPaths: string[] = [];

        for (let i = 0; i < files.length; i++) {
          if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
          const file = files[i];
          ValidationService.validateStrictBase64(file.data);
          const path = await UploadService.handleBase64Upload(file.data, file.name);
          tempPaths.push(path);
        }

        JobService.updateJob(job.id, ownerId, { progress: 50 });
        const mergedBuffer = await MergeService.mergePDFs(tempPaths);

        tempPaths.forEach(p => StorageService.deleteTempFile(p));

        if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
        JobService.updateJob(job.id, ownerId, {
          status: 'completed',
          progress: 100,
          result: {
            pdfBase64: `data:application/pdf;base64,${mergedBuffer.toString('base64')}`
          }
        });
      } else {
        throw new Error(`Unsupported background processing job type: ${type}`);
      }
    } catch (jobErr: any) {
      LoggingService.error(`Async job ${job.id} failed:`, jobErr);
      JobService.updateJob(job.id, ownerId, {
        status: JobService.getJob(job.id, ownerId)?.cancelRequested ? 'cancelled' : 'failed',
        error: jobErr.message || 'An unexpected error occurred during job execution.'
      });
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  };

  await processJob();

  const finalJob = JobService.getJob(job.id, ownerId) || job;
  res.status(200).json({
    success: true,
    jobId: finalJob.id,
    status: finalJob.status,
    result: finalJob.result,
    error: finalJob.error
  });
}

async function handleJobStatus(req: VercelRequest, res: VercelResponse) {
  const jobId = (req.query.jobId as string) || (req.query.id as string) || (req.body?.jobId as string);
  if (!jobId) return res.status(400).json({ error: 'jobId query parameter is required.' });

  const ownerId = getOwnerId(req);
  const job = JobService.getJob(jobId, ownerId);
  if (!job) return res.status(404).json({ error: 'Job not found or access denied.' });

  res.status(200).json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error
  });
}

async function handleJobCancel(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const jobId = (req.query.jobId as string) || (req.query.id as string) || (req.body?.jobId as string);
  if (!jobId) return res.status(400).json({ error: 'jobId parameter is required.' });

  const ownerId = getOwnerId(req);
  const success = JobService.cancelJob(jobId, ownerId);
  if (!success) {
    return res.status(400).json({ error: 'Job could not be cancelled (either not found or already completed).' });
  }

  res.status(200).json({ success: true, message: 'Cancellation request sent.' });
}

async function handleEditorAI(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { promptType, selectedText, customPrompt, enableThinking } = req.body || {};
  if (!promptType) return res.status(400).json({ error: 'promptType is required.' });

  const client = getAI();
  let promptText = '';

  switch (promptType) {
    case 'deep-think':
    case 'reasoning':
      promptText = `Perform a deep, step-by-step logical reasoning analysis of the following document text or instruction: "${customPrompt || selectedText || ''}". Provide detailed, thorough explanations and key conclusions.`;
      break;
    case 'rewrite':
      promptText = `Please rewrite the following text professionally, making it clear, engaging, and well-phrased while preserving the exact semantic meaning. Do not add conversational framing or explanations; return ONLY the rewritten text:\n\n"${selectedText || ''}"`;
      break;
    case 'summarize':
      promptText = `Please summarize the following text concisely. Return ONLY the summarized text, with no introductory text:\n\n"${selectedText || ''}"`;
      break;
    case 'translate':
      promptText = `Please translate the following text to Spanish/French (or detect and translate Spanish to English) beautifully. Return ONLY the translation, with no extra text:\n\n"${selectedText || ''}"`;
      break;
    case 'grammar':
      promptText = `Please fix any spelling or grammar mistakes in the following text. Preserve the original phrasing where possible. Return ONLY the corrected text:\n\n"${selectedText || ''}"`;
      break;
    case 'expand':
      promptText = `Please elaborate or expand on this topic professionally, keeping it aligned with the context of a document. Return ONLY the expanded text:\n\n"${selectedText || ''}"`;
      break;
    case 'shorten':
      promptText = `Please make this text shorter and more concise. Return ONLY the shortened text:\n\n"${selectedText || ''}"`;
      break;
    case 'custom':
      promptText = `Given this context text: "${selectedText || ''}", please perform this specific instruction: "${customPrompt}". Return ONLY the final resulting text with no extra conversational comments:`;
      break;
    default:
      promptText = `Please analyze or assist with this document text:\n\n"${selectedText || ''}"`;
  }

  ValidationService.validateTextPrompt(promptText, 10000);

  const isThinkingRequested = !!enableThinking || promptType === 'deep-think' || promptType === 'reasoning';
  const model = isThinkingRequested ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
  const config: any = {};
  if (isThinkingRequested) {
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }

  const response = await client.models.generateContent({
    model,
    contents: promptText,
    config: Object.keys(config).length > 0 ? config : undefined,
  });

  res.status(200).json({ text: response.text || '' });
}

async function handleEditorOCR(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 page snapshot is required for OCR.' });

  ValidationService.validateImageUpload(imageBase64, 'image/png');
  const cleanImageBase64 = ValidationService.validateStrictBase64(imageBase64);

  const client = getAI();
  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [
      {
        inlineData: {
          mimeType: 'image/png',
          data: cleanImageBase64,
        },
      },
      {
        text: `Analyze this document page image. Please perform optical character recognition (OCR) to detect any blocks of text.
        For each key line or block of text, output a JSON array of objects.
        Each object MUST have the following schema:
        {
          "text": "The exact detected text",
          "x": x_coordinate_percentage (0 to 100 representing left offset ratio of the page),
          "y": y_coordinate_percentage (0 to 100 representing top offset ratio of the page),
          "fontSize": standard_font_size_in_px_estimated (between 10 and 24),
          "fontFamily": "Helvetica"
        }
        Return ONLY the valid raw JSON array of blocks. Do not add any markdown, backticks, or text outside the JSON block. Example output format:
        [{"text": "Sample Heading", "x": 10, "y": 15, "fontSize": 20, "fontFamily": "Helvetica"}]`
      }
    ]
  });

  let rawText = response.text || '[]';
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let blocks = [];
  try {
    blocks = JSON.parse(rawText);
  } catch (parseError) {
    LoggingService.warn('[OCR Parse Warning] Direct JSON parse failed, trying to find array pattern.', rawText);
    const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
    if (match) {
      blocks = JSON.parse(match[0]);
    }
  }

  res.status(200).json({ blocks });
}
