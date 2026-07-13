/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Footer } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ToolPage } from './components/common/ToolPage';
import { MergeTool } from './tools/MergeTool';
import { SplitTool } from './tools/SplitTool';
import { CompressTool } from './tools/CompressTool';
import { PDFToJPGTool } from './tools/PDFToJPGTool';
import { PDFToWordTool } from './tools/PDFToWordTool';
import { PDFToExcelTool } from './tools/PDFToExcelTool';
import { EditTool } from './tools/EditTool';
import { OrganiseTool } from './tools/OrganiseTool';
import { RotateTool } from './tools/RotateTool';
import { ImageToPDFTool } from './tools/ImageToPDFTool';
import { ImageGenTool } from './tools/ImageGenTool';
import { AudioTranscribeTool } from './tools/AudioTranscribeTool';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0a0a0a] transition-colors duration-300">
        <Header />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            
            <Route path="/merge" element={
              <ToolPage 
                title="Merge PDF" 
                description="Combine multiple PDF files into one document in seconds."
                multiple
              >
                {(files) => <MergeTool initialFiles={files} />}
              </ToolPage>
            } />

            <Route path="/split" element={
              <ToolPage 
                title="Split PDF" 
                description="Extract pages from your PDF or split it into multiple files."
              >
                {(files) => <SplitTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/compress" element={
              <ToolPage 
                title="Compress PDF" 
                description="Reduce the size of your PDF while maintaining quality."
              >
                {(files) => <CompressTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/pdf-to-jpg" element={
              <ToolPage 
                title="PDF to JPG" 
                description="Convert PDF pages into high-quality JPG images."
              >
                {(files) => <PDFToJPGTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/image-to-pdf" element={
              <ToolPage 
                title="Image to PDF" 
                description="Convert JPG and PNG images to PDF in seconds."
                multiple
                accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }}
              >
                {(files) => <ImageToPDFTool initialFiles={files} />}
              </ToolPage>
            } />

            <Route path="/pdf-to-word" element={
              <ToolPage 
                title="PDF to Word" 
                description="Convert your PDF to an editable Word document."
              >
                {(files) => <PDFToWordTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/pdf-to-excel" element={
              <ToolPage 
                title="PDF to Excel" 
                description="Extract tables and data from PDF to Excel spreadsheets."
              >
                {(files) => <PDFToExcelTool file={files[0]} />}
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

            <Route path="/rotate" element={
              <ToolPage 
                title="Rotate PDF" 
                description="Rotate your PDF pages and save them permanently."
              >
                {(files) => <RotateTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/organise" element={
              <ToolPage 
                title="Organise PDF" 
                description="Reorder, rotate, and delete pages from your PDF."
              >
                {(files) => <OrganiseTool file={files[0]} />}
              </ToolPage>
            } />

            <Route path="/generate-image" element={
              <div className="min-h-[calc(100vh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors py-16 px-6">
                <div className="container-custom">
                  <ImageGenTool />
                </div>
              </div>
            } />

            <Route path="/transcribe" element={
              <div className="min-h-[calc(100vh-72px)] flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors py-16 px-6">
                <div className="container-custom">
                  <AudioTranscribeTool />
                </div>
              </div>
            } />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
