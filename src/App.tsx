/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { LanguageProvider } from './components/LanguageContext';
import { Header, Footer } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ScrollToTop } from './components/common/ScrollToTop';

// Lazy load tools and ToolPage container to optimize initial bundle size and loading speed
const ToolPage = lazy(() => import('./components/common/ToolPage').then(m => ({ default: m.ToolPage })));
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
const ImageGenTool = lazy(() => import('./tools/ImageGenTool').then(m => ({ default: m.ImageGenTool })));
const AudioTranscribeTool = lazy(() => import('./tools/AudioTranscribeTool').then(m => ({ default: m.AudioTranscribeTool })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy').then(m => ({ default: m.CookiePolicy })));
const Disclaimer = lazy(() => import('./pages/Disclaimer').then(m => ({ default: m.Disclaimer })));
import { StickyMobileAd } from './components/ads/AdUnit';

// A sleek, minimal, high-performance page loader skeleton fallback
const PageLoader = () => (
  <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center space-y-4">
    <div className="relative w-10 h-10">
      <svg className="w-full h-full animate-spin text-primary" viewBox="0 0 50 50">
        <circle className="opacity-15" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="3.5" fill="none" />
        <path className="opacity-90" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" d="M25,5a20,20 0 0,1 20,20" />
      </svg>
      <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-primary/20 dark:bg-primary/40 rounded-full animate-pulse" />
    </div>
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 animate-pulse">Loading tool...</span>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300 text-slate-900 dark:text-slate-100 overflow-x-hidden">
            <Header />
        
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<PageLoader />}>
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

              <Route path="/pdf-to-excel" element={
                <ToolPage 
                  title="PDF to Excel" 
                  description="Convert PDF tables and data into an editable Excel (.xlsx) file."
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
                  description="Drag and drop to reorder, remove, or rearrange pages in your PDF."
                >
                  {(files, onReset) => <OrganiseTool file={files[0]} onReset={onReset} />}
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

              <Route path="/generate-image" element={
                <div className="min-h-[calc(100dvh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors py-6 md:py-16 px-3 md:px-6">
                  <div className="container-custom !px-1 md:!px-6">
                    <ImageGenTool />
                  </div>
                </div>
              } />
              <Route path="/image-generator" element={<Navigate to="/generate-image" replace />} />

              <Route path="/transcribe" element={
                <div className="flex-1 flex flex-col justify-start bg-slate-50 dark:bg-slate-900/50 transition-colors py-4 md:py-8 px-4 md:px-8">
                  <div className="max-w-6xl w-full mx-auto">
                    <AudioTranscribeTool />
                  </div>
                </div>
              } />
              <Route path="/audio-transcribe" element={<Navigate to="/transcribe" replace />} />

              {/* Informational & Legal Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        <StickyMobileAd />
      </div>
    </Router>
   </LanguageProvider>
  </ThemeProvider>
  );
}
