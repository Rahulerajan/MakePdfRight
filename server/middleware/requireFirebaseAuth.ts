/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../services/firebaseAdmin';
import { LoggingService } from '../services/LoggingService';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

export type TokenVerifier = (idToken: string) => Promise<{
  uid: string;
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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        error: 'Authentication required. Please provide a valid Bearer token.',
      });
    }

    const idToken = authHeader.slice(7).trim();

    if (!idToken) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        error: 'Authentication required. Bearer token is empty.',
      });
    }

    try {
      const decodedToken = customVerifier
        ? await customVerifier(idToken)
        : await getFirebaseAuth().verifyIdToken(idToken);

      if (!decodedToken || !decodedToken.uid) {
        return res.status(403).json({
          status: 'error',
          statusCode: 403,
          error: 'Forbidden: Invalid token identity.',
        });
      }

      // Attach strictly derived identity from the cryptographically verified token
      req.authUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };

      next();
    } catch (err: any) {
      LoggingService.warn(`[Firebase Auth] Token verification rejected: ${err.code || err.message}`);
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        error: 'Unauthorized: Invalid, expired, or revoked authentication token.',
      });
    }
  };
}

/**
 * Express middleware requiring a valid Firebase ID Token in the Authorization header.
 * Attaches the verified user UID and profile claims strictly from the cryptographically verified token.
 * Rejects forged, missing, malformed, or expired tokens with non-disclosing 401/403 status.
 * Never accepts a UID from request JSON body, query parameters, X-Owner-Id, the anonymous sid cookie, or other client-controlled inputs.
 */
export const requireFirebaseAuth = createRequireFirebaseAuth();
