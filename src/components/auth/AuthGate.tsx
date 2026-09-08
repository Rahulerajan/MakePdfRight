/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../LanguageContext';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

const GoogleLogo = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.877 2.683-6.614z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.71H.956v2.332A9 9 0 009 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.963 10.71A5.42 5.42 0 013.682 9c0-.593.102-1.17.281-1.71V4.958H.956A9 9 0 000 9c0 1.452.347 2.827.956 4.042l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.322 0 2.509.455 3.442 1.346l2.581-2.581C13.463.891 11.426 0 9 0A9 9 0 00.956 4.958L3.963 7.29C4.672 5.164 6.656 3.58 9 3.58z"
    />
  </svg>
);

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { user, loading, error, signInWithGoogle, clearError } = useAuth();
  const { t } = useLanguage();

  const getAuthErrorMessage = (code: string | null): string | null => {
    if (!code) return null;
    switch (code) {
      case 'auth/popup-blocked':
        return t('auth.error_popup_blocked');
      case 'auth/cancelled-popup-request':
      case 'auth/popup-closed-by-user':
        return t('auth.error_cancelled');
      case 'auth/network-request-failed':
        return t('auth.error_network');
      case 'auth/unauthorized-domain':
        return t('auth.error_unauthorized_domain');
      case 'auth/user-disabled':
        return t('auth.error_user_disabled');
      default:
        return t('auth.error_generic');
    }
  };

  const localizedError = getAuthErrorMessage(error);

  if (loading) {
    return (
      <div className="min-h-[62vh] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('auth.verifying_status')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative overflow-hidden min-h-[calc(100vh-72px)] bg-slate-50/70 dark:bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-8 h-80 w-80 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-blue-500/[0.06] blur-3xl" />
        </div>

        <div className="container-custom relative py-10 sm:py-14 lg:py-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_520px] lg:gap-16">
            <section className="hidden lg:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                AI Workspace
              </div>

              <h1 className="mt-6 max-w-xl text-5xl xl:text-6xl font-bold leading-[1.02] tracking-[-0.055em] text-slate-950 dark:text-white">
                Your PDF workspace, securely connected.
              </h1>

              <p className="mt-5 max-w-xl text-[17px] leading-7 text-slate-600 dark:text-slate-300">
                Sign in once to continue conversations, access your workspace and use MakePDFRight AI tools across sessions.
              </p>

              <div className="mt-8 grid gap-4 max-w-lg">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Fast access</p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500 dark:text-slate-400">Continue where you left off without repeating setup.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Secure authentication</p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500 dark:text-slate-400">Google sign-in with Firebase-backed identity verification.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Cleaner experience</p>
                    <p className="mt-0.5 text-sm leading-6 text-slate-500 dark:text-slate-400">No separate username and password to create or remember.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto w-full max-w-xl animate-fade-in-up">
              <div className="rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-8 lg:p-9 shadow-[0_28px_80px_rgba(15,23,42,0.10),0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-100 dark:border-red-950/60 bg-red-50 dark:bg-red-950/30 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div className="mt-6">
                  <h2 className="text-2xl sm:text-[28px] font-bold tracking-[-0.035em] text-slate-950 dark:text-white">
                    {t('auth.workspace_title')}
                  </h2>
                  <p className="mt-2.5 text-sm sm:text-[15px] leading-6 text-slate-600 dark:text-slate-300">
                    {t('auth.workspace_desc')}
                  </p>
                </div>

                {localizedError && (
                  <div className="mt-5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300 flex items-start justify-between gap-3">
                    <span className="leading-5">{localizedError}</span>
                    <button
                      onClick={clearError}
                      className="shrink-0 text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                    >
                      {t('auth.dismiss')}
                    </button>
                  </div>
                )}

                <button
                  onClick={signInWithGoogle}
                  className="group mt-7 grid h-[54px] w-full grid-cols-[28px_1fr_28px] items-center rounded-[14px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 text-[15px] font-semibold text-slate-900 dark:text-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  <GoogleLogo />
                  <span className="text-center">{t('auth.sign_in_google')}</span>
                  <ArrowRight className="h-4 w-4 justify-self-end text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>

                <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  Secure access
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 text-center">
                    <FileText className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">Save workspace</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">Keep your progress</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 text-center">
                    <MessageSquare className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">Continue chats</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">Resume conversations</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-3.5 text-center">
                    <ShieldCheck className="mx-auto h-4 w-4 text-primary" />
                    <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">Secure access</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">Protected identity</p>
                  </div>
                </div>

                <Link
                  to="/"
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('auth.back_home')}
                </Link>

                <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-5 flex items-start gap-3 text-left">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    <strong className="font-semibold text-slate-600 dark:text-slate-300">{t('auth.free_notice_title')}</strong>{' '}
                    {t('auth.free_notice_desc')}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
