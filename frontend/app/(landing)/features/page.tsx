import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  MessageSquare, 
  Brain, 
  Trophy, 
  Smartphone, 
  BarChart3, 
  Users,
  Clock,
  Shield,
  Zap
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="py-24">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Everything You Need to Manage Reviews Like a Pro
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          From centralized management to AI-powered insights, discover all the features that make Revu the ultimate review management platform
        </p>
      </section>

      {/* Review Management Section */}
      <section id="review-management" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Review Management</h2>
            </div>
            <p className="text-lg text-gray-600 mb-6">
              Never miss another review with our centralized inbox that brings all your platforms together.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Real-time syncing from Google, TripAdvisor, Facebook & more</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Smart filters to prioritize what matters most</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Bulk actions for efficient management</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Team collaboration with assignments and notes</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Response tracking and analytics</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-100 rounded-lg p-8 h-96 flex items-center justify-center">
            <p className="text-gray-500">[Review Management Screenshot]</p>
          </div>
        </div>
      </section>

      {/* AI Responses Section */}
      <section id="ai-responses" className="bg-gray-50 py-24 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-white rounded-lg p-8 h-96 flex items-center justify-center shadow-sm">
              <p className="text-gray-500">[AI Response Demo]</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">AI-Powered Responses</h2>
              </div>
              <p className="text-lg text-gray-600 mb-6">
                Generate personalized responses in seconds that sound exactly like you wrote them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Learns your brand voice and tone</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Context-aware responses for every situation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>One-click generation and sending</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Improves with every edit you make</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Multi-language support coming soon</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Tracking Section */}
      <section id="competitor-tracking" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Competitor Tracking</h2>
            </div>
            <p className="text-lg text-gray-600 mb-6">
              Stay ahead of the competition with real-time monitoring and insights.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Monitor unlimited competitors</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Rating and review velocity comparisons</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Sentiment analysis benchmarking</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Alert when competitors make moves</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span>Identify opportunities and threats</span>
              </li>
            </ul>
          </div>
          <div className="bg-gray-100 rounded-lg p-8 h-96 flex items-center justify-center">
            <p className="text-gray-500">[Competitor Analysis Chart]</p>
          </div>
        </div>
      </section>

      {/* More Features Grid */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            And So Much More...
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Smartphone className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Social Monitoring</h3>
              <p className="text-gray-600">
                Track mentions and sentiment across social platforms in real-time.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BarChart3 className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Comprehensive reporting with actionable insights and trend analysis.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Users className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-gray-600">
                Role-based permissions, assignments, and internal notes.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Zap className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automation Rules</h3>
              <p className="text-gray-600">
                Set up intelligent workflows to handle reviews automatically.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Clock className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Response Templates</h3>
              <p className="text-gray-600">
                Save time with customizable templates for common scenarios.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Shield className="h-10 w-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-600">
                Bank-level encryption, GDPR compliance, and regular backups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Review Management?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of businesses already using Revu to save time and grow
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Request Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}