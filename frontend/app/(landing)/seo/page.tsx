import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SEO Features | Repruv',
  description: 'Discover how Repruv boosts your local SEO with automated review responses, performance analytics, and smart engagement tools.',
  alternates: { canonical: '/seo' }
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 prose prose-slate dark:prose-invert">
      <h1>SEO & Visibility Features</h1>
      <p>
        Repruv helps you turn customer feedback into a continuous SEO advantage. This page is a placeholder
        implementation created because the build previously failed: the directory existed without a page module.
      </p>
      <h2>Key Capabilities</h2>
      <ul>
        <li>Automated, brand-safe response generation</li>
        <li>Structured engagement metrics for search relevance</li>
        <li>Rule-based prioritization and workflow automation</li>
        <li>Performance tracking across channels</li>
      </ul>
      <h2>Next Steps</h2>
      <p>
        Customize this content or remove the <code>(landing)/seo</code> folder if this route is not required. Keeping it
        prevents Next.js from treating the empty segment as an invalid route and resolves the <code>"is not a module"</code> build error.
      </p>
    </main>
  );
}
