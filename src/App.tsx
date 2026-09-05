/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { LanguageProvider } from './components/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGate } from './components/auth/AuthGate';
import { Header, Footer } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ScrollToTop } from './components/common/ScrollToTop';

// Synchronously import ToolPage so headers, titles, and upload zones render immediately without full-page loaders
import { ToolPage } from './components/common/ToolPage';

// Import AI tool pages and informational/legal pages synchronously for clean SSR prerender and hydration
import { ImageGenPage } from './pages/ImageGenPage';
import { AudioTranscribePage } from './pages/AudioTranscribePage';
import { About } from './pages/About';
import { Resources } from './pages/Resources';
import { Contact } from './pages/Contact';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { CookiePolicy } from './pages/CookiePolicy';
import { Disclaimer } from './pages/Disclaimer';
import { NotFound } from './pages/NotFound';

// Lazy load heavy tool engines inside their own granular component Suspense boundaries
const MergeTool = lazy(() => import('./tools/MergeTool').then(m => ({ default: m.MergeTool })));
const SplitTool = lazy(() => import('./tools/SplitTool').then(m => ({ default: m.SplitTool })));
const CompressTool = lazy(() => import('./tools/CompressTool').then(m => ({ default: m.CompressTool })));
const PDFToJPGTool = lazy(() => import('./tools/PDFToJPGTool').then(m => ({ default: m.PDFToJPGTool })));
const PDFToWordTool = lazy(() => import('./tools/PDFToWordTool').then(m => ({ default: m.PDFToWordTool })));
const PDFToExcelTool = lazy(() => import('./tools/PDFToExcelTool').then(m => ({ default: m.PDFToExcelTool })));
const EditTool = lazy(() => import('./tools/EditTool').then(m => ({ default: m.EditTool })));
const OrganiseTool = lazy(() => import('./tools/OrganiseTool').then(m => ({ default: m.OrganiseTool })));
const RotateTool = lazy(() => import('./tools/RotateTool').then(m => ({ default: m.RotateTool })));
const ImageToPDFTool = lazy(() => import('./tools/ImageToPDFTool').then(m => ({ default: m.ImageToPDFTool })));
const AIWorkspacePage = lazy(() => import('./pages/AIWorkspacePage').then(m => ({ default: m.AIWorkspacePage })));

export interface AppProps {
  initialPath?: string;
}

