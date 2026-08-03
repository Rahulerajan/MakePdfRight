import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const Disclaimer: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO 
        title="Disclaimer | MakePDFRight" 
        description="Review the legal disclaimer regarding software usage, document processing, and services provided by MakePDFRight." 
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

        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Legal Notice</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Disclaimer
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Last Updated: July 2026
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Provided "As-Is"</h2>
            <p>
              The tools and services on MakePDFRight are provided on an "as-is" and "as-available" basis without warranties of any kind, whether express or implied. While we strive for maximum accuracy, reliability, and security, we cannot guarantee that document conversions will be error-free or uninterrupted.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. User Responsibility & Backups</h2>
            <p>
              Users are solely responsible for maintaining backup copies of their original documents. MakePDFRight automatically purges files after processing and cannot recover lost or deleted files.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Third-Party Links & Ads</h2>
            <p>
              MakePDFRight may display advertisements served by Google AdSense and third-party ad networks. We do not endorse or assume responsibility for the content, privacy policies, or practices of any third-party websites or ad partners.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
