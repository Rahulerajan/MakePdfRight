import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../components/LanguageContext';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';
import { AdUnit } from '../components/ads/AdUnit';
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
    icon: <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/generate-image',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10',
    isAi: true
  },
  {
    id: 'transcribe',
    name: 'Audio Transcription',
    description: 'Convert voice recordings and audio files into accurate text transcripts.',
    icon: <Mic className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/transcribe',
    color: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10',
    isAi: true
  },
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document while preserving the original quality.',
    icon: <FileStack className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/merge',
    color: 'bg-red-50 text-red-500 dark:bg-red-500/10'
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Split a PDF into individual pages or custom page ranges with ease.',
    icon: <Scissors className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/split',
    color: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10'
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining the best possible document quality.',
    icon: <Zap className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/compress',
    color: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF files into fully editable Microsoft Word (.docx) documents with accurate formatting.',
    icon: <FileText className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/pdf-to-word',
    color: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Extract tables and convert PDF data into editable Microsoft Excel (.xlsx) spreadsheets.',
    icon: <Table className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/pdf-to-excel',
    color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert every page of your PDF into high-quality JPG images.',
    icon: <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/pdf-to-jpg',
    color: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, WEBP, BMP, and other supported image formats into a professional PDF document.',
    icon: <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/image-to-pdf',
    color: 'bg-teal-50 text-teal-500 dark:bg-teal-500/10'
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    description: 'Edit PDF files by adding text, images, signatures, annotations, shapes, and more.',
    icon: <Type className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/edit',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10'
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate one or multiple PDF pages to the correct orientation in seconds.',
    icon: <RotateCw className="w-7 h-7 sm:w-8 sm:h-8" />,
    path: '/rotate',
    color: 'bg-pink-50 text-pink-500 dark:bg-pink-500/10'
  },
  {
    id: 'organise',
    name: 'Organize PDF',
    description: 'Reorder, rotate, add, delete, extract, and manage PDF pages with an intuitive interface.',
    icon: <LayoutGrid className="w-7 h-7 sm:w-8 sm:h-8" />,
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
          paddingTop: 'clamp(12px, 2vh, 22px)',
          paddingBottom: 'clamp(14px, 2.2vh, 26px)'
        }}
      >
        <div className="container-custom text-center space-y-1.5 sm:space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.12]"
          >
            {t('hero_title_1')}<span className="text-primary">{t('hero_title_2')}</span>{t('hero_title_3')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t('hero_desc')}
          </motion.p>
        </div>
      </section>

      {/* Top Ad Unit Below Hero */}
      <div className="container-custom py-1 sm:py-1.5">
        <AdUnit format="top-banner" />
      </div>

      {/* PDF Tools Section */}
      <section id="tools" className="w-full pt-2 sm:pt-3 pb-8 sm:pb-10">
        <div className="container-custom">
          <div className="flex items-center gap-2.5 mb-3.5 justify-center md:justify-start">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <LayoutGrid className="text-slate-600 dark:text-slate-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('standard_pdf_tools_heading')}</h2>
          </div>
          <div className="tools-grid-responsive items-stretch">
            {localizedTools.map((tool, idx) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="h-full flex flex-col"
              >
                <Link 
                  to={tool.path}
                  className="group relative flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-4.5 transition-all duration-300 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] justify-between"
                >
                  <div className="flex flex-col items-center text-center w-full flex-1">
                    <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-105 ${tool.color}`}>
                      {tool.icon}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-primary transition-colors line-clamp-1 w-full text-center">
                      {tool.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-normal font-medium line-clamp-2 text-center w-full">
                      {tool.description}
                    </p>
                  </div>

                  <div className="w-full mt-auto pt-3">
                    <div className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 group-hover:bg-primary group-hover:text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 border border-slate-100 dark:border-slate-800">
                      <span>{getStartedText}</span>
                    </div>
                  </div>

                  {tool.isAi && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="text-primary w-4 h-4 animate-pulse" />
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* In-Content Ad Between Grid and FAQs */}
      <div className="container-custom py-2">
        <AdUnit format="in-content" />
      </div>

      {/* Homepage FAQ Section */}
      <section className="w-full py-12 bg-white dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="container-custom max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
              Everything you need to know about MakePDFRight tools and document security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Are my PDF files kept private?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Yes. All uploaded files are stored temporarily in isolated memory and automatically purged within 15 minutes. We never view, index, or sell document contents.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Is there any software installation required?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                No! All tools run directly in your web browser across desktop computers, tablets, and smartphones.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Is MakePDFRight free to use?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Yes! Every tool on MakePDFRight is 100% free with no registration or credit cards required.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">What file formats are supported?</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                We support PDF, DOCX, XLSX, JPG, PNG, WEBP, BMP, MP3, WAV, M4A, and AAC audio files.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
