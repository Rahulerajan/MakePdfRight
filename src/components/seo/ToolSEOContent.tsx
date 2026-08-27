/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  AlertTriangle, 
  Wrench, 
  ClipboardCheck,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FAQItem } from '../common/SEO';

export interface ToolSEOData {
  toolName: string;
  category: string;
  overview: string;
  topBody?: string[];
  specs?: {
    inputFormats: string;
    outputFormat: string;
    maxSize: string;
    processingMethod: string;
  };
  howItWorks: { step: number; title: string; desc: string }[];
  benefits: { title: string; desc: string }[];
  useCases: string[];
  limitations?: string[];
  troubleshooting?: { problem: string; solution: string }[];
  verificationChecklist?: string[];
  faqs: FAQItem[];
  relatedTools: { name: string; path: string; desc: string }[];
}

interface ToolSEOContentProps {
  data: ToolSEOData;
}

export const ToolSEOContent: React.FC<ToolSEOContentProps> = ({ data }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 md:mt-20 space-y-12 sm:space-y-16 text-slate-700 dark:text-slate-300">
      
      {/* Overview & Security Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              About {data.toolName}
            </h2>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {data.category} • Browser-First Architecture
            </span>
          </div>
        </div>

        <p className="text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
          {data.overview}
        </p>

        {data.topBody && data.topBody.length > 0 && (
          <div className="space-y-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            {data.topBody.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        )}

        {/* Technical Specifications Bar */}
        {data.specs && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div>
              <span className="block text-slate-400 font-medium">Input Formats</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.specs.inputFormats}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Output Format</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.specs.outputFormat}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Size Threshold</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.specs.maxSize}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Execution Engine</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.specs.processingMethod}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Client-First Memory Sandbox</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span>High-Speed Local Execution</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Zero Document Retention</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How to Use {data.toolName}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Follow three simple steps to process your files securely in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.howItWorks.map((step) => (
            <div 
              key={step.step}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold text-lg flex items-center justify-center mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Benefits */}
      <section className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
          Why Choose MakePDFRight for {data.toolName}?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.benefits.map((b, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {b.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common Use Cases */}
      {data.useCases && data.useCases.length > 0 && (
        <section className="bg-slate-100/70 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Common Use Cases
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.useCases.map((useCase, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Technical Limitations & Guidance */}
      {data.limitations && data.limitations.length > 0 && (
        <section className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Technical Considerations & Limitations
          </h2>
          <ul className="space-y-2.5">
            {data.limitations.map((lim, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-300/90 leading-relaxed font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Troubleshooting Common Issues */}
      {data.troubleshooting && data.troubleshooting.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Troubleshooting Common Issues
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.troubleshooting.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-start gap-2">
                  <span className="text-rose-500 font-bold shrink-0">Issue:</span>
                  <span>{item.problem}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                  <strong className="text-slate-800 dark:text-slate-200">Fix:</strong> {item.solution}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Post-Processing Quality Validation Checklist */}
      {data.verificationChecklist && data.verificationChecklist.length > 0 && (
        <section className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Quality Verification Checklist
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Before sharing or archiving your processed file, confirm these points:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.verificationChecklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Frequently Asked Questions */}
      {data.faqs && data.faqs.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-center">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {data.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-base sm:text-lg text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Tools */}
      {data.relatedTools && data.relatedTools.length > 0 && (
        <section className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Explore Related PDF & Document Tools
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {data.relatedTools.map((rt, i) => (
              <Link 
                key={i} 
                to={rt.path}
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary dark:hover:border-primary rounded-2xl transition-all shadow-sm flex flex-col h-full justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors text-sm mb-1">
                    {rt.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {rt.desc}
                  </p>
                </div>
                <div className="mt-auto pt-3 text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