export function App({ initialPath }: AppProps = {}) {
  const isServerOrMemory = initialPath !== undefined || typeof window === 'undefined';
  const RouterComponent = isServerOrMemory ? MemoryRouter : BrowserRouter;
  const routerProps = isServerOrMemory ? { initialEntries: [initialPath || '/'] } : {};

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RouterComponent {...routerProps}>
            <ScrollToTop />
            <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300 text-slate-900 dark:text-slate-100 overflow-x-hidden">
              <Header />
          
              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<Home />} />
              
              {/* Core PDF Tool Routes */}
              <Route path="/merge" element={
                <ToolPage 
                  title="Merge PDF" 
                  description="Combine multiple PDF files into one document in seconds."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf" element={<Navigate to="/merge" replace />} />
              <Route path="/merge-pdf-files-free" element={
                <ToolPage 
                  title="Merge PDF Files Free — No Sign-Up, No Watermark" 
                  description="Merge PDF files online for free. No sign-up, no watermark, no file limits. Fast, secure, and works in your browser."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/combine-pdf-files-online" element={
                <ToolPage 
                  title="Combine PDF Files Online in Seconds" 
                  description="Combine multiple PDF files into one document online — no installation required. Fast, free, and browser-based."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-multiple-pdf-files-into-one" element={
                <ToolPage 
                  title="Merge Multiple PDF Files Into One Document" 
                  description="Combine 3, 10, or more PDF files into a single document. Free online tool, no file limits."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-and-word-into-one-file" element={
                <ToolPage 
                  title="Merge PDF and Word Files Into One PDF" 
                  description="Combine PDF and Word (DOCX) files into a single PDF document online for free."
                  multiple
                  accept={{ 
                    'application/pdf': ['.pdf'], 
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 
                    'application/msword': ['.doc'], 
                    'image/*': ['.jpg', '.jpeg', '.png'] 
                  }}
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-scanned-pdf-pages" element={
                <ToolPage 
                  title="Merge Scanned PDF Pages Into One Document" 
                  description="Combine multiple scanned PDF pages or phone scans into a single PDF, free and online."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-on-iphone" element={
                <ToolPage 
                  title="How to Merge PDF Files on iPhone" 
                  description="Merge PDF files on your iPhone — no app needed. Free, fast, works right in Safari or Chrome."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-in-order" element={
                <ToolPage 
                  title="Merge PDFs While Keeping Your Page Order" 
                  description="Combine PDF files in the exact order you choose. Drag and drop to reorder before merging — free online."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-protected-pdf-files" element={
                <ToolPage 
                  title="How to Merge Password-Protected PDF Files" 
                  description="Learn how to merge PDF files that are password-protected or locked, free and online."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/how-to-merge-pdf-files" element={
                <ToolPage 
                  title="How to Merge PDF Files (Free, No Software Needed)" 
                  description="Step-by-step guide to merging PDF files online for free. No software installation required."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-jpg-and-pdf-into-one-file" element={
                <ToolPage 
                  title="Merge JPG and PDF Files Into One Document" 
                  description="Combine JPG images and PDF files into a single PDF document, free and online."
                  multiple
                  accept={{ 
                    'application/pdf': ['.pdf'], 
                    'image/*': ['.jpg', '.jpeg', '.png', '.webp'] 
                  }}
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-without-software" element={
                <ToolPage 
                  title="Merge PDF Files Without Installing Any Software" 
                  description="Combine PDF files online without downloading or installing anything. Works on any device, including locked-down work computers."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-keep-bookmarks" element={
                <ToolPage 
                  title="Merge PDFs Without Losing Bookmarks or Formatting" 
                  description="Combine PDF files while preserving bookmarks, formatting, and document structure."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/merge-pdf-without-losing-quality" element={
                <ToolPage 
                  title="Merge PDF Without Losing Quality" 
                  description="Combine multiple PDFs into a single document while preserving exact fonts, vector graphics, high-resolution images, and original page layouts."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/split" element={
                <ToolPage 
                  title="Split PDF" 
                  description="Break one PDF into separate files, or pull out just the pages you need."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf" element={<Navigate to="/split" replace />} />
              <Route path="/split-pdf-by-page-number" element={
                <ToolPage 
                  title="Split PDF by Page Number" 
                  description="Specify exact page numbers or custom page ranges (e.g., 1-5, 8, 10-12) to split and extract pages from your PDF instantly for free."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/extract-pages-from-pdf" element={
                <ToolPage 
                  title="Extract Pages from PDF" 
                  description="Pull out and save individual pages or page groups from your PDF document for free."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-into-single-pages" element={
                <ToolPage 
                  title="Split PDF into Single Pages" 
                  description="Separate every page of your PDF file into standalone individual PDF documents in one click."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/delete-pages-from-pdf" element={
                <ToolPage 
                  title="Delete Pages from PDF" 
                  description="Remove blank, duplicate, or unwanted pages from your PDF document online for free."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-in-half" element={
                <ToolPage 
                  title="Split PDF in Half" 
                  description="Divide any PDF document into two separate halves quickly and easily."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-every-n-pages" element={
                <ToolPage 
                  title="Split PDF Every N Pages" 
                  description="Automatically split large PDF documents into equal parts every N pages."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-large-pdf-file" element={
                <ToolPage 
                  title="Split Large PDF File" 
                  description="Break giant PDF files and heavy multi-gigabyte documents into smaller, lightweight PDFs."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-odd-even-pages" element={
                <ToolPage 
                  title="Split PDF Odd and Even Pages" 
                  description="Separate odd-numbered and even-numbered pages from your PDF document for duplex printing."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-on-iphone" element={
                <ToolPage 
                  title="Split PDF on iPhone" 
                  description="Split and extract PDF pages on your iPhone or iPad directly in Safari with no app downloads."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-without-losing-quality" element={
                <ToolPage 
                  title="Split PDF Without Losing Quality" 
                  description="Split PDF files without quality loss. Preserve 100% vector text, original image resolution, and page layouts."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-without-acrobat" element={
                <ToolPage 
                  title="Split PDF Without Acrobat" 
                  description="Split PDF files online for free without Adobe Acrobat or paid software."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/how-to-split-a-pdf" element={
                <ToolPage 
                  title="How to Split a PDF" 
                  description="Learn how to split a PDF file into separate pages or ranges online for free in 3 easy steps."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-by-range" element={
                <ToolPage 
                  title="Split PDF by Page Range" 
                  description="Split PDF files by specifying exact page ranges like 1-5, 6-10, or custom page expressions online for free."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-into-multiple-files" element={
                <ToolPage 
                  title="Split PDF into Multiple Files" 
                  description="Divide a single PDF document into multiple separate PDF files by page ranges or sections."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/separate-pdf-pages" element={
                <ToolPage 
                  title="Separate PDF Pages" 
                  description="Separate specific pages or groups of pages from any PDF document quickly and easily."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/extract-specific-pages-from-pdf" element={
                <ToolPage 
                  title="Extract Specific Pages from PDF" 
                  description="Extract selected pages (e.g. 1, 3, 7-10) from your PDF file for free."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/extract-single-page-from-pdf" element={
                <ToolPage 
                  title="Extract Single Page from PDF" 
                  description="Extract just one specific page from a large PDF document in seconds with zero quality loss."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-for-email" element={
                <ToolPage 
                  title="Split PDF for Email" 
                  description="Split oversized PDF files into smaller documents to send smoothly as email attachments."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-for-whatsapp" element={
                <ToolPage 
                  title="Split PDF for WhatsApp" 
                  description="Divide large PDF files into smaller, shareable documents for quick sending over WhatsApp and messaging apps."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-for-upload" element={
                <ToolPage 
                  title="Split PDF for Upload" 
                  description="Split large PDF files into smaller sections to meet strict upload limits on job portals and online forms."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf-online-free" element={
                <ToolPage 
                  title="Free Online PDF Splitter" 
                  description="Split PDF files online for free with zero page limits or watermarks."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/compress" element={
                <ToolPage 
                  title="Compress PDF" 
                  description="Reduce your PDF's file size while keeping text sharp and legible."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf" element={<Navigate to="/compress" replace />} />
              <Route path="/compress-pdf-to-100kb" element={
                <ToolPage 
                  title="Compress PDF to 100KB" 
                  description="Shrink large PDF documents to under 100KB easily for online submissions, email attachments, and government portals."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-to-500kb" element={
                <ToolPage 
                  title="Compress PDF to 500KB" 
                  description="Shrink your PDF to 500KB for forms and uploads with mid-size limits."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-to-1mb" element={
                <ToolPage 
                  title="Compress PDF to 1MB" 
                  description="Shrink your PDF to 1MB or smaller for uploads, forms, and email."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-without-losing-quality" element={
                <ToolPage 
                  title="Compress PDF Without Losing Quality" 
                  description="Reduce file size while keeping text and images sharp."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-for-whatsapp" element={
                <ToolPage 
                  title="Compress PDF for WhatsApp" 
                  description="Shrink your PDF to send smoothly over WhatsApp without failed uploads."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-for-job-application" element={
                <ToolPage 
                  title="Compress PDF for Job Applications" 
                  description="Get your resume or portfolio PDF under application portal size limits without losing quality."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-multiple-pdf-files" element={
                <ToolPage 
                  title="Compress Multiple PDF Files at Once" 
                  description="Batch compress several PDFs in one go — free, fast, no software needed."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-on-iphone" element={
                <ToolPage 
                  title="Compress PDF on iPhone" 
                  description="Shrink PDF file size directly in Safari on your iPhone. No app download required."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf-under-2mb" element={
                <ToolPage 
                  title="Compress PDF Under 2MB" 
                  description="Shrink your PDF to under 2MB for email attachments, portal submissions, and job applications."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/reduce-pdf-size-for-email" element={
                <ToolPage 
                  title="Reduce PDF Size for Email" 
                  description="Shrink large PDF documents so they send smoothly as email attachments without bounce-backs."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/pdf-to-jpg" element={
                <ToolPage 
                  title="PDF to JPG" 
                  description="Convert each page of your PDF into a downloadable JPG image."
                >
                  {(files, onReset) => <PDFToJPGTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/image-to-pdf" element={
                <ToolPage 
                  title="Image to PDF" 
                  description="Combine multiple images into one organized PDF document."
                  multiple
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                >
                  {(files, onReset) => <ImageToPDFTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/word-to-pdf" element={<Navigate to="/image-to-pdf" replace />} />

              <Route path="/pdf-to-word" element={
                <ToolPage 
                  title="PDF to Word" 
                  description="Convert your PDF into an editable Word (.docx) document."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-without-losing-formatting" element={
                <ToolPage 
                  title="Convert PDF to Word Without Losing Formatting" 
                  description="Convert PDF to an editable Word document while preserving fonts, tables, and layout. Free and online."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/scanned-pdf-to-word" element={
                <ToolPage 
                  title="Convert a Scanned PDF to an Editable Word Document" 
                  description="Turn scanned PDFs and image-based documents into editable Word files using OCR, free and online."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-free-no-email" element={
                <ToolPage 
                  title="Convert PDF to Word Free — No Email, No Sign-Up" 
                  description="Convert PDF to Word online for free. No email required, no account, no watermark."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-editable" element={
                <ToolPage 
                  title="Convert PDF to a Fully Editable Word Document" 
                  description="Turn a PDF into a Word file you can actually edit — text, tables, and formatting all stay editable."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-on-iphone" element={
                <ToolPage 
                  title="How to Convert PDF to Word on iPhone" 
                  description="Convert PDF to Word on your iPhone — no app needed. Free, fast, works right in Safari."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-with-tables" element={
                <ToolPage 
                  title="Convert a PDF With Tables Into an Editable Word Document" 
                  description="Convert PDF files containing tables into Word documents while keeping table structure and formatting intact."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-for-resume" element={
                <ToolPage 
                  title="Convert a PDF Resume to an Editable Word Document" 
                  description="Turn your PDF resume into an editable Word file so you can update it for each job application, free and online."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-multiple-pages" element={
                <ToolPage 
                  title="Convert Multi-Page PDFs to Word Documents" 
                  description="Convert PDFs of any length into a single Word document, free and online — no page limit."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-for-contracts" element={
                <ToolPage 
                  title="Convert a PDF Contract to an Editable Word Document" 
                  description="Turn a signed PDF contract into an editable Word document to revise terms or clauses, free and online."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-online-free" element={
                <ToolPage 
                  title="Convert PDF to Word Online, Free" 
                  description="Convert PDF to Word documents online for free. No software, no sign-up, no watermark."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-without-software" element={
                <ToolPage 
                  title="Convert PDF to Word Without Installing Any Software" 
                  description="Turn PDF files into Word documents online, no downloads or installations required. Works on any device."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-word-password-protected" element={
                <ToolPage 
                  title="Convert a Password-Protected PDF to Word" 
                  description="Learn how to convert a locked or password-protected PDF into an editable Word document, free and online."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/pdf-to-excel" element={
                <ToolPage 
                  title="Convert PDF to Excel" 
                  description="Convert PDF data into editable Excel spreadsheets."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/extract-tables-from-pdf-to-excel" element={
                <ToolPage 
                  title="Extract Tables from PDF to Excel" 
                  description="Extract rows, columns, and table data from text-based PDF files into editable Excel spreadsheets online."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-bank-statement-to-excel" element={
                <ToolPage 
                  title="Convert PDF Bank Statement to Excel" 
                  description="Convert text-based PDF bank statements to editable Excel spreadsheets for easier financial review and reconciliation."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/invoice-pdf-to-excel" element={
                <ToolPage 
                  title="Convert Invoice PDF to Excel" 
                  description="Convert text-based PDF invoices to Excel and organize line items, quantities, prices, and totals in an editable XLSX spreadsheet."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/financial-statement-pdf-to-excel" element={
                <ToolPage 
                  title="Financial Statement PDF to Excel" 
                  description="Convert text-based financial statement PDFs into editable Excel spreadsheets for reviewing tables, figures, expenses, and report data."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/multi-page-pdf-to-excel" element={
                <ToolPage 
                  title="Convert Multi-Page PDF to Excel" 
                  description="Convert data from multiple PDF pages into an editable Excel workbook online."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-excel-on-iphone" element={
                <ToolPage 
                  title="Convert PDF to Excel on iPhone" 
                  description="Convert a text-based PDF to an editable Excel spreadsheet on iPhone using Safari."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/pdf-to-xlsx-online" element={
                <ToolPage 
                  title="Convert PDF to XLSX Online" 
                  description="Convert text-based PDF data into a Microsoft Excel-compatible XLSX spreadsheet online for free."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/convert-pdf-data-to-excel" element={
                <ToolPage 
                  title="Convert PDF Data to Excel Online" 
                  description="Turn reusable text and numerical data from PDF documents into editable Excel rows and columns without manually retyping the information."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/edit" element={
                <ToolPage 
                  title="Edit PDF" 
                  description="Edit text, add annotations, and make changes directly in your PDF."
                >
                  {(files) => <EditTool file={files[0]} />}
                </ToolPage>
              } />
              <Route path="/edit-pdf" element={<Navigate to="/edit" replace />} />
              <Route path="/pdf-editor" element={<Navigate to="/edit" replace />} />

              <Route path="/rotate" element={
                <ToolPage 
                  title="Rotate PDF" 
                  description="Fix incorrectly oriented pages — rotate individually or all at once."
                >
                  {(files, onReset) => <RotateTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/rotate-pdf" element={<Navigate to="/rotate" replace />} />

              <Route path="/organise" element={
                <ToolPage 
                  title="Organize PDF" 
                  description="Drag and drop to reorder, merge multiple PDFs, insert blank pages, or rearrange pages in your document."
                  multiple
                >
                  {(files, onReset) => <OrganiseTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/organize" element={<Navigate to="/organise" replace />} />

              <Route path="/ocr" element={
                <ToolPage 
                  title="OCR PDF" 
                  description="Perform OCR text recognition on scanned PDF files."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/generate-image" element={<ImageGenPage />} />
              <Route path="/image-generator" element={<Navigate to="/generate-image" replace />} />

              <Route path="/transcribe" element={<AudioTranscribePage />} />
              <Route path="/audio-transcribe" element={<Navigate to="/transcribe" replace />} />

              {/* Authenticated AI Workspace Route (Protected by AuthGate) */}
              <Route path="/ai-workspace" element={
                <AuthGate>
                  <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center py-24">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                    </div>
                  }>
                    <AIWorkspacePage />
                  </Suspense>
                </AuthGate>
              } />

              {/* Informational & Legal Pages */}
              <Route path="/resources" element={<Resources />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
        </main>

        <Footer />
      </div>
    </RouterComponent>
   </AuthProvider>
  </LanguageProvider>
 </ThemeProvider>
  );
}

export default App;
