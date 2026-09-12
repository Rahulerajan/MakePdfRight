import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GUIDES, guidePath } from '../src/constants/guides';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

test('Every guide has full article HTML, crawlable links and its own canonical URL after build', () => {
  const hub = fs.readFileSync('dist/resources/index.html', 'utf8');
  const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
  for (const guide of GUIDES) {
    const route = guidePath(guide.id);
    const html = fs.readFileSync(path.join('dist', route.slice(1), 'index.html'), 'utf8');
    assert.ok(hub.includes(`href="${route}"`), `${route}: hub must use a real link`);
    assert.ok(sitemap.includes(`<loc>https://www.makepdfright.com${route}</loc>`));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes('<article'));
    assert.ok(html.includes(`<link rel="canonical" href="https://www.makepdfright.com${route}"`));
    assert.ok(!html.includes('content="noindex'));
    for (const section of guide.content) {
      for (const paragraph of section.paragraphs) {
        assert.ok(html.includes(escapeHtml(paragraph)), `${route}: article text must exist without clicking or running JavaScript`);
      }
    }
    const schema = JSON.parse(html.match(/<script id="seo-jsonld-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    assert.ok(!schema['@graph'].some((node: { '@type': string }) => node['@type'] === 'SoftwareApplication'), 'Guides must not be labeled as software');
  }
});
