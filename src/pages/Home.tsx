import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../components/LanguageContext';
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
  Bot,
  Mic
} from 'lucide-react';

const tools = [
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

const aiTools = [
  {
    id: 'generate-image',
    name: 'AI Image Generator',
    description: 'Create stunning images from text descriptions using advanced AI models.',
    icon: <Sparkles className="w-10 h-10" />,
    path: '/generate-image',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10'
  },
  {
    id: 'transcribe',
    name: 'Audio Transcription',
    description: 'Convert voice recordings and audio files into accurate text transcripts.',
    icon: <Mic className="w-10 h-10" />,
    path: '/transcribe',
    color: 'bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10'
  }
];

export const Home = () => {
  const { t } = useLanguage();

  const localizedTools = tools.map(tool => {
    const keyId = tool.id.replace(/-/g, '_');
    return {
      ...tool,
      name: t(`tools.${keyId}.name`),
      description: t(`tools.${keyId}.description`)
    };
  });

  const localizedAiTools = aiTools.map(tool => {
    const keyId = tool.id === 'generate-image' ? 'image_gen' : tool.id;
    return {
      ...tool,
      name: t(`tools.${keyId}.name`),
      description: t(`tools.${keyId}.description`)
    };
  });

  return (
    <div className="flex flex-col space-y-24 pb-24">
      {/* Hero */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-colors">
        <div className="container-custom text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]"
          >
            {t('hero_title_1')}<span className="text-primary">{t('hero_title_2')}</span>{t('hero_title_3')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            {t('hero_desc')}
          </motion.p>
        </div>
      </section>

      {/* AI Tools Section */}
      <section className="container-custom">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bot className="text-primary w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('ai_powered_tools_heading')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {localizedAiTools.map((tool, index) => (
            <Link key={tool.id} to={tool.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-md hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] hover:border-primary/40 dark:hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${tool.color}`}>
                  {tool.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">{tool.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{tool.description}</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="text-primary w-5 h-5 animate-pulse" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Standard Tool Grid Section */}
      <section className="w-full">
        <div className="container-custom">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <LayoutGrid className="text-slate-600 dark:text-slate-300 w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('standard_pdf_tools_heading')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {localizedTools.map((tool, idx) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link 
                  to={tool.path}
                  className="group block h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 transition-all duration-300 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-1.5"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-550 group-hover:scale-110 ${tool.color}`}>
                    {tool.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">{tool.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {tool.description}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
