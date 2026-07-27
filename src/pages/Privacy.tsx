import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Cpu, Server, EyeOff, FileText, ArrowLeft } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO title={SEO_DATA['/privacy'].title} description={SEO_DATA['/privacy'].description} />
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Your Privacy Matters</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Last Updated: July 25, 2026
          </p>
        </div>

        {/* Key Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Short-Term Processing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Files are held temporarily in isolated server storage solely for transformation and auto-deleted within 15 minutes.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">AI Processing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              AI features (transcription, image gen, PDF edit tools) transmit request context securely to Google Gemini APIs.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">No Data Selling</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We never require user registration, sell personal info, or store your document content permanently.
            </p>
          </div>
        </div>

        {/* Detailed Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              1. What Files Are Uploaded and How They Are Handled
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              When you use MakePDFRight to merge, split, compress, edit, or convert documents, your uploaded PDF files, images, or audio recordings are processed on our secure full-stack backend servers.
            </p>
            <ul className="list-disc pl-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-2">
              <li>
                <strong>Temporary Storage Duration:</strong> Uploaded files exist strictly in isolated temporary disk/memory storage for the brief duration required to complete your requested task.
              </li>
              <li>
                <strong>Automatic Cleanup:</strong> Our automated cleanup daemon inspects and unlinks temporary file storage every 10 minutes, ensuring files are deleted within <strong>15 minutes maximum</strong> of processing.
              </li>
              <li>
                <strong>No Long-term Persistence:</strong> We do not index, retain, inspect, or build persistent databases of your uploaded documents or converted file outputs.
              </li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-violet-500" />
              2. AI-Powered Features & Third-Party APIs
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Certain intelligent features on MakePDFRight—such as AI Image Generation, Audio Transcription, and document analysis—utilize Google's Gemini API infrastructure.
            </p>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              When you invoke an AI tool, relevant text prompts, extracted document text, or audio samples are securely proxied via server-to-server API endpoints to Google Gemini. These requests do not transmit user identity or personal identifiers.
            </p>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              You can review how Google manages data transmitted to their API infrastructure by visiting the{' '}
              <a 
                href="https://policies.google.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline font-semibold"
              >
                Google Privacy Policy
              </a>.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-emerald-500" />
              3. Information We Do NOT Collect
            </h2>
            <ul className="list-disc pl-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>User Accounts:</strong> We do not require accounts, usernames, passwords, or credit card details to use our core document tools.</li>
              <li><strong>Personal Identity:</strong> We do not track or sell personal identity records.</li>
              <li><strong>Document Content Mining:</strong> We never scan your documents for advertising, marketing, or behavioral profiling.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              4. Local Storage & Preferences
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              MakePDFRight uses standard browser <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">localStorage</code> solely to save your local UI preferences, specifically:
            </p>
            <ul className="list-disc pl-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-1">
              <li>Your selected color theme (Light mode / Dark mode).</li>
              <li>Your selected interface language preference.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Contact Us Regarding Privacy
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have any questions, concerns, or feedback regarding our privacy practices or file handling procedures, please contact our team at:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email: <a href="mailto:privacy@makepdfright.com" className="text-primary hover:underline">privacy@makepdfright.com</a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
