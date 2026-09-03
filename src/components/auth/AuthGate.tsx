/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading, error, signInWithGoogle, clearError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Verifying authentication status...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-custom py-12 sm:py-16 md:py-20 flex justify-center">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl text-center space-y-8 animate-fade-in-up">
          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Document Workspace
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Sign in with your Google account to access your personal AI document assistant, query PDF documents, and retain your research workspace.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-300 ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={signInWithGoogle}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>

            <Link
              to="/"
              className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* Privacy & Anonymous Assurance Notice */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>100% Free Core Tools:</strong> Merge, split, compress, convert, and edit remain completely free and anonymous without any login. Authentication is only required to manage your persistent AI Document Workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
