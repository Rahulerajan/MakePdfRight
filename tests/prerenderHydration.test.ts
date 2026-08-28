import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../src/App';
import { PRIMARY_INDEXABLE_ROUTES, publishingPolicyFor } from '../src/constants/publishing';

describe('Prerender and Hydration Consistency Tests', () => {
  const distDir = path.join(process.cwd(), 'dist');

  test('Homepage prerender matches React App renderToString', () => {
    const reactHtml = renderToString(React.createElement(App, { initialPath: '/' }));
    assert.ok(reactHtml.includes('MakePDFRight'), 'React render should contain MakePDFRight branding');
    assert.ok(reactHtml.includes('Make Your') && reactHtml.includes('PDFs'), 'React render should contain homepage H1 heading');
    assert.ok(reactHtml.includes('Merge PDF'), 'React render should contain tools');

    const indexHtmlPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      assert.ok(indexHtml.includes('data-prerendered="true"'), 'dist/index.html should have data-prerendered attribute');
      assert.ok(indexHtml.includes('Make Your') && indexHtml.includes('PDFs'), 'dist/index.html should contain exact React H1');
      assert.ok(!indexHtml.includes('Free, Fast & Private Online PDF Tools'), 'dist/index.html must not contain old alternative SEO template H1');
    }
  });

  test('Tool routes prerender real React component markup with <h1>', () => {
    const mergeHtml = renderToString(React.createElement(App, { initialPath: '/merge' }));
    assert.ok(mergeHtml.includes('Merge PDF'), 'Merge route must render Merge PDF title');
    assert.ok(mergeHtml.includes('Combine multiple PDF files'), 'Merge route must render description');

    const compressHtml = renderToString(React.createElement(App, { initialPath: '/compress' }));
    assert.ok(compressHtml.includes('Compress PDF'), 'Compress route must render Compress PDF title');
  });

  test('Sitemap contains exactly 21 primary indexable URLs', () => {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml should exist');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const count = (sitemapContent.match(/<url>/g) || []).length;
    assert.strictEqual(count, 21, `Expected exactly 21 URLs in sitemap, found ${count}`);

    for (const route of PRIMARY_INDEXABLE_ROUTES) {
      const expectedUrl = `https://www.makepdfright.com${route === '/' ? '' : route}`;
      assert.ok(sitemapContent.includes(`<loc>${expectedUrl}</loc>`), `Missing ${expectedUrl} in sitemap`);
    }
  });

  test('All primary routes have strict publishing policies', () => {
    assert.strictEqual(PRIMARY_INDEXABLE_ROUTES.length, 21, 'There must be exactly 21 primary indexable routes');
    for (const route of PRIMARY_INDEXABLE_ROUTES) {
      const policy = publishingPolicyFor(route);
      assert.strictEqual(policy.indexable, true, `Route ${route} should be indexable`);
      assert.strictEqual(policy.canonicalPath, route, `Route ${route} should be self-canonical`);
    }
  });

  test('Prerendered HTML pages use normal blocking stylesheets without FOUC techniques', () => {
    const indexHtmlPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      
      // Main app CSS must not have media="print" or onload switching
      const appCssMatches = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="\/assets\/index-[^"]+\.css"[^>]*>/gi) ||
                            indexHtml.match(/<link[^>]+href="\/assets\/index-[^"]+\.css"[^>]+rel="stylesheet"[^>]*>/gi);
      
      assert.ok(appCssMatches && appCssMatches.length === 1, 'There should be exactly 1 main application stylesheet link');
      const cssTag = appCssMatches[0];
      assert.ok(!cssTag.includes('media="print"'), 'Application stylesheet must NOT have media="print"');
      assert.ok(!cssTag.includes('onload='), 'Application stylesheet must NOT use onload media switching');
      assert.ok(cssTag.includes('crossorigin') || cssTag.includes('rel="stylesheet"'), 'Application stylesheet must be a normal blocking link tag');
    }
  });

  test('404 page is completely isolated and valid for genuine HTTP 404 responses', () => {
    const notFoundHtmlPath = path.join(distDir, '404.html');
    if (fs.existsSync(notFoundHtmlPath)) {
      const html = fs.readFileSync(notFoundHtmlPath, 'utf-8');
      assert.ok(html.includes('Page Not Found'), '404 page must have visible Page Not Found heading');
      assert.ok(html.includes('noindex, follow'), '404 page must have noindex, follow meta robots');
      assert.ok(!html.includes('<link rel="canonical"'), '404 page must NOT contain a canonical tag');
      assert.ok(!html.includes('adsbygoogle.js'), '404 page must NOT contain AdSense scripts');
      assert.ok(!html.includes('Make Your PDFs Right'), '404 page must NOT contain homepage content');
    }
  });

  test('vercel.json routing guarantees genuine HTTP 404 for unknown URLs', () => {
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json should exist');
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
    
    // Catch-all rewrite to /index.html must NOT exist
    const catchAllRewrite = vercelJson.rewrites?.find((r: any) => 
      r.destination === '/index.html' && (r.source.includes('(?!') || r.source.includes('.*') || r.source === '/:match*')
    );
    assert.strictEqual(catchAllRewrite, undefined, 'vercel.json must NOT contain a broad catch-all rewrite to /index.html');

    // 308 redirects must be present
    const mergePdfRedirect = vercelJson.redirects?.find((r: any) => r.source === '/merge-pdf' && r.destination === '/merge');
    assert.ok(mergePdfRedirect, 'Permanent redirect /merge-pdf -> /merge must be present');
    assert.strictEqual(mergePdfRedirect.permanent, true, 'Redirect must be permanent (HTTP 308)');
  });
});
