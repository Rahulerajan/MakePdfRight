import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { IJobStore, Job, JobStatus, isValidJobTransition, ClaimResult } from './IJobStore.js';
import { StorageService } from '../services/StorageService.js';
import { LoggingService } from '../services/LoggingService.js';
import { AppError } from '../services/ErrorHandler.js';

// Global in-memory async mutex map per jobId to sequence async calls within same Node process
const inMemoryLocks = new Map<string, Promise<void>>();

async function acquireLock(jobId: string): Promise<() => void> {
  // Step 1: In-process async serialization
  let resolveCurrentLock: () => void = () => {};
  const currentLockPromise = new Promise<void>((resolve) => {
    resolveCurrentLock = resolve;
  });

  const previousLock = inMemoryLocks.get(jobId) || Promise.resolve();
  inMemoryLocks.set(jobId, previousLock.then(() => currentLockPromise));
  await previousLock;

  // Step 2: Cross-process file system atomic lock file
  const lockDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'locks');
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true, mode: 0o700 });
  }

  const sanitizedId = jobId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const lockPath = path.join(lockDir, `${sanitizedId}.lock`);
  const maxAttempts = 100;
  let acquiredFd: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // 'wx' flag creates file exclusively, failing if it already exists
      acquiredFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(acquiredFd, Date.now().toString(), 'utf-8');
      break; // Successfully acquired lock!
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        // Check for stale lock file (older than 5 seconds)
        try {
          const stats = fs.statSync(lockPath);
          if (Date.now() - stats.mtimeMs > 5000) {
            fs.unlinkSync(lockPath); // Stale lock cleanup
          }
        } catch {}
        // Wait 10ms and retry
        await new Promise((r) => setTimeout(r, 10));
      } else {
        throw err;
      }
    }
  }

  return () => {
    if (acquiredFd !== null) {
      try {
        fs.closeSync(acquiredFd);
      } catch {}
    }
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}
    resolveCurrentLock();
  };
}

export async function withJobLock<T>(jobId: string, fn: () => Promise<T>): Promise<T> {
  const release = await acquireLock(jobId);
  try {
    return await fn();
  } finally {
    release();
  }
}

export class StorageJobStore implements IJobStore {
  // In-memory write-through cache per process instance for fast polling reads
  private memoryCache = new Map<string, Job>();

