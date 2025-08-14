import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  MessageSquare, 
  Brain, 
  Trophy, 
} from 'lucide-react';
import { 
  FaMobileAlt, 
  FaChartBar, 
  FaUsers,
  FaBolt,
  FaClock,
  FaShieldAlt,
  FaHashtag
} from 'react-icons/fa';

export default function FeaturesPage() {
  return (
    <div className="py-24 section-background">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-dark mb-6">
          Everything You Need to Manage Reviews Like a Pro
        </h1>
        <p className="text-xl text-secondary-dark mb-8 max-w-3xl mx-auto">
          From centralized management to AI-powered insights, discover all the features that make Repruv the ultimate review management platform
        </p>
      </section>

      {/* Review Management Section */}
  <section id="review-management" className="theme-review max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-[var(--feature-icon)]" />
              </div>
              <h2 className="text-3xl font-bold text-primary-dark">Review Management</h2>
            </div>
            <p className="text-lg text-secondary-dark mb-6">
              Never miss another review with our centralized inbox that brings all your platforms together.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Real-time syncing from Google, TripAdvisor, Facebook & more</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Smart filters to prioritize what matters most</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Bulk actions for efficient management</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Team collaboration with assignments and notes</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Response tracking and analytics</span>
              </li>
            </ul>
          </div>
          <div className="card-background-light rounded-lg p-8 h-96 flex items-center justify-center">
            <p className="text-muted-dark">[Review Management Screenshot]</p>
          </div>
        </div>
      </section>

      {/* AI Responses Section */}
  <section id="ai-responses" className="theme-ai section-background-alt py-24 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 card-background rounded-lg p-8 h-96 flex items-center justify-center shadow-sm">
              <p className="text-muted-dark">[AI Response Demo]</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-[var(--feature-icon)]" />
                </div>
                <h2 className="text-3xl font-bold text-primary-dark">AI-Powered Responses</h2>
              </div>
              <p className="text-lg text-secondary-dark mb-6">
                Generate personalized responses in seconds that sound exactly like you wrote them.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Learns your brand voice and tone</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Context-aware responses for every situation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">One-click generation and sending</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Improves with every edit you make</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Multi-language support coming soon</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Tracking Section */}
  <section id="competitor-tracking" className="theme-competitors max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-[var(--feature-icon)]" />
              </div>
              <h2 className="text-3xl font-bold text-primary-dark">Competitor Tracking</h2>
            </div>
            <p className="text-lg text-secondary-dark mb-6">
              Stay ahead of the competition with real-time monitoring and insights.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Monitor unlimited competitors</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Rating and review velocity comparisons</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Sentiment analysis benchmarking</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Alert when competitors make moves</span>
              </li>
              <li className="flex items-start">
                <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                <span className="text-body-dark">Identify opportunities and threats</span>
              </li>
            </ul>
          </div>
          <div className="card-background-light rounded-lg p-8 h-96 flex items-center justify-center">
            <p className="text-muted-dark">[Competitor Analysis Chart]</p>
          </div>
        </div>
      </section>

      {/* Social Monitoring Section */}
  <section id="social-monitoring" className="theme-social section-background-alt py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 card-background rounded-lg p-8 h-96 flex items-center justify-center shadow-sm">
              <p className="text-muted-dark">[Social Monitoring Dashboard]</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                  <FaHashtag className="h-6 w-6 text-[var(--feature-icon)]" />
                </div>
                <h2 className="text-3xl font-bold text-primary-dark">Social Monitoring</h2>
              </div>
              <p className="text-lg text-secondary-dark mb-6">
                Track mentions and feedback across all social media platforms in real-time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Monitor Facebook, Instagram, Twitter, and more</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Real-time sentiment analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Automated alert notifications</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Hashtag and keyword tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Influencer mention identification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics and Reports Section */}
  <section id="analytics-and-reports" className="theme-analytics max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                <FaChartBar className="h-6 w-6 text-[var(--feature-icon)]" />
              </div>
              <h2 className="text-3xl font-bold text-primary-dark">Analytics & Reports</h2>
            </div>
            <p className="text-lg text-secondary-dark mb-6">
              Get actionable insights with comprehensive reporting and analytics derived from your review data.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span className="text-body-dark">Performance metrics and KPIs</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span className="text-body-dark">Sentiment trend analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span className="text-body-dark">Custom reporting dashboards</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span className="text-body-dark">Automated report generation</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 mt-1">✓</span>
                <span className="text-body-dark">Export data in multiple formats</span>
              </li>
            </ul>
          </div>
          <div className="card-background-light rounded-lg p-8 h-96 flex items-center justify-center">
            <p className="text-muted-dark">[Analytics Dashboard]</p>
          </div>
        </div>
      </section>

  {/* Team Collaboration Section */}
  <section id="team-collaboration" className="theme-team section-background py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 card-background rounded-lg p-8 h-96 flex items-center justify-center shadow-sm">
              <p className="text-muted-dark">[Team Collaboration Interface]</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 icon-background rounded-lg flex items-center justify-center">
                    <FaUsers className="h-6 w-6 text-[var(--feature-icon)]" />
                  </div>
                <h2 className="text-3xl font-bold text-primary-dark">Team Collaboration</h2>
              </div>
              <p className="text-lg text-secondary-dark mb-6">
                Work collaboratively with task assignments, role-based permissions and automation workflows.
              </p>
              <ul className="space-y-3">
          <li className="flex items-start">
            <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Role-based access control</span>
                </li>
                <li className="flex items-start">
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Task assignments and notifications</span>
                </li>
                <li className="flex items-start">
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Internal notes and comments</span>
                </li>
                <li className="flex items-start">
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span className="text-body-dark">Approval workflows</span>
                </li>
                <li className="flex items-start">
                    <span className="text-[var(--feature-tick)] mr-3 mt-1">✓</span>
                  <span>Team performance analytics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

  {/* More Features Grid */}
  <section className="section-background-alt py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-dark mb-12 text-center">
            And So Much More...
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
      <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
        <FaMobileAlt className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Social Monitoring</h3>
              <p className="text-secondary-dark">
                Track mentions and sentiment across social platforms in real-time.
              </p>
            </div>
            <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
        <FaChartBar className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Advanced Analytics</h3>
              <p className="text-secondary-dark">
                Comprehensive reporting with actionable insights and trend analysis.
              </p>
            </div>
            <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
        <FaUsers className="h-10 w-10 text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Team Collaboration</h3>
              <p className="text-secondary-dark">
                Role-based permissions, assignments, and internal notes.
              </p>
            </div>
            <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
                <FaBolt className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Automation Rules</h3>
              <p className="text-secondary-dark">
                Set up intelligent workflows to handle reviews automatically.
              </p>
            </div>
            <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
        <FaClock className="h-10 w-10 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Response Templates</h3>
              <p className="text-secondary-dark">
                Save time with customizable templates for common scenarios.
              </p>
            </div>
            <div className="card-background p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-4">
        <FaShieldAlt className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Enterprise Security</h3>
              <p className="text-secondary-dark">
                Bank-level encryption, GDPR compliance, and regular backups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 section-background-alt">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary-dark mb-4">
            Ready to Transform Your Review Management?
          </h2>
          <p className="text-xl text-secondary-dark mb-8">
            Join hundreds of businesses already using Repruv to save time and grow
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="button-primary" asChild>
              <Link href="/join-waitlist">Join Waiting List</Link>
            </Button>
            <Button size="lg" className="button-secondary" asChild>
              <Link href="/demo">Request Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}