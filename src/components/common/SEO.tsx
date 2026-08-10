import React, { useEffect } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  faqs?: FAQItem[];
  toolName?: string;
  category?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  canonicalUrl,
  ogImage = '/og-image.png',
  faqs,
  toolName,
  category = 'PDF Tools'
}) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const fullCanonical = canonicalUrl || `https://www.makepdfright.com${currentPath}`;

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
    updateMeta('meta[name="description"]', 'name', 'description', description);
    updateMeta('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large');

    // Open Graph
    updateMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'MakePDFRight');
    updateMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    updateMeta('meta[property="og:title"]', 'property', 'og:title', title);
    updateMeta('meta[property="og:description"]', 'property', 'og:description', description);
    updateMeta('meta[property="og:url"]', 'property', 'og:url', fullCanonical);
    updateMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);

    // Twitter Cards
    updateMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    updateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // Canonical Link
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', fullCanonical);

    // 3. Structured Data (JSON-LD) Injection
    const schemaGraph: any[] = [
      // WebSite Schema
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'MakePDFRight',
        'url': 'https://makepdfright.com',
        'description': 'Fast, private & free browser-first PDF and AI document processing tools.'
      },
      // Organization Schema
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'MakePDFRight',
        'url': 'https://makepdfright.com',
        'logo': 'https://makepdfright.com/apple-touch-icon.png'
      }
    ];

    // If on a specific Tool Page, add SoftwareApplication schema
    if (toolName) {
      schemaGraph.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': `${toolName} - MakePDFRight`,
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Any',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        },
        'description': description,
        'url': fullCanonical
      });

      // Breadcrumb Schema
      schemaGraph.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://makepdfright.com'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': category,
            'item': 'https://makepdfright.com/#tools'
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': toolName,
            'item': fullCanonical
          }
        ]
      });
    }

    // FAQ Schema if FAQs present
    if (faqs && faqs.length > 0) {
      schemaGraph.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
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

    // Inject JSON-LD Script Tag
    let scriptEl = document.querySelector('#seo-jsonld-schema') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'seo-jsonld-schema';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(schemaGraph);

  }, [title, description, canonicalUrl, ogImage, faqs, toolName, category]);

  return null;
};
