/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, applicationDefault, type App, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { LoggingService } from './LoggingService';

let app: App | null = null;

export class FirebaseConfigError extends Error {
  readonly code: string = 'FIREBASE_ADMIN_UNCONFIGURED';

  constructor(message: string = 'FIREBASE_PROJECT_ID environment variable is required in production.') {
    super(message);
    this.name = 'FirebaseConfigError';
    Object.setPrototypeOf(this, FirebaseConfigError.prototype);
  }
}

/**
 * Resolves the Firebase Admin project ID strictly:
 * - In production, requires an explicit FIREBASE_PROJECT_ID, failing closed if absent.
 * - Does NOT silently select GCP_PROJECT or GCLOUD_PROJECT.
 * - In development/test only, falls back to the canonical project in firebase-applet-config.json or canonical online-flag-zfs6l.
 */
function resolveFirebaseAdminProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new FirebaseConfigError();
  }

  // Non-production fallback only
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.projectId) {
        return parsed.projectId;
      }
    }
  } catch {
    // ignore read error
  }

  return 'online-flag-zfs6l';
}

/**
 * Initializes Firebase Admin SDK using Application Default Credentials (ADC).
 * Never uses, requires, or creates a service-account JSON file.
 * Fails closed in production if FIREBASE_PROJECT_ID is missing.
 */
export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !process.env.FIREBASE_PROJECT_ID) {
    throw new FirebaseConfigError();
  }

  const projectId = resolveFirebaseAdminProjectId();
  const options: AppOptions = {
    projectId,
  };

  // Attempt Application Default Credentials (ADC is standard in GCP / Cloud Run)
  try {
    options.credential = applicationDefault();
  } catch (err: any) {
    LoggingService.info(`[Firebase Admin] ADC credential initialization note: ${err?.code || 'adc_unavailable'}`);
  }

  try {
    app = initializeApp(options);
    LoggingService.info(`[Firebase Admin] Initialized with projectId: ${projectId}`);
  } catch (err: any) {
    LoggingService.error(`[Firebase Admin] Initialization failed: ${err?.code || 'initialization_failed'}`);
    throw err;
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

