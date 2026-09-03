/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getFirebaseAuth,
  googleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
} from '../lib/firebaseClient';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Clear any existing auth error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Listen for auth state changes & handle any redirect result
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const auth = getFirebaseAuth();

      // Check if arriving from a redirect flow
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            setUser(result.user);
            setError(null);
          }
        })
        .catch((err: any) => {
          // Ignore cancelled or duplicate redirect operations
          if (err.code !== 'auth/credential-already-in-use') {
            setError(formatAuthError(err));
          }
        });

      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
    } catch (err: any) {
      setError(formatAuthError(err));
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Google Sign-In with popup, falling back to redirect if popup is blocked or unsupported
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
        setUser(result.user);
        setError(null);
      } catch (popupErr: any) {
        // If popup was blocked, unsupported in iframe, or closed, fallback to redirect
        const shouldFallbackToRedirect = 
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/operation-not-supported-in-this-environment';

        if (shouldFallbackToRedirect) {
          await signInWithRedirect(auth, googleAuthProvider);
          return;
        }

        // If user actively closed the popup window, don't show an aggressive error
        if (popupErr.code === 'auth/popup-closed-by-user') {
          setLoading(false);
          return;
        }

        throw popupErr;
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      setError(formatAuthError(err));
    }
  }, []);

  // Get fresh Firebase ID token with optional force refresh
  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch (err: any) {
      setError(formatAuthError(err));
      return null;
    }
  }, [user]);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
    getIdToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function formatAuthError(err: any): string {
  if (!err) return 'An unexpected authentication error occurred.';
  switch (err.code) {
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups or use redirect sign-in.';
    case 'auth/unauthorized-domain':
      return 'This app domain is not yet authorized in the Firebase Console. Please add it to Authorized Domains.';
    case 'auth/network-request-failed':
      return 'Network error connecting to Firebase. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    default:
      return err.message || 'Authentication operation failed.';
  }
}
