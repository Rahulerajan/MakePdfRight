import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../components/LanguageContext';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';
import { preloadTool } from '../utils/preloadTools';
import { 
  FileStack, 
  Scissors, 
  Zap, 
  FileText, 
  Table, 
  Image as ImageIcon, 
  Type,
  LayoutGrid,
  RotateCw,
  Sparkles,
  Mic
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  isAi?: boolean;
}

const tools: Tool[] = [
  {
    id: 'generate-image',
    name: 'Image Generator',
    description: 'Create custom images from text descriptions using advanced models.',
    icon: <Sparkles className="w-10 h-10" />,
    path: '/generate-image',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10',
    isAi: true
  },
  {
    id: 'transcribe',
    name: 'Audio Transcription',
    description: 'Convert voice recordings and audio files into accurate text transcripts.',
    icon: <Mic className="w-10 h-10" />,
    path: '/transcribe',
    color: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10',
    isAi: true
  },
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document while preserving the original quality.',
    icon: <FileStack className="w-10 h-10" />,
    path: '/merge',
    color: 'bg-red-50 text-red-500 dark:bg-red-500/10'
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Split a PDF into individual pages or custom page ranges with ease.',
    icon: <Scissors className="w-10 h-10" />,
    path: '/split',
    color: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10'
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining the best possible document quality.',
    icon: <Zap className="w-10 h-10" />,
    path: '/compress',
    color: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF files into fully editable Microsoft Word (.docx) documents with accurate formatting.',
    icon: <FileText className="w-10 h-10" />,
    path: '/pdf-to-word',
    color: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Extract tables and convert PDF data into editable Microsoft Excel (.xlsx) spreadsheets.',
    icon: <Table className="w-10 h-10" />,
    path: '/pdf-to-excel',
    color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert every page of your PDF into high-quality JPG images.',
    icon: <ImageIcon className="w-10 h-10" />,
    path: '/pdf-to-jpg',
    color: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, WEBP, BMP, and other supported image formats into a professional PDF document.',
    icon: <ImageIcon className="w-10 h-10" />,
    path: '/image-to-pdf',
    color: 'bg-teal-50 text-teal-500 dark:bg-teal-500/10'
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    description: 'Edit PDF files by adding text, images, signatures, annotations, shapes, and more.',
    icon: <Type className="w-10 h-10" />,
    path: '/edit',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10'
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate one or multiple PDF pages to the correct orientation in seconds.',
    icon: <RotateCw className="w-10 h-10" />,
    path: '/rotate',
    color: 'bg-pink-50 text-pink-500 dark:bg-pink-500/10'
  },
  {
    id: 'organise',
    name: 'Organize PDF',
    description: 'Reorder, rotate, add, delete, extract, and manage PDF pages with an intuitive interface.',
    icon: <LayoutGrid className="w-10 h-10" />,
    path: '/organise',
    color: 'bg-slate-50 text-slate-500 dark:bg-slate-500/10'
  }
];

const getStartedLabels: Record<string, string> = {
  en: 'Get Started',
  hi: 'शुरू करें',
  fr: 'Commencer',
  de: 'Loslegen',
  es: 'Empezar'
};

