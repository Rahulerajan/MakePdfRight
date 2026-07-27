import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ShieldAlert, Scale, AlertTriangle, ArrowLeft } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO title={SEO_DATA['/terms'].title} description={SEO_DATA['/terms'].description} />
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Back Link */}
        <div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-4 text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Terms & Conditions</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Last Updated: July 25, 2026
          </p>
        </div>

        {/* Detailed Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              1. Acceptance of Terms
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              By accessing or using MakePDFRight ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              2. Acceptable Use Policy
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              MakePDFRight is provided for lawful document management and processing. You expressly agree not to:
            </p>
            <ul className="list-disc pl-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-2">
              <li>Upload files containing illegal, harmful, defamatory, or infringing content.</li>
              <li>Upload malware, viruses, corrupted code, or executable scripts intended to compromise server integrity.</li>
              <li>Attempt to bypass rate limits, server security controls, or path traversal safeguards.</li>
              <li>Use automated scripts or bots to overload our infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-violet-500" />
              3. AI & Automated Processing Disclaimer
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Tools powered by artificial intelligence (including AI transcription, image generation, text extraction, and PDF editing) are provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for maximum precision:
            </p>
            <ul className="list-disc pl-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-2">
              <li>We do not guarantee 100% accuracy, completeness, or flawlessness of AI-generated transcriptions or OCR extractions.</li>
              <li>Users are strongly advised to verify critical financial, legal, or official documents generated or converted through the platform.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Service Availability & File Limits
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              MakePDFRight enforces reasonable technical file size limits (typically up to 50MB-100MB per document batch) to maintain fast server responsiveness for all users. We reserve the right to modify, suspend, or discontinue any feature at any time without prior notice.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Limitation of Liability
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              To the fullest extent permitted by applicable law, MakePDFRight, its operators, and contributors shall not be liable for any direct, indirect, incidental, or consequential damages resulting from lost files, corrupt document conversions, or service interruptions.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Contact Information
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              For questions regarding these Terms of Service, please reach out to:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email: <a href="mailto:support@makepdfright.com" className="text-primary hover:underline">support@makepdfright.com</a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
