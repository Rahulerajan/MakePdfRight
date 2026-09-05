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
} from '../services/workspaceService';
import { LoggingService } from '../services/LoggingService';

export function createAiWorkspaceRouter(workspaceService: WorkspaceService): Router {
  const router = Router();

  /**
   * Centralized safe error handler for workspace routes.
   * Strictly prevents any leakage of Firebase internal messages, project IDs, UIDs, or stack traces.
   */
  const handleWorkspaceError = (err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof WorkspaceValidationError) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
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

    LoggingService.error(`[Workspace API Error] ${req.method} request failed`);
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
      const workspaces = await workspaceService.listWorkspaces(userId);
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
      const workspace = await workspaceService.createWorkspace(userId, { name, customInstructions });
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
      const workspace = await workspaceService.getWorkspace(userId, workspaceId);
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
      const workspace = await workspaceService.updateWorkspace(userId, workspaceId, { name, customInstructions });
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
      await workspaceService.deleteWorkspace(userId, workspaceId);
      res.json({ success: true, deleted: true });
    } catch (err) {
      handleWorkspaceError(err, req, res, next);
    }
  });

  return router;
}
