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
      modulePreload: {
        polyfill: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('react')) {
                return 'vendor-react';
              }
            }
            if (id.includes('LanguageContext') || id.includes('translations')) {
              return 'app-translations';
            }
            if (id.includes('seoData')) {
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
