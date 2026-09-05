/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  WorkspaceService,
  WorkspaceValidationError,
  WorkspaceNotFoundError,
  WorkspacePersistenceError,
  validateStrictBody,
  workspaceService as defaultWorkspaceService,
} from '../services/workspaceService';
import {
  MessageService,
  MessageValidationError,
  MessageConflictError,
  validateAndParsePdfDocument,
  buildGeminiContext,
  toMessageDto,
  InMemoryMessageStore,
  messageService as defaultMessageService,
} from '../services/messageService';
import {
  GeminiModelService,
  GeminiConfigError,
  GeminiUnavailableError,
  GeminiRateLimitError,
  GeminiInvalidRequestError,
  GeminiAbortError,
  geminiModelService as defaultGeminiModelService,
} from '../services/geminiModelService';
import {
  IDistributedRateLimiter,
  InMemoryDistributedRateLimiter,
  FirestoreDistributedRateLimiter,
} from '../services/workspaceRateLimiter.js';
import { getFirebaseFirestore } from '../services/firebaseAdmin';
import { LoggingService } from '../services/LoggingService';

// Distributed Rate Limiter singleton instance
let defaultRateLimiter: IDistributedRateLimiter;
if (process.env.WORKSPACE_STORE === 'memory' || process.env.NODE_ENV === 'test') {
  defaultRateLimiter = new InMemoryDistributedRateLimiter(30, 60000);
} else {
  try {
    const db = getFirebaseFirestore();
    defaultRateLimiter = new FirestoreDistributedRateLimiter(db, 30, 60000);
  } catch {
    defaultRateLimiter = new InMemoryDistributedRateLimiter(30, 60000);
  }
}

export function getDefaultRateLimiter(): IDistributedRateLimiter {
  return defaultRateLimiter;
}

export function setDefaultRateLimiter(limiter: IDistributedRateLimiter): void {
  defaultRateLimiter = limiter;
}

// Backward-compatible synchronous in-memory rate check helpers for unit test suites
const localRateLimits = new Map<string, number[]>();

export function checkUidRateLimit(uid: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const timestamps = (localRateLimits.get(uid) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    return false;
  }
  timestamps.push(now);
  localRateLimits.set(uid, timestamps);
  return true;
}

export function resetRateLimits(): void {
  localRateLimits.clear();
}

