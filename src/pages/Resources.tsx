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
  Table, 
  Layers, 
  ArrowRight,
  Sparkles,
  Scissors,
  RotateCw,
  FileStack
} from 'lucide-react';

import { GUIDES, guidePath } from '../constants/guides';

export const Resources: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredGuides = selectedCategory === 'all'
    ? GUIDES
    : GUIDES.filter(g => g.category === selectedCategory);


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
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
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
                <Link
                  to={guidePath(guide.id)}
                  aria-label={`Read ${guide.title}`}
                  className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Full Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
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
