import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';
import { JobService } from './JobService.js';
import { getFirebaseFirestore } from './firebaseAdmin.js';

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

function normalizeIdentifier(identifier: string): string {
  // Anonymous sessions contain `anon_<networkHash>_<uuid>`. Quota by the stable
  // network hash as well as the session so discarding cookies cannot mint a new quota.
  const match = /^anon_([a-f0-9]{16})_/i.exec(identifier);
  return match ? `anon_${match[1].toLowerCase()}` : identifier;
}

async function acquireKeyLock(lockKey: string): Promise<() => void> {
  let resolveLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => { resolveLock = resolve; });
  const prevLock = IN_MEMORY_LOCKS.get(lockKey) || Promise.resolve();
  IN_MEMORY_LOCKS.set(lockKey, prevLock.then(() => lockPromise));
  await prevLock;

  const lockDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'ratelimits');
  if (!fs.existsSync(lockDir)) fs.mkdirSync(lockDir, { recursive: true, mode: 0o700 });

  const sanitizedKey = lockKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const lockPath = path.join(lockDir, `${sanitizedKey}.lock`);
  let acquiredFd: number | null = null;

  for (let attempt = 0; attempt < 1000; attempt++) {
    try {
      acquiredFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(acquiredFd, Date.now().toString(), 'utf-8');
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stats = fs.statSync(lockPath);
          if (Date.now() - stats.mtimeMs > 3000) fs.unlinkSync(lockPath);
        } catch {}
        await new Promise((r) => setTimeout(r, 10));
      } else {
        break;
      }
    }
  }

  return () => {
    if (acquiredFd !== null) { try { fs.closeSync(acquiredFd); } catch {} }
    try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch {}
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
      case 'upload': return { windowMs: 60_000, max: isNaN(envUp) ? 15 : envUp };
      case 'pdf': return { windowMs: 60_000, max: isNaN(envPdf) ? 20 : envPdf };
      case 'ai': return { windowMs: 60_000, max: isNaN(envAi) ? 10 : envAi };
      default: return { windowMs: 60_000, max: isNaN(envGen) ? 60 : envGen };
    }
  }

  static getMaxActiveJobsPerOwner(): number {
    const envVal = parseInt(process.env.MAX_ACTIVE_JOBS_PER_OWNER || '5', 10);
    return isNaN(envVal) ? 5 : envVal;
  }

  private static buildResult(record: { count: number; windowStart: number }, config: RateLimitConfig, now: number): RateLimitResult {
    const resetAt = record.windowStart + config.windowMs;
    const allowed = record.count <= config.max;
    return {
      allowed,
      limit: config.max,
      remaining: Math.max(0, config.max - Math.min(record.count, config.max)),
      resetAt,
      retryAfter: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
      ...(allowed ? {} : { message: `Too many requests. Please try again in ${Math.max(1, Math.ceil((resetAt - now) / 1000))} seconds.` })
    };
  }

  private static async checkFirestore(rateKey: string, config: RateLimitConfig, now: number): Promise<RateLimitResult> {
    const db = getFirebaseFirestore();
    const docId = crypto.createHash('sha256').update(rateKey).digest('hex');
    const ref = db.collection('rateLimits').doc(docId);

    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;
      let windowStart = typeof data?.windowStart === 'number' ? data.windowStart : now;
      let count = typeof data?.count === 'number' ? data.count : 0;
      if (now - windowStart >= config.windowMs || now < windowStart) {
        windowStart = now;
        count = 0;
      }

      if (count >= config.max) {
        return this.buildResult({ count: config.max + 1, windowStart }, config, now);
      }

      count += 1;
      tx.set(ref, { count, windowStart, expiresAt: new Date(windowStart + config.windowMs), updatedAt: new Date() }, { merge: false });
      return this.buildResult({ count, windowStart }, config, now);
    });
  }

  private static async checkLocal(rateKey: string, config: RateLimitConfig, now: number): Promise<RateLimitResult> {
    const releaseLock = await acquireKeyLock(rateKey);
    try {
      const dataDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'ratelimits');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      const dataPath = path.join(dataDir, `${rateKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
      let record = { count: 0, windowStart: now };
      if (fs.existsSync(dataPath)) {
        try { record = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch {}
      }
      if (now - record.windowStart >= config.windowMs || now < record.windowStart) record = { count: 0, windowStart: now };
      if (record.count >= config.max) return this.buildResult({ count: config.max + 1, windowStart: record.windowStart }, config, now);
      record.count += 1;
      fs.writeFileSync(dataPath, JSON.stringify(record), { encoding: 'utf-8', mode: 0o600 });
      return this.buildResult(record, config, now);
    } finally {
      releaseLock();
    }
  }

  static async checkRateLimit(identifier: string, category: RateLimitCategory, action: string = 'default'): Promise<RateLimitResult> {
    const config = this.getCategoryLimits(category);
    const now = Date.now();
    const principal = normalizeIdentifier(identifier);
    const rateKey = `rate_${category}_${principal}_${action}`;

    try {
      // Firestore is the shared, atomic backing store for Cloud Run/Vercel production.
      // The filesystem implementation remains only for development/tests.
      return process.env.NODE_ENV === 'production'
        ? await this.checkFirestore(rateKey, config, now)
        : await this.checkLocal(rateKey, config, now);
    } catch (err: any) {
      LoggingService.error(`[DistributedRateLimiter] Exception checking rate limit for ${rateKey}:`, err);
      // Production failures fail closed for every API category so a database outage
      // cannot silently turn rate limiting off on a scaled deployment.
      if (process.env.NODE_ENV === 'production' || category === 'ai' || category === 'pdf' || category === 'upload') {
        return {
          allowed: false,
          limit: config.max,
          remaining: 0,
          resetAt: now + 30_000,
          retryAfter: 30,
          message: 'Rate limit verification service temporarily unavailable. Please retry shortly.'
        };
      }
      return { allowed: true, limit: config.max, remaining: 1, resetAt: now + config.windowMs, retryAfter: 0 };
    }
  }

  static async resetLocal(identifier?: string, category: RateLimitCategory = 'general', action: string = 'default'): Promise<void> {
    try {
      const dataDir = path.resolve(os.tmpdir(), 'make-pdf-right', 'ratelimits');
      if (!fs.existsSync(dataDir)) return;
      if (identifier) {
        const principal = normalizeIdentifier(identifier);
        const rateKey = `rate_${category}_${principal}_${action}`;
        const dataPath = path.join(dataDir, `${rateKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
        if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
      } else {
        const files = fs.readdirSync(dataDir);
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.lock')) {
            try { fs.unlinkSync(path.join(dataDir, file)); } catch {}
          }
        }
      }
    } catch {}
  }

  static async checkActiveJobLimit(ownerId: string): Promise<{ allowed: boolean; max: number; activeJobs: number; retryAfter: number; message?: string }> {
    const maxActive = this.getMaxActiveJobsPerOwner();
    try {
      const jobs = await JobService.listJobsForOwner(ownerId);
      const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing');
      if (activeJobs.length >= maxActive) {
        return { allowed: false, max: maxActive, activeJobs: activeJobs.length, retryAfter: 15, message: `Maximum active jobs limit reached (${activeJobs.length}/${maxActive}). Please wait for current jobs to finish before submitting new ones.` };
      }
      return { allowed: true, max: maxActive, activeJobs: activeJobs.length, retryAfter: 0 };
    } catch (err: any) {
      LoggingService.error(`[DistributedRateLimiter] Error checking active job limit for ${ownerId}:`, err);
      return { allowed: false, max: maxActive, activeJobs: maxActive, retryAfter: 30, message: 'Active job verification is temporarily unavailable.' };
    }
  }

  static sendRateLimitResponse(res: any, result: RateLimitResult) {
    if (res.setHeader) {
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());
      if (!result.allowed && result.retryAfter > 0) res.setHeader('Retry-After', result.retryAfter.toString());
    }
    return res.status(429).json({ success: false, status: 'error', statusCode: 429, error: { code: 'RATE_LIMITED', message: result.message || 'Too many requests. Please try again later.', retryAfter: result.retryAfter } });
  }
}