  private getJobObjectKey(ownerId: string, jobId: string): string {
    const sanitizedOwner = (ownerId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `users/${sanitizedOwner}/jobs/${jobId}.json`;
  }

  private getIdempotencyObjectKey(ownerId: string, idempotencyKey: string): string {
    const sanitizedOwner = (ownerId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedKey = idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `users/${sanitizedOwner}/idempotency/${sanitizedKey}.json`;
  }

  async createJob(
    jobData: Omit<Job, 'id' | 'createdAt' | 'status' | 'progress'>,
    idempotencyKey?: string
  ): Promise<Job> {
    const ownerId = jobData.ownerId || 'anonymous';

    // Check idempotency key duplicate request
    if (idempotencyKey) {
      const existing = await this.getByIdempotencyKey(idempotencyKey, ownerId);
      if (existing && existing.status !== 'failed' && existing.status !== 'expired') {
        LoggingService.info(`[StorageJobStore] Idempotency match found for key: ${idempotencyKey}, returning existing job ${existing.id}`);
        return existing;
      }
    }

    const jobId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours retention

    const job: Job = {
      ...jobData,
      id: jobId,
      ownerId,
      status: 'queued',
      progress: 0,
      createdAt: nowIso,
      expiresAt: jobData.expiresAt || expiresAtIso,
      attemptCount: 0,
      idempotencyKey
    };

    await this.persistJob(job);

    if (idempotencyKey) {
      const idemKey = this.getIdempotencyObjectKey(ownerId, idempotencyKey);
      const provider = StorageService.getStorageProvider();
      await provider.upload(idemKey, Buffer.from(JSON.stringify({ jobId, ownerId, createdAt: nowIso }), 'utf-8'), {
        ownerId,
        contentType: 'application/json'
      });
    }

    LoggingService.info(`[StorageJobStore] Created persistent job ${jobId} for owner ${ownerId} (operation: ${job.operation})`);
    return job;
  }

  private async persistJob(job: Job): Promise<void> {
    const key = this.getJobObjectKey(job.ownerId, job.id);
    const provider = StorageService.getStorageProvider();
    const jsonBuf = Buffer.from(JSON.stringify(job, null, 2), 'utf-8');

    await provider.upload(key, jsonBuf, {
      ownerId: job.ownerId,
      contentType: 'application/json'
    });

    this.memoryCache.set(`${job.ownerId}:${job.id}`, job);
  }

  async getJob(id: string, ownerId: string, forceRefresh: boolean = false): Promise<Job | null> {
    const cacheKey = `${ownerId}:${id}`;
    if (!forceRefresh && this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    try {
      const key = this.getJobObjectKey(ownerId, id);
      const provider = StorageService.getStorageProvider();
      const exists = await provider.exists(key);
      if (!exists) return null;

      const buf = await provider.download(key);
      const job: Job = JSON.parse(buf.toString('utf-8'));

      if (job.ownerId !== ownerId && ownerId !== 'admin') {
        LoggingService.warn(`[StorageJobStore] Ownership mismatch for job ${id}: expected ${ownerId}, got ${job.ownerId}`);
        return null;
      }

      this.memoryCache.set(cacheKey, job);
      return job;
    } catch (err) {
      LoggingService.error(`[StorageJobStore] Failed to retrieve job ${id}:`, err);
      return null;
    }
  }

  async updateJob(id: string, ownerId: string, updates: Partial<Job>): Promise<Job | null> {
    return withJobLock(id, async () => {
      const current = await this.getJob(id, ownerId, true);
      if (!current) {
        LoggingService.warn(`[StorageJobStore] Cannot update non-existent job: ${id} for owner ${ownerId}`);
        return null;
      }

      // Validate state transition if status changes
      if (updates.status && updates.status !== current.status) {
        if (!isValidJobTransition(current.status, updates.status)) {
          throw new AppError(`Invalid job state transition from '${current.status}' to '${updates.status}'.`, 400);
        }
      }

      const updatedJob: Job = {
        ...current,
        ...updates,
        id: current.id,
        ownerId: current.ownerId,
        createdAt: current.createdAt
      };

      await this.persistJob(updatedJob);
      LoggingService.info(`[StorageJobStore] Updated job ${id} (status: ${updatedJob.status}, progress: ${updatedJob.progress}%)`);
      return updatedJob;
    });
  }

  async claimJob(
    jobId: string,
    ownerId: string,
    workerId: string,
    leaseDurationMs: number = 60000
  ): Promise<ClaimResult> {
    return withJobLock(jobId, async () => {
      const current = await this.getJob(jobId, ownerId, true);
      if (!current) {
        return { success: false, job: null };
      }

      const now = Date.now();
      const isQueued = current.status === 'queued';
      const isLeaseExpired =
        current.status === 'processing' &&
        current.leaseExpiresAt &&
        new Date(current.leaseExpiresAt).getTime() < now;

      if (!isQueued && !isLeaseExpired) {
        LoggingService.warn(`[StorageJobStore] Claim failed for job ${jobId}: job is in status '${current.status}' with active lease.`);
        return { success: false, job: current };
      }

      const nowIso = new Date(now).toISOString();
      const leaseExpiresAt = new Date(now + leaseDurationMs).toISOString();

      const claimedJob: Job = {
        ...current,
        status: 'processing',
        workerId,
        leaseAcquiredAt: nowIso,
        leaseExpiresAt,
        startedAt: current.startedAt || nowIso,
        workerStartedAt: nowIso,
        attemptCount: (current.attemptCount || 0) + 1,
        progress: isQueued ? 10 : current.progress
      };

      await this.persistJob(claimedJob);
      LoggingService.info(`[StorageJobStore] Worker ${workerId} successfully claimed job ${jobId} (attempt: ${claimedJob.attemptCount})`);
      return { success: true, job: claimedJob };
    });
  }

  async renewLease(
    jobId: string,
    ownerId: string,
    workerId: string,
    extensionMs: number = 60000
  ): Promise<boolean> {
    return withJobLock(jobId, async () => {
      const current = await this.getJob(jobId, ownerId, true);
      if (!current || current.status !== 'processing' || current.workerId !== workerId) {
        LoggingService.warn(`[StorageJobStore] Lease renewal failed for job ${jobId}: worker ${workerId} does not hold active processing lease.`);
        return false;
      }

      const newExpiresAt = new Date(Date.now() + extensionMs).toISOString();
      const updatedJob: Job = {
        ...current,
        leaseExpiresAt: newExpiresAt
      };

      await this.persistJob(updatedJob);
      LoggingService.info(`[StorageJobStore] Extended lease for worker ${workerId} on job ${jobId} to ${newExpiresAt}`);
      return true;
    });
  }

  async completeJobWithLeaseCheck(
    jobId: string,
    ownerId: string,
    workerId: string,
    updates: Partial<Job>
  ): Promise<Job | null> {
    return withJobLock(jobId, async () => {
      const current = await this.getJob(jobId, ownerId, true);
      if (!current) return null;

      if (current.workerId !== workerId) {
        LoggingService.warn(`[StorageJobStore] Worker ${workerId} lost lease for job ${jobId} (current worker: ${current.workerId}); completion rejected.`);
        return null;
      }

      if (current.leaseExpiresAt && new Date(current.leaseExpiresAt).getTime() < Date.now()) {
        LoggingService.warn(`[StorageJobStore] Worker ${workerId} lease expired for job ${jobId}; completion rejected.`);
        return null;
      }

      if (updates.status && updates.status !== current.status) {
        if (!isValidJobTransition(current.status, updates.status)) {
          throw new AppError(`Invalid job state transition from '${current.status}' to '${updates.status}'.`, 400);
        }
      }

      const updatedJob: Job = {
        ...current,
        ...updates,
        id: current.id,
        ownerId: current.ownerId,
        createdAt: current.createdAt
      };

      await this.persistJob(updatedJob);
      LoggingService.info(`[StorageJobStore] Completed job ${jobId} with lease verification for worker ${workerId}`);
      return updatedJob;
    });
  }

  async cancelJob(id: string, ownerId: string): Promise<boolean> {
    return withJobLock(id, async () => {
      const current = await this.getJob(id, ownerId, true);
      if (!current) return false;

      if (current.status === 'completed' || current.status === 'failed' || current.status === 'expired') {
        return false;
      }

      const targetStatus: JobStatus = 'cancelled';
      if (!isValidJobTransition(current.status, targetStatus)) {
        return false;
      }

      const updatedJob: Job = {
        ...current,
        status: targetStatus,
        cancelRequested: true,
        completedAt: new Date().toISOString()
      };

      await this.persistJob(updatedJob);
      LoggingService.info(`[StorageJobStore] Cancelled job ${id} for owner ${ownerId}`);
      return true;
    });
  }

  async listJobsForOwner(ownerId: string, limit: number = 20): Promise<Job[]> {
    const jobs: Job[] = [];
    for (const [k, job] of this.memoryCache.entries()) {
      if (job.ownerId === ownerId) {
        jobs.push(job);
      }
    }
    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async expireJob(id: string, ownerId: string): Promise<boolean> {
    const current = await this.getJob(id, ownerId);
    if (!current) return false;

    await this.updateJob(id, ownerId, {
      status: 'expired'
    });

    // Cleanup input & output objects if present
    const provider = StorageService.getStorageProvider();
    if (current.inputObjectKey) {
      await provider.delete(current.inputObjectKey).catch(() => {});
    }
    if (current.outputObjectKey) {
      await provider.delete(current.outputObjectKey).catch(() => {});
    }

    this.memoryCache.delete(`${ownerId}:${id}`);
    return true;
  }

  async deleteJob(id: string, ownerId: string): Promise<boolean> {
    const key = this.getJobObjectKey(ownerId, id);
    const provider = StorageService.getStorageProvider();
    await provider.delete(key);
    this.memoryCache.delete(`${ownerId}:${id}`);
    return true;
  }

  async findQueuedJobs(limit: number = 10): Promise<Job[]> {
    const queued: Job[] = [];
    for (const job of this.memoryCache.values()) {
      if (job.status === 'queued') {
        queued.push(job);
      }
    }
    return queued.slice(0, limit);
  }

  async findStaleProcessingJobs(maxAgeMs: number = 5 * 60 * 1000): Promise<Job[]> {
    const stale: Job[] = [];
    const now = Date.now();
    for (const job of this.memoryCache.values()) {
      if (job.status === 'processing') {
        const leaseExpired = job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() < now;
        const startedTime = job.workerStartedAt ? new Date(job.workerStartedAt).getTime() : 0;
        const workerStale = startedTime > 0 && (now - startedTime > maxAgeMs);

        if (leaseExpired || workerStale) {
          stale.push(job);
        }
      }
    }
    return stale;
  }

  async getByIdempotencyKey(idempotencyKey: string, ownerId: string): Promise<Job | null> {
    try {
      const key = this.getIdempotencyObjectKey(ownerId, idempotencyKey);
      const provider = StorageService.getStorageProvider();
      const exists = await provider.exists(key);
      if (!exists) return null;

      const buf = await provider.download(key);
      const data = JSON.parse(buf.toString('utf-8'));
      if (data?.jobId && data?.ownerId === ownerId) {
        return await this.getJob(data.jobId, ownerId);
      }
      return null;
    } catch {
      return null;
    }
  }
}
