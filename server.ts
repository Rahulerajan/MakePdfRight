import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Import SEO metadata
import { SEO_DATA, RouteSEO } from "./src/constants/seoData";

// Import custom PDF infrastructure services
import { LoggingService, requestLogger } from "./server/services/LoggingService";
import { errorHandler, AppError } from "./server/services/ErrorHandler";
import { StorageService } from "./server/services/StorageService";
import { ValidationService } from "./server/services/ValidationService";
import { UploadService } from "./server/services/UploadService";
import { DownloadService } from "./server/services/DownloadService";
import { JobService } from "./server/services/JobService";
import { MergeService } from "./server/services/MergeService";
import { SplitService } from "./server/services/SplitService";
import { RotateService } from "./server/services/RotateService";
import { OrganizeService } from "./server/services/OrganizeService";
import { OCRService } from "./server/services/OCRService";
import { WatermarkService } from "./server/services/WatermarkService";
import { RepairService } from "./server/services/RepairService";
import { ThumbnailService } from "./server/services/ThumbnailService";
import { CompressionService } from "./server/services/CompressionService";

// Load environment variables
dotenv.config();

const PORT = 3000;

// Validate Environment at Startup
function validateEnvironment() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const rawOrigins = process.env.ALLOWED_ORIGINS;
    const origins = rawOrigins 
      ? rawOrigins.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (origins.length === 0) {
      LoggingService.warn("[Security Warning] ALLOWED_ORIGINS environment variable is not defined or is empty in production. CORS is not configured; defaulting to allowing same-origin/no-origin requests only.");
    }
    if (!process.env.APP_URL) {
      LoggingService.warn("[Security Notice] APP_URL environment variable is not defined in production. Dynamic URLs will rely on Request Host.");
    }
  }
}

validateEnvironment();

// Configure Rate Limiters
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      statusCode: 429,
      error: "Too many requests. Please wait a minute before trying again."
    });
  }
});

// Processing operations limiter (20 requests per minute)
const processingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      statusCode: 429,
      error: "Rate limit exceeded for PDF processing. Please wait a minute before submitting more files."
    });
  }
});

// Stricter rate limit for Gemini-backed AI endpoints (10 requests per minute)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: "error",
      statusCode: 429,
      error: "Rate limit exceeded for AI endpoints (10 requests/minute). Please wait a minute before trying again."
    });
  }
});

// Auth & Session Identification Middleware
declare global {
  namespace Express {
    interface Request {
      ownerId?: string;
    }
  }
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Check authorization key if API_ACCESS_KEY is set
  const accessKey = process.env.API_ACCESS_KEY;
  if (accessKey) {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    const providedKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : apiKeyHeader;
    if (!providedKey || providedKey !== accessKey) {
      return res.status(401).json({ status: "error", statusCode: 401, error: "Unauthorized access: Invalid or missing API key." });
    }
  }

  // Derive owner ID for job isolation and request ownership
  const ownerHeader = req.headers['x-owner-id'] || req.headers['x-session-id'];
  if (ownerHeader && typeof ownerHeader === 'string' && ownerHeader.trim().length > 0) {
    req.ownerId = ownerHeader.trim().substring(0, 100);
  } else {
    // Fallback to IP + User-Agent identifier hash if no session token provided
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown-client';
    req.ownerId = 'anon_' + crypto.createHash('sha256').update(`${clientIp}_${userAgent}`).digest('hex').substring(0, 16);
  }

  next();
}

