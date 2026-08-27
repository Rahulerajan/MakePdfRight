import fs from 'fs';
import path from 'path';
import { SEO_DATA, RouteSEO } from '../src/constants/seoData';
import { TOOL_SEO_CONTENT_MAP } from '../src/constants/toolSeoData';
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from '../src/constants/publishing';

const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_HTML_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(BASE_HTML_PATH)) {
  console.error('[Prerender] dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(BASE_HTML_PATH, 'utf-8');

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPageBody(route: string, seo: RouteSEO): string {
  const toolData = TOOL_SEO_CONTENT_MAP[route];
  const title = seo.title || 'MakePDFRight';
  const desc = seo.description || '';

  const headerHtml = `
    <header class="w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 py-4 px-6 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 font-black text-xl text-slate-900 dark:text-white tracking-tight">
          <span class="text-primary text-2xl font-black">MakePDF<span class="text-red-600">Right</span></span>
        </a>
        <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <a href="/merge" class="hover:text-primary transition-colors">Merge PDF</a>
          <a href="/split" class="hover:text-primary transition-colors">Split PDF</a>
          <a href="/compress" class="hover:text-primary transition-colors">Compress PDF</a>
          <a href="/pdf-to-word" class="hover:text-primary transition-colors">PDF to Word</a>
          <a href="/pdf-to-excel" class="hover:text-primary transition-colors">PDF to Excel</a>
          <a href="/resources" class="hover:text-primary transition-colors">Resources</a>
          <a href="/about" class="hover:text-primary transition-colors">About</a>
          <a href="/contact" class="hover:text-primary transition-colors">Contact</a>
        </nav>
      </div>
    </header>
  `;

  const footerHtml = `
    <footer class="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 px-6 mt-16 text-slate-600 dark:text-slate-400 text-sm">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="space-y-3">
          <div class="font-black text-lg text-slate-900 dark:text-white">MakePDF<span class="text-red-600">Right</span></div>
          <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Fast, private, and accessible browser-first PDF and document manipulation tools.</p>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 dark:text-white mb-3">Core Tools</h4>
          <ul class="space-y-2 text-xs">
            <li><a href="/merge" class="hover:underline">Merge PDF</a></li>
            <li><a href="/split" class="hover:underline">Split PDF</a></li>
            <li><a href="/compress" class="hover:underline">Compress PDF</a></li>
            <li><a href="/pdf-to-word" class="hover:underline">PDF to Word</a></li>
            <li><a href="/pdf-to-excel" class="hover:underline">PDF to Excel</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 dark:text-white mb-3">Knowledge & Help</h4>
          <ul class="space-y-2 text-xs">
            <li><a href="/resources" class="hover:underline">Document Guides</a></li>
            <li><a href="/about" class="hover:underline">About MakePDFRight</a></li>
            <li><a href="/contact" class="hover:underline">Contact Support</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 dark:text-white mb-3">Legal & Trust</h4>
          <ul class="space-y-2 text-xs">
            <li><a href="/privacy" class="hover:underline">Privacy Policy</a></li>
            <li><a href="/terms" class="hover:underline">Terms of Service</a></li>
            <li><a href="/cookie-policy" class="hover:underline">Cookie Policy</a></li>
            <li><a href="/disclaimer" class="hover:underline">Disclaimer</a></li>
          </ul>
        </div>
      </div>
      <div class="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
        &copy; ${new Date().getFullYear()} MakePDFRight. All rights reserved. Files processed client-side or ephemerally deleted within 15 minutes.
      </div>
    </footer>
  `;

  let mainContent = '';

  if (route === '/') {
    mainContent = `
      <main class="max-w-6xl mx-auto px-4 py-12 space-y-12">
        <div class="text-center space-y-4 max-w-3xl mx-auto">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">Free, Fast &amp; Private Online PDF Tools</h1>
          <p class="text-lg text-slate-600 dark:text-slate-300">${escapeHtml(desc)}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/merge" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Merge PDF</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Combine multiple PDF files, documents, and scanned pages in your desired sequence.</p>
          </a>
          <a href="/split" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Split PDF</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Extract individual pages, split by custom range, or separate every page into new files.</p>
          </a>
          <a href="/compress" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Compress PDF</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Reduce PDF file size for email attachments and portal uploads while maintaining visual clarity.</p>
          </a>
          <a href="/pdf-to-word" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">PDF to Word</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Convert PDF documents into editable Microsoft Word (.docx) documents with preserved layouts.</p>
          </a>
          <a href="/pdf-to-excel" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">PDF to Excel</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Extract data tables, financial reports, and invoices into structured Excel (.xlsx) spreadsheets.</p>
          </a>
          <a href="/edit" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Edit PDF</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Add text annotations, draw shapes, redact sensitive data, and sign documents online.</p>
          </a>
        </div>
      </main>
    `;
  } else if (route === '/about') {
    mainContent = `
      <main class="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">About MakePDFRight</h1>
        <p class="text-lg text-slate-600 dark:text-slate-300">MakePDFRight is an independent web utility project built to deliver fast, private, and accessible document manipulation tools directly in your browser without mandatory accounts or paywalls.</p>
        <section class="space-y-4">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">How We Process Files & Protect Privacy</h2>
          <p class="text-slate-600 dark:text-slate-300">Core PDF tools (Merge, Split, Rotate, Compress, Image-to-PDF, Organize) execute client-side in your browser's memory sandbox using WebAssembly and JavaScript without uploading files to a server. For server-assisted tasks, files reside in isolated temporary storage and are automatically deleted after 15 minutes.</p>
        </section>
      </main>
    `;
  } else if (route === '/contact') {
    mainContent = `
      <main class="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">Contact Us</h1>
        <p class="text-lg text-slate-600 dark:text-slate-300">Have questions, feedback, or tool feature requests? Reach our support team at <a href="mailto:support@makepdfright.com" class="text-primary font-bold">support@makepdfright.com</a> or use the online contact form.</p>
      </main>
    `;
  } else if (route === '/resources') {
    mainContent = `
      <main class="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">Document Guides, Formats &amp; Technical Best Practices</h1>
        <p class="text-lg text-slate-600 dark:text-slate-300">In-depth, practical explanations of PDF structures, compression algorithms, OCR preparation, and data extraction techniques.</p>
        <section class="space-y-6">
          <article class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">PDF vs Editable Document Formats</h2>
            <p class="text-slate-600 dark:text-slate-300">Learn the technical distinctions between fixed postscript coordinate systems in PDF files and fluid document flow in Microsoft Word DOCX and Excel XLSX spreadsheets.</p>
          </article>
          <article class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">How PDF Compression Works</h2>
            <p class="text-slate-600 dark:text-slate-300">A detailed analysis of raster image subsampling, DCT quantization, Flate vector stream compression, and font subset stripping.</p>
          </article>
        </section>
      </main>
    `;
  } else if (['/privacy', '/terms', '/cookie-policy', '/disclaimer'].includes(route)) {
    mainContent = `
      <main class="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">${escapeHtml(title.split('–')[0].split('|')[0].trim())}</h1>
        <div class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-4">
          <p>${escapeHtml(desc)}</p>
          <p>Please review our official policies regarding file handling, privacy protections, terms of use, and cookie management on MakePDFRight.</p>
        </div>
      </main>
    `;
  } else if (toolData) {
    const howItWorksHtml = (toolData.howItWorks || []).map(step => `
      <li class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
        <div class="font-bold text-slate-900 dark:text-white">Step ${step.step}: ${escapeHtml(step.title)}</div>
        <p class="text-xs text-slate-600 dark:text-slate-400">${escapeHtml(step.desc)}</p>
      </li>
    `).join('');

    const faqsHtml = (toolData.faqs || []).map(faq => `
      <div class="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
        <h3 class="font-bold text-slate-900 dark:text-white text-base">${escapeHtml(faq.question)}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(faq.answer)}</p>
      </div>
    `).join('');

    const benefitsHtml = (toolData.benefits || []).map(b => `
      <li class="space-y-1">
        <strong class="text-slate-900 dark:text-white">${escapeHtml(b.title)}:</strong>
        <span class="text-slate-600 dark:text-slate-300 text-sm"> ${escapeHtml(b.desc)}</span>
      </li>
    `).join('');

    const useCasesHtml = (toolData.useCases || []).map(u => `
      <li class="text-slate-600 dark:text-slate-300 text-sm list-disc pl-2">${escapeHtml(u)}</li>
    `).join('');

    mainContent = `
      <main class="max-w-5xl mx-auto px-4 py-12 space-y-12">
        <div class="text-center space-y-4 max-w-3xl mx-auto">
          <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">${escapeHtml(title.split('–')[0].split('|')[0].trim())}</h1>
          <p class="text-base sm:text-lg text-slate-600 dark:text-slate-300">${escapeHtml(desc)}</p>
        </div>

        <div class="p-10 rounded-3xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4 shadow-sm">
          <div class="text-base font-bold text-slate-700 dark:text-slate-300">Drag &amp; Drop Your Files Here or Click to Browse</div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Processed securely in your browser or ephemerally cleaned after 15 minutes.</p>
        </div>

        <section class="space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Comprehensive Overview</h2>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(toolData.overview)}</p>
          ${(toolData.topBody || []).map(p => `<p class="text-slate-600 dark:text-slate-300 leading-relaxed">${escapeHtml(p)}</p>`).join('')}
        </section>

        ${howItWorksHtml ? `
        <section class="space-y-4">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">How It Works: Step-by-Step Instructions</h2>
          <ol class="grid grid-cols-1 sm:grid-cols-3 gap-4">${howItWorksHtml}</ol>
        </section>
        ` : ''}

        ${benefitsHtml ? `
        <section class="space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Key Capabilities &amp; Architecture</h2>
          <ul class="space-y-3">${benefitsHtml}</ul>
        </section>
        ` : ''}

        ${useCasesHtml ? `
        <section class="space-y-4">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Common Practical Use Cases</h2>
          <ul class="space-y-2 pl-4">${useCasesHtml}</ul>
        </section>
        ` : ''}

        ${faqsHtml ? `
        <section class="space-y-4">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <div class="space-y-4">${faqsHtml}</div>
        </section>
        ` : ''}
      </main>
    `;
  } else {
    mainContent = `
      <main class="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">${escapeHtml(title)}</h1>
        <p class="text-slate-600 dark:text-slate-300">${escapeHtml(desc)}</p>
      </main>
    `;
  }

  return `${headerHtml}${mainContent}${footerHtml}`;
}

function injectMetadata(html: string, route: string, seo: RouteSEO): string {
  const policy = publishingPolicyFor(route);
  const title = seo.title || 'MakePDFRight - Fast, Private Online PDF & AI Tools';
  const desc = seo.description || '';
  const appUrl = 'https://www.makepdfright.com';
  const canonical = policy.canonicalPath === '/' ? appUrl : `${appUrl}${policy.canonicalPath}`;
  const rawOgImage = seo.ogImage || '/og-image.png';
  const fullOgImage = rawOgImage.startsWith('http')
    ? rawOgImage
    : `${appUrl}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;
  const ogImageAlt = seo.ogImageAlt || `${title.split('–')[0].split('|')[0].trim()} with MakePDFRight`;
  const twitterTitle = seo.twitterTitle || title;
  const twitterDesc = seo.twitterDescription || desc;
  const rawTwitterImage = seo.twitterImage || rawOgImage;
  const fullTwitterImage = rawTwitterImage.startsWith('http')
    ? rawTwitterImage
    : `${appUrl}${rawTwitterImage.startsWith('/') ? '' : '/'}${rawTwitterImage}`;
  const twitterImageAlt = seo.twitterImageAlt || ogImageAlt;
  const author = seo.author || 'MakePDFRight';
  const keywords = seo.keywords || 'PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to Excel, edit PDF, AI image generator, audio transcribe, free PDF editor';
  const robots = !policy.indexable ? 'noindex, follow' : (seo.robots || policy.robots);

  let modified = html;

  // Replace Title
  modified = modified.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace or add Meta Description
  if (modified.includes('<meta name="description"')) {
    modified = modified.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(desc)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="description" content="${escapeHtml(desc)}" />\n</head>`);
  }

  // Replace or add Meta Author
  if (modified.includes('<meta name="author"')) {
    modified = modified.replace(/<meta\s+name="author"\s+content="[^"]*"\s*\/?>/i, `<meta name="author" content="${escapeHtml(author)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="author" content="${escapeHtml(author)}" />\n</head>`);
  }

  // Replace or add Meta Keywords
  if (modified.includes('<meta name="keywords"')) {
    modified = modified.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i, `<meta name="keywords" content="${escapeHtml(keywords)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="keywords" content="${escapeHtml(keywords)}" />\n</head>`);
  }

  // Replace or add Meta Robots
  if (modified.includes('<meta name="robots"')) {
    modified = modified.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${escapeHtml(robots)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="robots" content="${escapeHtml(robots)}" />\n</head>`);
  }

  // Replace or add Canonical Link
  if (modified.includes('<link rel="canonical"')) {
    modified = modified.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  } else {
    modified = modified.replace('</head>', `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
  }

  // Replace or add Open Graph tags
  if (modified.includes('property="og:site_name"')) {
    modified = modified.replace(/<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:site_name" content="MakePDFRight" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:site_name" content="MakePDFRight" />\n</head>`);
  }

  if (modified.includes('property="og:type"')) {
    modified = modified.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="website" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:type" content="website" />\n</head>`);
  }

  if (modified.includes('property="og:title"')) {
    modified = modified.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:title" content="${escapeHtml(title)}" />\n</head>`);
  }

  if (modified.includes('property="og:description"')) {
    modified = modified.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(desc)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:description" content="${escapeHtml(desc)}" />\n</head>`);
  }

  if (modified.includes('property="og:url"')) {
    modified = modified.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:url" content="${escapeHtml(canonical)}" />\n</head>`);
  }

  if (modified.includes('property="og:image"')) {
    modified = modified.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(fullOgImage)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:image" content="${escapeHtml(fullOgImage)}" />\n</head>`);
  }

  if (modified.includes('property="og:image:alt"')) {
    modified = modified.replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />\n</head>`);
  }

  // Replace or add Twitter tags
  if (modified.includes('name="twitter:card"')) {
    modified = modified.replace(/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:card" content="summary_large_image" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="twitter:card" content="summary_large_image" />\n</head>`);
  }

  if (modified.includes('name="twitter:title"')) {
    modified = modified.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(twitterTitle)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="twitter:title" content="${escapeHtml(twitterTitle)}" />\n</head>`);
  }

  if (modified.includes('name="twitter:description"')) {
    modified = modified.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(twitterDesc)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="twitter:description" content="${escapeHtml(twitterDesc)}" />\n</head>`);
  }

  if (modified.includes('name="twitter:image"')) {
    modified = modified.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(fullTwitterImage)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="twitter:image" content="${escapeHtml(fullTwitterImage)}" />\n</head>`);
  }

  if (modified.includes('name="twitter:image:alt"')) {
    modified = modified.replace(/<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${escapeHtml(twitterImageAlt)}" />`);
  } else {
    modified = modified.replace('</head>', `  <meta name="twitter:image:alt" content="${escapeHtml(twitterImageAlt)}" />\n</head>`);
  }

  // Inject Rich JSON-LD Schemas ONLY for indexable pages
  const graphNodes: any[] = [
    {
      "@type": "WebSite",
      "@id": `${appUrl}/#website`,
      "url": appUrl,
      "name": "MakePDFRight",
      "description": "Fast, private & free browser-first PDF and AI document processing tools."
    },
    {
      "@type": "Organization",
      "@id": `${appUrl}/#organization`,
      "name": "MakePDFRight",
      "url": appUrl,
      "logo": `${appUrl}/apple-touch-icon.png`
    }
  ];

  if (policy.indexable) {
    const toolData = TOOL_SEO_CONTENT_MAP[route];
    if (route === '/about') {
      graphNodes.push({
        "@type": "AboutPage",
        "@id": `${canonical}/#webpage`,
        "url": canonical,
        "name": title,
        "description": desc
      });
    } else if (route === '/contact') {
      graphNodes.push({
        "@type": "ContactPage",
        "@id": `${canonical}/#webpage`,
        "url": canonical,
        "name": title,
        "description": desc
      });
    } else if (toolData) {
      graphNodes.push({
        "@type": "SoftwareApplication",
        "@id": `${canonical}/#software`,
        "name": toolData.toolName || title,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web, iOS, Android, Windows, macOS, Linux",
        "url": canonical,
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": desc
      });

      if (toolData.faqs && toolData.faqs.length > 0) {
        graphNodes.push({
          "@type": "FAQPage",
          "@id": `${canonical}/#faq`,
          "mainEntity": toolData.faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        });
      }
    } else {
      graphNodes.push({
        "@type": "WebPage",
        "@id": `${canonical}/#webpage`,
        "url": canonical,
        "name": title,
        "description": desc
      });
    }
  } else {
    // Non-indexable route: minimal WebPage
    graphNodes.push({
      "@type": "WebPage",
      "@id": `${canonical}/#webpage`,
      "url": canonical,
      "name": title,
      "description": desc
    });
  }

  const schemaScript = `\n    <script type="application/ld+json" id="seo-jsonld-schema">${JSON.stringify({ "@context": "https://schema.org", "@graph": graphNodes })}</script>\n  `;
  modified = modified.replace('</head>', `${schemaScript}</head>`);

  // Inject visible prerendered HTML body into <div id="root">
  const pageBodyHtml = renderPageBody(route, seo);
  if (modified.includes('<div id="root"></div>')) {
    modified = modified.replace('<div id="root"></div>', `<div id="root">${pageBodyHtml}</div>`);
  } else if (/<div id="root">[\s\S]*?<\/div>/i.test(modified)) {
    modified = modified.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${pageBodyHtml}</div>`);
  }

  return modified;
}

// Generate static HTML files for every route in SEO_DATA
let count = 0;
const prerenderedSlugs: string[] = [];

for (const [route, seo] of Object.entries(SEO_DATA)) {
  if (route === '/404') continue;

  const html = injectMetadata(baseHtml, route, seo as any);
  
  if (route === '/') {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf-8');
  } else {
    const slug = route.replace(/^\//, '');
    prerenderedSlugs.push(slug);
    const routeDir = path.join(DIST_DIR, slug);
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf-8');
    fs.writeFileSync(path.join(DIST_DIR, `${slug}.html`), html, 'utf-8');
  }
  count++;
}

console.log(`[Prerender] Successfully generated static prerendered HTML with metadata for ${count} routes!`);

// Automatically sync vercel.json rewrites with prerendered slugs
function syncVercelRewrites(slugs: string[]) {
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelJsonPath)) {
    console.warn('[Prerender] vercel.json not found, skipping rewrite auto-sync.');
    return;
  }

  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
    
    // Sort slugs by length descending so more specific paths match before general ones
    const sortedSlugs = Array.from(new Set(slugs)).sort((a, b) => b.length - a.length);
    const slugPattern = sortedSlugs.join('|');

    if (!Array.isArray(vercelConfig.rewrites)) {
      vercelConfig.rewrites = [];
    }

    // Locate or create the prerendered HTML rewrite rule
    const prerenderRewriteIndex = vercelConfig.rewrites.findIndex(
      (r: any) => r.destination === '/:path/index.html'
    );

    const updatedPrerenderRule = {
      source: `/:path(${slugPattern})`,
      destination: '/:path/index.html'
    };

    if (prerenderRewriteIndex >= 0) {
      vercelConfig.rewrites[prerenderRewriteIndex] = updatedPrerenderRule;
    } else {
      // Insert right before the SPA catch-all rule (destination '/index.html')
      const spaCatchAllIndex = vercelConfig.rewrites.findIndex(
        (r: any) => r.destination === '/index.html'
      );
      if (spaCatchAllIndex >= 0) {
        vercelConfig.rewrites.splice(spaCatchAllIndex, 0, updatedPrerenderRule);
      } else {
        vercelConfig.rewrites.push(updatedPrerenderRule);
      }
    }

    fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2) + '\n', 'utf-8');
    console.log(`[Prerender] 🔄 Auto-synced vercel.json: Updated prerender rewrite regex with ${sortedSlugs.length} slugs!`);
  } catch (error: any) {
    console.error('[Prerender] Failed to auto-sync vercel.json rewrites:', error.message);
  }
}

syncVercelRewrites(prerenderedSlugs);
