/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, applicationDefault, type App, type AppOptions } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { LoggingService } from './LoggingService';

let app: App | null = null;

/**
 * Initializes Firebase Admin SDK once using Application Default Credentials.
 * Accepts an optional FIREBASE_PROJECT_ID override.
 * Never uses or generates a service-account JSON file.
 */
export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  let fallbackProjectId: string | undefined;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      fallbackProjectId = parsed.projectId;
    }
  } catch {
    // ignore fallback read errors
  }

  const projectId = 
    process.env.FIREBASE_PROJECT_ID || 
    process.env.GCP_PROJECT || 
    process.env.GCLOUD_PROJECT || 
    fallbackProjectId;

  const options: AppOptions = {};
  if (projectId) {
    options.projectId = projectId;
  }

  // Attempt Application Default Credentials (standard in Cloud Run / Google Cloud environments)
  try {
    options.credential = applicationDefault();
  } catch {
    // In local dev without ADC, initialize with project options
    LoggingService.info('[Firebase Admin] ADC credentials not found, initializing with project config.');
  }

  try {
    app = initializeApp(options);
    LoggingService.info(`[Firebase Admin] App initialized successfully with projectId: ${projectId || 'default'}`);
  } catch (err: any) {
    LoggingService.error(`[Firebase Admin] Initialization failed: ${err.message}`);
    throw err;
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
