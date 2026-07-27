import express from "express";
import path from "path";
import fs from "fs";
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

// Configure rate limiters
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

// Stricter rate limit for Gemini-backed AI endpoints (10 requests per minute)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 requests per minute
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

async function startServer() {
  const app = express();

  // Security headers middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // Configure explicit CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : undefined;

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins && allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy restriction: Domain not allowed.'), false);
      }
      return callback(null, true);
    },
    credentials: true
  }));

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
    LoggingService.info("[Server] Gemini client initialized successfully with API key.");
  } else {
    LoggingService.warn("[Server] WARNING: GEMINI_API_KEY environment variable is not defined.");
  }

  // Helper to ensure Gemini is initialized
  const getAI = () => {
    if (!ai) {
      const currentKey = process.env.GEMINI_API_KEY;
      if (!currentKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server. Please check your secrets/environment.");
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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", apiKeyConfigured: !!process.env.GEMINI_API_KEY });
  });

  // 1. PDF Compression Endpoint
  app.post("/api/pdf/compress", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, level, customValue } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }
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
  app.post("/api/pdf/merge", async (req, res, next) => {
    const tempPaths: string[] = [];
    try {
      const { files } = req.body; // Array of { name: string, data: string } (base64)
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "files array is required" });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
  app.post("/api/pdf/split", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, pageIndices } = req.body;
      if (!pdfBase64 || !pageIndices || !Array.isArray(pageIndices)) {
        return res.status(400).json({ error: "pdfBase64 and pageIndices are required" });
      }

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
  app.post("/api/pdf/rotate", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, rotations } = req.body;
      if (!pdfBase64 || !rotations || !Array.isArray(rotations)) {
        return res.status(400).json({ error: "pdfBase64 and rotations array are required" });
      }

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
  app.post("/api/pdf/organize", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, pageItems } = req.body;
      if (!pdfBase64 || !pageItems || !Array.isArray(pageItems)) {
        return res.status(400).json({ error: "pdfBase64 and pageItems array are required" });
      }

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
      
      const client = getAI();
      const blocks = await OCRService.performOCR(imageBase64, client);
      res.json({ success: true, blocks });
    } catch (err: any) {
      next(err);
    }
  });

  // 7. PDF Watermark Endpoint
  app.post("/api/pdf/watermark", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64, text, fontSize, opacity, color, rotation } = req.body;
      if (!pdfBase64 || !text) {
        return res.status(400).json({ error: "pdfBase64 and text are required" });
      }

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
  app.post("/api/pdf/repair", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

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
  app.post("/api/pdf/details", async (req, res, next) => {
    let tempPath: string | null = null;
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "pdfBase64 is required" });
      }

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
  app.post("/api/pdf/job/create", async (req, res, next) => {
    try {
      const { type, payload } = req.body;
      if (!type || !payload) {
        return res.status(400).json({ error: "Job type and payload are required." });
      }

      const job = JobService.createJob(type);
      
      // Process Job Asynchronously without blocking the response
      setTimeout(async () => {
        let tempPath: string | null = null;
        try {
          JobService.updateJob(job.id, { status: 'processing', progress: 10 });
          
          if (type === 'compress') {
            const { pdfBase64, level, customValue } = payload;
            tempPath = await UploadService.handleBase64Upload(pdfBase64, 'compress_async.pdf');
            
            JobService.updateJob(job.id, { progress: 30 });
            
            if (JobService.getJob(job.id)?.cancelRequested) throw new Error('Job cancelled.');
            
            const result = await CompressionService.compressPDF(tempPath, level, customValue);
            
            if (JobService.getJob(job.id)?.cancelRequested) throw new Error('Job cancelled.');
            
            JobService.updateJob(job.id, { progress: 90 });
            
            const base64 = result.pdfBuffer.toString('base64');
            JobService.updateJob(job.id, {
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
            const tempPaths: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
              if (JobService.getJob(job.id)?.cancelRequested) throw new Error('Job cancelled.');
              const file = files[i];
              const path = await UploadService.handleBase64Upload(file.data, file.name);
              tempPaths.push(path);
            }
            
            JobService.updateJob(job.id, { progress: 50 });
            const mergedBuffer = await MergeService.mergePDFs(tempPaths);
            
            tempPaths.forEach(p => StorageService.deleteTempFile(p));
            
            if (JobService.getJob(job.id)?.cancelRequested) throw new Error('Job cancelled.');
            JobService.updateJob(job.id, {
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
          JobService.updateJob(job.id, {
            status: JobService.getJob(job.id)?.cancelRequested ? 'cancelled' : 'failed',
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
    const job = JobService.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found." });
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
    const success = JobService.cancelJob(req.params.jobId);
    if (!success) {
      return res.status(400).json({ error: "Job could not be cancelled (either not found or already completed)." });
    }
    res.json({ success: true, message: "Cancellation request sent." });
  });

  // 2. Chat with PDF Endpoint (AI rate limited)
  app.post("/api/chat-pdf", aiLimiter, async (req, res, next) => {
    const { pdfBase64, message } = req.body;
    if (!pdfBase64 || !message) {
      return res.status(400).json({ error: "Both pdfBase64 and message are required." });
    }

    try {
      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: message,
              },
            ],
          },
        ],
      });

      res.json({ text: response.text });
    } catch (error: any) {
      next(error);
    }
  });

  // 3. Analyze Image Endpoint (AI rate limited)
  app.post("/api/analyze-image", aiLimiter, async (req, res, next) => {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64 || !mimeType || !prompt) {
      return res.status(400).json({ error: "imageBase64, mimeType, and prompt are required." });
    }

    try {
      ValidationService.validateImageUpload(imageBase64, mimeType);

      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      res.json({ text: response.text });
    } catch (error: any) {
      next(error);
    }
  });

  // 4. Transcribe Audio Endpoint (AI rate limited)
  app.post("/api/transcribe-audio", aiLimiter, async (req, res, next) => {
    const { audioBase64, mimeType, language } = req.body;
    if (!audioBase64 || !mimeType) {
      return res.status(400).json({ error: "audioBase64 and mimeType are required." });
    }

    try {
      ValidationService.validateAudioUpload(audioBase64, mimeType);

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
                  data: audioBase64,
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

  // 5. Generate Speech (Text-to-Speech) Endpoint (AI rate limited)
  app.post("/api/generate-speech", aiLimiter, async (req, res, next) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required." });
    }

    try {
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

  // 6. Complex Query Endpoint (with thinking mode, AI rate limited)
  app.post("/api/complex-query", aiLimiter, async (req, res, next) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required." });
    }

    try {
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

  // 7. PDF Editor AI Assistant (AI rate limited)
  app.post("/api/pdf-editor-ai", aiLimiter, async (req, res, next) => {
    const { promptType, selectedText, customPrompt } = req.body;
    if (!promptType) {
      return res.status(400).json({ error: "promptType is required." });
    }

    try {
      const client = getAI();
      let promptText = "";

      switch (promptType) {
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

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      next(error);
    }
  });

  // 8. PDF Editor OCR Vision (Page Text Extraction to Overlays, AI rate limited)
  app.post("/api/pdf-editor-ocr", aiLimiter, async (req, res, next) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 page snapshot is required for OCR." });
    }

    try {
      ValidationService.validateImageUpload(imageBase64, 'image/png');

      const client = getAI();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
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
