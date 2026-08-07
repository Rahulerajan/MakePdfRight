import React from 'react';
import { ShieldCheck, Cookie as CookieIcon } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { BackButton } from '../components/common/BackButton';

export const CookiePolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO 
        title="Cookie Policy | MakePDFRight" 
        description="Learn how MakePDFRight uses essential cookies, local storage, and advertising cookies for AdSense." 
      />
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <BackButton label="Back to Home" />
        </div>

        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <CookieIcon className="w-4 h-4" />
            <span>Transparency & Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Last Updated: July 2026
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your computer or mobile device when you visit a website. They allow websites to remember your actions and preferences over time.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. How MakePDFRight Uses Cookies & Storage</h2>
            <p>MakePDFRight relies primarily on client-side local storage and essential cookies to ensure optimal site performance:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Essential Preferences:</strong> We use browser <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">localStorage</code> to remember your selected theme (dark/light mode) and language choices.</li>
              <li><strong>Google Analytics:</strong> Anonymous usage metrics help us optimize server bandwidth and feature performance.</li>
              <li><strong>Google AdSense Advertising:</strong> Google AdSense and third-party advertising vendors use cookies to serve non-intrusive ads based on prior website visits.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. How to Manage or Disable Cookies</h2>
            <p>
              You can instruct your browser to refuse all cookies or notify you when a cookie is being sent. You can also opt out of personalized advertising by visiting{' '}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                Google Ads Settings
              </a>.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Contact Us</h2>
            <p>If you have questions regarding our Cookie Policy, please reach out via our contact page.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
