import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { type GuideItem, guidePath } from '../constants/guides';

export function Guide({ guide }: { guide: GuideItem }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 px-4 py-10 sm:py-14 text-slate-700 dark:text-slate-300">
      <SEO title={`${guide.title} | MakePDFRight`} description={guide.summary}
        canonicalUrl={`https://www.makepdfright.com${guidePath(guide.id)}`} />
      <div className="max-w-3xl mx-auto space-y-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm">
          <Link to="/" className="text-primary hover:underline">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/resources" className="text-primary hover:underline">Resources &amp; Guides</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{guide.title}</span>
        </nav>
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8">
          <header className="space-y-4">
            <p className="text-sm font-semibold text-primary capitalize">{guide.category}</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{guide.title}</h1>
            <p className="text-lg leading-relaxed">{guide.summary}</p>
          </header>
          <section aria-labelledby="takeaways" className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 space-y-3">
            <h2 id="takeaways" className="text-xl font-bold text-slate-900 dark:text-white">Key takeaways</h2>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              {guide.keyPoints.map(point => <li key={point}>{point}</li>)}
            </ul>
          </section>
          {guide.content.map(section => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{section.heading}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph} className="leading-relaxed">{paragraph}</p>)}
            </section>
          ))}
          <footer className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-wrap items-center gap-5">
            <Link to={guide.relatedTool.path} className="rounded-xl bg-primary px-5 py-3 text-white font-semibold hover:bg-primary/90">Open {guide.relatedTool.name}</Link>
            <Link to="/resources" className="text-primary hover:underline font-semibold">Browse all guides</Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
