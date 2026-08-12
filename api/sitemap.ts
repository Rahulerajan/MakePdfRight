import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SEO_DATA } from '../server/seoData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

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

    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(sitemapXml);
}
