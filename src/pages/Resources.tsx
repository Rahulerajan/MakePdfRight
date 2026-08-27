/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { 
  BookOpen, 
  FileText, 
  Zap, 
  ShieldCheck, 
  Table, 
  Layers, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Sparkles,
  Scissors,
  RotateCw,
  FileStack,
  AlertTriangle
} from 'lucide-react';

interface GuideItem {
  id: string;
  title: string;
  category: 'fundamentals' | 'conversion' | 'optimization' | 'security';
  readTime: string;
  summary: string;
  keyPoints: string[];
  content: {
    heading: string;
    paragraphs: string[];
  }[];
  relatedTool: {
    name: string;
    path: string;
  };
}

const GUIDES: GuideItem[] = [
  {
    id: 'pdf-vs-editable-formats',
    title: 'PDF vs Editable Document Formats: Why Layouts Behave Differently',
    category: 'fundamentals',
    readTime: '6 min read',
    summary: 'Understand the underlying postscript coordinates of PDF files compared to fluid paragraph flow in DOCX and XLSX documents.',
    keyPoints: [
      'PDFs position every glyph, line, and image using absolute page coordinates (X, Y points).',
      'Word (DOCX) and Excel (XLSX) rely on relative document flow, styling hierarchies, and fluid layout engines.',
      'Converting PDF to editable formats requires algorithmic layout reconstruction rather than direct file translation.'
    ],
    content: [
      {
        heading: 'The Architecture of a Fixed-Layout PDF',
        paragraphs: [
          'The Portable Document Format (PDF) was engineered by Adobe in 1993 to ensure that documents appear identical across any screen, printer, or operating system. To achieve this absolute visual fidelity, a PDF does not store paragraphs or tables in the traditional sense; instead, it stores drawing instructions and absolute coordinates on a fixed canvas.',
          'For example, a heading in a PDF is stored as raw glyphs placed at precise X/Y millimeter coordinates relative to the page margin. When you open a PDF on Windows, macOS, or a smartphone, the PDF rendering engine simply paints those exact coordinates.'
        ]
      },
      {
        heading: 'Why Paragraph Flow Shifts During Conversion',
        paragraphs: [
          'In contrast, word processing formats like Microsoft Word (.docx) and Google Docs use fluid layout models where text wraps dynamically based on font size, paragraph margins, line height, and page margins.',
          'When MakePDFRight converts a PDF into a Word document, our conversion engine analyzes proximity clusters—detecting whether separate text fragments belong to the same logical paragraph, header, or table column. Understanding this difference helps you anticipate minor typographic adjustments when converting complex multi-column brochures or newsletters.'
        ]
      }
    ],
    relatedTool: { name: 'PDF to Word Tool', path: '/pdf-to-word' }
  },
  {
    id: 'how-pdf-compression-works',
    title: 'How PDF Compression Actually Works: Lossless vs Lossy Optimization',
    category: 'optimization',
    readTime: '5 min read',
    summary: 'A technical breakdown of raster image subsampling, vector preservation, font subsetting, and internal PDF object stream compression.',
    keyPoints: [
      'Text and vector paths are compressed losslessly using Flate/Deflate algorithms with zero degradation.',
      'Embedded JPEG and PNG photographs are optimized through resolution subsampling and quantization.',
      'Unused embedded fonts and redundant metadata streams are safely stripped to maximize size reduction.'
    ],
    content: [
      {
        heading: 'The Three Main Components of a PDF File Size',
        paragraphs: [
          'Large PDF files are rarely caused by plain text. A 100-page novel of pure text usually takes less than 1 MB. High file sizes typically stem from three elements: high-DPI scanned photos (often 300 to 600 DPI from office copiers), uncompressed embedded raster graphics, and redundant font subsets.',
          'MakePDFRight’s compression engine targets these bloated components while leaving core vector structures completely untouched.'
        ]
      },
      {
        heading: 'Balancing File Size vs Visual Quality',
        paragraphs: [
          'When you select Recommended Compression, the system downsamples 300+ DPI images to screen-friendly 144–150 DPI, which reduces the file size by 60%–80% without noticeable pixelation on laptop screens and mobile phones.',
          'For strict job portals or government email attachment limits (e.g., under 2MB), Extreme Compression applies deeper DCT quantization, making the file ultra-lightweight while keeping text crisp and fully readable.'
        ]
      }
    ],
    relatedTool: { name: 'Compress PDF Tool', path: '/compress' }
  },
  {
    id: 'scanned-vs-digital-pdf',
    title: 'Scanned vs Digital PDFs: How to Identify and Prepare for OCR',
    category: 'fundamentals',
    readTime: '5 min read',
    summary: 'Learn how to detect whether a PDF contains live selectable vector text or flat pixel images, and how to prepare scans for optical character recognition.',
    keyPoints: [
      'Digital "Born-Digital" PDFs contain extractable font glyphs and selectable text layers.',
      'Scanned PDFs are flat bitmap pictures of physical paper encapsulated inside a PDF wrapper.',
      'OCR analyzes contrast and character shapes to reconstruct searchable text layers over scanned images.'
    ],
    content: [
      {
        heading: 'The 3-Second Selection Test',
        paragraphs: [
          'To determine if your PDF is digital or scanned, open it in any browser or viewer and try to highlight a sentence with your cursor. If you can highlight individual words and copy/paste them into a text editor, your document is a born-digital PDF with a native text layer.',
          'If clicking and dragging draws a selection box over the entire page or highlights nothing, the PDF is a scanned bitmap image. Standard conversion tools cannot extract text from image-only PDFs without Optical Character Recognition (OCR).'
        ]
      },
      {
        heading: 'Best Practices for High-Accuracy OCR',
        paragraphs: [
          'OCR accuracy depends heavily on scan quality. For optimal recognition, scan at 300 DPI, ensure pages are upright and aligned, avoid skewed or rotated orientation, and maintain high contrast between dark ink and clean white backgrounds.',
          'Handwritten notes, blurry mobile camera shots with heavy shadows, and crumpled receipts will require manual verification after transcription.'
        ]
      }
    ],
    relatedTool: { name: 'OCR PDF Tool', path: '/ocr' }
  },
  {
    id: 'extracting-pdf-tables-to-excel',
    title: 'Extracting PDF Tables to Excel: Structure, Numbers, and Audit Rules',
    category: 'conversion',
    readTime: '7 min read',
    summary: 'Best practices for converting invoices, bank statements, and financial schedules into clean, formula-ready XLSX spreadsheets.',
    keyPoints: [
      'Table converters identify coordinate boundaries, whitespace gutters, and cell grid lines.',
      'Always audit numerical columns for thousand-separators, currency symbols, and negative brackets.',
      'Multi-page tables should be structured into contiguous sheets for easy pivot and formula analysis.'
    ],
    content: [
      {
        heading: 'How Tabular Data is Detected in PDFs',
        paragraphs: [
          'Because PDFs have no native "cell" or "spreadsheet" tags, table conversion engines detect alignment grids by analyzing horizontal baselines and vertical whitespace gaps between numerical columns.',
          'When columns have clear headers (such as Date, Description, Debit, Credit, Balance), the algorithm maps each row into distinct spreadsheet cells.'
        ]
      },
      {
        heading: 'Essential Post-Conversion Financial Checklist',
        paragraphs: [
          'Whenever you convert bank statements, balance sheets, or payroll summaries from PDF to Excel, always perform a reconciliation check: run a `=SUM()` formula over credit and debit columns and compare the total against the PDF summary.',
          'Check that negative amounts (e.g., `-$150.00` or `($150.00)`) were correctly interpreted as negative numeric values rather than plain text strings.'
        ]
      }
    ],
    relatedTool: { name: 'PDF to Excel Tool', path: '/pdf-to-excel' }
  },
  {
    id: 'document-privacy-client-side',
    title: 'Document Privacy & Client-Side Processing: Protecting Confidential Files',
    category: 'security',
    readTime: '4 min read',
    summary: 'How modern WebAssembly and in-browser PDF engines allow file manipulation without sending sensitive data over external networks.',
    keyPoints: [
      'Core tools like Merge, Split, Rotate, and Organise execute directly inside your web browser’s memory sandbox.',
      'Files never leave your local device for purely client-side operations.',
      'Server-assisted tools use ephemeral memory buffers with immediate memory purge upon job completion.'
    ],
    content: [
      {
        heading: 'Client-Side Execution vs Traditional Cloud Uploads',
        paragraphs: [
          'Many legacy PDF websites require every file to be uploaded to an external server, processed on remote virtual machines, and stored in cloud buckets for download links. This introduces privacy risks when handling tax records, medical documents, and NDAs.',
          'MakePDFRight leverages modern WebAssembly and client-side JavaScript (pdf-lib, pdfjs) to perform operations like merging, splitting, reordering, and rotating entirely on your computer or phone. Your document bytes never traverse third-party servers for these tasks.'
        ]
      },
      {
        heading: 'Handling Sensitive and Confidential Records',
        paragraphs: [
          'For tools requiring server-assisted transformation (such as complex Word generation or AI analysis), all transmission is protected by strict TLS 1.3 encryption, processed in short-lived memory buffers, and permanently purged immediately after generation.',
          'We never log, monetize, or train machine learning models on your uploaded personal documents.'
        ]
      }
    ],
    relatedTool: { name: 'Privacy Policy', path: '/privacy' }
  },
  {
    id: 'post-conversion-validation-checklist',
    title: 'The Post-Conversion Verification Checklist: 5 Quality Steps',
    category: 'conversion',
    readTime: '4 min read',
    summary: 'A 5-point verification routine to confirm page sequence, text fidelity, image resolution, and numerical calculations before sending critical files.',
    keyPoints: [
      'Step 1: Check total page count and verify no pages were dropped or duplicated.',
      'Step 2: Inspect vector logos, signature blocks, and embedded charts for visual clarity.',
      'Step 3: Sample 3 random paragraphs to confirm character encodings and spacing.',
      'Step 4: Verify hyperlinks, bookmarks, and form fields if interactive elements were expected.',
      'Step 5: Run a quick sum check on any financial or numerical spreadsheet columns.'
    ],
    content: [
      {
        heading: 'Why Verification Matters',
        paragraphs: [
          'Automated conversion and compression algorithms are highly capable, but complex source documents with custom embedded fonts or unusual coordinate transformations can occasionally introduce subtle formatting shifts.',
          'Spending 30 seconds running through this 5-point checklist guarantees that your client proposals, tax submissions, and legal filings are 100% accurate before submission.'
        ]
      }
    ],
    relatedTool: { name: 'All PDF Tools', path: '/' }
  }
];

