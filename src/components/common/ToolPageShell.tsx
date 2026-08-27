import React from 'react';
import { motion } from 'framer-motion';
import { SEO } from './SEO';
import { SEO_DATA } from '../../constants/seoData';
import { ToolSEOContent } from '../seo/ToolSEOContent';
import { TOOL_SEO_CONTENT_MAP } from '../../constants/toolSeoData';
import { BackButton } from './BackButton';
import { useLanguage } from '../LanguageContext';
import { useLocation } from 'react-router-dom';

interface ToolPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  isWorkspaceActive?: boolean;
}

export const ToolPageShell: React.FC<ToolPageShellProps> = ({
  title,
  description,
  children,
  isWorkspaceActive = false
}) => {
  const { t } = useLanguage();
  const location = useLocation();

  // Map English tool title to localized versions
  const keyMap: Record<string, string> = {
    'Merge PDF': 'merge',
    'Split PDF': 'split',
    'Compress PDF': 'compress',
    'PDF to JPG': 'pdf_to_jpg',
    'Image to PDF': 'image_to_pdf',
    'PDF to Word': 'pdf_to_word',
    'PDF to Excel': 'pdf_to_excel',
    'Convert PDF to Excel': 'pdf_to_excel',
    'Edit PDF': 'edit',
    'Rotate PDF': 'rotate',
    'Organize PDF': 'organise',
    'OCR PDF': 'ocr',
    'AI Image Generator': 'generate_image',
    'Audio Transcribe': 'transcribe'
  };
  const baseKey = keyMap[title];
  const displayTitle = baseKey ? t(`tool.${baseKey}.title`) : title;
  const displayDesc = baseKey ? t(`tool.${baseKey}.desc`) : description;

  const routeSeo = SEO_DATA[location.pathname];
  const seoTitle = routeSeo?.title || `${title} – Online Free | MakePDFRight`;
  const seoDesc = routeSeo?.description || description;
  const toolSeoContent = TOOL_SEO_CONTENT_MAP[location.pathname] || (baseKey ? TOOL_SEO_CONTENT_MAP[`/${baseKey}`] : (baseKey === 'pdf_to_excel' ? TOOL_SEO_CONTENT_MAP['/pdf-to-excel'] : undefined));

  return (
    <div className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-colors ${!isWorkspaceActive ? 'min-h-[calc(100dvh-72px)]' : 'h-[calc(100dvh-72px)] overflow-hidden'}`}>
      <SEO 
        title={seoTitle} 
        description={seoDesc} 
        canonicalUrl={routeSeo?.canonicalUrl}
        ogImage={routeSeo?.ogImage}
        ogImageAlt={routeSeo?.ogImageAlt}
        twitterTitle={routeSeo?.twitterTitle}
        twitterDescription={routeSeo?.twitterDescription}
        twitterImage={routeSeo?.twitterImage}
        twitterImageAlt={routeSeo?.twitterImageAlt}
        keywords={routeSeo?.keywords}
        author={routeSeo?.author}
        robots={routeSeo?.robots}
        toolName={title}
        faqs={toolSeoContent?.faqs}
      />

      {!isWorkspaceActive ? (
        <div className="flex-1 py-4 sm:py-6 md:py-10 px-4 md:px-6 flex flex-col justify-start md:justify-center">
          <div className="container-custom relative w-full pt-1 sm:pt-0">
            <div className="mb-4 sm:mb-6 max-w-6xl mx-auto">
              <BackButton label={t('back_home')} />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full flex items-start justify-center max-w-7xl mx-auto"
            >
              {/* Main Content Column */}
              <div className="flex-1 max-w-2xl min-w-0 space-y-6 md:space-y-8">
                <div className="text-center space-y-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {displayTitle}
                  </h1>
                  <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                    {displayDesc}
                  </p>
                </div>

                {/* Primary Interaction Area (Synchronous UploadCard / Input) */}
                {children}

                {/* Comprehensive Tool SEO Content */}
                {toolSeoContent && (
                  <ToolSEOContent data={toolSeoContent} />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            {children}
          </motion.div>
        </div>
      )}
    </div>
  );
};
