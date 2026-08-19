import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useLanguage, Language } from '../LanguageContext';
import { 
  FileText, 
  ChevronDown,
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
  Mic,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { preloadTool } from '../../utils/preloadTools';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Header = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const isDark = theme === 'dark';
  const location = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const navItems = [
    { 
      label: 'All Tools', 
      id: 'all',
      tools: [
        { name: 'Merge PDF', path: '/merge', icon: <FileStack className="w-4 h-4" /> },
        { name: 'Split PDF', path: '/split', icon: <Scissors className="w-4 h-4" /> },
        { name: 'Organize PDF', path: '/organise', icon: <LayoutGrid className="w-4 h-4" /> },
        { name: 'Rotate PDF', path: '/rotate', icon: <RotateCw className="w-4 h-4" /> },
      ]
    },
    { 
      label: 'Media Tools', 
      id: 'ai',
      tools: [
        { name: 'Image Generator', path: '/generate-image', icon: <Sparkles className="w-4 h-4" /> },
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

  const languagesList = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const currentLang = languagesList.find(l => l.code === language) || languagesList[0];

  const getLabelKey = (label: string) => {
    const map: Record<string, string> = {
      'All Tools': 'all_tools',
      'AI Tools': 'ai_tools',
      'Media Tools': 'ai_tools',
      'Compress': 'compress',
      'Convert': 'convert',
      'Edit': 'edit'
    };
    return map[label] || label.toLowerCase();
  };

  const getToolKey = (name: string) => {
    const map: Record<string, string> = {
      'Merge PDF': 'tools.merge.name',
      'Split PDF': 'tools.split.name',
      'Organize PDF': 'tools.organise.name',
      'Rotate PDF': 'tools.rotate.name',
      'Image Generator': 'tools.image_gen.name',
      'AI Image Gen': 'tools.image_gen.name',
      'AI Image Generator': 'tools.image_gen.name',
      'Transcribe': 'tools.transcribe.name',
      'Compress PDF': 'tools.compress.name',
      'PDF to Word': 'tools.pdf_to_word.name',
      'PDF to Excel': 'tools.pdf_to_excel.name',
      'PDF to JPG': 'tools.pdf_to_jpg.name',
      'Image to PDF': 'tools.image_to_pdf.name',
      'Edit PDF': 'tools.edit.name'
    };
    return map[name] || name;
  };

  // Prevent Page Scrolling when Mobile Menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Trap keyboard focus and listen for escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsLangOpen(false);
        triggerButtonRef.current?.focus();
      }

      if (e.key === 'Tab' && isMobileMenuOpen && mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-[100] w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[72px] flex items-center transition-colors duration-300">
      <div className="container-custom w-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">MakePDFRight</span>
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
              <button className="flex items-center gap-1 text-[15px] font-semibold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors focus:outline-none">
                {t(getLabelKey(item.label))}
                <ChevronDown className={cn("w-4 h-4 transition-transform", activeDropdown === item.id && "rotate-180")} />
              </button>

              {activeDropdown === item.id && (
                <div
                  className="absolute top-[72px] left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 overflow-hidden animate-fade-in-up"
                >
                  {item.tools.map((tool) => (
                    <Link
                      key={tool.path}
                      to={tool.path}
                      onMouseEnter={() => preloadTool(tool.path)}
                      onFocus={() => preloadTool(tool.path)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-all group"
                    >
                      <span className="text-slate-400 group-hover:text-primary transition-colors">{tool.icon}</span>
                      <span className="text-sm font-medium">{t(getToolKey(tool.name))}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
          
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full cursor-pointer transition-colors focus:outline-none"
              title="Select Language"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{currentLang.code}</span>
            </button>

            {isLangOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsLangOpen(false)} 
                />
                <div
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 overflow-hidden animate-fade-in-up"
                >
                  {languagesList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as Language);
                        setIsLangOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer focus:outline-none",
                        language === lang.code 
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      {language === lang.code && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            id="darkToggle"
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
            title={isDark ? t('dark_mode_light') : t('dark_mode_dark')}
          >
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Hamburger Menu Button - Rotating & Morphing Custom Morph Design */}
          <button 
            ref={triggerButtonRef}
            className="lg:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-300 relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer focus:outline-none z-[110]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={t('toggle_menu')}
          >
            <div className={cn("relative w-6 h-6 flex items-center justify-center transition-transform duration-300", isMobileMenuOpen && "rotate-90")}>
              <span className={cn("absolute w-5 h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5")} />
              <span className={cn("absolute w-5 h-0.5 bg-current rounded-full transition-all duration-200", isMobileMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100")} />
              <span className={cn("absolute w-5 h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5")} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu & Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Blur & Semi-transparent Dark/Light Overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/20 dark:bg-slate-950/50 backdrop-blur-sm z-[95] lg:hidden transition-opacity duration-200"
          />

          {/* Menu Panel */}
          <div
            ref={mobileMenuRef}
            className="fixed top-20 right-4 bottom-4 w-[calc(100%-32px)] max-w-sm bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl p-6 overflow-y-auto z-[100] lg:hidden flex flex-col gap-8 select-none animate-fade-in-up"
          >
            {/* Staggered Navigation Items */}
            <div className="flex flex-col gap-6 flex-1">
              {navItems.map((item) => (
                <div 
                  key={item.id} 
                  className="space-y-3"
                >
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                    {t(getLabelKey(item.label))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {item.tools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        onMouseEnter={() => preloadTool(tool.path)}
                        onFocus={() => preloadTool(tool.path)}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 transition-colors group"
                      >
                        <span className="text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">{tool.icon}</span>
                        <span className="font-semibold text-sm">{t(getToolKey(tool.name))}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Language Selector inside floating panel */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Language</div>
              <div className="grid grid-cols-2 gap-2">
                {languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as Language);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      language === lang.code 
                        ? "bg-primary text-white border-primary shadow-sm shadow-primary/25" 
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 pt-12 pb-8 mt-auto transition-colors">
      <div className="container-custom space-y-10">
        
        {/* Main Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Brand & Security Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">MakePDFRight</span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-sm">
              The premier suite of fast, private, and free online PDF and AI processing tools. Edit, merge, convert, split, transcribe, and generate images directly in your browser.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>🔒 100% Secure • Files auto-deleted in 15 mins</span>
              </div>
            </div>
          </div>

          {/* Column 1: PDF Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">PDF Tools</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li><Link to="/merge" onMouseEnter={() => preloadTool('/merge')} onFocus={() => preloadTool('/merge')} className="hover:text-primary transition-colors">Merge PDF</Link></li>
              <li><Link to="/split" onMouseEnter={() => preloadTool('/split')} onFocus={() => preloadTool('/split')} className="hover:text-primary transition-colors">Split PDF</Link></li>
              <li><Link to="/compress" onMouseEnter={() => preloadTool('/compress')} onFocus={() => preloadTool('/compress')} className="hover:text-primary transition-colors">Compress PDF</Link></li>
              <li><Link to="/edit" onMouseEnter={() => preloadTool('/edit')} onFocus={() => preloadTool('/edit')} className="hover:text-primary transition-colors">Edit PDF</Link></li>
              <li><Link to="/organise" onMouseEnter={() => preloadTool('/organise')} onFocus={() => preloadTool('/organise')} className="hover:text-primary transition-colors">Organize PDF</Link></li>
              <li><Link to="/rotate" onMouseEnter={() => preloadTool('/rotate')} onFocus={() => preloadTool('/rotate')} className="hover:text-primary transition-colors">Rotate PDF</Link></li>
            </ul>
          </div>

          {/* Column 2: Convert & AI Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Convert & AI</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li><Link to="/pdf-to-word" onMouseEnter={() => preloadTool('/pdf-to-word')} onFocus={() => preloadTool('/pdf-to-word')} className="hover:text-primary transition-colors">PDF to Word</Link></li>
              <li><Link to="/pdf-to-excel" onMouseEnter={() => preloadTool('/pdf-to-excel')} onFocus={() => preloadTool('/pdf-to-excel')} className="hover:text-primary transition-colors">PDF to Excel</Link></li>
              <li><Link to="/pdf-to-jpg" onMouseEnter={() => preloadTool('/pdf-to-jpg')} onFocus={() => preloadTool('/pdf-to-jpg')} className="hover:text-primary transition-colors">PDF to JPG</Link></li>
              <li><Link to="/image-to-pdf" onMouseEnter={() => preloadTool('/image-to-pdf')} onFocus={() => preloadTool('/image-to-pdf')} className="hover:text-primary transition-colors">Image to PDF</Link></li>
              <li><Link to="/generate-image" onMouseEnter={() => preloadTool('/generate-image')} onFocus={() => preloadTool('/generate-image')} className="hover:text-primary transition-colors flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" />AI Image Gen</Link></li>
              <li><Link to="/transcribe" onMouseEnter={() => preloadTool('/transcribe')} onFocus={() => preloadTool('/transcribe')} className="hover:text-primary transition-colors flex items-center gap-1.5"><Mic className="w-3 h-3 text-cyan-500" />Audio Transcribe</Link></li>
            </ul>
          </div>

          {/* Column 3: Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Company & Legal</h4>
            <ul className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              <li><Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} MakePDFRight. All rights reserved. Built for Privacy & Speed.
          </div>
        </div>

      </div>
    </footer>
  );
};
