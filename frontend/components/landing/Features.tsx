// frontend/components/landing/Features.tsx
import { 
  BarChart3, 
  Brain, 
  Trophy, 
  Smartphone, 
  FileText, 
  Users 
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Review Management',
    description: 'Centralize all your reviews from Google, TripAdvisor, and more in one intelligent inbox',
  },
  {
    icon: Brain,
    title: 'AI Responses',
    description: 'Generate personalized responses in your brand voice with our advanced AI assistant',
  },
  {
    icon: Trophy,
    title: 'Competitor Tracking',
    description: 'Monitor and benchmark against local competitors to stay ahead of the competition',
  },
  {
    icon: Smartphone,
    title: 'Social Monitoring',
    description: 'Track mentions and sentiment across social platforms in real-time',
  },
  {
    icon: FileText,
    title: 'Analytics & Reports',
    description: 'Get actionable insights with comprehensive reporting and analytics',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together with role-based permissions and task assignments',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Manage Your Online Reputation
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to save you time and grow your business
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}