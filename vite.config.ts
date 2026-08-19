import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function asyncCssPlugin() {
  return {
    name: 'async-css-plugin',
    transformIndexHtml(html: string) {
      return html.replace(
        /<link rel="stylesheet"([^>]*href="[^"]+\.css"[^>]*)>/g,
        '<link rel="stylesheet"$1 media="print" onload="this.media=\'all\'" /><noscript><link rel="stylesheet"$1 /></noscript>'
      );
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), asyncCssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1200,
      modulePreload: {
        polyfill: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) {
                return 'vendor-pdfjs';
              }
              if (
                id.includes('@pdf-lib/standard-fonts') ||
                id.includes('@pdf-lib/upng') ||
                id.includes('pako') ||
                id.includes('fontkit') ||
                id.includes('pdf-lib/es/core/embedders/StandardFont') ||
                id.includes('pdf-lib/cjs/core/embedders/StandardFont') ||
                id.includes('StandardFonts')
              ) {
                return 'vendor-pdf-lib-assets';
              }
              if (id.includes('pdf-lib') || id.includes('@pdf-lib')) {
                return 'vendor-pdf-lib-core';
              }
              if (id.includes('exceljs')) {
                return 'vendor-exceljs';
              }
              if (id.includes('docx')) {
                return 'vendor-docx';
              }
              if (id.includes('jspdf')) {
                return 'vendor-jspdf';
              }
              if (id.includes('html2canvas')) {
                return 'vendor-html2canvas';
              }
              if (id.includes('jszip')) {
                return 'vendor-jszip';
              }
              if (id.includes('@google/genai')) {
                return 'feature-ai-client';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/') || id.includes('react-dropzone') || id.includes('scheduler')) {
                return 'vendor-react';
              }
            }

            // Application tool engines & submodules
            if (id.includes('/src/tools/pdf-editor/') || id.includes('/src/tools/EditTool')) {
              return 'feature-pdf-editor';
            }
            if (id.includes('/src/tools/ImageGenTool') || id.includes('/src/pages/ImageGenPage')) {
              return 'feature-ai-image';
            }
            if (id.includes('/src/tools/AudioTranscribeTool') || id.includes('/src/pages/AudioTranscribePage')) {
              return 'feature-ai-audio';
            }
            if (id.includes('/src/services/gemini')) {
              return 'feature-ai-client';
            }
            if (id.includes('/src/tools/PDFToWordTool')) {
              return 'feature-convert-word';
            }
            if (id.includes('/src/tools/PDFToExcelTool')) {
              return 'feature-convert-excel';
            }
            if (id.includes('/src/tools/PDFToJPGTool')) {
              return 'feature-convert-jpg';
            }
            if (id.includes('/src/tools/ImageToPDFTool')) {
              return 'feature-convert-image';
            }

            // App static data & i18n
            if (id.includes('LanguageContext') || id.includes('translations')) {
              return 'app-translations';
            }
            if (id.includes('seoData') || id.includes('toolSeoData')) {
              return 'app-seo-data';
            }
            if (id.includes('data/tools')) {
              return 'app-tools-catalog';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
