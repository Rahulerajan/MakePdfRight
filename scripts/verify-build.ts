import fs from 'fs';
import path from 'path';
import { SEO_DATA } from '../server/seoData.ts';
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from '../src/constants/publishing.ts';

const DIST_DIR = path.join(process.cwd(), 'dist');
const VERCEL_JSON_PATH = path.join(process.cwd(), 'vercel.json');
const SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

export function verifyBuildIntegrity(): boolean {
  console.log('\n[Integrity Safeguard] Verifying SEO routes, prerendered files, and Vercel routing rules...');
  let hasErrors = false;

  const seoRoutes = Object.keys(SEO_DATA).filter(r => r !== '/404');
  console.log(`[Integrity Safeguard] Found ${seoRoutes.length} total routes to validate.`);

  // 1. Check all routes have prerendered HTML files in dist/
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
    console.log(`✅ All ${seoRoutes.length} routes have valid prerendered HTML files on disk.`);
  }

  // 2. Validate against vercel.json rewrites and redirects
  if (fs.existsSync(VERCEL_JSON_PATH)) {
    try {
      const vercelJson = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, 'utf-8'));
      
      // Ensure NO catch-all rewrite to /index.html exists (prevents soft 404s)
      const catchAllRewrite = vercelJson.rewrites?.find((r: any) => 
        r.destination === '/index.html' && (r.source.includes('(?!') || r.source.includes('.*') || r.source === '/:match*')
      );
      if (catchAllRewrite) {
        console.error('❌ [Integrity Failure] vercel.json contains a broad catch-all rewrite to /index.html! This creates soft 404s.');
        hasErrors = true;
      } else {
        console.log('✅ vercel.json has no broad catch-all rewrite (genuine 404s guaranteed).');
      }

      // Verify alias redirects (e.g. /merge-pdf -> /merge)
      const requiredRedirects = [
        { source: '/merge-pdf', destination: '/merge' },
        { source: '/split-pdf', destination: '/split' },
        { source: '/compress-pdf', destination: '/compress' },
        { source: '/edit-pdf', destination: '/edit' },
        { source: '/rotate-pdf', destination: '/rotate' },
        { source: '/organize', destination: '/organise' },
        { source: '/image-generator', destination: '/generate-image' },
        { source: '/audio-transcribe', destination: '/transcribe' },
        { source: '/word-to-pdf', destination: '/pdf-to-word' }
      ];

      for (const reqRedir of requiredRedirects) {
        const found = vercelJson.redirects?.find((r: any) => r.source === reqRedir.source && r.destination === reqRedir.destination && r.permanent === true);
        if (!found) {
          console.error(`❌ [Integrity Failure] vercel.json is missing required 308 permanent redirect: ${reqRedir.source} -> ${reqRedir.destination}`);
          hasErrors = true;
        }
      }
      console.log(`✅ All ${requiredRedirects.length} required alias permanent redirects are preserved in vercel.json.`);

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

  // 3. Validate sitemap.xml against PRIMARY_INDEXABLE_ROUTES
  if (fs.existsSync(SITEMAP_PATH)) {
    const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const missingInSitemap: string[] = [];
    const nonIndexableInSitemap: string[] = [];

    // Verify all primary indexable routes are in sitemap.xml
    for (const route of PRIMARY_INDEXABLE_ROUTES) {
      const expectedUrl = `https://www.makepdfright.com${route === '/' ? '' : route}`;
      if (!sitemapXml.includes(`<loc>${expectedUrl}</loc>`)) {
        missingInSitemap.push(expectedUrl);
      }
    }

    // Verify NO non-indexable or thin routes are in sitemap.xml
    for (const route of seoRoutes) {
      const policy = publishingPolicyFor(route);
      if (!policy.indexable) {
        const forbiddenUrl = `https://www.makepdfright.com${route}`;
        if (sitemapXml.includes(`<loc>${forbiddenUrl}</loc>`)) {
          nonIndexableInSitemap.push(forbiddenUrl);
        }
      }
    }

    if (missingInSitemap.length > 0) {
      console.error(`\n❌ [Integrity Failure] ${missingInSitemap.length} primary indexable routes missing from sitemap.xml:`);
      missingInSitemap.forEach(u => console.error(`  - ${u}`));
      hasErrors = true;
    } else {
      console.log(`✅ All ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes are present in sitemap.xml.`);
    }

    if (nonIndexableInSitemap.length > 0) {
      console.error(`\n❌ [Integrity Failure] ${nonIndexableInSitemap.length} non-indexable/thin routes incorrectly found in sitemap.xml:`);
      nonIndexableInSitemap.forEach(u => console.error(`  - ${u}`));
      hasErrors = true;
    } else {
      console.log('✅ Zero non-indexable or thin routes in sitemap.xml (AdSense & Search Console compliant).');
    }

    const distSitemapPath = path.join(DIST_DIR, 'sitemap.xml');
    if (fs.existsSync(distSitemapPath)) {
      const distSitemapXml = fs.readFileSync(distSitemapPath, 'utf-8');
      const urlCount = (distSitemapXml.match(/<url>/g) || []).length;
      if (urlCount !== 21) {
        console.error(`❌ [Integrity Failure] dist/sitemap.xml contains ${urlCount} URLs, expected exactly 21!`);
        hasErrors = true;
      } else {
        console.log(`✅ dist/sitemap.xml contains exactly 21 URLs.`);
      }
    }
  }

  // 4. Validate 404 page & Non-Monetizable Page AdSense Isolation
  console.log('\n[Integrity Safeguard] Verifying 404 page and AdSense isolation rules...');
  const notFoundHtmlPath = path.join(DIST_DIR, '404.html');
  if (!fs.existsSync(notFoundHtmlPath)) {
    console.error('❌ [Integrity Failure] dist/404.html is missing!');
    hasErrors = true;
  } else {
    const notFoundHtml = fs.readFileSync(notFoundHtmlPath, 'utf-8');
    if (notFoundHtml.includes('<link rel="canonical"')) {
      console.error('❌ [Integrity Failure] dist/404.html must NOT contain a canonical tag!');
      hasErrors = true;
    }
    if (!notFoundHtml.includes('noindex, follow')) {
      console.error('❌ [Integrity Failure] dist/404.html must contain meta robots noindex, follow!');
      hasErrors = true;
    }
    if (notFoundHtml.includes('adsbygoogle.js')) {
      console.error('❌ [Integrity Failure] dist/404.html must NOT contain AdSense script!');
      hasErrors = true;
    }
    console.log('✅ dist/404.html is correctly isolated (no canonical, noindex, no AdSense).');
  }

  // Check non-monetizable routes have no AdSense script
  const nonMonetizableRoutes = ['/privacy', '/terms', '/cookie-policy', '/disclaimer', '/contact'];
  for (const route of nonMonetizableRoutes) {
    const slug = route.replace(/^\//, '');
    const htmlPath = path.join(DIST_DIR, slug, 'index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      if (html.includes('adsbygoogle.js')) {
        console.error(`❌ [Integrity Failure] Non-monetizable route ${route} contains AdSense script!`);
        hasErrors = true;
      }
    }
  }
  console.log('✅ All non-monetizable policy and contact routes are completely free of AdSense scripts.');

  // Validate Private Route Isolation (/ai-workspace): noindex, nofollow, no canonical, no AdSense
  console.log('\n[Integrity Safeguard] Verifying private authenticated routes isolation (/ai-workspace)...');
  const workspaceHtmlPath = path.join(DIST_DIR, 'ai-workspace', 'index.html');
  if (!fs.existsSync(workspaceHtmlPath)) {
    console.error('❌ [Integrity Failure] dist/ai-workspace/index.html is missing!');
    hasErrors = true;
  } else {
    const workspaceHtml = fs.readFileSync(workspaceHtmlPath, 'utf-8');
    if (workspaceHtml.includes('<link rel="canonical"') || workspaceHtml.includes('rel="canonical"')) {
      console.error('❌ [Integrity Failure] dist/ai-workspace/index.html must NOT contain a canonical tag!');
      hasErrors = true;
    }
    if (!workspaceHtml.includes('noindex, nofollow')) {
      console.error('❌ [Integrity Failure] dist/ai-workspace/index.html must contain meta robots noindex, nofollow!');
      hasErrors = true;
    }
    if (workspaceHtml.includes('adsbygoogle.js')) {
      console.error('❌ [Integrity Failure] dist/ai-workspace/index.html must NOT contain AdSense script!');
      hasErrors = true;
    }

    if (fs.existsSync(SITEMAP_PATH)) {
      const sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
      if (sitemapXml.includes('/ai-workspace')) {
        console.error('❌ [Integrity Failure] /ai-workspace MUST NOT appear in sitemap.xml!');
        hasErrors = true;
      }
    }
    console.log('✅ dist/ai-workspace/index.html is strictly isolated (no canonical, noindex, nofollow, no AdSense, excluded from sitemap).');
  }

  // 5. Verify Raw HTML Visible Content (H1, Meaningful content, FAQs) for all primary indexable routes
  console.log('\n[Integrity Safeguard] Verifying raw HTML visible content without running JavaScript...');
  const missingVisibleContent: string[] = [];
  for (const route of PRIMARY_INDEXABLE_ROUTES) {
    const slug = route === '/' ? '' : route.replace(/^\//, '');
    const htmlPath = route === '/' 
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, slug, 'index.html');

    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      const rootStartIndex = html.indexOf('<div id="root"');
      const scriptIndex = html.indexOf('<script', rootStartIndex);
      const rootEndIndex = scriptIndex !== -1 ? scriptIndex : html.indexOf('</body>', rootStartIndex);
      const rootContent = rootStartIndex !== -1 && rootEndIndex !== -1 ? html.substring(rootStartIndex, rootEndIndex) : '';

      if (!rootContent || !/<h1[^>]*>[\s\S]*?<\/h1>/i.test(rootContent)) {
        missingVisibleContent.push(`${route}: Missing prerendered <h1> or body content inside #root`);
      }
    } else {
      missingVisibleContent.push(`${route}: HTML file missing at ${htmlPath}`);
    }
  }

  if (missingVisibleContent.length > 0) {
    console.error(`❌ [Integrity Failure] ${missingVisibleContent.length} routes lack raw prerendered visible body content:`);
    missingVisibleContent.forEach(m => console.error(`  - ${m}`));
    hasErrors = true;
  } else {
    console.log(`✅ All ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes contain genuine prerendered visible body content & <h1>.`);
  }

  // 6. Verify Blocking Application Stylesheet (Anti-FOUC safeguard)
  console.log('\n[Integrity Safeguard] Verifying blocking application stylesheet (Zero FOUC rules)...');
  const stylesheetFailures: string[] = [];
  const canonicalFailures: string[] = [];

  for (const route of PRIMARY_INDEXABLE_ROUTES) {
    const slug = route === '/' ? '' : route.replace(/^\//, '');
    const htmlPath = route === '/' 
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, slug, 'index.html');

    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // Check for application stylesheet link
      const appCssMatches = html.match(/<link[^>]+rel="stylesheet"[^>]+href="\/assets\/index-[^"]+\.css"[^>]*>/gi) ||
                            html.match(/<link[^>]+href="\/assets\/index-[^"]+\.css"[^>]+rel="stylesheet"[^>]*>/gi);

      if (!appCssMatches || appCssMatches.length !== 1) {
        stylesheetFailures.push(`${route}: Expected exactly 1 application stylesheet link, found ${appCssMatches ? appCssMatches.length : 0}`);
      } else {
        const cssTag = appCssMatches[0];
        if (/media=["']print["']/i.test(cssTag)) {
          stylesheetFailures.push(`${route}: Application stylesheet uses media="print" (causes flash of unstyled content)!`);
        }
        if (/onload=["'][^"']*this\.media/i.test(cssTag)) {
          stylesheetFailures.push(`${route}: Application stylesheet uses onload media switching (causes flash of unstyled content)!`);
        }

        // Verify referenced CSS file exists
        const hrefMatch = cssTag.match(/href="(\/assets\/index-[^"]+\.css)"/i);
        if (hrefMatch) {
          const cssFilePath = path.join(DIST_DIR, hrefMatch[1].slice(1));
          if (!fs.existsSync(cssFilePath)) {
            stylesheetFailures.push(`${route}: Referenced CSS file does not exist on disk: ${hrefMatch[1]}`);
          } else {
            const cssStats = fs.statSync(cssFilePath);
            if (cssStats.size < 1000) {
              stylesheetFailures.push(`${route}: Referenced CSS file is suspiciously small (${cssStats.size} bytes): ${hrefMatch[1]}`);
            }
          }
        }
      }

      // Check Canonical URL
      const expectedCanonical = `https://www.makepdfright.com${route === '/' ? '' : route}`;
      const canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) ||
                             html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i);
      if (!canonicalMatch || canonicalMatch[1] !== expectedCanonical) {
        canonicalFailures.push(`${route}: Expected canonical "${expectedCanonical}", found "${canonicalMatch ? canonicalMatch[1] : 'none'}"`);
      }
    }
  }

  if (stylesheetFailures.length > 0) {
    console.error(`❌ [Integrity Failure] ${stylesheetFailures.length} stylesheet integrity issues detected:`);
    stylesheetFailures.forEach(s => console.error(`  - ${s}`));
    hasErrors = true;
  } else {
    console.log(`✅ All ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes load normal, blocking application stylesheets with valid CSS assets.`);
  }

  if (canonicalFailures.length > 0) {
    console.error(`❌ [Integrity Failure] ${canonicalFailures.length} canonical URL mismatches detected:`);
    canonicalFailures.forEach(c => console.error(`  - ${c}`));
    hasErrors = true;
  } else {
    console.log(`✅ All ${PRIMARY_INDEXABLE_ROUTES.length} primary indexable routes have exact self-referencing canonical URLs.`);
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
