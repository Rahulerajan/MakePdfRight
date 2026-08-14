import path from 'path';
import crypto from 'crypto';
import { IJobStore, Job } from '../storage/IJobStore.js';
import { StorageService } from './StorageService.js';
import { CompressionService } from './CompressionService.js';
import { MergeService } from './MergeService.js';
import { SplitService } from './SplitService.js';
import { RotateService } from './RotateService.js';
import { OrganizeService } from './OrganizeService.js';
import { WatermarkService } from './WatermarkService.js';
import { RepairService } from './RepairService.js';
import { OCRService } from './OCRService.js';
import { getAI } from '../apiUtils.js';
import { LoggingService } from './LoggingService.js';
import { AppError } from './ErrorHandler.js';
import { ValidationService } from './ValidationService.js';

export class WorkerService {
  private static store: IJobStore;
  private static isProcessingLoopRunning = false;

  static setStore(jobStore: IJobStore) {
    this.store = jobStore;
  }

  static getStore(): IJobStore {
    if (!this.store) {
      throw new Error('WorkerService job store not initialized.');
    }
    return this.store;
  }

  /**
   * Process a specific job by ID with strict worker atomic claim & lease management.
   */
  static async processJob(jobId: string, ownerId: string, customWorkerId?: string): Promise<Job | null> {
    const store = this.getStore();
    const workerId = customWorkerId || `worker_${crypto.randomUUID()}`;

    // Step 0: Atomic claim & lease acquisition
    const claimResult = await store.claimJob(jobId, ownerId, workerId, 60000); // 60s initial lease
    if (!claimResult.success || !claimResult.job) {
      LoggingService.warn(`[WorkerService] Worker ${workerId} could not claim job ${jobId}. Claim rejected or already held by another active worker.`);
      return claimResult.job;
    }

    const job = claimResult.job;
    const currentAttempts = job.attemptCount || 1;

    // Step 0.1: Start periodic heartbeat/lease renewal during long-running processing
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await store.renewLease(job.id, ownerId, workerId, 60000);
        if (!renewed) {
          LoggingService.warn(`[WorkerService] Heartbeat lease renewal failed for worker ${workerId} on job ${job.id}`);
        }
      } catch (err) {
        LoggingService.error(`[WorkerService] Heartbeat error for worker ${workerId}:`, err);
      }
    }, 15000); // Renew every 15s

    let tempInputPaths: string[] = [];
    let tempOutputPath: string | null = null;

    try {
      LoggingService.info(`[WorkerService] Worker ${workerId} processing job ${job.id} (op: ${job.operation}, attempt: ${currentAttempts})`);

      // Step 1: Verify cancellation
      const freshJob = await store.getJob(job.id, ownerId, true);
      if (freshJob?.cancelRequested) {
        await store.updateJob(job.id, ownerId, { status: 'cancelled', completedAt: new Date().toISOString() });
        return freshJob;
      }

      await store.updateJob(job.id, ownerId, { progress: 30 });

      // Step 2: Execute operation
      let resultPayload: any = {};
      let outputBuffer: Buffer | null = null;
      let outputName = 'document_output.pdf';

      const payload = job.payload || {};

      switch (job.operation) {
        case 'compress': {
          const { inputObjectKey, level, customValue } = payload;
          if (!inputObjectKey) throw new AppError('Job payload missing inputObjectKey.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const provider = StorageService.getStorageProvider();
          const inputBuf = await provider.download(inputObjectKey);
          const meta = await provider.getMetadata(inputObjectKey);
          const inputName = ValidationService.sanitizeFilename(meta?.originalFilename || 'document.pdf');

          const tempIn = StorageService.writeTempFile(inputBuf, inputName);
          tempInputPaths.push(tempIn);

          const compressResult = await CompressionService.compressPDF(tempIn, level || 'recommended', customValue || 50);
          outputBuffer = compressResult.pdfBuffer;
          outputName = ValidationService.sanitizeFilename(`compressed_${inputName}`);

          resultPayload = {
            originalSize: compressResult.originalSize,
            compressedSize: compressResult.compressedSize,
            spaceSaved: compressResult.spaceSaved,
            percentage: compressResult.percentage,
            processingTime: compressResult.processingTime,
            pages: compressResult.pages,
            imagesOptimized: compressResult.imagesOptimized,
            fontsOptimized: compressResult.fontsOptimized,
            metadataRemoved: compressResult.metadataRemoved,
            optimizationSummary: compressResult.optimizationSummary
          };
          break;
        }

        case 'merge': {
          const { inputObjectKeys } = payload;
          if (!inputObjectKeys || !Array.isArray(inputObjectKeys) || inputObjectKeys.length === 0) {
            throw new AppError('Merge operation requires inputObjectKeys array.', 400);
          }

          const provider = StorageService.getStorageProvider();
          for (let i = 0; i < inputObjectKeys.length; i++) {
            const key = inputObjectKeys[i];
            await StorageService.verifyObjectOwnership(key, ownerId);
            const buf = await provider.download(key);
            const p = StorageService.writeTempFile(buf, `merge_in_${i}.pdf`);
            tempInputPaths.push(p);
          }

          outputBuffer = await MergeService.mergePDFs(tempInputPaths);
          outputName = 'merged_document.pdf';
          break;
        }

        case 'split': {
          const { inputObjectKey, pageIndices } = payload;
          if (!inputObjectKey || !pageIndices) throw new AppError('Split requires inputObjectKey and pageIndices.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const tempIn = StorageService.writeTempFile(buf, 'split_in.pdf');
          tempInputPaths.push(tempIn);

          outputBuffer = await SplitService.splitPDF(tempIn, pageIndices);
          outputName = 'split_document.pdf';
          break;
        }

        case 'rotate': {
          const { inputObjectKey, rotations } = payload;
          if (!inputObjectKey || !rotations) throw new AppError('Rotate requires inputObjectKey and rotations.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const tempIn = StorageService.writeTempFile(buf, 'rotate_in.pdf');
          tempInputPaths.push(tempIn);

          outputBuffer = await RotateService.rotatePDF(tempIn, rotations);
          outputName = 'rotated_document.pdf';
          break;
        }

        case 'organize': {
          const { inputObjectKey, pageItems } = payload;
          if (!inputObjectKey || !pageItems) throw new AppError('Organize requires inputObjectKey and pageItems.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const tempIn = StorageService.writeTempFile(buf, 'organize_in.pdf');
          tempInputPaths.push(tempIn);

          outputBuffer = await OrganizeService.organizePDF(tempIn, pageItems);
          outputName = 'organized_document.pdf';
          break;
        }

        case 'watermark': {
          const { inputObjectKey, text, fontSize, opacity, color, rotation } = payload;
          if (!inputObjectKey || !text) throw new AppError('Watermark requires inputObjectKey and text.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const tempIn = StorageService.writeTempFile(buf, 'watermark_in.pdf');
          tempInputPaths.push(tempIn);

          outputBuffer = await WatermarkService.addWatermark(tempIn, {
            text,
            fontSize: fontSize ? Number(fontSize) : undefined,
            opacity: opacity !== undefined ? Number(opacity) : undefined,
            color,
            rotation: rotation !== undefined ? Number(rotation) : undefined
          });
          outputName = 'watermarked_document.pdf';
          break;
        }

        case 'repair': {
          const { inputObjectKey } = payload;
          if (!inputObjectKey) throw new AppError('Repair requires inputObjectKey.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const tempIn = StorageService.writeTempFile(buf, 'repair_in.pdf');
          tempInputPaths.push(tempIn);

          outputBuffer = await RepairService.repairPDF(tempIn);
          outputName = 'repaired_document.pdf';
          break;
        }

        case 'ocr': {
          const { inputObjectKey } = payload;
          if (!inputObjectKey) throw new AppError('OCR requires inputObjectKey.', 400);

          await StorageService.verifyObjectOwnership(inputObjectKey, ownerId);
          const buf = await StorageService.getStorageProvider().download(inputObjectKey);
          const base64 = buf.toString('base64');

          const client = getAI();
          const blocks = await OCRService.performOCR(base64, client);
          resultPayload = { blocks };
          break;
        }

        default:
          throw new AppError(`Unsupported worker operation type: ${job.operation}`, 400);
      }

      await store.updateJob(job.id, ownerId, { progress: 80 });

      // Step 3: Save output to private object storage if output buffer generated
      let outputObjectKey: string | undefined = undefined;
      let downloadUrl: string | undefined = undefined;

      if (outputBuffer) {
        const provider = StorageService.getStorageProvider();
        outputObjectKey = StorageService.generateObjectKey(ownerId, 'outputs', '.pdf');

        const safeOutputName = ValidationService.sanitizeFilename(outputName, 'output.pdf');
        await provider.upload(outputObjectKey, outputBuffer, {
          ownerId,
          contentType: 'application/pdf',
          originalFilename: safeOutputName
        });

        downloadUrl = await provider.createSignedDownloadUrl(outputObjectKey, 1800); // 30 mins signed URL
        resultPayload.output = {
          objectKey: outputObjectKey,
          filename: safeOutputName,
          size: outputBuffer.length,
          downloadUrl
        };
      }

      const checkCancel = await store.getJob(job.id, ownerId, true);
      if (checkCancel?.cancelRequested) {
        if (outputObjectKey) {
          await StorageService.getStorageProvider().delete(outputObjectKey).catch(() => {});
        }
        await store.updateJob(job.id, ownerId, { status: 'cancelled', completedAt: new Date().toISOString() });
        return checkCancel;
      }

      // Step 4: Mark completed with lease verification
      const finalJob = await store.completeJobWithLeaseCheck(job.id, ownerId, workerId, {
        status: 'completed',
        progress: 100,
        outputObjectKey,
        completedAt: new Date().toISOString(),
        result: resultPayload
      });

      if (!finalJob) {
        LoggingService.error(`[WorkerService] Worker ${workerId} lease expired or lost before completion of job ${job.id}`);
        if (outputObjectKey) {
          await StorageService.getStorageProvider().delete(outputObjectKey).catch(() => {});
        }
        return null;
      }

      LoggingService.info(`[WorkerService] Worker ${workerId} successfully completed job ${job.id} (op: ${job.operation})`);
      return finalJob;

    } catch (err: any) {
      LoggingService.error(`[WorkerService] Worker ${workerId} failed processing job ${job.id} on attempt ${currentAttempts}:`, err);

      const isTransient = err.statusCode === 503 || err.statusCode === 504 || err.message?.includes('ECONNRESET') || err.message?.includes('timeout');
      const canRetry = isTransient && currentAttempts < 3;

      if (canRetry) {
        LoggingService.info(`[WorkerService] Scheduling transient retry for job ${job.id}`);
        return await store.updateJob(job.id, ownerId, {
          status: 'queued',
          progress: 0,
          errorCode: 'TRANSIENT_RETRY',
          safeErrorMessage: `Temporary failure on attempt ${currentAttempts}. Retrying job...`
        });
      } else {
        return await store.updateJob(job.id, ownerId, {
          status: 'failed',
          progress: 0,
          errorCode: err.errorCode || 'PROCESSING_ERROR',
          safeErrorMessage: err.message || 'An unexpected error occurred during PDF processing.',
          completedAt: new Date().toISOString()
        });
      }
    } finally {
      clearInterval(heartbeatTimer);
      // Cleanup temporary working files
      tempInputPaths.forEach(p => StorageService.deleteTempFile(p));
      if (tempOutputPath) StorageService.deleteTempFile(tempOutputPath);
    }
  }

  /**
   * Sweeper: Recover stale processing jobs or expired output files.
   */
  static async sweepStaleJobs(): Promise<void> {
    try {
      const store = this.getStore();
      const staleJobs = await store.findStaleProcessingJobs(5 * 60 * 1000); // 5 minutes

      for (const stale of staleJobs) {
        LoggingService.warn(`[WorkerService] Recovering stale processing job: ${stale.id}`);
        if ((stale.attemptCount || 0) < 3) {
          await store.updateJob(stale.id, stale.ownerId, {
            status: 'queued',
            progress: 0,
            errorCode: 'WORKER_STALE_RECOVER'
          });
        } else {
          await store.updateJob(stale.id, stale.ownerId, {
            status: 'failed',
            errorCode: 'WORKER_TIMEOUT',
            safeErrorMessage: 'Processing timed out and reached maximum retry attempts.',
            completedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      LoggingService.error('[WorkerService] Error recovering stale jobs:', err);
    }
  }
}
