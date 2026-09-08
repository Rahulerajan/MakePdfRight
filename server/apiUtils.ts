import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { LoggingService } from './services/LoggingService.js';
import { AppError } from './services/ErrorHandler.js';

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError("GEMINI_API_KEY environment variable is missing on the server.", 500);
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

let fallbackSessionSecret: string | null = null;

export function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  if (!process.env.WORKER_SECRET) {
    LoggingService.warn('[Security Notice] WORKER_SECRET environment variable is not set in production. Remote worker triggers will be rejected.');
  }

  const sessionSecret = process.env.SESSION_SECRET || process.env.APP_SECRET;
  if (!sessionSecret) {
    throw new Error('[Security Configuration Error] SESSION_SECRET or APP_SECRET is required in production. Refusing to start with an instance-local session signing key.');
  }

  if (sessionSecret.length < 32) {
    LoggingService.warn('[Security Notice] SESSION_SECRET / APP_SECRET should contain at least 32 characters of high-entropy random data.');
  }
}

// Automatically invoke environment validation at module load in production (serverless and Cloud Run entrypoints).
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.APP_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Security Configuration Error] SESSION_SECRET or APP_SECRET is required in production.');
  }

  // Development/test-only convenience. Production is explicitly fail-closed above.
  if (!fallbackSessionSecret) {
    fallbackSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return fallbackSessionSecret;
}

export function signSessionId(sessionId: string): string {
  const secret = getSessionSecret();
  const hmac = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${hmac}`;
}

export function verifySignedSessionToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, signature] = parts;
  if (!sessionId || !signature) return null;

  try {
    const secret = getSessionSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return sessionId;
    }
  } catch {
    return null;
  }
  return null;
}

export function setSessionCookie(res: any, signedToken: string): void {
  if (!res || typeof res.setHeader !== 'function') return;
  const cookieValue = `sid=${encodeURIComponent(signedToken)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict; Secure`;

  const existing = (typeof res.getHeader === 'function' ? res.getHeader('Set-Cookie') : null) || res.headers?.['set-cookie'];
  if (existing) {
    if (Array.isArray(existing)) {
      res.setHeader('Set-Cookie', [...existing, cookieValue]);
    } else {
      res.setHeader('Set-Cookie', [existing, cookieValue]);
    }
  } else {
    res.setHeader('Set-Cookie', cookieValue);
  }
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return typeof value === 'string' ? value : '';
}

/**
 * Stable low-trust network fingerprint used only as an abuse-control bucket.
 * It is deliberately NOT used as the file/job owner identity, because multiple
 * users can share an IP address and user-agent behind NAT/proxies.
 */
export function getNetworkFingerprint(req: VercelRequest | any): string {
  const forwarded = firstHeaderValue(req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For']);
  const clientIp = (forwarded.split(',')[0] || '').trim() || req.socket?.remoteAddress || 'unknown-ip';
  const userAgent = firstHeaderValue(req.headers?.['user-agent'] || req.headers?.['User-Agent']).slice(0, 512) || 'unknown-client';
  return crypto.createHash('sha256').update(`${clientIp}\n${userAgent}`).digest('hex').substring(0, 16);
}

function createAnonymousSessionId(req: VercelRequest | any): string {
  // The network prefix lets rate limiting collapse cookie-rotation attempts into
  // one abuse bucket, while the UUID suffix keeps storage/job ownership unique.
  return `anon_${getNetworkFingerprint(req)}_${crypto.randomUUID()}`;
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const rawAllowed = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = rawAllowed
    ? rawAllowed.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const reqOrigin = (req.headers.origin as string) || (req.headers.Origin as string);

  let isAllowed = false;
  if (reqOrigin && allowedOrigins.length > 0) {
    if (allowedOrigins.includes(reqOrigin) || allowedOrigins.includes('*')) {
      isAllowed = true;
    }
  }

  if (isAllowed && reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Api-Key, X-Owner-Id, X-Session-Id, X-Session-Token, Cookie'
  );

  if (req.method === 'OPTIONS') {
    if (!isAllowed && reqOrigin) {
      res.status(403).end();
      return true;
    }
    res.status(200).end();
    return true;
  }
  return false;
}

export function getOwnerId(req: VercelRequest | any, res?: VercelResponse | any): string {
  // If already derived and attached to req in this request lifecycle, reuse it.
  if (req.ownerId && typeof req.ownerId === 'string') {
    return req.ownerId;
  }

  // 1. Check signed session cookie (sid or session_id).
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const cookies = cookieHeader.split(';').map((c: string) => c.trim());
    for (const c of cookies) {
      const separator = c.indexOf('=');
      const name = separator >= 0 ? c.slice(0, separator) : c;
      const val = separator >= 0 ? c.slice(separator + 1) : '';
      if ((name === 'sid' || name === 'session_id') && val) {
        try {
          const verifiedId = verifySignedSessionToken(decodeURIComponent(val));
          if (verifiedId) {
            req.ownerId = verifiedId;
            return verifiedId;
          }
        } catch {
          // Invalid percent encoding or invalid token: rotate to a fresh unique anonymous session below.
        }
      }
    }
  }

  // 2. Check signed session header (x-session-token, x-owner-id, x-session-id).
  const candidateHeaders = [
    req.headers?.['x-session-token'],
    req.headers?.['x-owner-id'],
    req.headers?.['x-session-id']
  ];
  for (const hdr of candidateHeaders) {
    if (hdr && typeof hdr === 'string') {
      const verifiedId = verifySignedSessionToken(hdr.trim());
      if (verifiedId) {
        req.ownerId = verifiedId;
        return verifiedId;
      }
    }
  }

  // 3. No valid signed identity: always create a UNIQUE owner identity. A stable
  // IP+UA-only identity must never own files because separate users can share it.
  const newSessionId = createAnonymousSessionId(req);
  req.ownerId = newSessionId;

  // Persist the unique owner identity whenever a response is available. This also
  // replaces tampered/expired session cookies instead of collapsing to a shared ID.
  if (res) {
    const signedToken = signSessionId(newSessionId);
    setSessionCookie(res, signedToken);
  }

  return newSessionId;
}

export function ensureSession(req: VercelRequest | any, res?: VercelResponse | any): string {
  return getOwnerId(req, res);
}

export function verifyAuth(req: VercelRequest, res: VercelResponse): boolean {
  const accessKey = process.env.API_ACCESS_KEY;

  if (accessKey) {
    const authHeader = req.headers['authorization'] as string | undefined;
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const providedKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : apiKeyHeader;
    if (!providedKey || providedKey !== accessKey) {
      res.status(401).json({ status: "error", statusCode: 401, error: "Unauthorized access: Invalid or missing API key." });
      return false;
    }
  }
  return true;
}

export function handleError(res: VercelResponse, err: any) {
  LoggingService.error('[API Handler Error]', err);
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : (err.message || "An unexpected internal server error occurred.");
  res.status(statusCode).json({
    status: "error",
    statusCode,
    error: message
  });
}
