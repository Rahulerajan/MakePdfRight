import fs from 'fs';
import path from 'path';
import { SEO_DATA } from '../server/seoData.ts';
import { TOOL_SEO_CONTENT_MAP } from '../src/constants/toolSeoData.ts';

const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_HTML_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(BASE_HTML_PATH)) {
  console.error('[Prerender] dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(BASE_HTML_PATH, 'utf-8');

function injectMetadata(html: string, route: string, seo: { title?: string; description?: string; ogImage?: string }): string {
  const title = seo.title || 'MakePDFRight - Fast, Private Online PDF & AI Tools';
  const desc = seo.description || '';
  const ogImage = seo.ogImage || '/og-image.png';
  const canonical = `https://www.makepdfright.com${route === '/' ? '' : route}`;

  let modified = html;

  // Replace Title
  modified = modified.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  // Replace Meta Description
  if (modified.includes('<meta name="description"')) {
    modified = modified.replace(/<meta name="description" content="[^"]*"/i, `<meta name="description" content="${desc}"`);
  } else {
    modified = modified.replace('</head>', `  <meta name="description" content="${desc}" />\n</head>`);
  }

  // Replace Canonical Link
  if (modified.includes('<link rel="canonical"')) {
    modified = modified.replace(/<link rel="canonical" href="[^"]*"/i, `<link rel="canonical" href="${canonical}"`);
  } else {
    modified = modified.replace('</head>', `  <link rel="canonical" href="${canonical}" />\n</head>`);
  }

  // Replace OG tags
  modified = modified.replace(/<meta property="og:title" content="[^"]*"/i, `<meta property="og:title" content="${title}"`);
  modified = modified.replace(/<meta property="og:description" content="[^"]*"/i, `<meta property="og:description" content="${desc}"`);
  modified = modified.replace(/<meta property="og:url" content="[^"]*"/i, `<meta property="og:url" content="${canonical}"`);
  modified = modified.replace(/<meta property="og:image" content="[^"]*"/i, `<meta property="og:image" content="https://www.makepdfright.com${ogImage}"`);

  // Replace Twitter tags
  modified = modified.replace(/<meta name="twitter:title" content="[^"]*"/i, `<meta name="twitter:title" content="${title}"`);
  modified = modified.replace(/<meta name="twitter:description" content="[^"]*"/i, `<meta name="twitter:description" content="${desc}"`);
  modified = modified.replace(/<meta name="twitter:image" content="[^"]*"/i, `<meta name="twitter:image" content="https://www.makepdfright.com${ogImage}"`);

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
for (const [route, seo] of Object.entries(SEO_DATA)) {
  if (route === '/404') continue;

  const html = injectMetadata(baseHtml, route, seo as any);
  
  if (route === '/') {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf-8');
  } else {
    const slug = route.replace(/^\//, '');
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
