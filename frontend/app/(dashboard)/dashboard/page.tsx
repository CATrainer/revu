// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { TrendingUp, AlertCircle } from 'lucide-react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { getProfileKPIs } from '@/lib/profile-config';

export default function DashboardPage() {
  const { currentWorkspace, interactions } = useStore();
  const relevant = currentWorkspace ? interactions.filter(i => i.workspaceId === currentWorkspace.id || (currentWorkspace.id === 'agency' && i.workspaceId === 'agency')) : interactions;
  const kpis = currentWorkspace ? getProfileKPIs(currentWorkspace, relevant) : [];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Dashboard Overview</h1>
        <p className="mt-2 text-secondary-dark">Welcome back! Here&apos;s what&apos;s happening with your reviews.</p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.length > 0 ? (
          kpis.map(k => (
            <MetricsCard key={k.title} title={k.title} value={k.value} icon={TrendingUp} trend={k.trend} />
          ))
        ) : (
          <MetricsCard title="Pending Actions" value="5" icon={AlertCircle} />
        )}
      </div>
      
      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-primary-dark">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 status-success-bg rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-dark">New 5-star review</p>
                  <p className="text-sm text-secondary-dark">2 minutes ago • Google</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 status-danger-bg rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-dark">Negative review needs response</p>
                  <p className="text-sm text-secondary-dark">15 minutes ago • TripAdvisor</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 status-info-bg rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-dark">Competitor alert</p>
                  <p className="text-sm text-secondary-dark">1 hour ago • Rating increased</p>
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