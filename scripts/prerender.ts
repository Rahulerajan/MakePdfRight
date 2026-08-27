import fs from 'fs';
import path from 'path';
import { SEO_DATA, RouteSEO } from '../server/seoData.ts';
import { TOOL_SEO_CONTENT_MAP } from '../src/constants/toolSeoData.ts';

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

function injectMetadata(html: string, route: string, seo: RouteSEO): string {
  const title = seo.title || 'MakePDFRight - Fast, Private Online PDF & AI Tools';
  const desc = seo.description || '';
  const canonical = seo.canonicalUrl || `https://www.makepdfright.com${route === '/' ? '' : route}`;
  const rawOgImage = seo.ogImage || '/og-image.png';
  const fullOgImage = rawOgImage.startsWith('http')
    ? rawOgImage
    : `https://www.makepdfright.com${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;
  const ogImageAlt = seo.ogImageAlt || `${title.split('–')[0].split('|')[0].trim()} with MakePDFRight`;
  const twitterTitle = seo.twitterTitle || title;
  const twitterDesc = seo.twitterDescription || desc;
  const rawTwitterImage = seo.twitterImage || rawOgImage;
  const fullTwitterImage = rawTwitterImage.startsWith('http')
    ? rawTwitterImage
    : `https://www.makepdfright.com${rawTwitterImage.startsWith('/') ? '' : '/'}${rawTwitterImage}`;
  const twitterImageAlt = seo.twitterImageAlt || ogImageAlt;
  const author = seo.author || 'MakePDFRight';
  const keywords = seo.keywords || 'PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to Excel, edit PDF, AI image generator, audio transcribe, free PDF editor';
  const robots = seo.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

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

  // Inject Rich JSON-LD Schemas if toolData exists
  const toolData = TOOL_SEO_CONTENT_MAP[route];
  if (toolData && toolData.faqs && toolData.faqs.length > 0) {
    const jsonLdGraph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
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
        },
        {
          "@type": "FAQPage",
          "mainEntity": toolData.faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        }
      ]
    };

    const schemaScript = `\n    <script type="application/ld+json" id="seo-jsonld-schema">${JSON.stringify(jsonLdGraph)}</script>\n  `;
    modified = modified.replace('</head>', `${schemaScript}</head>`);
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
