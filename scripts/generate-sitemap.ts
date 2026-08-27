import fs from 'fs';
import path from 'path';
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from '../src/constants/publishing';

function generateSitemap() {
  const baseUrl = 'https://www.makepdfright.com';

  // Only include verified, indexable, self-canonical HTTP 200 routes
  const urls = PRIMARY_INDEXABLE_ROUTES.map((route) => {
    const policy = publishingPolicyFor(route);
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
  console.log(`[Sitemap] Successfully generated ${sitemapPath} with ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes.`);

  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const distSitemapPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distSitemapPath, sitemapXml, 'utf-8');
    console.log(`[Sitemap] Successfully synced ${distSitemapPath} with ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes.`);
  }
}

generateSitemap();
