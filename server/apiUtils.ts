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

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin as string) || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Api-Key, X-Owner-Id, X-Session-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export function getOwnerId(req: VercelRequest): string {
  const ownerHeader = (req.headers['x-owner-id'] as string) || (req.headers['x-session-id'] as string);
  if (ownerHeader && typeof ownerHeader === 'string' && ownerHeader.trim().length > 0) {
    return ownerHeader.trim().substring(0, 100);
  }
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown-client';
  return 'anon_' + crypto.createHash('sha256').update(`${clientIp}_${userAgent}`).digest('hex').substring(0, 16);
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
