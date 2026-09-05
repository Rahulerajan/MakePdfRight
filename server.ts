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
import { TOOL_SEO_CONTENT_MAP } from "./src/constants/toolSeoData";
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from "./src/constants/publishing";

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
import { dispatchPdfAction } from "./server/dispatchers/pdfDispatcher.js";
import { dispatchAiAction } from "./server/dispatchers/aiDispatcher.js";
import { dispatchFileAction } from "./server/dispatchers/fileDispatcher.js";
import { getOwnerId } from "./server/apiUtils.js";
import { requireFirebaseAuth } from "./server/middleware/requireFirebaseAuth";
import { workspaceService } from "./server/services/workspaceService";
import { createAiWorkspaceRouter } from "./server/routes/aiWorkspaceRoutes";

// Load environment variables
dotenv.config();

const rawPort = process.env.PORT || '3000';
const PORT = Number.parseInt(rawPort, 10);
if (Number.isNaN(PORT) || PORT <= 0 || PORT > 65535) {
  throw new Error(`[Server] Invalid PORT configuration: "${rawPort}". PORT must be a valid integer between 1 and 65535.`);
}

// Validate Environment at Startup
export function validateEnvironment() {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!process.env.WORKER_SECRET) {
      LoggingService.warn("[Security Notice] WORKER_SECRET environment variable is not defined in production. Remote worker triggers will be rejected.");
    }
    if (!process.env.APP_SECRET && !process.env.SESSION_SECRET) {
      LoggingService.warn("[Security Notice] APP_SECRET / SESSION_SECRET is not defined in production. Using secure internal cryptographic key for session cookies.");
    }
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

import { DistributedRateLimiter } from "./server/services/DistributedRateLimiter";

// Distributed General Rate Limiting Middleware
async function standardLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ownerId = (req as any).ownerId || getOwnerId(req as any, res as any);
  const rateCheck = await DistributedRateLimiter.checkRateLimit(ownerId, 'general', 'general-api');
  if (!rateCheck.allowed) {
    return DistributedRateLimiter.sendRateLimitResponse(res, rateCheck);
  }
  next();
}

