import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileQuestion, 
  Home, 
  ArrowRight, 
  Layers, 
  Scissors, 
  Minimize2, 
  FileText, 
  Edit3, 
  Image, 
  Sparkles 
} from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const NotFound: React.FC = () => {
  const popularTools = [
    {
      title: 'Merge PDF',
      path: '/merge',
      desc: 'Combine multiple PDF documents into a single organized file.',
      icon: Layers,
      badge: 'Popular',
    },
    {
      title: 'Split PDF',
      path: '/split',
      desc: 'Extract specific pages or split multi-page PDF documents.',
      icon: Scissors,
      badge: 'Popular',
    },
    {
      title: 'Compress PDF',
      path: '/compress',
      desc: 'Reduce file size while preserving document visual quality.',
      icon: Minimize2,
      badge: 'Popular',
    },
    {
      title: 'PDF to Word',
      path: '/pdf-to-word',
      desc: 'Convert PDF files into fully editable Microsoft Word documents.',
      icon: FileText,
      badge: 'Fast',
    },
    {
      title: 'Edit PDF',
      path: '/edit',
      desc: 'Add text, signatures, annotations, and images directly to PDFs.',
      icon: Edit3,
      badge: 'Tool',
    },
    {
      title: 'Image to PDF',
      path: '/image-to-pdf',
      desc: 'Convert JPG, PNG, and WebP images into clean PDF documents.',
      icon: Image,
      badge: 'Free',
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO 
        title="Page Not Found (404) | MakePDFRight" 
        description="The page you requested could not be found. Explore our free PDF tools including Merge PDF, Split PDF, Compress PDF, and PDF Editor." 
      />
      <div className="max-w-4xl w-full mx-auto text-center space-y-10">
        
        {/* Main 404 Hero Section */}
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <FileQuestion className="w-4 h-4" />
            <span>404 Error</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
              Page Not Found
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              We couldn't find the page you're looking for. It might have been moved, renamed, or the link you followed may be broken.
            </p>
          </div>

          <div className="pt-2">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              <span>Back to Homepage</span>
            </Link>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Navigation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Try one of our popular PDF tools
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Continue working with your documents right away.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {popularTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="group bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all duration-200 flex flex-col justify-between text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {tool.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 flex items-center text-xs font-semibold text-primary opacity-90 group-hover:opacity-100">
                    <span>Use tool</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
