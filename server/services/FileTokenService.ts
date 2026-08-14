import crypto from 'crypto';
import { LoggingService } from './LoggingService.js';

export function getTokenSecret(): string {
  const secret = process.env.APP_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET or SESSION_SECRET environment variable is required.');
  }
  return secret;
}

export interface FileTokenPayload {
  objectKey: string;
  ownerId: string;
  action: 'upload' | 'download';
  expiresAt: number;
}

export class FileTokenService {
  /**
   * Generate a signed token string for an object action
   */
  static generateToken(objectKey: string, ownerId: string, action: 'upload' | 'download', expiresInSeconds: number = 900): { token: string; expiresAt: number } {
    const expiresAt = Date.now() + (expiresInSeconds * 1000);
    const payloadStr = JSON.stringify({ objectKey, ownerId, action, expiresAt });
    const encodedPayload = Buffer.from(payloadStr, 'utf8').toString('base64url');
    
    const hmac = crypto.createHmac('sha256', getTokenSecret());
    hmac.update(encodedPayload);
    const signature = hmac.digest('base64url');

    const token = `${encodedPayload}.${signature}`;
    return { token, expiresAt };
  }

  /**
   * Verify and parse a signed token string
   */
  static verifyToken(token: string, expectedAction: 'upload' | 'download'): FileTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;

    try {
      const hmac = crypto.createHmac('sha256', getTokenSecret());
      hmac.update(encodedPayload);
      const expectedSignature = hmac.digest('base64url');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        LoggingService.warn('[FileTokenService] Invalid token signature');
        return null;
      }

      const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const payload: FileTokenPayload = JSON.parse(payloadJson);

      if (!payload || typeof payload !== 'object' || !payload.objectKey || !payload.ownerId || !payload.expiresAt) {
        LoggingService.warn('[FileTokenService] Invalid token payload structure');
        return null;
      }

      if (payload.action !== expectedAction) {
        LoggingService.warn(`[FileTokenService] Mismatched token action: expected ${expectedAction}, got ${payload.action}`);
        return null;
      }

      if (Date.now() > payload.expiresAt) {
        LoggingService.warn('[FileTokenService] Token has expired');
        return null;
      }

      return payload;
    } catch (err) {
      LoggingService.error('[FileTokenService] Error parsing token:', err);
      return null;
    }
  }
}