export const Resources: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);

  const filteredGuides = selectedCategory === 'all'
    ? GUIDES
    : GUIDES.filter(g => g.category === selectedCategory);

  const activeGuide = GUIDES.find(g => g.id === activeGuideId);

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-slate-50 dark:bg-slate-900/50 py-8 sm:py-12 px-4 md:px-8 transition-colors">
      <SEO 
        title="PDF & Document Resources Hub – Technical Guides & Best Practices | MakePDFRight"
        description="Comprehensive guides on PDF compression, scanned vs digital documents, table extraction, document security, and file conversion best practices."
        canonicalUrl="https://www.makepdfright.com/resources"
        keywords="pdf guides, pdf compression explanation, scanned vs digital pdf, pdf to word formatting, table extraction best practices, document privacy"
      />

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>MakePDFRight Knowledge Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Document Guides, Formats & Technical Best Practices
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            In-depth, practical explanations of PDF structures, compression algorithms, OCR preparation, and data extraction techniques to help you get the best results from your documents.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {[
            { id: 'all', label: 'All Guides' },
            { id: 'fundamentals', label: 'PDF Fundamentals' },
            { id: 'conversion', label: 'Conversion & Data' },
            { id: 'optimization', label: 'Compression & Speed' },
            { id: 'security', label: 'Privacy & Security' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveGuideId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-primary/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active Guide Modal / Expanded View */}
        {activeGuide && (
          <div className="bg-white dark:bg-slate-900 border-2 border-primary/40 dark:border-primary/50 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 animate-fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {activeGuide.readTime} • {activeGuide.category.toUpperCase()}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeGuide.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveGuideId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Close Guide ✕
              </button>
            </div>

            {/* Key Takeaways */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Key Takeaways
              </h3>
              <ul className="space-y-2">
                {activeGuide.keyPoints.map((pt, i) => (
                  <li key={i} className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Body */}
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              {activeGuide.content.map((sec, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {sec.heading}
                  </h3>
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-500">
                Ready to try this in practice?
              </span>
              <Link
                to={activeGuide.relatedTool.path}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <span>Launch {activeGuide.relatedTool.name}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:border-primary/60 hover:shadow-md transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="uppercase tracking-wider text-primary font-bold">{guide.category}</span>
                  <span>{guide.readTime}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug">
                  {guide.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setActiveGuideId(guide.id)}
                  className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Full Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to={guide.relatedTool.path}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Tool →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Tool Decision Tree Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Which MakePDFRight Tool Do You Need?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Find the exact workflow matching your document requirement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { intent: 'I have multiple PDF files to join into a single document', tool: 'Merge PDF', path: '/merge', icon: <FileStack className="w-5 h-5 text-blue-500" /> },
              { intent: 'I need to extract specific pages or split a large file into chapters', tool: 'Split PDF', path: '/split', icon: <Scissors className="w-5 h-5 text-emerald-500" /> },
              { intent: 'My PDF is too large to email or upload to a portal', tool: 'Compress PDF', path: '/compress', icon: <Zap className="w-5 h-5 text-amber-500" /> },
              { intent: 'I need to convert PDF text into an editable Word document', tool: 'PDF to Word', path: '/pdf-to-word', icon: <FileText className="w-5 h-5 text-indigo-500" /> },
              { intent: 'I have tables, invoices, or bank data to analyze in spreadsheets', tool: 'PDF to Excel', path: '/pdf-to-excel', icon: <Table className="w-5 h-5 text-teal-500" /> },
              { intent: 'Some pages are upside-down or sideways', tool: 'Rotate PDF', path: '/rotate', icon: <RotateCw className="w-5 h-5 text-purple-500" /> },
              { intent: 'I want to reorder, delete, or rearrange pages visually', tool: 'Organize PDF', path: '/organise', icon: <Layers className="w-5 h-5 text-rose-500" /> },
              { intent: 'I have a scanned document image and need searchable text', tool: 'OCR PDF', path: '/ocr', icon: <Sparkles className="w-5 h-5 text-cyan-500" /> },
              { intent: 'I need to annotate, draw, or add text onto PDF pages', tool: 'Edit PDF', path: '/edit', icon: <FileText className="w-5 h-5 text-orange-500" /> }
            ].map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/80 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {item.tool}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.intent}
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-bold text-primary flex items-center gap-1">
                  <span>Open Tool</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
