/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggingService } from './LoggingService';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export interface IDistributedRateLimiter {
  checkAndConsume(uid: string, cost?: number): Promise<RateLimitResult>;
  reset(uid?: string): Promise<void>;
}

/**
 * In-Memory Distributed Rate Limiter
 * Supports simulating multiple concurrent Cloud Run instances sharing a backing store.
 */
export class InMemoryDistributedRateLimiter implements IDistributedRateLimiter {
  private static sharedStore: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkAndConsume(uid: string, cost: number = 1): Promise<RateLimitResult> {
    const now = Date.now();
    const timestamps = InMemoryDistributedRateLimiter.sharedStore.get(uid) || [];
    
    // Clean expired timestamps
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length + cost > this.maxRequests) {
      const oldest = validTimestamps[0] || now;
      const resetInMs = Math.max(0, this.windowMs - (now - oldest));
      InMemoryDistributedRateLimiter.sharedStore.set(uid, validTimestamps);
      return {
        allowed: false,
        remaining: Math.max(0, this.maxRequests - validTimestamps.length),
        resetInMs,
      };
    }

    // Add current timestamps
    for (let i = 0; i < cost; i++) {
      validTimestamps.push(now);
    }
    // Bound stored timestamps to at most maxRequests
    InMemoryDistributedRateLimiter.sharedStore.set(uid, validTimestamps.slice(-this.maxRequests));

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetInMs: this.windowMs,
    };
  }

  async reset(uid?: string): Promise<void> {
    if (uid) {
      InMemoryDistributedRateLimiter.sharedStore.delete(uid);
    } else {
      InMemoryDistributedRateLimiter.sharedStore.clear();
    }
  }
}

/**
 * Firestore-backed Distributed Rate Limiter
 * Enforces atomic rate limiting across all Cloud Run container instances.
 */
export class FirestoreDistributedRateLimiter implements IDistributedRateLimiter {
  private db: any;
  private maxRequests: number;
  private windowMs: number;

  constructor(db: any, maxRequests: number = 30, windowMs: number = 60000) {
    this.db = db;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkAndConsume(uid: string, cost: number = 1): Promise<RateLimitResult> {
    const rateLimitDocRef = this.db
      .collection('users')
      .doc(uid)
      .collection('rateLimits')
      .doc('geminiGeneration');

    const now = Date.now();

    try {
      return await this.db.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(rateLimitDocRef);
        const data = snap.exists ? snap.data() : null;
        const rawTimestamps: number[] = Array.isArray(data?.timestamps) ? data.timestamps : [];

        // Filter expired
        const valid = rawTimestamps.filter((t) => typeof t === 'number' && now - t < this.windowMs);

        if (valid.length + cost > this.maxRequests) {
          const oldest = valid[0] || now;
          const resetInMs = Math.max(0, this.windowMs - (now - oldest));
          // Clean up expired entries in doc
          transaction.set(
            rateLimitDocRef,
            { timestamps: valid, updatedAt: new Date() },
            { merge: true }
          );
          return {
            allowed: false,
            remaining: Math.max(0, this.maxRequests - valid.length),
            resetInMs,
          };
        }

        for (let i = 0; i < cost; i++) {
          valid.push(now);
        }

        // Bound stored timestamps to at most maxRequests
        const bounded = valid.slice(-this.maxRequests);

        transaction.set(
          rateLimitDocRef,
          { timestamps: bounded, updatedAt: new Date() },
          { merge: true }
        );

        return {
          allowed: true,
          remaining: this.maxRequests - bounded.length,
          resetInMs: this.windowMs,
        };
      });
    } catch (err) {
      LoggingService.error('[FirestoreRateLimiter] Error in transaction:', err);
      throw err;
    }
  }

  async reset(uid?: string): Promise<void> {
    if (!uid) return;
    try {
      const rateLimitDocRef = this.db
        .collection('users')
        .doc(uid)
        .collection('rateLimits')
        .doc('geminiGeneration');
      await rateLimitDocRef.delete();
    } catch (err) {
      LoggingService.warn('[FirestoreRateLimiter] Failed to reset rate limit for uid:', uid, err);
    }
  }
}
