import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check, TrendingUp, Search, BarChart3 } from 'lucide-react';

export default function SEOPage() {
  return (
    <div className="py-24 section-background">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
          Reviews That Boost Your Local SEO
        </h1>
        <p className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto">
          Turn customer feedback into search engine gold with our SEO-optimized review management
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" className="button-primary border-0" asChild>
            <Link href="/join-waitlist">Join Waiting List</Link>
          </Button>
          <Button size="lg" variant="outline" className="button-secondary" asChild>
            <Link href="/demo">See How It Works</Link>
          </Button>
        </div>
      </section>

      {/* Why Reviews Matter for SEO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
          Why Reviews Matter for SEO
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card-background p-8 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <Search className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-primary-dark">Fresh Content</h3>
            <p className="text-secondary-dark">
              Google values fresh, relevant content. Regular reviews keep your profile active and engaging.
            </p>
          </div>
          <div className="card-background p-8 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-primary-dark">Local Pack Rankings</h3>
            <p className="text-secondary-dark">
              Review signals directly impact your position in Googles local 3-pack results.
            </p>
          </div>
          <div className="card-background p-8 rounded-lg shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <BarChart3 className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-primary-dark">Increased Visibility</h3>
            <p className="text-secondary-dark">
              More reviews mean more keywords and long-tail search opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* How Repruv Helps */}
      <section className="section-background-alt py-24 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
            How Repruv Supercharges Your SEO
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-primary-dark">Automated Response Publishing</h4>
                    <p className="text-secondary-dark">
                      Every response adds fresh, keyword-rich content to your profile
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-primary-dark">Keyword Optimization</h4>
                    <p className="text-secondary-dark">
                      AI naturally includes local keywords and service terms in responses
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-primary-dark">Review Velocity Tracking</h4>
                    <p className="text-secondary-dark">
                      Monitor and improve your review acquisition rate
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-primary-dark">Rich Snippet Optimization</h4>
                    <p className="text-secondary-dark">
                      Structured data helps your reviews appear in search results
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="card-background p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-primary-dark">SEO Impact Example</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary-dark">Local Search Visibility</span>
                  <span className="text-2xl font-bold text-green-600">+47%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary-dark">Click-Through Rate</span>
                  <span className="text-2xl font-bold text-green-600">+32%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary-dark">Map Pack Position</span>
                  <span className="text-2xl font-bold text-green-600">#3 → #1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-dark mb-4">
            Ready to Dominate Local Search?
          </h2>
          <p className="text-xl text-secondary-dark mb-8">
            Join businesses seeing 40%+ increases in local search visibility
          </p>
          <Button size="lg" asChild>
            <Link href="/join-waitlist">Join Waiting List</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}