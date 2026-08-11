import { IJobStore, Job, JobStatus } from '../storage/IJobStore.js';
import { StorageJobStore } from '../storage/StorageJobStore.js';
import { WorkerService } from './WorkerService.js';
import { LoggingService } from './LoggingService.js';
import { AppError } from './ErrorHandler.js';

const SUPPORTED_JOB_TYPES = new Set([
  'compress',
  'merge',
  'split',
  'rotate',
  'organize',
  'watermark',
  'repair',
  'ocr',
  'pdf-editor-ai',
  'pdf-editor-ocr'
]);

const MAX_PER_USER_CONCURRENT_JOBS = 10;
const MAX_GLOBAL_CONCURRENT_JOBS = 50;

export class JobService {
  private static store: IJobStore = new StorageJobStore();

  static {
    try {
      WorkerService.setStore(this.store);
      this.startScheduledSweeper();
      LoggingService.info('[JobService] Initialized with persistent StorageJobStore.');
    } catch (err) {
      LoggingService.error('Failed to initialize JobService:', err);
    }
  }

  static getStore(): IJobStore {
    return this.store;
  }

  /**
   * Create an asynchronous processing job.
   */
  static async createJob(
    type: string,
    ownerId: string = 'anonymous',
    payload?: any,
    idempotencyKey?: string
  ): Promise<Job> {
    if (!SUPPORTED_JOB_TYPES.has(type)) {
      throw new AppError(`Unsupported job type: '${type}'.`, 400);
    }

    // Check concurrency
    const activeJobs = await this.store.listJobsForOwner(ownerId, 50);
    const userActiveCount = activeJobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
    if (userActiveCount >= MAX_PER_USER_CONCURRENT_JOBS) {
      throw new AppError(`User limit reached: You have ${userActiveCount} active jobs running. Please wait for them to finish.`, 429);
    }

    const job = await this.store.createJob({
      ownerId,
      operation: type,
      payload
    }, idempotencyKey);

    return job;
  }

  /**
   * Retrieve all jobs for an owner.
   */
  static async listJobsForOwner(ownerId: string, limit: number = 50): Promise<Job[]> {
    return await this.store.listJobsForOwner(ownerId, limit);
  }

  /**
   * Retrieve a job by ID for the authorized owner.
   */
  static async getJob(id: string, ownerId: string = 'anonymous'): Promise<Job | null> {
    return await this.store.getJob(id, ownerId);
  }

  /**
   * Update job status/fields with strict state machine validation.
   */
  static async updateJob(id: string, ownerId: string, updates: Partial<Job>): Promise<Job | null> {
    return await this.store.updateJob(id, ownerId, updates);
  }

  /**
   * Cancel a job for the authorized owner.
   */
  static async cancelJob(id: string, ownerId: string = 'anonymous'): Promise<boolean> {
    return await this.store.cancelJob(id, ownerId);
  }

  /**
   * Triggers processing execution for a job asynchronously.
   */
  static async processJobAsync(id: string, ownerId: string): Promise<Job | null> {
    // Process asynchronously without blocking the initial HTTP response
    return WorkerService.processJob(id, ownerId);
  }

  /**
   * Periodic background sweeper for stale jobs and expired output files.
   */
  private static startScheduledSweeper(intervalMs: number = 60 * 1000) {
    const timer = setInterval(async () => {
      try {
        await WorkerService.sweepStaleJobs();
      } catch (err) {
        LoggingService.error('[JobService] Sweeper error:', err);
      }
    }, intervalMs);
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }
}
