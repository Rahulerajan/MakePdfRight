import React from 'react';
import { ShieldCheck, Zap, Lock, Sparkles, HelpCircle, Mail, BookOpen, AlertCircle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { BackButton } from '../components/common/BackButton';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO 
        title="About Us – Independent Document & PDF Utilities | MakePDFRight" 
        description="Learn about MakePDFRight, an independent suite of privacy-focused browser-first PDF tools, how our technology works, our editorial standards, and our file-handling policy." 
        canonicalUrl="https://www.makepdfright.com/about"
      />
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <BackButton label="Back to Home" />
        </div>

        <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Transparency & Engineering</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            About MakePDFRight
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            An independent web utility project built to deliver fast, private, and accessible document manipulation tools directly in your browser without mandatory accounts or paywalls.
          </p>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">In-Browser Processing</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Core PDF tools execute client-side in your browser's memory sandbox so your documents never leave your device.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">No Paywalls or Sign-Ups</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Full access to document merging, splitting, compression, and conversions with zero registration or hidden subscriptions.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Factual & Transparent</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We clearly document exact format capabilities, scan limitations, and post-conversion verification steps.
            </p>
          </div>
        </div>

        {/* Detailed Explanations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 shadow-sm text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What is MakePDFRight?</h2>
            <p>
              MakePDFRight is a web-based suite of digital document and media utilities. It provides essential tools for everyday document workflows—such as merging PDF contracts, splitting multi-page reports, compressing large files for email attachments, extracting tables to Excel, converting pages to Word, and rotating misaligned scans.
            </p>
            <p>
              Unlike legacy desktop software that requires license keys, software installations, or heavy background processes, MakePDFRight operates through standards-compliant web technologies, making it instantly accessible on Windows, macOS, Linux, iOS, and Android browsers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Who Maintains MakePDFRight?</h2>
            <p>
              MakePDFRight is built and maintained by independent web software developers and document technology enthusiasts. We are dedicated to maintaining lightweight, reliable web tools that respect user autonomy and privacy.
            </p>
            <p>
              We continuously test browser compatibility across Chromium, WebKit (Safari), and Gecko (Firefox) engines, ensuring that updates to web standards do not disrupt your document workflows.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How We Process Files & Protect Privacy</h2>
            <p>
              We believe privacy is an architectural choice, not just a policy statement:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Client-Side Processing (Primary):</strong> Tools such as Merge, Split, Rotate, Organize, Compress, and Image-to-PDF utilize client-side WebAssembly, PDF.js, and pdf-lib. The actual document manipulation occurs directly in your browser's local RAM.
              </li>
              <li>
                <strong>Ephemeral Server-Assisted Tasks:</strong> For tools requiring server-side assistance (such as complex document conversions or AI generation), files are transmitted over secure TLS 1.3 encryption, held strictly in short-lived memory buffers during processing, and purged immediately upon completion.
              </li>
              <li>
                <strong>No Data Harvesting:</strong> We do not log, retain, monetize, or train machine learning algorithms on your private documents.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Product Capabilities & Factual Limitations</h2>
            <p>
              We strive to be transparent about what our tools can and cannot do:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Born-Digital vs Scanned PDFs:</strong> Conversion tools work best with born-digital PDFs that have a native selectable text layer. Flat bitmap scans require OCR and may vary in accuracy depending on resolution, lighting, and language complexity.
              </li>
              <li>
                <strong>Complex Layout Shifts:</strong> Highly intricate multi-column brochures, customized magazine layouts, or unusual font encodings may require minor manual adjustments after conversion to editable Word or Excel formats.
              </li>
              <li>
                <strong>Encrypted Documents:</strong> Password-protected or DRM-locked PDFs must be unlocked before client-side manipulation tools can read their object streams.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Editorial Review & How to Report Issues</h2>
            <p>
              All technical guides, tool instructions, and troubleshooting tips on MakePDFRight are written and reviewed by our development team to ensure they accurately reflect actual tool functionality.
            </p>
            <p>
              If you encounter a bug, an unsupported document format, or have a suggestion for improving a tool, we welcome your feedback. Please visit our <Link to="/contact" className="text-primary font-semibold hover:underline">Contact Page</Link> or email us directly at <code>support@makepdfright.com</code> with your browser version and error details.
            </p>
          </section>

        </div>

        {/* Resources Cross-Link */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>Explore Our Technical Resource Guides</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Learn how PDF coordinate systems, compression algorithms, and OCR engines work.
            </p>
          </div>
          <Link
            to="/resources"
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 shrink-0"
          >
            Visit Resources Hub →
          </Link>
        </div>

      </div>
    </div>
  );
};

