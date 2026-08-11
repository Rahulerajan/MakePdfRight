export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface Job {
  id: string;
  ownerId: string;
  operation: string; // e.g. 'compress', 'merge', 'split', 'rotate', etc.
  inputObjectKey?: string;
  outputObjectKey?: string;
  status: JobStatus;
  progress: number; // 0 - 100
  payload?: any; // Inputs / parameters
  result?: any; // Output metadata, downloadUrl, spaceSaved, etc.
  createdAt: string; // ISO string
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  errorCode?: string;
  safeErrorMessage?: string;
  idempotencyKey?: string;
  cancelRequested?: boolean;
  workerStartedAt?: string;
  attemptCount?: number;
  workerId?: string;
  leaseAcquiredAt?: string;
  leaseExpiresAt?: string;
  version?: number; // Monotonically increasing version counter for atomic conditional writes
}

export interface ClaimResult {
  success: boolean;
  job: Job | null;
}

export interface IJobStore {
  createJob(jobData: Omit<Job, 'id' | 'createdAt' | 'status' | 'progress'>, idempotencyKey?: string): Promise<Job>;
  getJob(id: string, ownerId: string, forceRefresh?: boolean): Promise<Job | null>;
  updateJob(id: string, ownerId: string, updates: Partial<Job>): Promise<Job | null>;
  cancelJob(id: string, ownerId: string): Promise<boolean>;
  listJobsForOwner(ownerId: string, limit?: number): Promise<Job[]>;
  expireJob(id: string, ownerId: string): Promise<boolean>;
  deleteJob(id: string, ownerId: string): Promise<boolean>;
  findQueuedJobs(limit?: number): Promise<Job[]>;
  findStaleProcessingJobs(maxAgeMs?: number): Promise<Job[]>;
  getByIdempotencyKey(idempotencyKey: string, ownerId: string): Promise<Job | null>;
  claimJob(jobId: string, ownerId: string, workerId: string, leaseDurationMs?: number): Promise<ClaimResult>;
  renewLease(jobId: string, ownerId: string, workerId: string, extensionMs?: number): Promise<boolean>;
  completeJobWithLeaseCheck(jobId: string, ownerId: string, workerId: string, updates: Partial<Job>): Promise<Job | null>;
}

// Strict Job State Machine Validator
const VALID_STATE_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ['processing', 'cancelled', 'expired'],
  processing: ['completed', 'failed', 'cancelled', 'expired', 'queued'],
  completed: ['expired'],
  failed: ['expired'],
  cancelled: ['expired'],
  expired: []
};

export function isValidJobTransition(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_STATE_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}
