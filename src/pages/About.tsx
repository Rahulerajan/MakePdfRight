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
              MakePDFRight is an independent suite of online digital document and media utilities. The platform was created to provide everyday users, students, professionals, and small organizations with immediate, barrier-free access to essential PDF manipulation tools.
            </p>
            <p>
              Traditional document software frequently locks fundamental capabilities behind steep subscription fees, complicated software installations, or intrusive user registration flows. MakePDFRight is engineered around open web standards, delivering fast and reliable document handling directly in modern desktop and mobile web browsers without demanding software licenses or email accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Project Ownership &amp; Mission</h2>
            <p>
              MakePDFRight is owned and maintained by an independent team of web software developers and document technology engineers based in Kerala, India. Our mission is to keep common digital utilities accessible, straightforward, and respectful of user autonomy.
            </p>
            <p>
              We prioritize software stability, cross-browser compatibility (tested across Chromium, WebKit, and Gecko engines), and truthful communication regarding what browser-based document processing can achieve.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Suite of Utilities Provided</h2>
            <p>
              MakePDFRight offers a structured set of document manipulation and conversion tools:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong><Link to="/merge" className="text-primary hover:underline">Merge PDF</Link>:</strong> Combine multiple PDF files, statements, or report chapters into a single structured PDF document.</li>
              <li><strong><Link to="/split" className="text-primary hover:underline">Split PDF</Link>:</strong> Extract individual pages, custom page ranges, or separate all pages into individual files.</li>
              <li><strong><Link to="/compress" className="text-primary hover:underline">Compress PDF</Link>:</strong> Optimize PDF document sizes for email attachments and portal upload limits while balancing visual clarity.</li>
              <li><strong><Link to="/pdf-to-word" className="text-primary hover:underline">PDF to Word</Link>:</strong> Convert PDF documents into editable Microsoft Word (.docx) documents with layout retention.</li>
              <li><strong><Link to="/pdf-to-excel" className="text-primary hover:underline">PDF to Excel</Link>:</strong> Extract structured data tables into Microsoft Excel (.xlsx) spreadsheets.</li>
              <li><strong><Link to="/pdf-to-jpg" className="text-primary hover:underline">PDF to JPG</Link> &amp; <Link to="/image-to-pdf" className="text-primary hover:underline">Image to PDF</Link>:</strong> Convert between PDF pages and image formats (JPG, PNG, WebP).</li>
              <li><strong><Link to="/edit" className="text-primary hover:underline">Edit PDF</Link>, <Link to="/rotate" className="text-primary hover:underline">Rotate PDF</Link> &amp; <Link to="/organise" className="text-primary hover:underline">Organize PDF</Link>:</strong> Annotate, rotate, and reorder PDF pages interactively.</li>
              <li><strong><Link to="/generate-image" className="text-primary hover:underline">AI Image Generator</Link> &amp; <Link to="/transcribe" className="text-primary hover:underline">Audio Transcription</Link>:</strong> Multi-modal utilities for creating visual assets and generating text transcripts from audio recordings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Technical Architecture: Client-Side vs Server-Assisted</h2>
            <p>
              We design our tools to minimize unnecessary data transfer:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Browser-Native Processing (Client-Side):</strong> Tools such as Merge, Split, Rotate, Organize, Compress, and Image-to-PDF run directly in your browser's local sandbox using JavaScript and WebAssembly libraries (such as pdf-lib and PDF.js). File manipulation occurs in your device's memory without transmission to our backend.
              </li>
              <li>
                <strong>Server-Assisted Conversion:</strong> Heavy document conversions (such as PDF to Word, PDF to Excel OCR, and AI media operations) utilize temporary backend processing containers. Uploaded files are transmitted over TLS 1.3 encryption, held in isolated temporary storage, and automatically purged by our cleanup daemon within 15 minutes.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Engineering Limitations &amp; Best Practices</h2>
            <p>
              We maintain realistic standards regarding document conversion and compression:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Vector vs. Raster Content:</strong> Born-digital PDFs convert with higher structural accuracy than scanned bitmap images, which rely on optical character recognition.</li>
              <li><strong>Encrypted Documents:</strong> Password-protected PDFs must have security restrictions removed before client-side stream extraction can occur.</li>
              <li><strong>Complex Formatting:</strong> Multi-column magazine layouts or specialized typography may experience minor formatting shifts upon conversion to editable Word documents.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Advertising &amp; Monetization Disclosure</h2>
            <p>
              MakePDFRight is supported primarily through digital advertising, including Google AdSense. This allows us to offer document processing tools at no financial cost to users without requiring subscription payments.
            </p>
            <p>
              We strictly uphold Google Publisher Policies and user experience standards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Advertisements are placed in dedicated layout zones outside functional document manipulation canvases and upload dropzones.</li>
              <li>Advertisements and third-party ad scripts are completely excluded from sensitive informational and policy pages, including our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>, <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>, <Link to="/disclaimer" className="text-primary hover:underline">Disclaimer</Link>, and <Link to="/contact" className="text-primary hover:underline">Contact</Link> pages.</li>
              <li>We never use deceptive ads, artificial download buttons, or intrusive pop-ups that interfere with document workflows.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Content Maintenance &amp; Reporting Errors</h2>
            <p>
              All technical guides, tool instructions, and educational resources on MakePDFRight are authored and maintained by our engineering team. We regularly audit our documentation against real-world browser behavior and tool updates.
            </p>
            <p>
              If you encounter a bug, formatting issue, or unexpected behavior during document processing, please report it to our team at <a href="mailto:support@makepdfright.com" className="text-primary font-bold hover:underline">support@makepdfright.com</a> or via our <Link to="/contact" className="text-primary font-medium hover:underline">Contact Page</Link>. Include your browser type and a brief summary of the issue so we can investigate promptly.
            </p>
          </section>

          {/* Legal & Policy Navigation */}
          <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Policy &amp; Trust Links</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Review our full policies: <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> | <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> | <Link to="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link> | <Link to="/disclaimer" className="text-primary hover:underline">Disclaimer</Link> | <Link to="/resources" className="text-primary hover:underline">Technical Resources</Link>.
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

