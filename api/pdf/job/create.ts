import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, verifyAuth, getOwnerId, handleError } from '../../../server/apiUtils';
import { JobService } from '../../../server/services/JobService';
import { ValidationService } from '../../../server/services/ValidationService';
import { UploadService } from '../../../server/services/UploadService';
import { CompressionService } from '../../../server/services/CompressionService';
import { MergeService } from '../../../server/services/MergeService';
import { StorageService } from '../../../server/services/StorageService';
import { LoggingService } from '../../../server/services/LoggingService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!verifyAuth(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, payload } = req.body || {};
    if (!type || !payload) {
      return res.status(400).json({ error: 'Job type and payload are required.' });
    }

    const ownerId = getOwnerId(req);
    const job = JobService.createJob(type, ownerId);

    // Execute job processing synchronously or before closing response in serverless env
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

    // In serverless, await job processing so it completes before lambda terminates
    await processJob();

    const finalJob = JobService.getJob(job.id, ownerId) || job;
    res.status(200).json({
      success: true,
      jobId: finalJob.id,
      status: finalJob.status,
      result: finalJob.result,
      error: finalJob.error
    });
  } catch (err: any) {
    handleError(res, err);
  }
}