export const Home = () => {
  const { language, t } = useLanguage();

  const localizedTools = tools.map(tool => {
    const keyId = tool.id === 'generate-image' ? 'image_gen' : tool.id.replace(/-/g, '_');
    return {
      ...tool,
      name: t(`tools.${keyId}.name`),
      description: t(`tools.${keyId}.description`)
    };
  });

  const getStartedText = getStartedLabels[language] || getStartedLabels['en'];

  return (
    <div className="flex flex-col w-full">
      <SEO title={SEO_DATA['/'].title} description={SEO_DATA['/'].description} />
      {/* Hero Section */}
      <section 
        className="bg-slate-50 dark:bg-slate-900/50 transition-colors border-b border-slate-200/40 dark:border-slate-800/40 w-full"
        style={{
          height: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 'clamp(16px, 3vh, 36px)',
          paddingBottom: 'clamp(20px, 4vh, 48px)'
        }}
      >
        <div className="container-custom text-center space-y-2 md:space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1] animate-fade-in-up">
            {t('hero_title_1')}<span className="text-primary">{t('hero_title_2')}</span>{t('hero_title_3')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium animate-fade-in-up-delay-1">
            {t('hero_desc')}
          </p>
        </div>
      </section>

      {/* PDF Tools Section */}
      <section id="tools" className="w-full pt-4 pb-12">
        <div className="container-custom">
          <div className="flex items-center gap-3 mb-5 justify-center md:justify-start">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <LayoutGrid className="text-slate-600 dark:text-slate-300 w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('standard_pdf_tools_heading')}</h2>
          </div>
          <div className="tools-grid-responsive">
            {localizedTools.map((tool) => (
              <div
                key={tool.id}
                className="h-full"
              >
                <Link 
                  to={tool.path}
                  onMouseEnter={() => preloadTool(tool.path)}
                  onFocus={() => preloadTool(tool.path)}
                  className="group relative flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 transition-all duration-300 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] justify-between"
                >
                  <div className="flex flex-col items-center text-center w-full">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${tool.color}`}>
                      {tool.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors line-clamp-1 w-full text-center">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-3 h-[72px] text-center w-full">
                      {tool.description}
                    </p>
                  </div>

                  <div className="w-full mt-auto pt-4">
                    <div className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 group-hover:bg-primary group-hover:text-white text-sm font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-800">
                      <span>{getStartedText}</span>
                    </div>
                  </div>

                  {tool.isAi && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="text-primary w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comprehensive Guides & Platform Overview */}
      <section className="w-full py-16 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="container-custom max-w-5xl space-y-16">
          
          {/* Overview */}
          <div className="space-y-4 text-center sm:text-left">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              A Complete, Browser-First Suite for Digital Document Management
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              MakePDFRight provides accessible, high-performance web utilities designed to solve everyday document tasks without mandatory accounts, paywalls, or software installation. Whether you are assembling multi-part contract submissions, preparing academic research papers, optimizing scanned records for email attachments, or extracting structured data for analysis, our tools deliver accurate and predictable results directly in modern web browsers.
            </p>
          </div>

          {/* Tool Categories & Workflows */}
          <div className="space-y-6">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Core Document Tool Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">1. Document Assembly &amp; Organization</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Consolidate multiple PDF documents, reports, and appendices using our <Link to="/merge" className="text-primary font-medium hover:underline">Merge PDF</Link> tool. Divide large dossiers, isolate specific chapters, or delete blank pages with <Link to="/split" className="text-primary font-medium hover:underline">Split PDF</Link> and <Link to="/organise" className="text-primary font-medium hover:underline">Organize PDF</Link>. Correct orientation issues on scanned pages instantly using <Link to="/rotate" className="text-primary font-medium hover:underline">Rotate PDF</Link>.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">2. File Size Optimization &amp; Compression</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Reduce heavy document sizes to comply with email attachment thresholds (e.g. 25MB) and government portal upload limits using our <Link to="/compress" className="text-primary font-medium hover:underline">Compress PDF</Link> tool. Our optimization algorithms analyze image streams and redundant structural objects, balancing compact file sizes with clear typography and legible figures.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">3. Format Conversion &amp; Data Extraction</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Transform static PDF documents into editable formats. Convert reports into editable Microsoft Word documents with <Link to="/pdf-to-word" className="text-primary font-medium hover:underline">PDF to Word</Link>, extract structured tabular records into spreadsheets with <Link to="/pdf-to-excel" className="text-primary font-medium hover:underline">PDF to Excel</Link>, or convert pages to image formats using <Link to="/pdf-to-jpg" className="text-primary font-medium hover:underline">PDF to JPG</Link> and <Link to="/image-to-pdf" className="text-primary font-medium hover:underline">Image to PDF</Link>.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">4. Interactive Annotation &amp; Media Utilities</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Add notes, callouts, text blocks, and freehand signatures to documents with our in-browser <Link to="/edit" className="text-primary font-medium hover:underline">Edit PDF</Link> canvas. For multi-modal workflows, generate custom visual assets using our <Link to="/generate-image" className="text-primary font-medium hover:underline">AI Image Generator</Link> or transcribe recorded voice memos into text files with <Link to="/transcribe" className="text-primary font-medium hover:underline">Audio Transcription</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Browser vs Server Processing Architecture */}
          <div className="space-y-4 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Understanding Processing Architecture: Browser-Native vs. Server-Assisted
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              MakePDFRight uses a hybrid processing model to optimize both performance and privacy:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Client-Side Browser Execution</h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tools like Merge, Split, Rotate, Organize, Compress, and Image-to-PDF run client-side in your browser's sandboxed WebAssembly and JavaScript environment. Your files are manipulated in local device memory without being uploaded to any server.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Ephemeral Server-Assisted Operations</h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Complex conversion tasks (such as PDF to Word, PDF to Excel OCR, and AI media generation) require specialized server engines. Files uploaded for these operations are transferred over encrypted HTTPS, processed in isolated temporary memory buffers, and automatically purged by our cleanup daemon within 15 minutes.
                </p>
              </div>
            </div>
          </div>

          {/* Guide to Choosing the Right Tool */}
          <div className="space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Guide: Choosing the Right Tool for Your Workflow
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Need to send a heavy PDF via email or upload to a portal?</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Use Compress PDF to balance visual quality and reduced file size.</div>
                </div>
                <Link to="/compress" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">Open Compress</Link>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Need to combine statements, invoices, or signed contracts?</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Use Merge PDF to arrange and concatenate documents in precise sequence.</div>
                </div>
                <Link to="/merge" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">Open Merge</Link>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Need to pull data tables into Excel for analysis?</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Use PDF to Excel to extract tabular records into spreadsheet workbooks.</div>
                </div>
                <Link to="/pdf-to-excel" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">Open PDF to Excel</Link>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Need to revise text or restructure an article?</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Use PDF to Word to convert fixed layouts into editable flowable DOCX documents.</div>
                </div>
                <Link to="/pdf-to-word" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">Open PDF to Word</Link>
              </div>
            </div>
          </div>

          {/* Technical Limitations & Best Practices */}
          <div className="space-y-4 p-8 bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Technical Boundaries &amp; Realistic Limitations</h3>
            <p>
              While modern web technologies allow sophisticated document manipulations, certain physical and architectural constraints exist:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Password-Protected Files:</strong> Encrypted or permission-locked PDFs must have passwords removed or verified prior to reorganization and conversion.</li>
              <li><strong>Scanned Raster Documents:</strong> Flat image scans do not contain native vector text. Conversion to Word or Excel relies on optical character recognition (OCR), which depends on scan resolution and clarity.</li>
              <li><strong>Post-Conversion Verification:</strong> Because PDF is a fixed-coordinate layout standard and Word is a reflowable layout standard, complex multi-column documents or non-standard fonts should be inspected post-conversion.</li>
              <li><strong>Browser Memory Limits:</strong> Ultra-large files (exceeding 200MB) processed client-side may encounter memory constraints on mobile devices with limited RAM.</li>
            </ul>
          </div>

          {/* Useful Resource & Information Links */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Helpful Information &amp; Policy Resources</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Explore our technical guides in <Link to="/resources" className="text-primary hover:underline font-medium">Resources</Link>, learn about our project history on <Link to="/about" className="text-primary hover:underline font-medium">About Us</Link>, reach out for questions via <Link to="/contact" className="text-primary hover:underline font-medium">Contact</Link>, or read our official policies in <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, <Link to="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>, <Link to="/cookie-policy" className="text-primary hover:underline font-medium">Cookie Policy</Link>, and <Link to="/disclaimer" className="text-primary hover:underline font-medium">Disclaimer</Link>.
            </p>
          </div>

        </div>
      </section>

      {/* Homepage FAQ Section */}
      <section className="w-full py-12 bg-white dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="container-custom max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              Everything you need to know about MakePDFRight tools, privacy architecture, and document workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">How are my uploaded PDF files handled?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Core tools (Merge, Split, Rotate, Organize, Compress) execute client-side in your browser's RAM without server uploads. For server-assisted conversions, files are held temporarily in isolated memory and automatically purged within 15 minutes.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Is there any software installation required?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                No software installation, plugins, or extensions are needed. All tools function directly in modern desktop and mobile web browsers including Chrome, Safari, Firefox, and Edge.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Is MakePDFRight free to use?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Yes. MakePDFRight utilities are free to use without mandatory user registration, payment details, or hidden subscription paywalls.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">What file formats are supported?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Supported formats include PDF, DOCX, XLSX, JPG, PNG, WEBP, BMP, MP3, WAV, M4A, and AAC audio files.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
