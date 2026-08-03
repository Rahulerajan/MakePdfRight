import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Lock, Sparkles, ArrowLeft, Heart, Globe2 } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO 
        title="About Us | MakePDFRight" 
        description="Discover MakePDFRight - the fast, private, browser-first PDF and AI document processing toolkit designed for privacy and speed." 
      />
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Our Mission & Vision</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            About MakePDFRight
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
            We build high-performance, private, and accessible document tools to empower people worldwide without subscriptions or mandatory software installs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Privacy First</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Documents are processed in isolated memory and automatically purged within 15 minutes.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Lightning Speed</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Optimized WASM and server processing engine for instant page merges, splits, and conversions.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">100% Free</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              No registration, credit cards, paywalls, or artificial limits on your document editing needs.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Why We Built MakePDFRight</h2>
          <p>
            Handling PDFs shouldn't require installing proprietary desktop software, creating accounts, or agreeing to monthly subscriptions just to merge two receipts or rotate a page.
          </p>
          <p>
            MakePDFRight was designed as an intuitive, secure online utility suite that puts user control, document security, and privacy at the center. With integrated Gemini AI capabilities, users can also transcribe speech and generate high-resolution images within the exact same clean interface.
          </p>
        </div>
      </div>
    </div>
  );
};
