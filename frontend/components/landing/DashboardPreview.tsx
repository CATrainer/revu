// frontend/components/landing/DashboardPreview.tsx
// Static, non-interactive mini preview of the dashboard for the landing hero section.
// Uses mock data, no hooks, and semantic design tokens so it adapts to light/dark instantly.

import { Star, TrendingUp, MessageSquare, Brain, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: string; // e.g. '+23%' or '-5%'
  changeType?: 'increase' | 'decrease';
}

const metrics: MiniMetricProps[] = [
  { icon: Star, label: 'Avg Rating', value: '4.7', change: '+0.2', changeType: 'increase' },
  { icon: MessageSquare, label: 'Reviews (Mo)', value: '142', change: '+23%', changeType: 'increase' },
  { icon: TrendingUp, label: 'Response Rate', value: '95%', change: '+5%', changeType: 'increase' },
  { icon: Brain, label: 'Sentiment', value: '82%', change: '+5%', changeType: 'increase' },
  { icon: Clock, label: 'Resp. Time', value: '2.5h', change: '-15%', changeType: 'decrease' },
  { icon: AlertCircle, label: 'Action Items', value: '5' },
];

export function DashboardPreview() {
  return (
    <div
      className="relative mx-auto max-w-5xl rounded-xl shadow-2xl border border-muted bg-[var(--card)] overflow-hidden backdrop-blur-sm" 
      style={{ perspective: '2000px' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-muted bg-[var(--muted)] dark:bg-[var(--secondary)] text-primary-dark select-none pointer-events-none">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-[var(--danger)]/80" />
          <div className="h-3 w-3 rounded-full bg-[var(--warning)]/80" />
            <div className="h-3 w-3 rounded-full bg-[var(--success)]/80" />
          <span className="ml-3 font-semibold text-sm">Repruv Dashboard (Preview)</span>
        </div>
        <div className="text-xs text-secondary-dark hidden sm:block">Static preview • Not live data</div>
      </div>

      {/* Content grid */}
      <div className="p-6 space-y-8 pointer-events-none select-none">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="dashboard-card rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-secondary-dark uppercase tracking-wide">{m.label}</p>
                  <p className="text-xl font-bold mt-1 text-primary-dark">{m.value}</p>
                  {m.change && (
                    <p
                      className={cn(
                        'mt-1 text-xs font-medium',
                        m.changeType === 'increase' ? 'status-success' : 'status-danger'
                      )}
                    >
                      {m.changeType === 'increase' ? '▲' : '▼'} {m.change}
                    </p>
                  )}
                </div>
                <div className="h-8 w-8 rounded-md brand-background flex items-center justify-center">
                  <m.icon className="h-4 w-4 brand-text" />
                </div>
              </div>
              {/* Tiny sparkline placeholder */}
              <div className="mt-3 h-8 w-full rounded bg-gradient-to-r from-[var(--brand-primary)]/25 via-[var(--brand-primary)]/10 to-transparent dark:from-[var(--brand-primary)]/35 dark:via-[var(--brand-primary)]/15" />
            </div>
          ))}
        </div>

        {/* Recent Activity + AI Insight mock row */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="dashboard-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-primary-dark mb-4">Recent Activity</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <span className="w-2 h-2 rounded-full status-success-bg mt-2" />
                <div>
                  <p className="font-medium text-primary-dark">New 5-star review</p>
                  <p className="text-secondary-dark text-xs">&quot;Amazing service and quick response!&quot;</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-2 h-2 rounded-full status-danger-bg mt-2" />
                <div>
                  <p className="font-medium text-primary-dark">Needs response</p>
                  <p className="text-secondary-dark text-xs">Customer mentioned slow delivery.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <span className="w-2 h-2 rounded-full status-info-bg mt-2" />
                <div>
                  <p className="font-medium text-primary-dark">Competitor alert</p>
                  <p className="text-secondary-dark text-xs">Local rival gained +12 reviews.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="dashboard-card rounded-lg p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-primary-dark mb-2">AI Insight</h3>
              <p className="text-sm text-secondary-dark leading-relaxed">
                Responses under 3 hours correlate with a <span className="font-semibold brand-text">+18% increase</span> in
                5-star reviews. Consider automating responses for peak times.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-secondary-dark">
              <div className="p-2 rounded bg-[var(--muted)] dark:bg-[var(--secondary)]">Peak: 9-11am</div>
              <div className="p-2 rounded bg-[var(--muted)] dark:bg-[var(--secondary)]">Slow: 2-4pm</div>
              <div className="p-2 rounded bg-[var(--muted)] dark:bg-[var(--secondary)]">Best Resp: 2.1h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade vignette to blend with hero background */}
  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--background)] to-transparent" />
    </div>
  );
}