async function startServer() {
  const app = express();

  // Trust reverse proxy headers (Cloud Run / Nginx) for rate-limiting
  app.set("trust proxy", 1);

  // Restrictive Security Headers (Helmet CSP)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "wss:", "ws:"],
        frameAncestors: ["'self'", "https://*.studio.google", "https://*.google.com", "https://*.google.dev", "https://*.run.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));

  // Configure explicit CORS
  app.use((req, res, next) => {
    const isProd = process.env.NODE_ENV === "production";
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    cors({
      origin: (origin, callback) => {
        // Allow same-origin / non-browser requests without origin header
        if (!origin) {
          return callback(null, true);
        }

        // Whitelist configuration when ALLOWED_ORIGINS is set
        if (allowedOrigins.length > 0) {
          if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
          }
          return callback(new AppError('CORS policy restriction: Domain origin not allowed.', 403), false);
        }

        // Production fallback when ALLOWED_ORIGINS is unset: allow same-origin requests
        if (isProd) {
          const requestHost = req.headers.host;
          const appUrl = process.env.APP_URL;

          let isSameOrigin = false;
          try {
            const originUrl = new URL(origin);
            if (requestHost && originUrl.host === requestHost) {
              isSameOrigin = true;
            } else if (appUrl && originUrl.origin === new URL(appUrl).origin) {
              isSameOrigin = true;
            }
          } catch {
            isSameOrigin = false;
          }

          if (isSameOrigin) {
            return callback(null, true);
          }

          return callback(new AppError('CORS policy restriction: Cross-origin request blocked in production when ALLOWED_ORIGINS is unset.', 403), false);
        }

        // Development fallback: allow all origins
        return callback(null, true);
      },
      credentials: false
    })(req, res, next);
  });

  // Request logging & observability middleware
  app.use(requestLogger);

  // Handle larger payloads for base64 files up to 50MB
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Apply general rate limit on all API endpoints
  app.use("/api/", standardLimiter);

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    LoggingService.info("[Server] Gemini client initialized successfully.");
  } else {
    LoggingService.warn("[Server] GEMINI_API_KEY environment variable is not defined.");
  }

  // Helper to ensure Gemini is initialized lazily
  const getAI = () => {
    if (!ai) {
      const currentKey = process.env.GEMINI_API_KEY;
      if (!currentKey) {
        throw new AppError("GEMINI_API_KEY environment variable is missing on the server.", 500);
      }
      ai = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return ai;
  };

  // --- API Endpoints ---

  // Health check (Non-disclosing)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Protect processing and AI routes with Auth Middleware
  app.use("/api/pdf/", authMiddleware);
  app.use("/api/chat-pdf", authMiddleware);
  app.use("/api/analyze-image", authMiddleware);
  app.use("/api/transcribe-audio", authMiddleware);
  app.use("/api/generate-speech", authMiddleware);
  app.use("/api/complex-query", authMiddleware);
  app.use("/api/pdf-editor-ai", authMiddleware);
  app.use("/api/pdf-editor-ocr", authMiddleware);

  // 1. PDF Compression Endpoint
  app.post("/api/pdf/compress", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, level, customValue } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

      ValidationService.validateStrictBase64(pdfBase64);
      const compressionLevel = level || 'recommended';
      const customVal = customValue !== undefined ? Number(customValue) : 50;

      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'document.pdf');
      
      const result = await CompressionService.compressPDF(tempPath, compressionLevel, customVal);
      
      const base64 = result.pdfBuffer.toString('base64');
      res.json({
        success: true,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        spaceSaved: result.spaceSaved,
        percentage: result.percentage,
        processingTime: result.processingTime,
        pages: result.pages,
        imagesOptimized: result.imagesOptimized,
        fontsOptimized: result.fontsOptimized,
        metadataRemoved: result.metadataRemoved,
        optimizationSummary: result.optimizationSummary,
        pdfBase64: `data:application/pdf;base64,${base64}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 2. PDF Merge Endpoint
  app.post("/api/pdf/merge", processingLimiter, async (req, res, next) => {
    const tempPaths: string[] = [];
    try {
      const { files } = req.body; // Array of { name: string, data: string } (base64)
      ValidationService.validateMergeFilesPayload(files);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file || !file.data) {
          throw new AppError(`File item at index ${i} is missing base64 data.`, 400);
        }
        ValidationService.validateStrictBase64(file.data);
        const path = await UploadService.handleBase64Upload(file.data, file.name || `doc_${i}.pdf`);
        tempPaths.push(path);
      }

      const mergedBuffer = await MergeService.mergePDFs(tempPaths);
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${mergedBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      tempPaths.forEach(path => StorageService.deleteTempFile(path));
    }
  });

  // 3. PDF Split Endpoint
  app.post("/api/pdf/split", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, pageIndices } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

      ValidationService.validateStrictBase64(pdfBase64);
      ValidationService.validateSplitPayload(pageIndices);

      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'split.pdf');
      const splitBuffer = await SplitService.splitPDF(tempPath, pageIndices);
      
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${splitBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 4. PDF Rotate Endpoint
  app.post("/api/pdf/rotate", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, rotations } = req.body;
      if (!pdfBase64 || !rotations || !Array.isArray(rotations)) {
        return res.status(400).json({ error: "pdfBase64 and rotations array are required" });
      }

      if (rotations.length > 2000) {
        throw new AppError("Rotations array length exceeds 2000 items limit.", 400);
      }

      ValidationService.validateStrictBase64(pdfBase64);
      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'rotate.pdf');
      const rotatedBuffer = await RotateService.rotatePDF(tempPath, rotations);
      
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${rotatedBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 5. PDF Organize Endpoint
  app.post("/api/pdf/organize", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, pageItems } = req.body;
      if (!pdfBase64 || !pageItems || !Array.isArray(pageItems)) {
        return res.status(400).json({ error: "pdfBase64 and pageItems array are required" });
      }

      if (pageItems.length > 2000) {
        throw new AppError("Page items array length exceeds 2000 items limit.", 400);
      }

      ValidationService.validateStrictBase64(pdfBase64);
      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'organize.pdf');
      const organizedBuffer = await OrganizeService.organizePDF(tempPath, pageItems);
      
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${organizedBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 6. PDF OCR Endpoint (AI rate limited)
  app.post("/api/pdf/ocr", aiLimiter, async (req, res, next) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      ValidationService.validateImageUpload(imageBase64, 'image/png');
      const cleanBase64 = ValidationService.validateStrictBase64(imageBase64);
      
      const client = getAI();
      const blocks = await OCRService.performOCR(cleanBase64, client);
      res.json({ success: true, blocks });
    } catch (err: any) {
      next(err);
    }
  });

  // 7. PDF Watermark Endpoint
  app.post("/api/pdf/watermark", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, text, fontSize, opacity, color, rotation } = req.body;
      if (!pdfBase64 || !text) {
        return res.status(400).json({ error: "pdfBase64 and text are required" });
      }

      ValidationService.validateStrictBase64(pdfBase64);
      ValidationService.validateWatermarkText(text);

      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'watermark.pdf');
      const watermarkedBuffer = await WatermarkService.addWatermark(tempPath, {
        text,
        fontSize: fontSize ? Number(fontSize) : undefined,
        opacity: opacity !== undefined ? Number(opacity) : undefined,
        color,
        rotation: rotation !== undefined ? Number(rotation) : undefined
      });
      
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${watermarkedBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 8. PDF Repair Endpoint
  app.post("/api/pdf/repair", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

      ValidationService.validateStrictBase64(pdfBase64);
      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'repair.pdf');
      const repairedBuffer = await RepairService.repairPDF(tempPath);
      
      res.json({
        success: true,
        pdfBase64: `data:application/pdf;base64,${repairedBuffer.toString('base64')}`
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 9. PDF Details Endpoint
  app.post("/api/pdf/details", processingLimiter, async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

      ValidationService.validateStrictBase64(pdfBase64);
      tempPath = await UploadService.handleBase64Upload(pdfBase64, 'details.pdf');
      const details = await ThumbnailService.getDetails(tempPath);
      
      res.json({
        success: true,
        ...details
      });
    } catch (err: any) {
      next(err);
    } finally {
      if (tempPath) StorageService.deleteTempFile(tempPath);
    }
  });

  // 10. Async Background Processing Queue Endpoints
  app.post("/api/pdf/job/create", processingLimiter, async (req, res, next) => {
    try {
      const { type, payload } = req.body;
      if (!type || !payload) {
        return res.status(400).json({ error: "Job type and payload are required." });
      }

      const ownerId = req.ownerId || 'anonymous';
      const job = JobService.createJob(type, ownerId);
      
      // Process Job Asynchronously without blocking the response
      setTimeout(async () => {
        let tempPath: string | null = null;
        try {
          JobService.updateJob(job.id, ownerId, { status: 'processing', progress: 10 });
          
          if (type === 'compress') {
            const { pdfBase64, level, customValue } = payload;
            ValidationService.validateStrictBase64(pdfBase64);
            tempPath = await UploadService.handleBase64Upload(pdfBase64, 'compress_async.pdf');
            
            JobService.updateJob(job.id, ownerId, { progress: 30 });
            
            if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
            
            const result = await CompressionService.compressPDF(tempPath, level, customValue);
            
            if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
            
            JobService.updateJob(job.id, ownerId, { progress: 90 });
            
            const base64 = result.pdfBuffer.toString('base64');
            JobService.updateJob(job.id, ownerId, {
              status: 'completed',
              progress: 100,
              result: {
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                spaceSaved: result.spaceSaved,
                percentage: result.percentage,
                processingTime: result.processingTime,
                pages: result.pages,
                imagesOptimized: result.imagesOptimized,
                fontsOptimized: result.fontsOptimized,
                metadataRemoved: result.metadataRemoved,
                optimizationSummary: result.optimizationSummary,
                pdfBase64: `data:application/pdf;base64,${base64}`
              }
            });
          } else if (type === 'merge') {
            const { files } = payload;
            ValidationService.validateMergeFilesPayload(files);
            const tempPaths: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
              if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
              const file = files[i];
              ValidationService.validateStrictBase64(file.data);
              const path = await UploadService.handleBase64Upload(file.data, file.name);
              tempPaths.push(path);
            }
            
            JobService.updateJob(job.id, ownerId, { progress: 50 });
            const mergedBuffer = await MergeService.mergePDFs(tempPaths);
            
            tempPaths.forEach(p => StorageService.deleteTempFile(p));
            
            if (JobService.getJob(job.id, ownerId)?.cancelRequested) throw new Error('Job cancelled.');
            JobService.updateJob(job.id, ownerId, {
              status: 'completed',
              progress: 100,
              result: {
                pdfBase64: `data:application/pdf;base64,${mergedBuffer.toString('base64')}`
              }
            });
          } else {
            throw new Error(`Unsupported background processing job type: ${type}`);
          }
        } catch (jobErr: any) {
          LoggingService.error(`Async job ${job.id} failed:`, jobErr);
          JobService.updateJob(job.id, ownerId, {
            status: JobService.getJob(job.id, ownerId)?.cancelRequested ? 'cancelled' : 'failed',
            error: jobErr.message || 'An unexpected error occurred during job execution.'
          });
        } finally {
          if (tempPath) StorageService.deleteTempFile(tempPath);
        }
      }, 0);

      res.json({
        success: true,
        jobId: job.id,
        status: job.status
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/pdf/job/status/:jobId", (req, res) => {
    const ownerId = req.ownerId || 'anonymous';
    const job = JobService.getJob(req.params.jobId, ownerId);
    if (!job) {
      return res.status(404).json({ error: "Job not found or access denied." });
    }
    res.json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    });
  });

  app.post("/api/pdf/job/cancel/:jobId", (req, res) => {
    const ownerId = req.ownerId || 'anonymous';
    const success = JobService.cancelJob(req.params.jobId, ownerId);
    if (!success) {
      return res.status(400).json({ error: "Job could not be cancelled (either not found or already completed)." });
    }
    res.json({ success: true, message: "Cancellation request sent." });
  });

  // 11. Chat with PDF Endpoint (AI rate limited)
  app.post("/api/chat-pdf", aiLimiter, async (req, res, next) => {
    const { pdfBase64, message, enableThinking } = req.body;
    if (!pdfBase64 || !message) {
      return res.status(400).json({ error: "Both pdfBase64 and message are required." });
    }

    try {
      const cleanPdfBase64 = ValidationService.validateStrictBase64(pdfBase64);
      ValidationService.validateTextPrompt(message, 5000);

      const client = getAI();
      const isThinking = !!enableThinking;
      const model = isThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const config: any = {};
      if (isThinking) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      }

      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: cleanPdfBase64,
                },
              },
              {
                text: message,
              },
            ],
          },
        ],
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      next(error);
    }
  });

  // 12. Analyze Image Endpoint (AI rate limited)
  app.post("/api/analyze-image", aiLimiter, async (req, res, next) => {
    const { imageBase64, mimeType, prompt, enableThinking } = req.body;
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: "imageBase64, mimeType, and prompt are required." });
    }

    try {
      ValidationService.validateImageUpload(imageBase64, mimeType);
      const cleanImageBase64 = ValidationService.validateStrictBase64(imageBase64);
      ValidationService.validateTextPrompt(prompt, 5000);

      const client = getAI();
      const isThinking = !!enableThinking;
      const model = isThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const config: any = {};
      if (isThinking) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      }

      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanImageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      next(error);
    }
  });

  // 13. Transcribe Audio Endpoint (AI rate limited)
  app.post("/api/transcribe-audio", aiLimiter, async (req, res, next) => {
    const { audioBase64, mimeType, language } = req.body;
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "audioBase64 and mimeType are required." });
    }

    try {
      ValidationService.validateAudioUpload(audioBase64, mimeType);
      const cleanAudioBase64 = ValidationService.validateStrictBase64(audioBase64);

      const client = getAI();
      const languageText = language && language !== "auto"
        ? `The spoken language is ${language}.`
        : "Automatically detect the spoken language.";

      const promptText = `Please transcribe the provided audio accurately.
      - ${languageText}
      - Capture the spoken words verbatim.
      - Maintain proper punctuation, capitalization, sentence boundaries, and paragraphing where logical.
      - Ignore long silent periods or ambient background noise.
      - Handle different speaking speeds and pronunciations.
      - If the audio is silent or contains no clear speech, return empty text and a low confidence score (e.g. 0).`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanAudioBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The verbatim transcript of the audio with correct punctuation, capitalization, and paragraphing."
              },
              confidence: {
                type: Type.INTEGER,
                description: "The estimated confidence of the transcription, as an integer between 0 and 100."
              },
              detectedLanguage: {
                type: Type.STRING,
                description: "The name of the language detected (e.g., English, Hindi, French, German, Spanish)."
              }
            },
            required: ["text", "confidence"]
          }
        }
      });

      const jsonText = response.text || "{}";
      const result = JSON.parse(jsonText.trim());
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // 14. Generate Speech (Text-to-Speech) Endpoint (AI rate limited)
  app.post("/api/generate-speech", aiLimiter, async (req, res, next) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }

    try {
      ValidationService.validateTextPrompt(text, 1000);
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audioBase64 });
    } catch (error: any) {
      next(error);
    }
  });

  // 14b. Generate AI Image Endpoint (AI rate limited)
  app.post("/api/generate-image", aiLimiter, async (req, res, next) => {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required for image generation." });
    }

    try {
      ValidationService.validateTextPrompt(prompt, 2000);

      let width = 1024;
      let height = 1024;
      switch (aspectRatio) {
        case "16:9": width = 1024; height = 576; break;
        case "4:3": width = 1024; height = 768; break;
        case "3:4": width = 768; height = 1024; break;
        case "9:16": width = 576; height = 1024; break;
        default: width = 1024; height = 1024; break;
      }

      let imageBase64DataUrl: string | null = null;
      const validRatio = (aspectRatio === "16:9" || aspectRatio === "4:3" || aspectRatio === "3:4" || aspectRatio === "9:16") ? aspectRatio : "1:1";

      // 1. Strategy A: Gemini API via @google/genai SDK (gemini-3.1-flash-lite-image)
      if (process.env.GEMINI_API_KEY) {
        try {
          const client = getAI();
          const geminiResponse = await client.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: {
              parts: [{ text: prompt.trim() }]
            },
            config: {
              imageConfig: {
                aspectRatio: validRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
              }
            }
          });

          const parts = geminiResponse.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                imageBase64DataUrl = `data:${mime};base64,${part.inlineData.data}`;
                LoggingService.info("[Server] Image generated successfully using gemini-3.1-flash-lite-image.");
                break;
              }
            }
          }
        } catch (geminiError: any) {
          LoggingService.info("[Server] gemini-3.1-flash-lite-image quota or generation limit reached, switching to fast fallback generators.");
        }
      }

      // 2. Strategy B: Pollinations AI with browser User-Agent headers & fast 5s timeout
      if (!imageBase64DataUrl) {
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(prompt.trim());
        const pollinationsEndpoints = [
          `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=turbo`,
          `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`
        ];

        for (const url of pollinationsEndpoints) {
          if (imageBase64DataUrl) break;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
              }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              if (arrayBuffer.byteLength > 1000) {
                const buffer = Buffer.from(arrayBuffer);
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                imageBase64DataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
                LoggingService.info(`[Server] Image generated successfully via Pollinations AI.`);
              }
            }
          } catch (pollinationsErr: any) {
            // Fast timeout fallback
          }
        }
      }

      // 3. Strategy C: Stock photo placeholder fallback
      if (!imageBase64DataUrl) {
        try {
          const seed = Math.abs(prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) || 12345;
          const picsumUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(picsumUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength > 1000) {
              const buffer = Buffer.from(arrayBuffer);
              imageBase64DataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
              LoggingService.info("[Server] Stock photo retrieved successfully as fallback image.");
            }
          }
        } catch (picsumErr: any) {
          LoggingService.warn("[Server] Picsum fallback attempt failed:", picsumErr?.message || picsumErr);
        }
      }

      // 4. Strategy D: Vector SVG graphical image representation
      if (!imageBase64DataUrl) {
        const cleanPromptEscaped = prompt.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1E293B" />
              <stop offset="50%" stop-color="#0F172A" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#E5322D" />
              <stop offset="100%" stop-color="#FF6B6B" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" />
          <circle cx="${width / 2}" cy="${height / 2 - 40}" r="${Math.min(width, height) / 4}" fill="url(#accent)" opacity="0.15" />
          <path d="M${width / 2 - 40} ${height / 2 - 60} L${width / 2 + 40} ${height / 2 - 60} L${width / 2} ${height / 2 + 20} Z" fill="url(#accent)" opacity="0.8" />
          <text x="50%" y="${height / 2 + 70}" font-family="sans-serif" font-size="20" font-weight="600" fill="#F8FAFC" text-anchor="middle">
            AI Generated Image
          </text>
          <text x="50%" y="${height / 2 + 105}" font-family="sans-serif" font-size="14" fill="#94A3B8" text-anchor="middle">
            "${cleanPromptEscaped.slice(0, 60)}${cleanPromptEscaped.length > 60 ? '...' : ''}"
          </text>
        </svg>`;

        const base64Svg = Buffer.from(svg).toString('base64');
        imageBase64DataUrl = `data:image/svg+xml;base64,${base64Svg}`;
      }

      res.json({ imageBase64: imageBase64DataUrl });
    } catch (error: any) {
      next(error);
    }
  });

  // 15. Complex Query Endpoint (with high thinking mode, AI rate limited)
  app.post("/api/complex-query", aiLimiter, async (req, res, next) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required." });
    }

    try {
      ValidationService.validateTextPrompt(prompt, 5000);
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      next(error);
    }
  });

  // 16. PDF Editor AI Assistant (AI rate limited)
  app.post("/api/pdf-editor-ai", aiLimiter, async (req, res, next) => {
    const { promptType, selectedText, customPrompt, enableThinking } = req.body;
    if (!promptType) {
      return res.status(400).json({ error: "promptType is required." });
    }

    try {
      const client = getAI();
      let promptText = "";

      switch (promptType) {
        case "deep-think":
        case "reasoning":
          promptText = `Perform a deep, step-by-step logical reasoning analysis of the following document text or instruction: "${customPrompt || selectedText || ''}". Provide detailed, thorough explanations and key conclusions.`;
          break;
        case "rewrite":
          promptText = `Please rewrite the following text professionally, making it clear, engaging, and well-phrased while preserving the exact semantic meaning. Do not add conversational framing or explanations; return ONLY the rewritten text:\n\n"${selectedText || ""}"`;
          break;
        case "summarize":
          promptText = `Please summarize the following text concisely. Return ONLY the summarized text, with no introductory text:\n\n"${selectedText || ""}"`;
          break;
        case "translate":
          promptText = `Please translate the following text to Spanish/French (or detect and translate Spanish to English) beautifully. Return ONLY the translation, with no extra text:\n\n"${selectedText || ""}"`;
          break;
        case "grammar":
          promptText = `Please fix any spelling or grammar mistakes in the following text. Preserve the original phrasing where possible. Return ONLY the corrected text:\n\n"${selectedText || ""}"`;
          break;
        case "expand":
          promptText = `Please elaborate or expand on this topic professionally, keeping it aligned with the context of a document. Return ONLY the expanded text:\n\n"${selectedText || ""}"`;
          break;
        case "shorten":
          promptText = `Please make this text shorter and more concise. Return ONLY the shortened text:\n\n"${selectedText || ""}"`;
          break;
        case "custom":
          promptText = `Given this context text: "${selectedText || ""}", please perform this specific instruction: "${customPrompt}". Return ONLY the final resulting text with no extra conversational comments:`;
          break;
        default:
          promptText = `Please analyze or assist with this document text:\n\n"${selectedText || ""}"`;
      }

      ValidationService.validateTextPrompt(promptText, 10000);

      const isThinkingRequested = !!enableThinking || promptType === "deep-think" || promptType === "reasoning";
      const model = isThinkingRequested ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const config: any = {};
      if (isThinkingRequested) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH,
        };
      }

      const response = await client.models.generateContent({
        model,
        contents: promptText,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      next(error);
    }
  });

  // Contact Us Email Submission Endpoint via Resend
  app.post("/api/contact", async (req, res, next) => {
    const { name, email, message, honeypot } = req.body || {};

    if (honeypot) {
      return res.status(200).json({ success: true, message: "Message sent successfully" });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Valid email address is required." });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      LoggingService.warn("[Contact] RESEND_API_KEY environment variable is not set.");
      return res.status(500).json({ error: "Email service is not configured on the server." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);

      const response = await resend.emails.send({
        from: "MakePDFRight Contact <onboarding@resend.dev>",
        to: ["makepdfright@gmail.com"],
        replyTo: email.trim(),
        subject: `New Contact Form Submission from ${name.trim()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h2 style="color: #e5322d; margin-top: 0; font-size: 20px;">New Message from MakePDFRight</h2>
            <p style="margin: 8px 0;"><strong>Sender Name:</strong> ${name.trim()}</p>
            <p style="margin: 8px 0;"><strong>Sender Email:</strong> <a href="mailto:${email.trim()}">${email.trim()}</a></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-weight: bold; margin-bottom: 8px;">Message:</p>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; border: 1px solid #cbd5e1;">${message.trim()}</div>
          </div>
        `,
      });

      if (response.error) {
        LoggingService.error(`[Contact] Resend API error: ${response.error.message}`);
        return res.status(500).json({ error: response.error.message || "Failed to send email." });
      }

      res.json({ success: true, id: response.data?.id });
    } catch (error: any) {
      next(error);
    }
  });

  // 17. PDF Editor OCR Vision (Page Text Extraction to Overlays, AI rate limited)
  app.post("/api/pdf-editor-ocr", aiLimiter, async (req, res, next) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 page snapshot is required for OCR." });
    }

    try {
      ValidationService.validateImageUpload(imageBase64, 'image/png');
      const cleanImageBase64 = ValidationService.validateStrictBase64(imageBase64);

      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanImageBase64,
            },
          },
          {
            text: `Analyze this document page image. Please perform optical character recognition (OCR) to detect any blocks of text.
            For each key line or block of text, output a JSON array of objects.
            Each object MUST have the following schema:
            {
              "text": "The exact detected text",
              "x": x_coordinate_percentage (0 to 100 representing left offset ratio of the page),
              "y": y_coordinate_percentage (0 to 100 representing top offset ratio of the page),
              "fontSize": standard_font_size_in_px_estimated (between 10 and 24),
              "fontFamily": "Helvetica"
            }
            Return ONLY the valid raw JSON array of blocks. Do not add any markdown, backticks, or text outside the JSON block. Example output format:
            [{"text": "Sample Heading", "x": 10, "y": 15, "fontSize": 20, "fontFamily": "Helvetica"}]`
          }
        ]
      });

      let rawText = response.text || "[]";
      // Sanitize potential markdown JSON blocks
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let blocks = [];
      try {
        blocks = JSON.parse(rawText);
      } catch (parseError) {
        LoggingService.warn("[OCR Parse Warning] Direct JSON parse failed, trying to find array pattern.", rawText);
        const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          blocks = JSON.parse(match[0]);
        }
      }

      res.json({ blocks });
    } catch (error: any) {
      next(error);
    }
  });

  // Dynamic sitemap route
  app.get("/sitemap.xml", (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const defaultOrigin = `${protocol}://${host}`;
    const baseUrl = (process.env.APP_URL || defaultOrigin).replace(/\/$/, '');

    const urls = Object.keys(SEO_DATA).map((route) => {
      const loc = `${baseUrl}${route === '/' ? '' : route}`;
      let priority = '0.8';
      let changefreq = 'weekly';

      if (route === '/') {
        priority = '1.0';
        changefreq = 'daily';
      } else if (route === '/privacy' || route === '/terms') {
        priority = '0.3';
        changefreq = 'monthly';
      }

      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
    res.header('Content-Type', 'application/xml').send(sitemapXml);
  });

  // Register custom global error handler
  app.use(errorHandler);

  // Helper to safely escape HTML attributes
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Inject route-specific SEO metadata into raw index.html
  function injectSEOMetadata(html: string, routePath: string, req: express.Request): string {
    let cleanPath = routePath.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    const routeSeo: RouteSEO = SEO_DATA[cleanPath] || SEO_DATA['/'];
    
    // Calculate canonical origin
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const defaultOrigin = `${protocol}://${host}`;
    const appUrl = (process.env.APP_URL || defaultOrigin).replace(/\/$/, '');
    const canonicalUrl = `${appUrl}${cleanPath === '/' ? '' : cleanPath}`;

    const titleText = routeSeo.title;
    const descText = routeSeo.description;

    // 1. Title
    if (/<title>.*?<\/title>/i.test(html)) {
      html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(titleText)}</title>`);
    } else {
      html = html.replace('</head>', `  <title>${escapeHtml(titleText)}</title>\n</head>`);
    }

    // 2. Meta description
    if (/<meta\s+name="description"\s+content=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeHtml(descText)}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(descText)}" />\n</head>`);
    }

    // 3. OpenGraph Title
    if (/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(titleText)}" />`);
    } else {
      html = html.replace('</head>', `  <meta property="og:title" content="${escapeHtml(titleText)}" />\n</head>`);
    }

    // 4. OpenGraph Description
    if (/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(descText)}" />`);
    } else {
      html = html.replace('</head>', `  <meta property="og:description" content="${escapeHtml(descText)}" />\n</head>`);
    }

    // 5. Twitter Title
    if (/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(titleText)}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="twitter:title" content="${escapeHtml(titleText)}" />\n</head>`);
    }

    // 6. Twitter Description
    if (/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(descText)}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="twitter:description" content="${escapeHtml(descText)}" />\n</head>`);
    }

    // 7. Canonical link
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
    if (/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i.test(html)) {
      html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, canonicalTag);
    } else {
      html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
    }

    // 8. JSON-LD Schema
    let jsonLdObj: any;
    if (cleanPath === '/') {
      jsonLdObj = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "MakePDFRight",
        "url": canonicalUrl,
        "description": descText,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${appUrl}/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };
    } else if (cleanPath === '/privacy' || cleanPath === '/terms') {
      jsonLdObj = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": titleText,
        "description": descText,
        "url": canonicalUrl
      };
    } else {
      jsonLdObj = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": titleText,
        "description": descText,
        "url": canonicalUrl,
        "applicationCategory": "UtilityApplication",
        "operatingSystem": "Any",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      };
    }

    const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLdObj, null, 2)}\n</script>`;
    html = html.replace('</head>', `  ${jsonLdScript}\n</head>`);

    return html;
  }

  // --- Frontend Server ---

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware
    LoggingService.info("[Server] Mounting Vite dev middleware with custom HTML SEO injection...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const template = await vite.transformIndexHtml(url, rawHtml);
        const seoHtml = injectSEOMetadata(template, req.path, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve production static assets
    LoggingService.info("[Server] Running in production. Serving static files with HTML SEO injection...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));

    let cachedIndexHtml: string | null = null;

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }
      try {
        if (!cachedIndexHtml) {
          cachedIndexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
        }
        const seoHtml = injectSEOMetadata(cachedIndexHtml, req.path, req);
        res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
      } catch (e) {
        next(e);
      }
    });
  }

  // Start listening
  app.listen(PORT, "0.0.0.0", () => {
    LoggingService.info(`[Server] Express server running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  LoggingService.error("[Server] Bootstrapping failed:", error);
});
