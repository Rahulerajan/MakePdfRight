import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    description: 'Combine PDFs in the order you want with the easiest PDF merger available.',
    icon: <FileStack className="w-10 h-10" />,
    path: '/merge',
    color: 'bg-red-50 text-red-500 dark:bg-red-500/10'
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    icon: <Scissors className="w-10 h-10" />,
    path: '/split',
    color: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10'
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size while optimizing for maximal PDF quality.',
    icon: <Zap className="w-10 h-10" />,
    path: '/compress',
    color: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents.',
    icon: <FileText className="w-10 h-10" />,
    path: '/pdf-to-word',
    color: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    description: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.',
    icon: <Table className="w-10 h-10" />,
    path: '/pdf-to-excel',
    color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Extract all images from a PDF or convert each page to a JPG image.',
    icon: <ImageIcon className="w-10 h-10" />,
    path: '/pdf-to-jpg',
    color: 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG and other images to PDF in seconds.',
    icon: <ImageIcon className="w-10 h-10" />,
    path: '/image-to-pdf',
    color: 'bg-teal-50 text-teal-500 dark:bg-teal-500/10'
  },
  {
    id: 'edit',
    name: 'Edit PDF',
    description: 'Add text, images, shapes or freehand annotations to a PDF document.',
    icon: <Type className="w-10 h-10" />,
    path: '/edit',
    color: 'bg-violet-50 text-violet-500 dark:bg-violet-500/10'
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!',
    icon: <RotateCw className="w-10 h-10" />,
    path: '/rotate',
    color: 'bg-pink-50 text-pink-500 dark:bg-pink-500/10'
  },
  {
    id: 'organise',
    name: 'Organise PDF',
    description: 'Sort, add and delete PDF pages. Rotate and reorder them as you need.',
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
            Make Your <span className="text-primary">PDFs</span> Right.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Every tool you need to work with PDFs in one place. 100% free, secure, and powered by AI.
          </motion.p>
        </div>
      </section>

      {/* AI Tools Section */}
      <section className="container-custom">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bot className="text-primary w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">AI Powered Tools</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aiTools.map((tool, index) => (
            <Link key={tool.id} to={tool.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
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
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Standard PDF Tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {tools.map((tool, idx) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link 
                  to={tool.path}
                  className="group block h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 transition-all duration-300 hover:border-primary dark:hover:border-primary hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 ${tool.color}`}>
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
