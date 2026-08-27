import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { App } from '../src/App';
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

function generateJsonLdSchema(route: string, seo: RouteSEO, appUrl: string): string {
  const policy = publishingPolicyFor(route);
  const title = seo.title || 'MakePDFRight';
  const desc = seo.description || '';
  const canonicalUrl = policy.canonicalPath === '/' ? appUrl : `${appUrl}${policy.canonicalPath}`;
  const toolData = TOOL_SEO_CONTENT_MAP[route];

  const graphNodes: any[] = [
    {
      '@type': 'WebSite',
      '@id': `${appUrl}/#website`,
      'url': appUrl,
      'name': 'MakePDFRight',
      'description': 'Fast, private & free browser-first PDF and AI document processing tools.'
    },
    {
      '@type': 'Organization',
      '@id': `${appUrl}/#organization`,
      'name': 'MakePDFRight',
      'url': appUrl,
      'logo': `${appUrl}/apple-touch-icon.png`
    }
  ];

  if (policy.indexable && route !== '/404') {
    if (route === '/about') {
      graphNodes.push({
        '@type': 'AboutPage',
        '@id': `${canonicalUrl}/#webpage`,
        'url': canonicalUrl,
        'name': title,
        'description': desc
      });
    } else if (route === '/contact') {
      graphNodes.push({
        '@type': 'ContactPage',
        '@id': `${canonicalUrl}/#webpage`,
        'url': canonicalUrl,
        'name': title,
        'description': desc
      });
    } else if (route !== '/') {
      const toolName = title.split('–')[0].split('|')[0].trim();
      graphNodes.push({
        '@type': 'SoftwareApplication',
        '@id': `${canonicalUrl}/#software`,
        'name': `${toolName} - MakePDFRight`,
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Any',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        },
        'description': desc,
        'url': canonicalUrl
      });
    } else {
      graphNodes.push({
        '@type': 'WebPage',
        '@id': `${canonicalUrl}/#webpage`,
        'url': canonicalUrl,
        'name': title,
        'description': desc
      });
    }

    if (route !== '/' && route !== '') {
      const toolName = title.split('–')[0].split('|')[0].trim();
      graphNodes.push({
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}/#breadcrumb`,
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': appUrl
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': toolName,
            'item': canonicalUrl
          }
        ]
      });
    }

    if (toolData?.faqs && toolData.faqs.length > 0) {
      graphNodes.push({
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}/#faq`,
        'mainEntity': toolData.faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      });
    }
  } else {
    graphNodes.push({
      '@type': 'WebPage',
      '@id': `${canonicalUrl}/#webpage`,
      'url': canonicalUrl,
      'name': title,
      'description': desc
    });
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graphNodes
  });
}

function prerenderRoute(route: string): string {
  const appUrl = 'https://www.makepdfright.com';
  const seo = SEO_DATA[route] || {
    title: 'Page Not Found – MakePDFRight',
    description: 'The requested document tool page does not exist or has been moved.',
    robots: 'noindex, follow'
  };

  const policy = publishingPolicyFor(route);
  const is404 = route === '/404';

  const title = seo.title || 'MakePDFRight – Online PDF & Document Processing Tools';
  const desc = seo.description || '';
  const canonicalUrl = policy.canonicalPath === '/' ? appUrl : `${appUrl}${policy.canonicalPath}`;
  const ogImg = seo.ogImage || '/og-image.png';
  const fullOgImg = ogImg.startsWith('http') ? ogImg : `${appUrl}${ogImg.startsWith('/') ? '' : '/'}${ogImg}`;
  const ogImgAlt = seo.ogImageAlt || `${title.split('–')[0].split('|')[0].trim()} with MakePDFRight`;
  const robotsContent = !policy.indexable || is404 ? 'noindex, follow' : (seo.robots || policy.robots);

  // Render real React App component at build time
  const renderedApp = renderToString(React.createElement(App, { initialPath: route }));

  // Generate metadata block
  let metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta name="author" content="MakePDFRight" />
    <meta name="robots" content="${escapeHtml(robotsContent)}" />
    ${!is404 ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : ''}
    <meta property="og:site_name" content="MakePDFRight" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(fullOgImg)}" />
    <meta property="og:image:alt" content="${escapeHtml(ogImgAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${escapeHtml(fullOgImg)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(ogImgAlt)}" />
  `;

  const schemaJson = generateJsonLdSchema(route, seo, appUrl);
  const schemaTag = `<script id="seo-jsonld-schema" type="application/ld+json">${schemaJson}</script>`;

  let html = baseHtml;

  // Replace title and metadata in head
  html = html.replace(/<title>.*?<\/title>/s, '');
  html = html.replace(/<meta name="description" content=".*?" \/>/s, '');
  html = html.replace(/<meta name="robots" content=".*?" \/>/s, '');
  html = html.replace(/<link rel="canonical" href=".*?" \/>/s, '');

  // Inject our custom meta tags and schema into <head>
  html = html.replace('</head>', `${metaTags}\n${schemaTag}\n</head>`);

  // Inject real React-rendered markup into #root with data-prerendered="true"
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root" data-prerendered="true">${renderedApp}</div>`
  );

  return html;
}

// Generate static HTML for all defined routes
const allRoutes = Object.keys(SEO_DATA);
if (!allRoutes.includes('/404')) {
  allRoutes.push('/404');
}

let generatedCount = 0;

allRoutes.forEach((route) => {
  const html = prerenderRoute(route);
  
  let targetPath = '';
  if (route === '/') {
    targetPath = path.join(DIST_DIR, 'index.html');
  } else if (route === '/404') {
    targetPath = path.join(DIST_DIR, '404.html');
  } else {
    const routeFolder = path.join(DIST_DIR, route.startsWith('/') ? route.slice(1) : route);
    fs.mkdirSync(routeFolder, { recursive: true });
    targetPath = path.join(routeFolder, 'index.html');
  }

  fs.writeFileSync(targetPath, html, 'utf-8');
  generatedCount++;
});

console.log(`[Prerender] Successfully prerendered ${generatedCount} React routes.`);

// Generate compliant sitemap.xml with exactly PRIMARY_INDEXABLE_ROUTES
const sitemapUrls = PRIMARY_INDEXABLE_ROUTES.map((route) => {
  const loc = route === '/' ? 'https://www.makepdfright.com/' : `https://www.makepdfright.com${route}`;
  const priority = route === '/' ? '1.0' : '0.8';
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;

fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
console.log(`[Prerender] Generated sitemap.xml with ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes.`);

// Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://www.makepdfright.com/sitemap.xml
`;

fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');
console.log('[Prerender] Generated robots.txt.');
