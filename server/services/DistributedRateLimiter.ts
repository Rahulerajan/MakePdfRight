import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';
import { JobService } from './JobService.js';

export type RateLimitCategory = 'general' | 'upload' | 'pdf' | 'ai';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  message?: string;
}

const IN_MEMORY_LOCKS = new Map<string, Promise<void>>();

async function acquireKeyLock(lockKey: string): Promise<() => void> {
  // In-process lock
  let resolveLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  const prevLock = IN_MEMORY_LOCKS.get(lockKey) || Promise.resolve();
  IN_MEMORY_LOCKS.set(lockKey, prevLock.then(() => lockPromise));
  await prevLock;

  // Cross-process filesystem lock
  const lockDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'ratelimits');
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true, mode: 0o700 });
  }

  const sanitizedKey = lockKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const lockPath = path.join(lockDir, `${sanitizedKey}.lock`);
  const maxAttempts = 1000;
  let acquiredFd: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      acquiredFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(acquiredFd, Date.now().toString(), 'utf-8');
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stats = fs.statSync(lockPath);
          if (Date.now() - stats.mtimeMs > 3000) {
            fs.unlinkSync(lockPath);
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 10));
      } else {
        break;
      }
    }
  }

  return () => {
    if (acquiredFd !== null) {
      try { fs.closeSync(acquiredFd); } catch {}
    }
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch {}
    resolveLock();
  };
}

export class DistributedRateLimiter {
  static getCategoryLimits(category: RateLimitCategory): RateLimitConfig {
    const envGen = parseInt(process.env.RATE_LIMIT_GENERAL || '60', 10);
    const envUp = parseInt(process.env.RATE_LIMIT_UPLOAD || '15', 10);
    const envPdf = parseInt(process.env.RATE_LIMIT_PDF || '20', 10);
    const envAi = parseInt(process.env.RATE_LIMIT_AI || '10', 10);

    switch (category) {
      case 'upload':
        return { windowMs: 60 * 1000, max: isNaN(envUp) ? 15 : envUp };
      case 'pdf':
        return { windowMs: 60 * 1000, max: isNaN(envPdf) ? 20 : envPdf };
      case 'ai':
        return { windowMs: 60 * 1000, max: isNaN(envAi) ? 10 : envAi };
      case 'general':
      default:
        return { windowMs: 60 * 1000, max: isNaN(envGen) ? 60 : envGen };
    }
  }

  static getMaxActiveJobsPerOwner(): number {
    const envVal = parseInt(process.env.MAX_ACTIVE_JOBS_PER_OWNER || '5', 10);
    return isNaN(envVal) ? 5 : envVal;
  }

  static async checkRateLimit(
    identifier: string,
    category: RateLimitCategory,
    action: string = 'default'
  ): Promise<RateLimitResult> {
    const config = this.getCategoryLimits(category);
    const windowMs = config.windowMs;
    const max = config.max;
    const now = Date.now();

    const rateKey = `rate_${category}_${identifier}_${action}`;
    const releaseLock = await acquireKeyLock(rateKey);

    try {
      const dataDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'ratelimits');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      }

      const sanitizedKey = rateKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dataPath = path.join(dataDir, `${sanitizedKey}.json`);

      let record = { count: 0, windowStart: now };
      if (fs.existsSync(dataPath)) {
        try {
          const raw = fs.readFileSync(dataPath, 'utf-8');
          record = JSON.parse(raw);
        } catch {}
      }

      // Check if window expired
      if (now - record.windowStart >= windowMs) {
        record.count = 0;
        record.windowStart = now;
      }

      if (record.count >= max) {
        const resetAt = record.windowStart + windowMs;
        const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
        
        LoggingService.warn(`[DistributedRateLimiter] Rate limit exceeded for ${rateKey}. Limit: ${max}, retryAfter: ${retryAfter}s`);
        
        return {
          allowed: false,
          limit: max,
          remaining: 0,
          resetAt,
          retryAfter,
          message: `Too many requests for ${category} operations. Please try again in ${retryAfter} seconds.`
        };
      }

      record.count += 1;
      const resetAt = record.windowStart + windowMs;
      const remaining = max - record.count;

      fs.writeFileSync(dataPath, JSON.stringify(record), 'utf-8');

      return {
        allowed: true,
        limit: max,
        remaining,
        resetAt,
        retryAfter: 0
      };
    } catch (err: any) {
      LoggingService.error(`[DistributedRateLimiter] Exception checking rate limit for ${rateKey}:`, err);

      // Fail-safe behavior according to specification (Section 19):
      // Expensive operations (AI, PDF) fail closed to protect resources.
      if (category === 'ai' || category === 'pdf') {
        return {
          allowed: false,
          limit: max,
          remaining: 0,
          resetAt: now + 30000,
          retryAfter: 30,
          message: 'Rate limit verification service temporarily unavailable for resource-intensive request.'
        };
      }

      // Fallback for general operations
      return {
        allowed: true,
        limit: max,
        remaining: 1,
        resetAt: now + windowMs,
        retryAfter: 0
      };
    } finally {
      releaseLock();
    }
  }

  static async checkActiveJobLimit(ownerId: string): Promise<{ allowed: boolean; max: number; activeJobs: number; retryAfter: number; message?: string }> {
    const maxActive = this.getMaxActiveJobsPerOwner();
    try {
      const jobs = await JobService.listJobsForOwner(ownerId);
      const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
      if (activeJobs.length >= maxActive) {
        return {
          allowed: false,
          max: maxActive,
          activeJobs: activeJobs.length,
          retryAfter: 15,
          message: `Maximum active jobs limit reached (${activeJobs.length}/${maxActive}). Please wait for current jobs to finish before submitting new ones.`
        };
      }

      return {
        allowed: true,
        max: maxActive,
        activeJobs: activeJobs.length,
        retryAfter: 0
      };
    } catch (err: any) {
      LoggingService.error(`[DistributedRateLimiter] Error checking active job limit for ${ownerId}:`, err);
      // Default allow if job query fails operational check, or treat as soft warning
      return { allowed: true, max: maxActive, activeJobs: 0, retryAfter: 0 };
    }
  }

  static sendRateLimitResponse(res: any, result: RateLimitResult) {
    if (res.setHeader) {
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());
      if (!result.allowed && result.retryAfter > 0) {
        res.setHeader('Retry-After', result.retryAfter.toString());
      }
    }

    return res.status(429).json({
      success: false,
      status: 'error',
      statusCode: 429,
      error: {
        code: 'RATE_LIMITED',
        message: result.message || 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter
      }
    });
  }
}
