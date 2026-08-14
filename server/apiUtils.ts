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
  if (isProd) {
    if (!process.env.WORKER_SECRET) {
      LoggingService.warn('[Security Notice] WORKER_SECRET environment variable is not set in production. Remote worker triggers will be rejected.');
    }
    if (!process.env.APP_SECRET && !process.env.SESSION_SECRET) {
      LoggingService.warn('[Security Notice] APP_SECRET / SESSION_SECRET is not set in production. Using secure internal cryptographic key for sessions.');
    }
  }
}

// Automatically invoke environment validation at module load in production (serverless entrypoints)
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.APP_SECRET;
  if (!secret) {
    if (!fallbackSessionSecret) {
      fallbackSessionSecret = crypto.randomBytes(32).toString('hex');
    }
    return fallbackSessionSecret;
  }
  return secret;
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
  // If already derived and attached to req in this request lifecycle, reuse it
  if (req.ownerId && typeof req.ownerId === 'string') {
    return req.ownerId;
  }

  let hasProvidedCookie = false;

  // 1. Check signed session cookie (sid or session_id)
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const cookies = cookieHeader.split(';').map((c: string) => c.trim());
    for (const c of cookies) {
      const [name, val] = c.split('=');
      if ((name === 'sid' || name === 'session_id') && val) {
        hasProvidedCookie = true;
        const verifiedId = verifySignedSessionToken(decodeURIComponent(val));
        if (verifiedId) {
          req.ownerId = verifiedId;
          return verifiedId;
        }
      }
    }
  }

  // 2. Check signed session header (x-session-token, x-owner-id, x-session-id)
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

  // 3. If no cookie was provided (fresh request) and response object is available, issue a new signed session cookie
  if (res && !hasProvidedCookie) {
    const newSessionId = crypto.randomUUID();
    const signedToken = signSessionId(newSessionId);
    setSessionCookie(res, signedToken);
    req.ownerId = newSessionId;
    return newSessionId;
  }

  // 4. Fallback to low-trust anonymous IP+UA hash (for tampered/forged cookies or when res is not provided)
  const clientIp = (req.headers?.['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers?.['user-agent'] as string) || 'unknown-client';
  const anonId = 'anon_' + crypto.createHash('sha256').update(`${clientIp}_${userAgent}`).digest('hex').substring(0, 16);
  req.ownerId = anonId;
  return anonId;
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
