/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getFirebaseAuth,
  googleAuthProvider,
  signInWithPopup,
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

  // Listen for auth state changes
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      const auth = getFirebaseAuth();
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

  // Google Sign-In with popup only
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      setError(null);
    } catch (popupErr: any) {
      if (popupErr?.code === 'auth/popup-closed-by-user') {
        // User closed the popup before completing sign-in
        setLoading(false);
        return;
      }
      setError(formatAuthError(popupErr));
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
  if (!err) return 'auth/generic-error';
  const code = err.code || '';
  switch (code) {
    case 'auth/popup-blocked':
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/network-request-failed':
    case 'auth/unauthorized-domain':
    case 'auth/user-disabled':
      return code;
    default:
      return 'auth/generic-error';
  }
}
