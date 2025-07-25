// frontend/app/(dashboard)/dashboard/page.tsx
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Brain, 
  AlertCircle,
  Clock 
} from 'lucide-react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your reviews.</p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricsCard
          title="Average Rating"
          value="4.7"
          change={{ value: 0.2, type: 'increase' }}
          icon={Star}
          trend="from last month"
        />
        <MetricsCard
          title="Reviews This Month"
          value="142"
          change={{ value: 23, type: 'increase' }}
          icon={MessageSquare}
          trend="23% increase"
        />
        <MetricsCard
          title="Response Rate"
          value="95%"
          change={{ value: 5, type: 'increase' }}
          icon={TrendingUp}
          trend="improvement"
        />
        <MetricsCard
          title="Sentiment Score"
          value="82%"
          change={{ value: 5, type: 'increase' }}
          icon={Brain}
          trend="5% better"
        />
        <MetricsCard
          title="Avg Response Time"
          value="2.5h"
          change={{ value: 15, type: 'decrease' }}
          icon={Clock}
          trend="faster"
        />
        <MetricsCard
          title="Action Required"
          value="5"
          icon={AlertCircle}
        />
      </div>
      
      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">New 5-star review</p>
                  <p className="text-sm text-gray-500">2 minutes ago • Google</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Negative review needs response</p>
                  <p className="text-sm text-gray-500">15 minutes ago • TripAdvisor</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Competitor alert</p>
                  <p className="text-sm text-gray-500">1 hour ago • Rating increased</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <QuickActions />
      </div>
    </div>
  );
}