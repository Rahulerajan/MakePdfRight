/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compatibility exports for older imports. Firebase configuration and
 * initialization live only in lib/firebaseClient.ts.
 */
import {
  getFirebaseAnalytics,
  getFirebaseApp,
  getFirebaseAuth,
  googleAuthProvider,
  type Analytics,
} from './lib/firebaseClient';

export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export { googleAuthProvider, getFirebaseAnalytics as getAnalytics };

export let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  getFirebaseAnalytics()
    .then((instance) => {
      analytics = instance;
    })
    .catch((err) => {
      console.warn('[Firebase Analytics] Not supported:', err);
    });
}

export default app;
