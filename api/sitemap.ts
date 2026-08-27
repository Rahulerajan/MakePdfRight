import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from '../src/constants/publishing.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const baseUrl = 'https://www.makepdfright.com';

  const urls = PRIMARY_INDEXABLE_ROUTES.map((route) => {
    const loc = `${baseUrl}${route === '/' ? '' : route}`;
    let priority = '0.8';
    let changefreq = 'weekly';

    if (route === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (['/privacy', '/terms', '/cookie-policy', '/disclaimer', '/contact', '/about'].includes(route)) {
      priority = '0.4';
      changefreq = 'monthly';
    } else if (route === '/resources') {
      priority = '0.9';
      changefreq = 'weekly';
    }

    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.status(200).send(sitemapXml);
}

