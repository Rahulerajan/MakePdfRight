/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, applicationDefault, type App, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { LoggingService } from './LoggingService';
import fallbackAppletConfig from '../../firebase-applet-config.json';

let app: App | null = null;

export class FirebaseConfigError extends Error {
  readonly code: string = 'FIREBASE_ADMIN_UNCONFIGURED';

  constructor(message: string = 'A Firebase or Google Cloud project ID is required.') {
    super(message);
    this.name = 'FirebaseConfigError';
    Object.setPrototypeOf(this, FirebaseConfigError.prototype);
  }
}

/**
 * Uses the explicit Firebase override first, then the standard project
 * variables supplied by Google Cloud Run, and finally the bundled web config.
 */
export function resolveFirebaseAdminProjectId(): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    fallbackAppletConfig.projectId;

  if (!projectId) throw new FirebaseConfigError();
  return projectId;
}

/**
 * Initializes Firebase Admin SDK using Application Default Credentials (ADC).
 * Never uses, requires, or creates a service-account JSON file.
 * Cloud Run supplies ADC and a standard Google Cloud project variable.
 */
export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
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
