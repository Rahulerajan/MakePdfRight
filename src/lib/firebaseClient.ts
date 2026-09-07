/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import fallbackAppletConfig from '../../firebase-applet-config.json';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface GoogleIdentityServices {
  accounts?: {
    oauth2?: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback(response: GoogleTokenResponse): void;
        error_callback?(error: { type?: string }): void;
      }): GoogleTokenClient;
    };
  };
}

function getEnv(key: string): string {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process?.env?.[key]) {
      return process.env[key] || '';
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Resolves Firebase client configuration atomically.
 * - If no VITE_FIREBASE_* variables are supplied, uses the complete JSON fallback.
 * - If any VITE_FIREBASE_* variable is supplied, requires all mandatory values from environment variables only.
 * - Never combines fields from environment variables with fields from fallback JSON.
 * - Produces a clear error message without exposing credential values.
 */
export function resolveFirebaseClientConfig(): FirebaseOptions {
  const envApiKey = getEnv('VITE_FIREBASE_API_KEY');
  const envAuthDomain = getEnv('VITE_FIREBASE_AUTH_DOMAIN');
  const envProjectId = getEnv('VITE_FIREBASE_PROJECT_ID');
  const envAppId = getEnv('VITE_FIREBASE_APP_ID');
  const envStorageBucket = getEnv('VITE_FIREBASE_STORAGE_BUCKET');
  const envMessagingSenderId = getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const envMeasurementId = getEnv('VITE_FIREBASE_MEASUREMENT_ID');

  const hasAnyEnvConfig = Boolean(
    envApiKey || envAuthDomain || envProjectId || envAppId ||
    envStorageBucket || envMessagingSenderId || envMeasurementId
  );

  if (hasAnyEnvConfig) {
    const missing: string[] = [];
    if (!envApiKey) missing.push('VITE_FIREBASE_API_KEY');
    if (!envAuthDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
    if (!envProjectId) missing.push('VITE_FIREBASE_PROJECT_ID');
    if (!envAppId) missing.push('VITE_FIREBASE_APP_ID');

    if (missing.length > 0) {
      throw new Error(
        `[Firebase Client Configuration Error] Environment configuration is incomplete. ` +
        `When supplying VITE_FIREBASE_* variables, all mandatory fields must be provided. Missing: ${missing.join(', ')}`
      );
    }

    return {
      apiKey: envApiKey,
      authDomain: envAuthDomain,
      projectId: envProjectId,
      appId: envAppId,
      storageBucket: envStorageBucket || undefined,
      messagingSenderId: envMessagingSenderId || undefined,
      measurementId: envMeasurementId || undefined,
    };
  }

  // Fallback to complete existing applet configuration (never mixed with partial env vars)
  if (!fallbackAppletConfig?.apiKey || !fallbackAppletConfig?.authDomain || !fallbackAppletConfig?.projectId || !fallbackAppletConfig?.appId) {
    throw new Error('[Firebase Client Configuration Error] Fallback firebase-applet-config.json is missing required fields.');
  }

  return {
    apiKey: fallbackAppletConfig.apiKey,
    authDomain: fallbackAppletConfig.authDomain,
    projectId: fallbackAppletConfig.projectId,
    appId: fallbackAppletConfig.appId,
    storageBucket: fallbackAppletConfig.storageBucket || undefined,
    messagingSenderId: fallbackAppletConfig.messagingSenderId || undefined,
    measurementId: fallbackAppletConfig.measurementId || undefined,
  };
}

export function resolveGoogleOAuthClientId(): string {
  return getEnv('VITE_GOOGLE_CLIENT_ID') || fallbackAppletConfig.oAuthClientId || '';
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
    } else {
      const config = resolveFirebaseClientConfig();
      app = initializeApp(config);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

/**
 * Uses Google Identity Services to obtain an OAuth token and exchanges it for
 * a Firebase credential. This avoids depending on Firebase's cross-origin
 * popup helper when the app is hosted outside Firebase Hosting.
 *
 * The OAuth client must list the deployed app origin in Google Cloud Console.
 * If GIS has not loaded, the standard Firebase popup remains available as a
 * compatibility fallback.
 */
export async function signInWithGoogleCredential(): Promise<User> {
  const auth = getFirebaseAuth();
  const clientId = resolveGoogleOAuthClientId();
  const googleIdentity = typeof window !== 'undefined'
    ? (window as Window & { google?: GoogleIdentityServices }).google
    : undefined;
  const oauth2 = googleIdentity?.accounts?.oauth2;

  if (!clientId || !oauth2) {
    const result = await signInWithPopup(auth, googleAuthProvider);
    return result.user;
  }

  const accessToken = await new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback(response) {
        if (response.error || !response.access_token) {
          reject(createAuthError('auth/generic-error'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback(error) {
        const code = error?.type === 'popup_failed_to_open'
          ? 'auth/popup-blocked'
          : error?.type === 'popup_closed'
            ? 'auth/popup-closed-by-user'
            : 'auth/generic-error';
        reject(createAuthError(code));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });

  const credential = GoogleAuthProvider.credential(null, accessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

function createAuthError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export {
  GoogleAuthProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
};
export type { User, Auth };
