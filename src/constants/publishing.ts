/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PublishingPolicy {
  indexable: boolean;
  canonicalPath: string;
  robots: string;
  monetizable: boolean;
  sitemapEligible: boolean;
}

export const PRIMARY_INDEXABLE_ROUTES = [
  '/',
  '/merge',
  '/split',
  '/compress',
  '/pdf-to-jpg',
  '/image-to-pdf',
  '/pdf-to-word',
  '/pdf-to-excel',
  '/edit',
  '/rotate',
  '/organise',
  '/ocr',
  '/generate-image',
  '/transcribe',
  '/resources',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cookie-policy',
  '/disclaimer'
] as const;

export const INDEXABLE_ROUTES: readonly string[] = PRIMARY_INDEXABLE_ROUTES;

export const CANONICAL_MAPPINGS: Record<string, string> = {
  // Direct Aliases
  '/merge-pdf': '/merge',
  '/split-pdf': '/split',
  '/compress-pdf': '/compress',
  '/edit-pdf': '/edit',
  '/pdf-editor': '/edit',
  '/rotate-pdf': '/rotate',
  '/organize': '/organise',
  '/image-generator': '/generate-image',
  '/audio-transcribe': '/transcribe',
  '/word-to-pdf': '/pdf-to-word',

  // PDF to Excel Supporting Routes Consolidated to /pdf-to-excel
  '/extract-tables-from-pdf-to-excel': '/pdf-to-excel',
  '/pdf-bank-statement-to-excel': '/pdf-to-excel',
  '/invoice-pdf-to-excel': '/pdf-to-excel',
  '/financial-statement-pdf-to-excel': '/pdf-to-excel',
  '/multi-page-pdf-to-excel': '/pdf-to-excel',
  '/pdf-to-excel-on-iphone': '/pdf-to-excel',
  '/pdf-to-xlsx-online': '/pdf-to-excel',
  '/convert-pdf-data-to-excel': '/pdf-to-excel',

  // Merge Variants -> Consolidated to /merge
  '/merge-pdf-files-free': '/merge',
  '/combine-pdf-files-online': '/merge',
  '/merge-multiple-pdf-files-into-one': '/merge',
  '/merge-pdf-and-word-into-one-file': '/merge',
  '/merge-scanned-pdf-pages': '/merge',
  '/merge-pdf-on-iphone': '/merge',
  '/merge-pdf-in-order': '/merge',
  '/merge-protected-pdf-files': '/merge',
  '/how-to-merge-pdf-files': '/merge',
  '/merge-jpg-and-pdf-into-one-file': '/merge',
  '/merge-pdf-without-software': '/merge',
  '/merge-pdf-keep-bookmarks': '/merge',
  '/merge-pdf-without-losing-quality': '/merge',

  // Split Variants -> Consolidated to /split
  '/split-pdf-by-page-number': '/split',
  '/extract-pages-from-pdf': '/split',
  '/split-pdf-into-single-pages': '/split',
  '/delete-pages-from-pdf': '/split',
  '/split-pdf-in-half': '/split',
  '/split-pdf-every-n-pages': '/split',
  '/split-large-pdf-file': '/split',
  '/split-pdf-odd-even-pages': '/split',
  '/split-pdf-on-iphone': '/split',
  '/split-pdf-without-losing-quality': '/split',
  '/split-pdf-without-acrobat': '/split',
  '/how-to-split-a-pdf': '/split',
  '/split-pdf-by-range': '/split',
  '/split-pdf-into-multiple-files': '/split',
  '/separate-pdf-pages': '/split',
  '/extract-specific-pages-from-pdf': '/split',
  '/extract-single-page-from-pdf': '/split',
  '/split-pdf-for-email': '/split',
  '/split-pdf-for-whatsapp': '/split',
  '/split-pdf-for-upload': '/split',
  '/split-pdf-online-free': '/split',

  // Compress Variants -> Consolidated to /compress
  '/compress-pdf-to-100kb': '/compress',
  '/compress-pdf-to-500kb': '/compress',
  '/compress-pdf-to-1mb': '/compress',
  '/compress-pdf-without-losing-quality': '/compress',
  '/compress-pdf-for-whatsapp': '/compress',
  '/compress-pdf-for-job-application': '/compress',
  '/compress-multiple-pdf-files': '/compress',
  '/compress-pdf-on-iphone': '/compress',
  '/compress-pdf-under-2mb': '/compress',
  '/reduce-pdf-size-for-email': '/compress',

  // PDF-to-Word Variants -> Consolidated to /pdf-to-word
  '/pdf-to-word-without-losing-formatting': '/pdf-to-word',
  '/scanned-pdf-to-word': '/pdf-to-word',
  '/pdf-to-word-free-no-email': '/pdf-to-word',
  '/pdf-to-word-editable': '/pdf-to-word',
  '/pdf-to-word-on-iphone': '/pdf-to-word',
  '/pdf-to-word-with-tables': '/pdf-to-word',
  '/pdf-to-word-for-resume': '/pdf-to-word',
  '/pdf-to-word-multiple-pages': '/pdf-to-word',
  '/pdf-to-word-for-contracts': '/pdf-to-word',
  '/pdf-to-word-online-free': '/pdf-to-word',
  '/pdf-to-word-without-software': '/pdf-to-word',
  '/pdf-to-word-password-protected': '/pdf-to-word',

  // Image Variants -> Consolidated
  '/jpg-to-pdf': '/image-to-pdf',
  '/convert-jpg-to-pdf-free': '/image-to-pdf',
};

// Trust, policy, and legal pages where ads are strictly disallowed
export const NON_MONETIZABLE_PAGES = new Set([
  '/ai-workspace',
  '/contact',
  '/privacy',
  '/terms',
  '/cookie-policy',
  '/disclaimer',
  '/404'
]);

export function canonicalPathFor(pathname: string): string {
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  if (CANONICAL_MAPPINGS[cleanPath]) {
    return CANONICAL_MAPPINGS[cleanPath];
  }
  return cleanPath;
}

export function publishingPolicyFor(pathname: string): PublishingPolicy {
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  const canonical = canonicalPathFor(cleanPath);

  // Authenticated AI Workspace route: private, unindexed, non-monetizable
  if (cleanPath === '/ai-workspace') {
    return {
      indexable: false,
      canonicalPath: '',
      robots: 'noindex, nofollow',
      monetizable: false,
      sitemapEligible: false,
    };
  }

  const isPrimary = (PRIMARY_INDEXABLE_ROUTES as readonly string[]).includes(cleanPath);

  // If path is one of the approved primary indexable routes
  if (isPrimary) {
    const isNonMonetizable = NON_MONETIZABLE_PAGES.has(cleanPath);
    return {
      indexable: true,
      canonicalPath: canonical,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      monetizable: !isNonMonetizable,
      sitemapEligible: true,
    };
  }

  // Supporting, thin, alias, or consolidated variants
  return {
    indexable: false,
    canonicalPath: canonical,
    robots: 'noindex, follow',
    monetizable: false,
    sitemapEligible: false,
  };
}
