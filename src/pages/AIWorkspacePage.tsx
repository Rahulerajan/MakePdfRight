/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { Sparkles, CheckCircle2, AlertCircle, Shield, User as UserIcon, RefreshCw, LogOut } from 'lucide-react';

export const AIWorkspacePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [serverCheckStatus, setServerCheckStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
  const [serverCheckResult, setServerCheckResult] = useState<string | null>(null);

  const verifyBackendToken = async () => {
    setServerCheckStatus('checking');
    setServerCheckResult(null);

    try {
      const response = await authenticatedFetch('/api/ai-workspace/auth-check');
      const data = await response.json();

      if (response.ok && data.success) {
        setServerCheckStatus('verified');
        setServerCheckResult(`Backend verified UID: ${data.user?.uid}`);
      } else {
        setServerCheckStatus('failed');
        setServerCheckResult(data.error || 'Server rejected token validation.');
      }
    } catch (err: any) {
      setServerCheckStatus('failed');
      setServerCheckResult(err.message || 'Failed to reach authentication endpoint.');
    }
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  return (
    <div className="container-custom py-8 sm:py-12 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AuthGate Verified
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              AI Document Workspace
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Interactive document analysis powered by Google Gemini AI
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Authenticated Identity & Token Validation Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Authenticated Session Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User Avatar'}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base">
                {getInitials()}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.displayName || 'Authenticated User'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || 'No email attached'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified Firebase UID
            </div>
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate mt-1">
              {user?.uid || '—'}
            </div>
          </div>
        </div>

        {/* Backend Verification Diagnostic Box */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Backend Bearer Token Verification
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tests the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">requireFirebaseAuth</code> Express middleware via <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">authenticatedFetch</code>
            </div>
          </div>

          <button
            onClick={verifyBackendToken}
            disabled={serverCheckStatus === 'checking'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${serverCheckStatus === 'checking' ? 'animate-spin' : ''}`} />
            {serverCheckStatus === 'checking' ? 'Verifying Token...' : 'Test Backend Auth'}
          </button>
        </div>

        {serverCheckStatus === 'verified' && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono">{serverCheckResult}</span>
          </div>
        )}

        {serverCheckStatus === 'failed' && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-3 text-red-800 dark:text-red-300 text-xs">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{serverCheckResult}</span>
          </div>
        )}
      </div>

      {/* Placeholder Notice for Step 3 & 4 */}
      <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Ready for Multi-Turn Workspace & Firestore Persistence
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          The authentication gate is confirmed active. Subsequent phases will mount multi-turn document chat, isolated Firestore storage, and the Gemini model fallback ladder.
        </p>
      </div>
    </div>
  );
};
