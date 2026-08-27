import React, { useEffect } from 'react';
import { SEO_DATA, RouteSEO } from '../../constants/seoData';
import { publishingPolicyFor } from '../../constants/publishing';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  keywords?: string;
  author?: string;
  robots?: string;
  faqs?: FAQItem[];
  toolName?: string;
  category?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  canonicalUrl,
  ogImage = '/og-image.png',
  ogImageAlt,
  twitterTitle,
  twitterDescription,
  twitterImage,
  twitterImageAlt,
  keywords,
  author = 'MakePDFRight',
  robots,
  faqs,
  toolName,
  category = 'PDF Tools'
}) => {
  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const routeSeo: RouteSEO | undefined = SEO_DATA[currentPath];
    const policy = publishingPolicyFor(currentPath);

    const finalTitle = title || routeSeo?.title || 'MakePDFRight – Fast, Private Online PDF & Media Tools';
    const finalDescription = description || routeSeo?.description || '';

    // 1. Update Document Title
    document.title = finalTitle;

    const appUrl = 'https://www.makepdfright.com';
    const canonicalTarget = policy.canonicalPath;
    const fullCanonical = canonicalUrl || (canonicalTarget === '/' ? appUrl : `${appUrl}${canonicalTarget}`);
    
    const rawOgImage = ogImage || routeSeo?.ogImage || '/og-image.png';
    const fullOgImage = rawOgImage.startsWith('http') 
      ? rawOgImage 
      : `${appUrl}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`;

    const finalOgImageAlt = ogImageAlt || routeSeo?.ogImageAlt || `${finalTitle.split('–')[0].split('|')[0].trim()} with MakePDFRight`;

    const finalTwitterTitle = twitterTitle || routeSeo?.twitterTitle || finalTitle;
    const finalTwitterDesc = twitterDescription || routeSeo?.twitterDescription || finalDescription;

    const rawTwitterImage = twitterImage || routeSeo?.twitterImage || rawOgImage;
    const fullTwitterImage = rawTwitterImage.startsWith('http')
      ? rawTwitterImage
      : `${appUrl}${rawTwitterImage.startsWith('/') ? '' : '/'}${rawTwitterImage}`;

    const finalTwitterImageAlt = twitterImageAlt || routeSeo?.twitterImageAlt || finalOgImageAlt;

    const finalKeywords = keywords || routeSeo?.keywords;
    const finalAuthor = author || routeSeo?.author || 'MakePDFRight';
    const finalRobots = robots || (!policy.indexable ? 'noindex, follow' : (routeSeo?.robots || policy.robots));

    // 2. Helper to set/update meta tag
    const updateMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard Meta Tags
    updateMeta('meta[name="description"]', 'name', 'description', finalDescription);
    updateMeta('meta[name="author"]', 'name', 'author', finalAuthor);
    if (finalKeywords) {
      updateMeta('meta[name="keywords"]', 'name', 'keywords', finalKeywords);
    }
    updateMeta('meta[name="robots"]', 'name', 'robots', finalRobots);

    // Open Graph
    updateMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'MakePDFRight');
    updateMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    updateMeta('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    updateMeta('meta[property="og:description"]', 'property', 'og:description', finalDescription);
    updateMeta('meta[property="og:url"]', 'property', 'og:url', fullCanonical);
    updateMeta('meta[property="og:image"]', 'property', 'og:image', fullOgImage);
    updateMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', finalOgImageAlt);

    // Twitter Cards
    updateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', finalTwitterTitle);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', finalTwitterDesc);
    updateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', fullTwitterImage);
    updateMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', finalTwitterImageAlt);

    // Canonical Link: Do NOT set canonical on 404 or unknown routes
    const is404 = currentPath === '/404' || finalTitle.includes('Page Not Found');
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (is404) {
      if (link) {
        link.remove();
      }
    } else {
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', fullCanonical);
    }

    // 3. Structured Data (JSON-LD) Injection using @graph format
    const graphNodes: any[] = [
      // WebSite Schema
      {
        '@type': 'WebSite',
        '@id': `${appUrl}/#website`,
        'url': appUrl,
        'name': 'MakePDFRight',
        'description': 'Fast, private & free browser-first PDF and AI document processing tools.'
      },
      // Organization Schema
      {
        '@type': 'Organization',
        '@id': `${appUrl}/#organization`,
        'name': 'MakePDFRight',
        'url': appUrl,
        'logo': `${appUrl}/apple-touch-icon.png`
      }
    ];

    // Page Specific Schemas (Only for Indexable Pages)
    if (policy.indexable) {
      if (currentPath === '/about') {
        graphNodes.push({
          '@type': 'AboutPage',
          '@id': `${fullCanonical}/#webpage`,
          'url': fullCanonical,
          'name': finalTitle,
          'description': finalDescription
        });
      } else if (currentPath === '/contact') {
        graphNodes.push({
          '@type': 'ContactPage',
          '@id': `${fullCanonical}/#webpage`,
          'url': fullCanonical,
          'name': finalTitle,
          'description': finalDescription
        });
      } else if (toolName) {
        graphNodes.push({
          '@type': 'SoftwareApplication',
          '@id': `${fullCanonical}/#software`,
          'name': `${toolName} - MakePDFRight`,
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Any',
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD'
          },
          'description': finalDescription,
          'url': fullCanonical
        });
      } else {
        graphNodes.push({
          '@type': 'WebPage',
          '@id': `${fullCanonical}/#webpage`,
          'url': fullCanonical,
          'name': finalTitle,
          'description': finalDescription
        });
      }

      // Breadcrumb Schema for non-home indexable pages
      if (currentPath !== '/' && currentPath !== '') {
        graphNodes.push({
          '@type': 'BreadcrumbList',
          '@id': `${fullCanonical}/#breadcrumb`,
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': appUrl
            },
            {
              '@type': 'ListItem',
              'position': 2,
              'name': toolName || finalTitle.split('–')[0].split('|')[0].trim(),
              'item': fullCanonical
            }
          ]
        });
      }

      // FAQ Schema if FAQs present on indexable page
      if (faqs && faqs.length > 0) {
        graphNodes.push({
          '@type': 'FAQPage',
          '@id': `${fullCanonical}/#faq`,
          'mainEntity': faqs.map(faq => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.answer
            }
          }))
        });
      }
    } else {
      // Non-indexable / thin route schema: generic lightweight WebPage
      graphNodes.push({
        '@type': 'WebPage',
        '@id': `${fullCanonical}/#webpage`,
        'url': fullCanonical,
        'name': finalTitle,
        'description': finalDescription
      });
    }

    const schemaGraph = {
      '@context': 'https://schema.org',
      '@graph': graphNodes
    };

    // Inject JSON-LD Script Tag
    let scriptEl = document.querySelector('#seo-jsonld-schema') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'seo-jsonld-schema';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaGraph);

  }, [title, description, canonicalUrl, ogImage, ogImageAlt, twitterTitle, twitterDescription, twitterImage, twitterImageAlt, keywords, author, robots, faqs, toolName, category]);

  return null;
};
