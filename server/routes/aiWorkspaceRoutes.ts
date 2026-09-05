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
  toMessageDto,
  messageService as defaultMessageService,
} from '../services/messageService';
import {
  GeminiModelService,
  GeminiConfigError,
  GeminiUnavailableError,
  GeminiRateLimitError,
  GeminiInvalidRequestError,
  geminiModelService as defaultGeminiModelService,
} from '../services/geminiModelService';
import { LoggingService } from '../services/LoggingService';

// UID-keyed sliding-window rate limiter
const generationRateLimits = new Map<string, number[]>();

export function checkUidRateLimit(uid: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  let timestamps = generationRateLimits.get(uid);
  if (!timestamps) {
    timestamps = [];
    generationRateLimits.set(uid, timestamps);
  }
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    generationRateLimits.set(uid, recent);
    return false;
  }
  recent.push(now);
  generationRateLimits.set(uid, recent);
  return true;
}

export function resetRateLimits(): void {
  generationRateLimits.clear();
}

export function createAiWorkspaceRouter(
  wsService: WorkspaceService = defaultWorkspaceService,
  msgService: MessageService = defaultMessageService,
  geminiService: GeminiModelService = defaultGeminiModelService
): Router {
  const router = Router();

  /**
   * Centralized safe error handler for workspace routes.
   * Strictly prevents any leakage of Firebase internal messages, project IDs, UIDs, or stack traces.
   */
  const handleWorkspaceError = (err: any, req: Request, res: Response, _next: NextFunction) => {
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
      // Strict payload schema validation: rejects unknown/spoofed fields
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
      // Strict payload schema validation: rejects unknown/spoofed fields
      validateStrictBody(req.body, true);
      const { name, customInstructions } = req.body;
      const workspace = await wsService.updateWorkspace(userId, workspaceId, { name, customInstructions });
      res.json({ success: true, workspace });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 5. Delete workspace (recursively removes all subcollections like messages)
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
      // Confirm workspace existence & ownership
      await wsService.getWorkspace(userId, workspaceId);

      const messages = await msgService.listMessages(userId, workspaceId);
      res.json({ success: true, messages });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  // 7. Post message and execute multi-turn Gemini response
  router.post('/workspaces/:workspaceId/messages', async (req: Request, res: Response, next: NextFunction) => {
    let pendingUserMessageId: string | null = null;
    const userId = (req as any).authUser?.uid;
    const { workspaceId } = req.params;

    try {
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Authentication required.',
        });
      }

      // UID-keyed generation rate limit check (30 requests/minute)
      if (!checkUidRateLimit(userId, 30, 60000)) {
        throw new GeminiRateLimitError('Message rate limit exceeded. Please wait a minute and try again.');
      }

      // Strict payload validation: reject unknown fields
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw new MessageValidationError('Request body must be a JSON object.');
      }

      const allowedKeys = new Set(['text', 'requestId', 'document']);
      for (const k of Object.keys(req.body)) {
        if (!allowedKeys.has(k)) {
          throw new MessageValidationError(`Disallowed field in message body: '${k}'.`);
        }
      }

      const { text, requestId, document } = req.body;

      // Confirm workspace existence and ownership
      const workspace = await wsService.getWorkspace(userId, workspaceId);

      // Idempotency check: check if this requestId has already been seen
      const existing = await msgService.findByRequestId(userId, workspaceId, requestId);
      if (existing) {
        if (existing.status === 'pending') {
          return res.status(409).json({
            status: 'error',
            statusCode: 409,
            code: 'REQUEST_IN_PROGRESS',
            error: 'A request with this requestId is currently being processed.',
          });
        }
        if (existing.status === 'complete') {
          const modelMsg = await msgService.findModelMessageByRequestId(userId, workspaceId, requestId);
          return res.json({
            success: true,
            userMessage: toMessageDto(existing),
            modelMessage: modelMsg ? toMessageDto(modelMsg) : null,
          });
        }
        // If 'failed', allow retry
      }

      // Validate optional request-scoped PDF document
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

      // Step 1: Save user message with pending status
      const savedUserMsg = await msgService.createPendingUserMessage(userId, workspaceId, {
        text,
        requestId,
        attachment: attachmentMeta,
      });
      pendingUserMessageId = savedUserMsg.id;

      // Fetch existing conversation history for context (at most 20 prior turns)
      const existingMessages = await msgService.listMessages(userId, workspaceId);
      const history = existingMessages
        .filter((m) => m.id !== savedUserMsg.id && m.status === 'complete')
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      // Step 2: Generate response using Gemini model ladder
      let geminiResult;
      try {
        geminiResult = await geminiService.generateResponse({
          customInstructions: workspace.customInstructions,
          history,
          userPrompt: text,
          documentBase64: docBase64,
          documentMimeType: docMimeType,
        });
      } catch (genErr: any) {
        // Step 4: Generation failed; mark user message failed without clearing prompt text
        const safeCode =
          genErr instanceof GeminiRateLimitError
            ? 'AI_RATE_LIMITED'
            : genErr instanceof GeminiConfigError
            ? 'AI_CONFIGURATION_UNAVAILABLE'
            : genErr instanceof GeminiInvalidRequestError
            ? 'INVALID_MESSAGE'
            : 'AI_UNAVAILABLE';

        await msgService.failUserMessage(userId, workspaceId, pendingUserMessageId, safeCode);
        throw genErr;
      }

      // Step 3: Atomically complete exchange with model reply
      const exchange = await msgService.completeExchange(userId, workspaceId, savedUserMsg.id, {
        text: geminiResult.text,
        modelUsed: geminiResult.modelUsed,
        requestId,
      });

      return res.status(201).json({
        success: true,
        userMessage: exchange.userMessage,
        modelMessage: exchange.modelMessage,
      });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  return router;
}
