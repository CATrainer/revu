import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Revu</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              All-in-One Dashboard to<br />
              Supercharge Your Business
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Manage reviews, monitor competitors, and grow your reputation with AI-powered insights that save you hours every week
            </p>
            <div className="space-x-4">
              <Link
                href="/signup"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-200"
              >
                Start Free Trial
              </Link>
              <Link
                href="/demo"
                className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border-2 border-indigo-600 hover:bg-gray-50 transition duration-200"
              >
                Request Demo
              </Link>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="📊"
              title="Review Management"
              description="Centralize all your reviews from Google, TripAdvisor, and more in one intelligent inbox"
            />
            <FeatureCard
              icon="🤖"
              title="AI Responses"
              description="Generate personalized responses in your brand voice with our advanced AI assistant"
            />
            <FeatureCard
              icon="🏆"
              title="Competitor Tracking"
              description="Monitor and benchmark against local competitors to stay ahead of the competition"
            />
            <FeatureCard
              icon="📱"
              title="Social Monitoring"
              description="Track mentions and sentiment across social platforms in real-time"
            />
            <FeatureCard
              icon="📈"
              title="Analytics & Reports"
              description="Get actionable insights with comprehensive reporting and analytics"
            />
            <FeatureCard
              icon="👥"
              title="Team Collaboration"
              description="Work together with role-based permissions and task assignments"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Revu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}