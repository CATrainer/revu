import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Brain, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIPage() {
  return (
    <div className="py-24">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Powered by Advanced AI
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          AI That Speaks Your Brand&apos;s Language
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Generate personalized responses that maintain your unique voice while saving 80% of response time
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Try AI Response Generator</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/demo">Watch Demo</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          How Our AI Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>1. Learn Your Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our AI analyzes your past responses and brand guidelines to understand your unique communication style.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>2. Generate Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Creates contextual, personalized responses for each review that sound authentically like you.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>3. Improve Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Every edit you make helps the AI better understand your preferences and improve future responses.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* AI Features */}
      <section className="bg-gray-50 py-24 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Advanced AI Features
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Smart Response Generation</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Context-Aware</strong> - Understands review sentiment and responds appropriately
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Brand Consistent</strong> - Maintains your tone whether professional, friendly, or casual
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Personalized</strong> - References specific details mentioned in reviews
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Multi-language</strong> - Coming soon: respond in the reviewer&apos;s language
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-6">Natural Language Insights</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Ask Anything</strong> - Query your reviews in plain English
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Trend Detection</strong> - Automatically identifies emerging issues
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Sentiment Analysis</strong> - Understand customer emotions at scale
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3">✓</span>
                  <div>
                    <strong>Actionable Recommendations</strong> - Get specific improvement suggestions
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">92%</div>
              <p className="text-gray-600">Response Acceptance Rate</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">10min</div>
              <p className="text-gray-600">Average Response Time</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">4.8/5</div>
              <p className="text-gray-600">Customer Satisfaction</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">80%</div>
              <p className="text-gray-600">Time Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Experience the Future of Review Management
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Let AI handle the heavy lifting while you focus on your business
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/join-waitlist">Join Waiting List</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}