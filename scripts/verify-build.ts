import fs from 'fs';
import path from 'path';
import { SEO_DATA } from '../server/seoData.ts';

const DIST_DIR = path.join(process.cwd(), 'dist');
const VERCEL_JSON_PATH = path.join(process.cwd(), 'vercel.json');
const SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

export function verifyBuildIntegrity(): boolean {
  console.log('\n[Integrity Safeguard] Verifying SEO routes, prerendered files, and Vercel routing rules...');
  let hasErrors = false;

  const seoRoutes = Object.keys(SEO_DATA).filter(r => r !== '/404');
  console.log(`[Integrity Safeguard] Found ${seoRoutes.length} SEO routes to validate.`);

  // 1. Check all SEO routes have prerendered HTML files in dist/
  const missingPrerenderFiles: string[] = [];
  for (const route of seoRoutes) {
    if (route === '/') {
      if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
        missingPrerenderFiles.push('/ (dist/index.html)');
      }
    } else {
      const slug = route.replace(/^\//, '');
      const htmlPath = path.join(DIST_DIR, slug, 'index.html');
      const flatHtmlPath = path.join(DIST_DIR, `${slug}.html`);
      if (!fs.existsSync(htmlPath) && !fs.existsSync(flatHtmlPath)) {
        missingPrerenderFiles.push(`${route} (${htmlPath})`);
      }
    }
  }

  if (missingPrerenderFiles.length > 0) {
    console.error(`\n❌ [Integrity Failure] ${missingPrerenderFiles.length} routes are missing prerendered HTML files:`);
    missingPrerenderFiles.forEach(f => console.error(`  - ${f}`));
    hasErrors = true;
  } else {
    console.log(`✅ All ${seoRoutes.length} SEO routes have valid prerendered HTML files on disk.`);
  }

  // 2. Validate against vercel.json rewrites
  if (fs.existsSync(VERCEL_JSON_PATH)) {
    try {
      const vercelJson = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, 'utf-8'));
      const prerenderRewrite = vercelJson.rewrites?.find((r: any) => r.destination === '/:path/index.html');
      
      if (!prerenderRewrite) {
        console.error('❌ [Integrity Failure] vercel.json is missing the /:path/index.html rewrite rule!');
        hasErrors = true;
      } else {
        const patternMatch = prerenderRewrite.source.match(/\/:path\((.*)\)/);
        if (!patternMatch) {
          console.error('❌ [Integrity Failure] Could not parse /:path(...) regex in vercel.json rewrite!');
          hasErrors = true;
        } else {
          const regex = new RegExp(`^(${patternMatch[1]})$`);
          const unroutedSlugs: string[] = [];

          for (const route of seoRoutes) {
            if (route === '/') continue;
            const slug = route.replace(/^\//, '');
            if (!regex.test(slug)) {
              unroutedSlugs.push(slug);
            }
          }

          if (unroutedSlugs.length > 0) {
            console.error(`\n❌ [Integrity Failure] ${unroutedSlugs.length} slugs are NOT matched by vercel.json rewrite regex:`);
            unroutedSlugs.forEach(s => console.error(`  - /${s}`));
            console.error('This will cause Googlebot to receive a 404 or un-prerendered SPA fallback!');
            hasErrors = true;
          } else {
            console.log(`✅ All ${seoRoutes.length - 1} sub-slugs are strictly matched by vercel.json rewrite rules.`);
          }
        }
      }
    } catch (e: any) {
      console.error('❌ [Integrity Failure] Failed to parse vercel.json:', e.message);
      hasErrors = true;
    }
  }

  // 3. Validate sitemap.xml against SEO_DATA
  if (fs.existsSync(SITEMAP_PATH)) {
    const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const missingInSitemap: string[] = [];
    const NON_CANONICAL_EXCLUSIONS = new Set([
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

    for (const route of seoRoutes) {
      if (NON_CANONICAL_EXCLUSIONS.has(route)) continue;
      const expectedUrl = `https://www.makepdfright.com${route === '/' ? '' : route}`;
      if (!sitemapXml.includes(`<loc>${expectedUrl}</loc>`)) {
        missingInSitemap.push(expectedUrl);
      }
    }

    if (missingInSitemap.length > 0) {
      console.error(`\n❌ [Integrity Failure] ${missingInSitemap.length} canonical routes missing from sitemap.xml:`);
      missingInSitemap.forEach(u => console.error(`  - ${u}`));
      hasErrors = true;
    } else {
      console.log('✅ All canonical SEO routes are present in sitemap.xml.');
    }
  }

  if (hasErrors) {
    console.error('\n🚨 Build safeguard failed. Please fix the route discrepancies before deploying to avoid Google Search Console indexing errors.\n');
    return false;
  }

  console.log('🎉 [Integrity Safeguard] All build integrity checks passed successfully!\n');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('verify-build.ts')) {
  const success = verifyBuildIntegrity();
  if (!success) {
    process.exit(1);
  }
}
