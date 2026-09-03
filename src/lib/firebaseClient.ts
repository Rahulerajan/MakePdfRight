/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

// Production configuration prioritizes VITE_FIREBASE_* variables, falling back to firebase-applet-config.json
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || fallbackAppletConfig.apiKey || '',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || fallbackAppletConfig.authDomain || '',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || fallbackAppletConfig.projectId || '',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || fallbackAppletConfig.storageBucket || '',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || fallbackAppletConfig.messagingSenderId || '',
  appId: getEnv('VITE_FIREBASE_APP_ID') || fallbackAppletConfig.appId || '',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || fallbackAppletConfig.measurementId || undefined,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  firebaseSignOut,
  onAuthStateChanged,
};
export type { User, Auth };
