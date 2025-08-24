// frontend/app/(dashboard)/dashboard/page.tsx
"use client";
import { TrendingUp, AlertCircle } from 'lucide-react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { getProfileKPIs } from '@/lib/profile-config';
import Link from 'next/link';

export default function DashboardPage() {
  const { currentWorkspace, interactions, onboarding, setOnboardingTask } = useStore();
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
              {relevant.slice(0, 6).map((i) => (
                <Link key={i.id} href={i.kind === 'review' ? '/reviews' : '/engagement'} className="flex items-start space-x-4 group">
                  <div className={`w-2 h-2 rounded-full mt-2 ${i.sentiment === 'Negative' ? 'status-danger-bg' : i.sentiment === 'Positive' ? 'status-success-bg' : 'status-info-bg'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-dark truncate">{i.kind === 'review' ? 'New review' : 'New mention'} — {i.platform}</p>
                    <p className="text-sm text-secondary-dark truncate group-hover:text-primary-dark">{i.content}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        
  <QuickActions />
      </div>

      {/* Onboarding Checklist */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="text-primary-dark">Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {onboarding.tasks.map(t => (
              <li key={t.id} className="flex items-center justify-between">
                <span className={`text-sm ${t.done ? 'line-through text-muted-dark' : 'text-primary-dark'}`}>{t.title}</span>
                <button
                  className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:section-background-alt"
                  onClick={() => setOnboardingTask(t.id, !t.done)}
                >
                  {t.done ? 'Undo' : 'Mark done'}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}