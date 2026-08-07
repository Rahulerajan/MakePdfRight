/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { LanguageProvider } from './components/LanguageContext';
import { Header, Footer } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ToolPage } from './components/common/ToolPage';
import { ScrollToTop } from './components/common/ScrollToTop';

// Lazy load tools to optimize initial bundle size and loading speed
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
          <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300 text-slate-900 dark:text-slate-100">
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
              <Route path="/merge-pdf" element={
                <ToolPage 
                  title="Merge PDF" 
                  description="Combine multiple PDF files into one document in seconds."
                  multiple
                >
                  {(files, onReset) => <MergeTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/split" element={
                <ToolPage 
                  title="Split PDF" 
                  description="Extract pages from your PDF or split it into multiple files."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/split-pdf" element={
                <ToolPage 
                  title="Split PDF" 
                  description="Extract pages from your PDF or split it into multiple files."
                >
                  {(files, onReset) => <SplitTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/compress" element={
                <ToolPage 
                  title="Compress PDF" 
                  description="Reduce the size of your PDF while maintaining quality."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/compress-pdf" element={
                <ToolPage 
                  title="Compress PDF" 
                  description="Reduce the size of your PDF while maintaining quality."
                  multiple
                >
                  {(files, onReset) => <CompressTool file={files[0]} initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/pdf-to-jpg" element={
                <ToolPage 
                  title="PDF to JPG" 
                  description="Convert PDF pages into high-quality JPG images."
                >
                  {(files, onReset) => <PDFToJPGTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/image-to-pdf" element={
                <ToolPage 
                  title="Image to PDF" 
                  description="Convert JPG and PNG images to PDF in seconds."
                  multiple
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                >
                  {(files, onReset) => <ImageToPDFTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/word-to-pdf" element={
                <ToolPage 
                  title="Image to PDF" 
                  description="Convert Word and image documents to PDF in seconds."
                  multiple
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
                >
                  {(files, onReset) => <ImageToPDFTool initialFiles={files} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/pdf-to-word" element={
                <ToolPage 
                  title="PDF to Word" 
                  description="Convert your PDF to an editable Word document."
                >
                  {(files, onReset) => <PDFToWordTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/pdf-to-excel" element={
                <ToolPage 
                  title="PDF to Excel" 
                  description="Extract tables and data from PDF to Excel spreadsheets."
                >
                  {(files, onReset) => <PDFToExcelTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/edit" element={
                <ToolPage 
                  title="Edit PDF" 
                  description="Modify text and add images to your PDF document."
                >
                  {(files) => <EditTool file={files[0]} />}
                </ToolPage>
              } />
              <Route path="/edit-pdf" element={
                <ToolPage 
                  title="Edit PDF" 
                  description="Modify text and add images to your PDF document."
                >
                  {(files) => <EditTool file={files[0]} />}
                </ToolPage>
              } />

              <Route path="/rotate" element={
                <ToolPage 
                  title="Rotate PDF" 
                  description="Rotate your PDF pages and save them permanently."
                >
                  {(files, onReset) => <RotateTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />
              <Route path="/rotate-pdf" element={
                <ToolPage 
                  title="Rotate PDF" 
                  description="Rotate your PDF pages and save them permanently."
                >
                  {(files, onReset) => <RotateTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/organise" element={
                <ToolPage 
                  title="Organize PDF" 
                  description="Reorder, rotate, and delete pages from your PDF."
                >
                  {(files, onReset) => <OrganiseTool file={files[0]} onReset={onReset} />}
                </ToolPage>
              } />

              <Route path="/ocr" element={
                <ToolPage 
                  title="PDF to Word" 
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

              <Route path="/transcribe" element={
                <div className="flex-1 flex flex-col justify-start bg-slate-50 dark:bg-slate-900/50 transition-colors py-4 md:py-8 px-4 md:px-8">
                  <div className="max-w-6xl w-full mx-auto">
                    <AudioTranscribeTool />
                  </div>
                </div>
              } />

              {/* Informational & Legal Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
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
