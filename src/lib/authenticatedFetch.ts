/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFirebaseAuth } from './firebaseClient';

/**
 * Frontend authenticated fetch helper that:
 * 1. Obtains a fresh Firebase ID token and attaches `Authorization: Bearer <token>`
 * 2. On 401 response (token expired), forces a refresh token once and retries the request exactly once.
 * 3. Never creates infinite retry loops.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User is not authenticated. Please sign in to proceed.');
  }

  // 1. Get current token (without forced refresh first)
  let idToken = await currentUser.getIdToken(false);

  const buildHeaders = (token: string): Headers => {
    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    return headers;
  };

  const firstResponse = await fetch(input, {
    ...init,
    headers: buildHeaders(idToken),
  });

  // 2. If token expired or rejected with 401, force-refresh token once only
  if (firstResponse.status === 401) {
    try {
      const freshToken = await currentUser.getIdToken(true);
      if (freshToken && freshToken !== idToken) {
        // Retry once with fresh token
        return await fetch(input, {
          ...init,
          headers: buildHeaders(freshToken),
        });
      }
    } catch {
      // Return original 401 response if refresh fails
      return firstResponse;
    }
  }

  return firstResponse;
}
