import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService';
import { StorageService } from './StorageService';
import { AppError } from './ErrorHandler';

export interface Job {
  id: string;
  type: string;
  ownerId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  resultFilePath?: string;
  error?: string;
  cancelRequested?: boolean;
  onCancel?: () => void;
  createdAt: Date;
}

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

const MAX_PER_USER_CONCURRENT_JOBS = 5;
const MAX_GLOBAL_CONCURRENT_JOBS = 25;

export class JobService {
  private static db: any = null;
  private static memoryJobs = new Map<string, Job>();
  private static onCancelMap = new Map<string, () => void>();

  static {
    try {
      // Safely attempt to require better-sqlite3
      const Database = require('better-sqlite3');
      const dbDir = path.resolve(os.tmpdir(), 'make-pdf-jobs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
      }
      const dbPath = path.resolve(dbDir, 'jobs.db');
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      
      // Step 1: Base table creation
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          progress INTEGER NOT NULL,
          result TEXT,
          error TEXT,
          cancel_requested INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // Step 2: Database column migration check if legacy table exists
      try {
        const columns = this.db.prepare("PRAGMA table_info('jobs')").all() as any[];
        const hasOwner = columns.some(c => c.name === 'owner_id');
        if (!hasOwner) {
          this.db.exec("ALTER TABLE jobs ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'anonymous'");
        }
        const hasResultFilePath = columns.some(c => c.name === 'result_file_path');
        if (!hasResultFilePath) {
          this.db.exec("ALTER TABLE jobs ADD COLUMN result_file_path TEXT");
        }
      } catch (mErr) {
        LoggingService.warn('Table migration check notice:', mErr);
      }

      // Step 3: Create indexes after columns are guaranteed to exist
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_owner ON jobs(owner_id, id);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      `);

      LoggingService.info(`JobService initialized with SQLite persistence at: ${dbPath}`);
    } catch (err) {
      LoggingService.warn('better-sqlite3 unavailable or failed to initialize. Falling back to in-memory job store for serverless environment:', err);
      this.db = null;
    }
  }

  static createJob(type: string, ownerId: string = 'anonymous'): Job {
    if (!SUPPORTED_JOB_TYPES.has(type)) {
      throw new AppError(`Unsupported job type: '${type}'.`, 400);
    }

    if (this.db) {
      // Check concurrency limits in SQLite
      const globalActiveStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM jobs WHERE status IN ('pending', 'processing')");
      const globalCount = (globalActiveStmt.get() as any)?.cnt || 0;
      if (globalCount >= MAX_GLOBAL_CONCURRENT_JOBS) {
        throw new AppError('Server busy: Maximum global concurrent jobs reached. Please try again shortly.', 429);
      }

      const userActiveStmt = this.db.prepare("SELECT COUNT(*) as cnt FROM jobs WHERE owner_id = ? AND status IN ('pending', 'processing')");
      const userCount = (userActiveStmt.get(ownerId) as any)?.cnt || 0;
      if (userCount >= MAX_PER_USER_CONCURRENT_JOBS) {
        throw new AppError(`User limit reached: You have ${userCount} active jobs running. Please wait for them to finish.`, 429);
      }
    } else {
      // Check concurrency limits in Memory
      let globalCount = 0;
      let userCount = 0;
      for (const j of this.memoryJobs.values()) {
        if (j.status === 'pending' || j.status === 'processing') {
          globalCount++;
          if (j.ownerId === ownerId) userCount++;
        }
      }
      if (globalCount >= MAX_GLOBAL_CONCURRENT_JOBS) {
        throw new AppError('Server busy: Maximum global concurrent jobs reached. Please try again shortly.', 429);
      }
      if (userCount >= MAX_PER_USER_CONCURRENT_JOBS) {
        throw new AppError(`User limit reached: You have ${userCount} active jobs running. Please wait for them to finish.`, 429);
      }
    }

    const jobId = crypto.randomUUID();
    const now = new Date();
    const job: Job = {
      id: jobId,
      type,
      ownerId,
      status: 'pending',
      progress: 0,
      createdAt: now
    };

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO jobs (id, type, owner_id, status, progress, cancel_requested, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `);
        stmt.run(job.id, job.type, job.ownerId, job.status, job.progress, now.toISOString());
      } catch (err) {
        LoggingService.error(`Failed to insert job ${jobId} into SQLite:`, err);
        throw new AppError('Failed to initialize processing job.', 500);
      }
    } else {
      this.memoryJobs.set(jobId, { ...job });
    }

    LoggingService.info(`Created async job: ${jobId} (type=${type}, owner=${ownerId})`);
    return job;
  }

  static getJob(id: string, ownerId: string = 'anonymous'): Job | undefined {
    if (!this.db) {
      const j = this.memoryJobs.get(id);
      if (j && (j.ownerId === ownerId || ownerId === 'anonymous' || j.ownerId === 'anonymous')) {
        return j;
      }
      return undefined;
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ? AND owner_id = ?');
      const row = stmt.get(id, ownerId) as any;
      if (!row) return undefined;

      let parsedResult: any = undefined;
      if (row.result_file_path) {
        try {
          const fileBuf = StorageService.readTempFile(row.result_file_path);
          parsedResult = JSON.parse(fileBuf.toString('utf-8'));
        } catch (fErr) {
          LoggingService.error(`Failed to read result file for job ${id}:`, fErr);
        }
      } else if (row.result) {
        try {
          parsedResult = JSON.parse(row.result);
        } catch (e) {
          parsedResult = row.result;
        }
      }

      return {
        id: row.id,
        type: row.type,
        ownerId: row.owner_id,
        status: row.status,
        progress: row.progress,
        result: parsedResult,
        resultFilePath: row.result_file_path || undefined,
        error: row.error || undefined,
        cancelRequested: Boolean(row.cancel_requested),
        createdAt: new Date(row.created_at)
      };
    } catch (err) {
      LoggingService.error(`Failed to read job ${id} from SQLite:`, err);
      return undefined;
    }
  }

  static updateJob(id: string, ownerId: string, updates: Partial<Job>) {
    const current = this.getJob(id, ownerId);
    if (!current) {
      LoggingService.warn(`Update job denied or not found: ${id} for owner: ${ownerId}`);
      return;
    }

    if (updates.onCancel) {
      this.onCancelMap.set(id, updates.onCancel);
    }

    const updatedJob: Job = {
      ...current,
      ...updates,
      status: updates.status !== undefined ? updates.status : current.status,
      progress: updates.progress !== undefined ? updates.progress : current.progress,
      error: updates.error !== undefined ? updates.error : current.error,
      cancelRequested: updates.cancelRequested !== undefined ? updates.cancelRequested : current.cancelRequested
    };

    if (!this.db) {
      this.memoryJobs.set(id, updatedJob);
      LoggingService.info(`Updated job ${id} in memory: status=${updatedJob.status}, progress=${updatedJob.progress}`);
      return;
    }

    const status = updatedJob.status;
    const progress = updatedJob.progress;
    const error = updatedJob.error;
    const cancelReq = updatedJob.cancelRequested ? 1 : 0;

    let resultJson: string | null = null;
    let resultFilePath: string | null = current.resultFilePath || null;

    if (updates.result !== undefined) {
      const jsonStr = JSON.stringify(updates.result);
      if (jsonStr.length > 50000) {
        try {
          const writtenPath = StorageService.writeTempFile(Buffer.from(jsonStr, 'utf-8'), `job_${id}_result.json`);
          resultFilePath = writtenPath;
          resultJson = null;
        } catch (sErr) {
          LoggingService.error(`Failed to write job result to temp file for job ${id}:`, sErr);
          resultJson = jsonStr;
        }
      } else {
        resultJson = jsonStr;
      }
    } else if (current.result && !resultFilePath) {
      resultJson = JSON.stringify(current.result);
    }

    try {
      const stmt = this.db.prepare(`
        UPDATE jobs
        SET status = ?, progress = ?, result = ?, result_file_path = ?, error = ?, cancel_requested = ?
        WHERE id = ? AND owner_id = ?
      `);
      stmt.run(status, progress, resultJson, resultFilePath, error, cancelReq, id, ownerId);
      LoggingService.info(`Updated job ${id}: status=${status}, progress=${progress}`);
    } catch (err) {
      LoggingService.error(`Failed to update job ${id} in SQLite:`, err);
    }
  }

  static cancelJob(id: string, ownerId: string = 'anonymous'): boolean {
    const job = this.getJob(id, ownerId);
    if (job) {
      if (job.status === 'completed' || job.status === 'failed') {
        return false;
      }

      if (!this.db) {
        job.status = 'cancelled';
        job.cancelRequested = true;
        this.memoryJobs.set(id, job);
        const onCancel = this.onCancelMap.get(id);
        if (onCancel) {
          onCancel();
          this.onCancelMap.delete(id);
        }
        LoggingService.info(`Cancelled job ${id} for owner ${ownerId} in memory`);
        return true;
      }

      try {
        const stmt = this.db.prepare(`
          UPDATE jobs
          SET status = 'cancelled', cancel_requested = 1
          WHERE id = ? AND owner_id = ?
        `);
        stmt.run(id, ownerId);

        const onCancel = this.onCancelMap.get(id);
        if (onCancel) {
          onCancel();
          this.onCancelMap.delete(id);
        }

        LoggingService.info(`Cancelled job ${id} for owner ${ownerId}`);
        return true;
      } catch (err) {
        LoggingService.error(`Failed to cancel job ${id} in SQLite:`, err);
        return false;
      }
    }
    return false;
  }

  static startCleanupTimer() {
    setInterval(() => {
      try {
        const cutoffTime = Date.now() - 15 * 60 * 1000;
        if (!this.db) {
          for (const [id, j] of this.memoryJobs.entries()) {
            if (j.createdAt.getTime() < cutoffTime) {
              this.memoryJobs.delete(id);
            }
          }
          return;
        }

        const cutoff = new Date(cutoffTime).toISOString();
        const selectStmt = this.db.prepare("SELECT result_file_path FROM jobs WHERE created_at < ? AND result_file_path IS NOT NULL");
        const rows = selectStmt.all(cutoff) as any[];
        for (const r of rows) {
          if (r.result_file_path) {
            StorageService.deleteTempFile(r.result_file_path);
          }
        }

        const deleteStmt = this.db.prepare('DELETE FROM jobs WHERE created_at < ?');
        const info = deleteStmt.run(cutoff);
        if (info.changes > 0) {
          LoggingService.info(`Auto-cleaned ${info.changes} stale job(s) and associated files from SQLite database.`);
          this.db.exec('PRAGMA optimize;');
        }
      } catch (err) {
        LoggingService.error('Error cleaning up stale jobs:', err);
      }
    }, 60000);
  }
}

JobService.startCleanupTimer();