// Auth & Session Identification Middleware
declare global {
  namespace Express {
    interface Request {
      ownerId?: string;
    }
  }
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const accessKey = process.env.API_ACCESS_KEY;

  if (accessKey) {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    const providedKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : apiKeyHeader;
    if (!providedKey || providedKey !== accessKey) {
      return res.status(401).json({ status: "error", statusCode: 401, error: "Unauthorized access: Invalid or missing API key." });
    }
  }

  // Derive verified owner ID from signed session token/cookie, or issue new signed session cookie
  req.ownerId = getOwnerId(req, res);

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
        imgSrc: ["'self'", "data:", "blob:", "https:", "https://lh3.googleusercontent.com"],
        mediaSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          "https://generativelanguage.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://*.firebaseio.com",
          "https://*.googleapis.com",
          "wss:",
          "ws:"
        ],
        frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"],
        frameAncestors: ["'self'", "https://*.studio.google", "https://*.google.com", "https://*.google.dev", "https://*.run.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
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

  // Canonical Host & Trailing Slash Redirections (Technical SEO)
  app.use((req, res, next) => {
    // Only redirect GET and HEAD requests to avoid altering API POST bodies
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const host = (req.headers.host || '').toLowerCase();

    // Redirect non-www host (makepdfright.com) to www.makepdfright.com (301)
    if (host === 'makepdfright.com') {
      return res.redirect(301, `https://www.makepdfright.com${req.originalUrl}`);
    }

    // Trailing slash normalization (e.g. /compress/ -> /compress, except root '/')
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      const safePath = req.path.slice(0, -1);
      return res.redirect(301, safePath + query);
    }

    next();
  });

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

  // Session management endpoint
  app.all("/api/session", (req, res) => {
    const ownerId = getOwnerId(req, res);
    res.json({ success: true, sessionId: ownerId });
  });

  // Health check (Non-disclosing)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Protect complete workspace API namespace with Firebase Authentication and mount modular router
  app.use("/api/ai-workspace", requireFirebaseAuth, createAiWorkspaceRouter(workspaceService));

  // Protect processing and AI routes with Auth Middleware
  app.use("/api/files", authMiddleware);
  app.use("/api/pdf-tools", authMiddleware);
  app.use("/api/ai-tools", authMiddleware);
  app.use("/api/pdf/", authMiddleware);
  app.use("/api/chat-pdf", authMiddleware);
  app.use("/api/analyze-image", authMiddleware);
  app.use("/api/transcribe-audio", authMiddleware);
  app.use("/api/generate-speech", authMiddleware);
  app.use("/api/generate-image", authMiddleware);
  app.use("/api/complex-query", authMiddleware);
  app.use("/api/pdf-editor-ai", authMiddleware);
  app.use("/api/pdf-editor-ocr", authMiddleware);

  // --- Unified Dispatcher API Endpoints ---

  app.all(["/api/files", "/api/files/*"], async (req, res, next) => {
    try {
      await dispatchFileAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf-tools", async (req, res, next) => {
    try {
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/ai-tools", async (req, res, next) => {
    try {
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf/job/status/:jobId", async (req, res, next) => {
    try {
      req.query.action = 'job-status';
      req.query.jobId = req.params.jobId;
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf/job/cancel/:jobId", async (req, res, next) => {
    try {
      req.query.action = 'job-cancel';
      req.query.jobId = req.params.jobId;
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf/job/:action", async (req, res, next) => {
    try {
      req.query.action = `job-${req.params.action}`;
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf/:action", async (req, res, next) => {
    try {
      req.query.action = req.params.action;
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/chat-pdf", async (req, res, next) => {
    try {
      req.query.action = 'chat-pdf';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/analyze-image", async (req, res, next) => {
    try {
      req.query.action = 'analyze-image';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/transcribe-audio", async (req, res, next) => {
    try {
      req.query.action = 'transcribe-audio';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/generate-speech", async (req, res, next) => {
    try {
      req.query.action = 'generate-speech';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/generate-image", async (req, res, next) => {
    try {
      req.query.action = 'generate-image';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/complex-query", async (req, res, next) => {
    try {
      req.query.action = 'complex-query';
      await dispatchAiAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf-editor-ai", async (req, res, next) => {
    try {
      req.query.action = 'editor-ai';
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.all("/api/pdf-editor-ocr", async (req, res, next) => {
    try {
      req.query.action = 'editor-ocr';
      await dispatchPdfAction(req, res);
    } catch (err) {
      next(err);
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
      LoggingService.warn(`[Contact] RESEND_API_KEY environment variable is not set. Received message from: ${name.trim()} <${email.trim()}>: ${message.trim().substring(0, 120)}`);
      return res.status(200).json({ success: true, message: "Thank you for contacting MakePDFRight. Our team has received your inquiry." });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);

      const response = await resend.emails.send({
        from: "MakePDFRight Contact <onboarding@resend.dev>",
        to: ["support@makepdfright.com"],
        replyTo: email.trim(),
        subject: `New Contact Form Submission from ${name.trim()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h2 style="color: #e5322d; margin-top: 0; font-size: 20px;">New Message from MakePDFRight Contact Form</h2>
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
  app.post("/api/pdf-editor-ocr", async (req, res, next) => {
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

  // 301 Permanent Redirects for redundant duplicate routes to canonical URLs
  const REDIRECTS: Record<string, string> = {
    '/compress-pdf': '/compress',
    '/merge-pdf': '/merge',
    '/split-pdf': '/split',
    '/edit-pdf': '/edit',
    '/rotate-pdf': '/rotate',
    '/word-to-pdf': '/image-to-pdf',
    '/organize': '/organise',
    '/audio-transcribe': '/transcribe',
    '/image-generator': '/generate-image',
    '/pdf-editor': '/edit',
  };

  Object.entries(REDIRECTS).forEach(([oldPath, newPath]) => {
    app.get(oldPath, (req, res) => {
      res.redirect(301, newPath);
    });
  });

  // Dynamic sitemap route (Strict AdSense compliance: Only self-canonical, indexable, HTTP 200 URLs)
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = 'https://www.makepdfright.com';

    const urls = PRIMARY_INDEXABLE_ROUTES.map((route) => {
      const loc = `${baseUrl}${route === '/' ? '' : route}`;
      let priority = '0.8';
      let changefreq = 'weekly';

      if (route === '/') {
        priority = '1.0';
        changefreq = 'daily';
      } else if (['/privacy', '/terms', '/cookie-policy', '/disclaimer', '/contact', '/about'].includes(route)) {
        priority = '0.4';
        changefreq = 'monthly';
      } else if (route === '/resources') {
        priority = '0.9';
        changefreq = 'weekly';
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

    const policy = publishingPolicyFor(cleanPath);
    const routeSeo: RouteSEO = SEO_DATA[cleanPath] || SEO_DATA['/404'] || SEO_DATA['/'];
    
    // Calculate canonical origin based on strict publishing policy
    const appUrl = 'https://www.makepdfright.com';
    const canonicalPath = policy.canonicalPath;
    const canonicalUrl = canonicalPath === '/' ? appUrl : `${appUrl}${canonicalPath}`;
    
    const rawOgImage = routeSeo.ogImage || '/og-image.png';
    const ogImageUrl = rawOgImage.startsWith('http') 
      ? rawOgImage 
      : `${appUrl}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;

    const titleText = routeSeo.title;
    const descText = routeSeo.description;
    const authorText = routeSeo.author || 'MakePDFRight';
    const keywordsText = routeSeo.keywords || 'PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to Excel, edit PDF, AI image generator, audio transcribe, free PDF editor';
    const robotsText = routeSeo.robots || policy.robots || (!policy.indexable ? 'noindex, follow' : 'index, follow');
    const ogImageAltText = routeSeo.ogImageAlt || `${titleText.split('–')[0].split('|')[0].trim()} with MakePDFRight`;
    const twitterTitleText = routeSeo.twitterTitle || titleText;
    const twitterDescText = routeSeo.twitterDescription || descText;
    const rawTwitterImage = routeSeo.twitterImage || rawOgImage;
    const twitterImageUrl = rawTwitterImage.startsWith('http')
      ? rawTwitterImage
      : `${appUrl}${rawTwitterImage.startsWith('/') ? '' : '/'}${rawTwitterImage}`;
    const twitterImageAltText = routeSeo.twitterImageAlt || ogImageAltText;

    // Helper functions for meta tags
    const setMetaProperty = (property: string, content: string) => {
      const regex = new RegExp(`<meta\\s+property="${property}"\\s+content=".*?"\\s*\\/?>`, 'i');
      const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
      if (regex.test(html)) {
        html = html.replace(regex, tag);
      } else {
        html = html.replace('</head>', `  ${tag}\n</head>`);
      }
    };

    const setMetaName = (name: string, content: string) => {
      const regex = new RegExp(`<meta\\s+name="${name}"\\s+content=".*?"\\s*\\/?>`, 'i');
      const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
      if (regex.test(html)) {
        html = html.replace(regex, tag);
      } else {
        html = html.replace('</head>', `  ${tag}\n</head>`);
      }
    };

    // 1. Title
    if (/<title>.*?<\/title>/i.test(html)) {
      html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(titleText)}</title>`);
    } else {
      html = html.replace('</head>', `  <title>${escapeHtml(titleText)}</title>\n</head>`);
    }

    // 2. Meta description, author, keywords & robots
    setMetaName('description', descText);
    setMetaName('author', authorText);
    setMetaName('keywords', keywordsText);
    setMetaName('robots', robotsText);

    // 3. OpenGraph tags
    setMetaProperty('og:site_name', 'MakePDFRight');
    setMetaProperty('og:type', 'website');
    setMetaProperty('og:title', titleText);
    setMetaProperty('og:description', descText);
    setMetaProperty('og:url', canonicalUrl);
    setMetaProperty('og:image', ogImageUrl);
    setMetaProperty('og:image:alt', ogImageAltText);

    // 4. Twitter Card tags
    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', twitterTitleText);
    setMetaName('twitter:description', twitterDescText);
    setMetaName('twitter:image', twitterImageUrl);
    setMetaName('twitter:image:alt', twitterImageAltText);

    // 5. Canonical link (404 and unindexed /ai-workspace pages must NOT have a canonical tag)
    const shouldOmitCanonical = cleanPath === '/404' || cleanPath === '/ai-workspace' || !policy.canonicalPath;
    if (shouldOmitCanonical) {
      html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, '');
    } else {
      const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
      if (/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i.test(html)) {
        html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, canonicalTag);
      } else {
        html = html.replace('</head>', `  ${canonicalTag}\n</head>`);
      }
    }

    if (!policy.monetizable || cleanPath === '/404' || cleanPath === '/ai-workspace') {
      html = html.replace(/<script[^>]*adsbygoogle\.js[^>]*><\/script>/gi, '');
    }

    // 8. JSON-LD Schema using @graph format
    const graphNodes: any[] = [
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        "url": appUrl,
        "name": "MakePDFRight",
        "description": "Fast, private & free browser-first PDF and AI document processing tools."
      },
      {
        "@type": "Organization",
        "@id": `${appUrl}/#organization`,
        "name": "MakePDFRight",
        "url": appUrl,
        "logo": `${appUrl}/apple-touch-icon.png`
      }
    ];

    if (cleanPath === '/') {
      graphNodes.push({
        "@type": "WebPage",
        "@id": `${canonicalUrl}/#webpage`,
        "url": canonicalUrl,
        "name": titleText,
        "description": descText
      });
    } else if (cleanPath === '/about') {
      graphNodes.push({
        "@type": "AboutPage",
        "@id": `${canonicalUrl}/#webpage`,
        "url": canonicalUrl,
        "name": titleText,
        "description": descText
      });
    } else if (cleanPath === '/contact') {
      graphNodes.push({
        "@type": "ContactPage",
        "@id": `${canonicalUrl}/#webpage`,
        "url": canonicalUrl,
        "name": titleText,
        "description": descText
      });
    } else if (['/privacy', '/terms', '/cookie-policy', '/disclaimer'].includes(cleanPath)) {
      graphNodes.push({
        "@type": "WebPage",
        "@id": `${canonicalUrl}/#webpage`,
        "url": canonicalUrl,
        "name": titleText,
        "description": descText
      });
    } else {
      graphNodes.push({
        "@type": "SoftwareApplication",
        "@id": `${canonicalUrl}/#software`,
        "name": titleText,
        "description": descText,
        "url": canonicalUrl,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Any",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      });
    }

    if (cleanPath !== '/') {
      graphNodes.push({
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}/#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": appUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": titleText.split('–')[0].split('|')[0].trim(),
            "item": canonicalUrl
          }
        ]
      });
    }

    const toolData = TOOL_SEO_CONTENT_MAP[cleanPath];
    if (toolData && toolData.faqs && toolData.faqs.length > 0) {
      graphNodes.push({
        "@type": "FAQPage",
        "@id": `${canonicalUrl}/#faq`,
        "mainEntity": toolData.faqs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    const jsonLdObj = {
      "@context": "https://schema.org",
      "@graph": graphNodes
    };

    const jsonLdScript = `<script type="application/ld+json" id="seo-jsonld-schema">\n${JSON.stringify(jsonLdObj, null, 2)}\n</script>`;
    
    if (/<script\s+type="application\/ld\+json".*?>.*?<\/script>/is.test(html)) {
      html = html.replace(/<script\s+type="application\/ld\+json".*?>.*?<\/script>/is, jsonLdScript);
    } else {
      html = html.replace('</head>', `  ${jsonLdScript}\n</head>`);
    }

    return html;
  }

  // --- Frontend Server ---

  // Direct permanent HTTP 301 redirects for aliases (Dev & Production)
  const HTTP_301_REDIRECTS: Record<string, string> = {
    '/merge-pdf': '/merge',
    '/split-pdf': '/split',
    '/compress-pdf': '/compress',
    '/edit-pdf': '/edit',
    '/pdf-editor': '/edit',
    '/rotate-pdf': '/rotate',
    '/organize': '/organise',
    '/image-generator': '/generate-image',
    '/audio-transcribe': '/transcribe',
    '/word-to-pdf': '/pdf-to-word',
  };

  app.use((req, res, next) => {
    let cleanPath = req.path.split('?')[0];
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    if (HTTP_301_REDIRECTS[cleanPath]) {
      return res.redirect(301, HTTP_301_REDIRECTS[cleanPath]);
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server middleware
    LoggingService.info("[Server] Mounting Vite dev middleware with custom HTML SEO injection...");
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(isHmrDisabled ? { hmr: false } : {}),
      },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Explicit route for AI Workspace page (unindexed, nofollow, private)
    app.get("/ai-workspace", async (req, res, next) => {
      try {
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        const url = req.originalUrl;
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const template = await vite.transformIndexHtml(url, rawHtml);
        const seoHtml = injectSEOMetadata(template, "/ai-workspace", req);
        res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }
      try {
        let cleanPath = req.path.split('?')[0];
        if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
          cleanPath = cleanPath.slice(0, -1);
        }
        if (cleanPath === '/ai-workspace') {
          res.setHeader("X-Robots-Tag", "noindex, nofollow");
        }
        const isKnownRoute = Boolean(SEO_DATA[cleanPath]) || cleanPath === '/';
        const statusCode = isKnownRoute ? 200 : 404;

        const url = req.originalUrl;
        const rawHtml = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const template = await vite.transformIndexHtml(url, rawHtml);
        const seoHtml = injectSEOMetadata(template, req.path, req);
        res.status(statusCode).set({ "Content-Type": "text/html" }).end(seoHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serve production static assets without automatic directory trailing-slash redirects
    LoggingService.info("[Server] Running in production. Serving static files with HTML SEO injection...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false, redirect: false }));

    const notFoundHtmlPath = path.join(distPath, "404.html");
    const cached404Html = fs.existsSync(notFoundHtmlPath)
      ? fs.readFileSync(notFoundHtmlPath, "utf-8")
      : null;

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.includes(".")) {
        return next();
      }
      try {
        let cleanPath = req.path.split('?')[0];
        if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
          cleanPath = cleanPath.slice(0, -1);
        }
        if (cleanPath === '/ai-workspace') {
          res.setHeader("X-Robots-Tag", "noindex, nofollow");
        }
        const isKnownRoute = Boolean(SEO_DATA[cleanPath]) || cleanPath === '/';

        if (!isKnownRoute) {
          if (cached404Html) {
            return res.status(404).set({ "Content-Type": "text/html" }).end(cached404Html);
          }
          const baseIndex = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
          const seoHtml = injectSEOMetadata(baseIndex, "/404", req);
          return res.status(404).set({ "Content-Type": "text/html" }).end(seoHtml);
        }

        // Resolve known routes to their corresponding prerendered files:
        // / -> dist/index.html
        // /merge -> dist/merge/index.html
        // /ai-workspace -> dist/ai-workspace/index.html
        // other routes -> dist/<slug>/index.html or dist/<slug>.html
        let targetFilePath = '';
        if (cleanPath === '/') {
          targetFilePath = path.join(distPath, 'index.html');
        } else {
          const slug = cleanPath.replace(/^\//, '');
          const dirIndex = path.join(distPath, slug, 'index.html');
          const flatFile = path.join(distPath, `${slug}.html`);
          if (fs.existsSync(dirIndex)) {
            targetFilePath = dirIndex;
          } else if (fs.existsSync(flatFile)) {
            targetFilePath = flatFile;
          } else {
            targetFilePath = path.join(distPath, 'index.html');
          }
        }

        if (fs.existsSync(targetFilePath)) {
          const fileContent = fs.readFileSync(targetFilePath, 'utf-8');
          return res.status(200).set({ "Content-Type": "text/html" }).end(fileContent);
        }

        const fallbackHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        const seoHtml = injectSEOMetadata(fallbackHtml, cleanPath, req);
        return res.status(200).set({ "Content-Type": "text/html" }).end(seoHtml);
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