export function createAiWorkspaceRouter(
  wsService: WorkspaceService = defaultWorkspaceService,
  msgService: MessageService = defaultMessageService,
  geminiService: GeminiModelService = defaultGeminiModelService,
  rateLimiter?: IDistributedRateLimiter
): Router {
  const router = Router();
  const activeRateLimiter =
    rateLimiter ||
    (msgService.getStore() instanceof InMemoryMessageStore || process.env.NODE_ENV === 'test'
      ? new InMemoryDistributedRateLimiter(30, 60000)
      : defaultRateLimiter);

  /**
   * Centralized safe error handler for workspace routes.
   * Strictly prevents any leakage of Firebase internal messages, project IDs, UIDs, or stack traces.
   */
  const handleWorkspaceError = (err: any, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent || res.writableEnded) {
      return;
    }

    if (err instanceof WorkspaceValidationError || err instanceof MessageValidationError || err instanceof GeminiInvalidRequestError) {
      return res.status(err.statusCode || 400).json({
        status: 'error',
        statusCode: err.statusCode || 400,
        code: err.code || 'INVALID_MESSAGE',
        error: err.message,
      });
    }
    if (err instanceof MessageConflictError) {
      return res.status(409).json({
        status: 'error',
        statusCode: 409,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof GeminiRateLimitError) {
      return res.status(429).json({
        status: 'error',
        statusCode: 429,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof GeminiConfigError) {
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof GeminiUnavailableError) {
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof GeminiAbortError) {
      return res.status(499).json({
        status: 'error',
        statusCode: 499,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof WorkspaceNotFoundError) {
      return res.status(404).json({
        status: 'error',
        statusCode: 404,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof WorkspacePersistenceError) {
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'Workspace storage is temporarily unavailable.',
      });
    }

    // Check for common Firestore failure signatures and map to safe 503
    const errMsg = String(err?.message || '').toLowerCase();
    const errCode = String(err?.code || '').toLowerCase();
    if (
      errCode.includes('unavailable') ||
      errCode.includes('deadline-exceeded') ||
      errCode.includes('permission-denied') ||
      errCode.includes('failed-precondition') ||
      errMsg.includes('firestore') ||
      errMsg.includes('timeout') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('econnrefused') ||
      errMsg.includes('credential')
    ) {
      LoggingService.error('[Workspace API Error] Firestore unavailable or connection failed');
      return res.status(503).json({
        status: 'error',
        statusCode: 503,
        code: 'PERSISTENCE_UNAVAILABLE',
        error: 'Workspace storage is temporarily unavailable.',
      });
    }

    LoggingService.error(`[Workspace API Error] ${req.method} request failed: ${errMsg}`);
    return res.status(500).json({
      status: 'error',
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'An unexpected error occurred while processing the workspace request.',
    });
  };

  // Authenticated AI Workspace token validation endpoint
  router.get('/auth-check', (_req: Request, res: Response) => {
    res.json({
      success: true,
      authenticated: true,
    });
  });

  // 1. List user's workspaces (max 50, ordered by updatedAt desc)
  router.get('/workspaces', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      const workspaces = await wsService.listWorkspaces(userId);
      res.json({ success: true, workspaces });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 2. Create new workspace
  router.post('/workspaces', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      validateStrictBody(req.body, false);
      const { name, customInstructions } = req.body;
      const workspace = await wsService.createWorkspace(userId, { name, customInstructions });
      res.status(201).json({ success: true, workspace });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 3. Get single workspace
  router.get('/workspaces/:workspaceId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      const { workspaceId } = req.params;
      const workspace = await wsService.getWorkspace(userId, workspaceId);
      res.json({ success: true, workspace });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 4. Update workspace (name / custom instructions)
  router.patch('/workspaces/:workspaceId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      const { workspaceId } = req.params;
      validateStrictBody(req.body, true);
      const { name, customInstructions } = req.body;
      const workspace = await wsService.updateWorkspace(userId, workspaceId, { name, customInstructions });
      res.json({ success: true, workspace });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 5. Delete workspace
  router.delete('/workspaces/:workspaceId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      const { workspaceId } = req.params;
      await wsService.deleteWorkspace(userId, workspaceId);
      res.json({ success: true, deleted: true });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 6. List chronological messages for workspace (max 50)
  router.get('/workspaces/:workspaceId/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).authUser?.uid;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }
      const { workspaceId } = req.params;
      await wsService.getWorkspace(userId, workspaceId);

      const messages = await msgService.listMessages(userId, workspaceId);
      res.json({ success: true, messages });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 7. Post message and execute multi-turn Gemini response with atomic idempotency
  router.post('/workspaces/:workspaceId/messages', async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).authUser?.uid;
    const { workspaceId } = req.params;
    let claimedMessageId: string | null = null;
    let validRequestId: string | null = null;

    // Set up client disconnect cancellation detection
    const abortController = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    };
    res.on('close', onClose);

    try {
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }

      // Strict payload validation: reject unknown fields
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw new MessageValidationError('Request body must be a JSON object.', 'INVALID_MESSAGE');
      }

      const allowedKeys = new Set(['text', 'requestId', 'document']);
      for (const k of Object.keys(req.body)) {
        if (!allowedKeys.has(k)) {
          throw new MessageValidationError(`Disallowed field in message body: '${k}'.`, 'INVALID_MESSAGE');
        }
      }

      const { text, requestId, document } = req.body;
      validRequestId = msgService.validateRequestId(requestId);

      // Confirm workspace existence and ownership
      const workspace = await wsService.getWorkspace(userId, workspaceId);

      // Validate optional request-scoped PDF document attachment
      let attachmentMeta = null;
      let docBase64: string | undefined = undefined;
      let docMimeType: string | undefined = undefined;

      if (document !== undefined && document !== null) {
        const validatedDoc = validateAndParsePdfDocument(document);
        attachmentMeta = {
          fileName: validatedDoc.fileName,
          fileSize: validatedDoc.fileSize,
          mimeType: validatedDoc.mimeType,
          sha256: validatedDoc.sha256,
        };
        docBase64 = validatedDoc.base64Data;
        docMimeType = validatedDoc.mimeType;
      }

      // P0 — ATOMIC FIRESTORE IDEMPOTENCY CLAIM
      const claim = await msgService.claimRequest(userId, workspaceId, {
        text,
        requestId: validRequestId,
        attachment: attachmentMeta,
      });

      if (claim.type === 'in_progress') {
        return res.status(409).json({
          status: 'error',
          statusCode: 409,
          code: 'REQUEST_IN_PROGRESS',
          error: 'A request with this requestId is currently in progress.',
        });
      }

      if (claim.type === 'complete') {
        return res.status(200).json({
          success: true,
          userMessage: toMessageDto(claim.userMessage),
          modelMessage: toMessageDto(claim.modelMessage),
        });
      }

      // Claim was granted (either 'claimed' or 'retry_claimed')
      claimedMessageId = claim.userMessage.id;

      // P0 — DISTRIBUTED RATE LIMITING
      // Only newly claimed or retry-claimed generations consume rate limit quota
      const rateLimitResult = await activeRateLimiter.checkAndConsume(userId);
      if (!rateLimitResult.allowed) {
        await msgService.failRequest(
          userId,
          workspaceId,
          validRequestId,
          claimedMessageId,
          'AI_RATE_LIMITED'
        );
        throw new GeminiRateLimitError('Message rate limit exceeded. Please wait a minute and try again.');
      }

      // Build context history using the context builder
      const allMessages = await msgService.listRawMessages(userId, workspaceId);
      const priorMessages = allMessages.filter((m) => m.id !== claimedMessageId);
      const { contents } = buildGeminiContext(priorMessages);
      const historyTurns = contents.map((c) => ({
        role: c.role,
        text: c.parts.map((p) => p.text).join(''),
      }));

      // Generate response using Gemini model ladder
      let geminiResult;
      try {
        geminiResult = await geminiService.generateResponse({
          customInstructions: workspace.customInstructions,
          history: historyTurns,
          userPrompt: text,
          documentBase64: docBase64,
          documentMimeType: docMimeType,
          abortSignal: abortController.signal,
        });
      } catch (genErr: any) {
        if (genErr instanceof GeminiAbortError || abortController.signal.aborted) {
          await msgService.failRequest(
            userId,
            workspaceId,
            validRequestId,
            claimedMessageId,
            'REQUEST_ABORTED'
          );
          if (!res.writableEnded) {
            return res.status(499).json({
              status: 'error',
              statusCode: 499,
              code: 'REQUEST_ABORTED',
              error: 'Client closed request.',
            });
          }
          return;
        }

        const safeCode =
          genErr instanceof GeminiRateLimitError
            ? 'AI_RATE_LIMITED'
            : genErr instanceof GeminiConfigError
            ? 'AI_CONFIGURATION_UNAVAILABLE'
            : genErr instanceof GeminiInvalidRequestError
            ? 'INVALID_MESSAGE'
            : 'AI_UNAVAILABLE';

        await msgService.failRequest(
          userId,
          workspaceId,
          validRequestId,
          claimedMessageId,
          safeCode
        );
        throw genErr;
      }

      // Atomically complete exchange with model reply and commit both messages
      const exchange = await msgService.completeExchange(userId, workspaceId, claimedMessageId, {
        text: geminiResult.text,
        modelUsed: geminiResult.modelUsed,
        requestId: validRequestId,
      });

      return res.status(201).json({
        success: true,
        userMessage: exchange.userMessage,
        modelMessage: exchange.modelMessage,
      });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    } finally {
      res.removeListener('close', onClose);
    }
  });

  return router;
}
