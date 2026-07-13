import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  FileStack,
  Scissors,
  Zap,
  Table,
  Image as ImageIcon,
  Type,
  LayoutGrid,
  RotateCw,
  Sparkles,
  Mic
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Header = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      // Default to DARK as per requirement
      return true;
    }
    return true;
  });
  const location = useLocation();

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = isDark ? 'dark' : 'light';
    
    // Apply both class (for Tailwind) and data-theme (for consistency with snippet)
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDark]);

  const navItems = [
    { 
      label: 'All Tools', 
      id: 'all',
      tools: [
        { name: 'Merge PDF', path: '/merge', icon: <FileStack className="w-4 h-4" /> },
        { name: 'Split PDF', path: '/split', icon: <Scissors className="w-4 h-4" /> },
        { name: 'Organise PDF', path: '/organise', icon: <LayoutGrid className="w-4 h-4" /> },
        { name: 'Rotate PDF', path: '/rotate', icon: <RotateCw className="w-4 h-4" /> },
      ]
    },
    { 
      label: 'AI Tools', 
      id: 'ai',
      tools: [
        { name: 'AI Image Gen', path: '/generate-image', icon: <Sparkles className="w-4 h-4" /> },
        { name: 'Transcribe', path: '/transcribe', icon: <Mic className="w-4 h-4" /> },
      ]
    },
    { 
      label: 'Compress', 
      id: 'compress',
      tools: [
        { name: 'Compress PDF', path: '/compress', icon: <Zap className="w-4 h-4" /> },
      ]
    },
    { 
      label: 'Convert', 
      id: 'convert',
      tools: [
        { name: 'PDF to Word', path: '/pdf-to-word', icon: <FileText className="w-4 h-4" /> },
        { name: 'PDF to Excel', path: '/pdf-to-excel', icon: <Table className="w-4 h-4" /> },
        { name: 'PDF to JPG', path: '/pdf-to-jpg', icon: <ImageIcon className="w-4 h-4" /> },
        { name: 'Image to PDF', path: '/image-to-pdf', icon: <ImageIcon className="w-4 h-4" /> },
      ]
    },
    { 
      label: 'Edit', 
      id: 'edit',
      tools: [
        { name: 'Edit PDF', path: '/edit', icon: <Type className="w-4 h-4" /> },
      ]
    },
  ];

  return (
    <header className="sticky top-0 z-[100] w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[72px] flex items-center transition-colors duration-300">
      <div className="container-custom w-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">MakePDFRight</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 h-full">
          {navItems.map((item) => (
            <div 
              key={item.id}
              className="relative h-[72px] flex items-center"
              onMouseEnter={() => setActiveDropdown(item.id)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 text-[15px] font-semibold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors">
                {item.label}
                <ChevronDown className={cn("w-4 h-4 transition-transform", activeDropdown === item.id && "rotate-180")} />
              </button>

              <AnimatePresence>
                {activeDropdown === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-[72px] left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 overflow-hidden"
                  >
                    {item.tools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-all group"
                      >
                        <span className="text-slate-400 group-hover:text-primary transition-colors">{tool.icon}</span>
                        <span className="text-sm font-medium">{tool.name}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">EN</span>
          </div>

          <button
            id="darkToggle"
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <Moon className="w-5 h-5" />
          </button>

          <button 
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 top-[72px] bg-white dark:bg-slate-900 z-[90] lg:hidden overflow-y-auto"
          >
            <div className="p-6 flex flex-col gap-6">
              {navItems.map((item) => (
                <div key={item.id} className="space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
                  <div className="flex flex-col gap-2">
                    {item.tools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                      >
                        {tool.icon}
                        <span className="font-semibold">{tool.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export const Footer = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (!isHome) return null;

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 mt-auto">
      <div className="container-custom text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="text-primary w-6 h-6" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">MakePDFRight</span>
        </div>
        <p className="text-sm font-medium text-slate-400">
          Made with ❤️ from Kerala
        </p>
      </div>
    </footer>
  );
};
