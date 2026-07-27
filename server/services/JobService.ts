import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { LoggingService } from './LoggingService';

export interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  cancelRequested?: boolean;
  onCancel?: () => void;
  createdAt: Date;
}

export class JobService {
  private static db: Database.Database;
  private static onCancelMap = new Map<string, () => void>();

  static {
    try {
      const dbDir = path.join(os.tmpdir(), 'make-pdf-jobs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const dbPath = path.join(dbDir, 'jobs.db');
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
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
      LoggingService.info(`JobService initialized with SQLite persistence at: ${dbPath}`);
    } catch (err) {
      LoggingService.error('Failed to initialize SQLite for JobService', err);
    }
  }

  static createJob(type: string): Job {
    const jobId = Math.random().toString(36).substring(2, 11);
    const now = new Date();
    const job: Job = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: now
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO jobs (id, type, status, progress, cancel_requested, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `);
      stmt.run(job.id, job.type, job.status, job.progress, now.toISOString());
    } catch (err) {
      LoggingService.error(`Failed to insert job ${jobId} into SQLite:`, err);
    }

    LoggingService.info(`Created async job: ${jobId} of type: ${type}`);
    return job;
  }

  static getJob(id: string): Job | undefined {
    try {
      const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
      const row = stmt.get(id) as any;
      if (!row) return undefined;

      let parsedResult: any = undefined;
      if (row.result) {
        try {
          parsedResult = JSON.parse(row.result);
        } catch (e) {
          parsedResult = row.result;
        }
      }

      return {
        id: row.id,
        type: row.type,
        status: row.status,
        progress: row.progress,
        result: parsedResult,
        error: row.error || undefined,
        cancelRequested: Boolean(row.cancel_requested),
        createdAt: new Date(row.created_at)
      };
    } catch (err) {
      LoggingService.error(`Failed to read job ${id} from SQLite:`, err);
      return undefined;
    }
  }

  static updateJob(id: string, updates: Partial<Job>) {
    const current = this.getJob(id);
    if (!current) return;

    if (updates.onCancel) {
      this.onCancelMap.set(id, updates.onCancel);
    }

    const status = updates.status !== undefined ? updates.status : current.status;
    const progress = updates.progress !== undefined ? updates.progress : current.progress;
    const result = updates.result !== undefined ? JSON.stringify(updates.result) : (current.result ? JSON.stringify(current.result) : null);
    const error = updates.error !== undefined ? updates.error : current.error;
    const cancelReq = updates.cancelRequested !== undefined ? (updates.cancelRequested ? 1 : 0) : (current.cancelRequested ? 1 : 0);

    try {
      const stmt = this.db.prepare(`
        UPDATE jobs
        SET status = ?, progress = ?, result = ?, error = ?, cancel_requested = ?
        WHERE id = ?
      `);
      stmt.run(status, progress, result, error, cancelReq, id);
      LoggingService.info(`Updated job ${id}: status=${status}, progress=${progress}`);
    } catch (err) {
      LoggingService.error(`Failed to update job ${id} in SQLite:`, err);
    }
  }

  static cancelJob(id: string): boolean {
    const job = this.getJob(id);
    if (job) {
      if (job.status === 'completed' || job.status === 'failed') {
        return false;
      }

      try {
        const stmt = this.db.prepare(`
          UPDATE jobs
          SET status = 'cancelled', cancel_requested = 1
          WHERE id = ?
        `);
        stmt.run(id);

        const onCancel = this.onCancelMap.get(id);
        if (onCancel) {
          onCancel();
          this.onCancelMap.delete(id);
        }

        LoggingService.info(`Cancelled job ${id}`);
        return true;
      } catch (err) {
        LoggingService.error(`Failed to cancel job ${id} in SQLite:`, err);
        return false;
      }
    }
    return false;
  }

  // Auto clean up old jobs (older than 10 minutes)
  static startCleanupTimer() {
    setInterval(() => {
      try {
        const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const stmt = this.db.prepare('DELETE FROM jobs WHERE created_at < ?');
        const info = stmt.run(cutoff);
        if (info.changes > 0) {
          LoggingService.info(`Auto-cleaned ${info.changes} stale job(s) from SQLite database.`);
        }
      } catch (err) {
        LoggingService.error('Error cleaning up stale jobs from SQLite:', err);
      }
    }, 60000); // Check every minute
  }
}

// Start cleanup timer
JobService.startCleanupTimer();
