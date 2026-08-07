import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SEO_DATA } from '../src/constants/seoData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const defaultDomain = 'https://www.makepdfright.com';
  const baseUrl = (process.env.APP_URL || defaultDomain).replace(/\/$/, '');

  const urls = Object.keys(SEO_DATA).map((route) => {
    const loc = `${baseUrl}${route === '/' ? '' : route}`;
    let priority = '0.8';
    let changefreq = 'weekly';

    if (route === '/') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route === '/privacy' || route === '/terms') {
      priority = '0.3';
      changefreq = 'monthly';
    }

    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(sitemapXml);
}
