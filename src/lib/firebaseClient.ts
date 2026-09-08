/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken as getAppCheckToken,
  type AppCheck,
} from 'firebase/app-check';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  setPersistence,
  browserLocalPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import fallbackAppletConfig from '../../firebase-applet-config.json';

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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let authPersistencePromise: Promise<void> | null = null;
let appCheck: AppCheck | null = null;

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

async function ensureAuthPersistence(): Promise<void> {
  if (!authPersistencePromise) {
    authPersistencePromise = setPersistence(getFirebaseAuth(), browserLocalPersistence);
  }
  await authPersistencePromise;
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

let analyticsInstance: Analytics | null = null;

/**
 * Enables App Check only when a site key is configured. This lets deployments
 * collect metrics before enforcement without breaking local development.
 */
export function initializeFirebaseAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  const siteKey = getEnv('VITE_FIREBASE_APPCHECK_SITE_KEY').trim();
  if (!siteKey) return null;

  if (!appCheck) {
    appCheck = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheck;
}

export async function getFirebaseAppCheckToken(forceRefresh = false): Promise<string | null> {
  const instance = initializeFirebaseAppCheck();
  if (!instance) return null;
  const result = await getAppCheckToken(instance, forceRefresh);
  return result.token;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (!analyticsInstance) {
    try {
      const supported = await isSupported();
      if (supported) {
        analyticsInstance = getAnalytics(getFirebaseApp());
      }
    } catch (err) {
      console.warn('[Firebase Analytics] Initialization failed:', err);
    }
  }
  return analyticsInstance;
}

// Automatically initialize analytics when in browser
if (typeof window !== 'undefined') {
  initializeFirebaseAppCheck();
  getFirebaseAnalytics().catch(() => {});
}

/**
 * Signs in with Google credentials:
 * - If a GIS credential (JWT ID token) is provided, uses signInWithCredential.
 * - Otherwise, initiates standard Google Sign-In popup with Firebase Auth.
 */
export async function signInWithGoogleCredential(credentialOrIdToken?: string): Promise<User | null> {
  const authInstance = getFirebaseAuth();
  await ensureAuthPersistence();

  if (credentialOrIdToken) {
    const credential = GoogleAuthProvider.credential(credentialOrIdToken);
    const result = await signInWithCredential(authInstance, credential);
    return result.user;
  }

  try {
    const result = await signInWithPopup(authInstance, googleAuthProvider);
    return result.user;
  } catch (err: any) {
    const shouldUseRedirect =
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-this-environment';

    if (!shouldUseRedirect) throw err;

    await signInWithRedirect(authInstance, googleAuthProvider);
    return null;
  }
}

/** Completes a Google redirect flow after the browser returns to the app. */
export async function completeGoogleRedirectSignIn(): Promise<User | null> {
  await ensureAuthPersistence();
  const result = await getRedirectResult(getFirebaseAuth());
  return result?.user ?? null;
}

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  firebaseSignOut,
  onAuthStateChanged,
  getAnalytics,
};
export type { User, Auth, Analytics };
