import fs from 'fs';
import path from 'path';
import { SEO_DATA } from '../src/constants/seoData';

function generateSitemap() {
  const baseUrl = 'https://www.makepdfright.com';
  const NON_CANONICAL_ROUTES = new Set([
    '/compress-pdf',
    '/merge-pdf',
    '/split-pdf',
    '/edit-pdf',
    '/rotate-pdf',
    '/word-to-pdf',
    '/organize',
    '/audio-transcribe',
    '/image-generator',
    '/pdf-editor',
    '/404'
  ]);

  const canonicalRoutes = Object.keys(SEO_DATA).filter(route => !NON_CANONICAL_ROUTES.has(route));

  const urls = canonicalRoutes.map((route) => {
    const loc = `${baseUrl}${route === '/' ? '' : route}`;
    let priority = '0.8';
    let changefreq = 'weekly';

    if (route === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route === '/privacy' || route === '/terms' || route === '/cookie-policy' || route === '/disclaimer') {
      priority = '0.3';
      changefreq = 'monthly';
    }

    return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml, 'utf-8');
  console.log(`[Sitemap] Successfully generated ${sitemapPath} with ${Object.keys(SEO_DATA).length} routes.`);
}

generateSitemap();
