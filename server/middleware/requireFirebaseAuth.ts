/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth, FirebaseConfigError } from '../services/firebaseAdmin';
import { LoggingService } from '../services/LoggingService';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

export type TokenVerifier = (idToken: string, checkRevoked?: boolean) => Promise<{
  uid?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}>;

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

/**
 * Creates an Express middleware requiring a valid Firebase ID Token in the Authorization header.
 * Allows passing an optional TokenVerifier for testing and dependency injection.
 */
export function createRequireFirebaseAuth(customVerifier?: TokenVerifier) {
  return async function requireFirebaseAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        error: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    const idToken = authHeader.slice(7).trim();

    if (!idToken) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        error: 'Authentication required. Bearer token is empty.',
      });
    }

    try {
      const decodedToken = customVerifier
        ? await customVerifier(idToken, true)
        : await getFirebaseAuth().verifyIdToken(idToken, true);

      const uid = decodedToken?.uid || decodedToken?.sub;

      if (!decodedToken || !uid || typeof uid !== 'string') {
        return res.status(401).json({
          status: 'error',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          error: 'Unauthorized: Missing or invalid token identity.',
        });
      }

      // Attach strictly derived identity from the cryptographically verified token
      // Never read untrusted user IDs from cookies, request headers, query parameters, or request bodies.
      req.authUser = {
        uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };

      next();
    } catch (err: any) {
      // Safe non-disclosing error logging server-side only
      LoggingService.warn(`[Firebase Auth] Token verification rejected: ${err?.code || 'verification_failed'}`);

      // If Firebase Admin itself is not configured or unavailable, return 503 rather than false 401
      const isConfigError =
        err instanceof FirebaseConfigError ||
        err?.code === 'FIREBASE_ADMIN_UNCONFIGURED' ||
        err?.code === 'app/no-app';

      if (isConfigError) {
        return res.status(503).json({
          status: 'error',
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
          error: 'Authentication service is temporarily unavailable.',
        });
      }

      // Return HTTP 401 with a safe, non-disclosing error response
      // Never return raw Firebase internal errors, stack traces, project IDs, or user IDs
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        error: 'Unauthorized: Invalid, expired, or revoked authentication token.',
      });
    }
  };
}

/**
 * Express middleware requiring a valid Firebase ID Token in the Authorization header.
 * Attaches the verified user UID and profile claims strictly from the cryptographically verified token.
 */
export const requireFirebaseAuth = createRequireFirebaseAuth();
