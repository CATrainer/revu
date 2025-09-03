"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Arrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-emerald-600">▲</span>;
  if (delta < 0) return <span className="text-red-600">▼</span>;
  return <span className="text-muted-foreground">→</span>;
}

type ImpactSummary = {
  window_days: number;
  last_updated: string;
  metrics: {
    response_time_improvement_pct: number;
    cost_savings_usd: number;
    time_saved_seconds: number;
    automated_count: number;
    engagement_change_pct: number;
    roi: { time_value_usd: number; api_cost_usd: number; roi_usd: number };
    health_score: number;
    trends: {
      automated_count: { current: number; previous: number; delta: number };
      engagement_avg: { current: number; previous: number; delta: number };
      approval_time_seconds: { current: number; previous: number; delta: number };
    };
    milestones?: string[];
  };
};

export default function AutomationImpactWidget() {
  const { data, isLoading } = useQuery<ImpactSummary>({
    queryKey: ['impact-summary'],
    queryFn: async () => (await api.get('/automation/impact/summary', { params: { days: 30 } })).data as ImpactSummary,
    refetchInterval: 24 * 60 * 60 * 1000, // daily
  });
  const [detail, setDetail] = useState<string | null>(null);

  const m = data?.metrics;
  const t = m?.trends;
  const roi = m?.roi;

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="text-primary-dark">Automation Impact</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-muted-foreground">Loading daily summary…</div>}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. Response time improvement */}
            <button className="text-left p-3 rounded border hover:shadow-sm" onClick={()=> setDetail('response_time')}>
              <div className="text-xs text-muted-foreground">Response time</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {m?.response_time_improvement_pct ?? 0}% faster <Arrow delta={(t?.approval_time_seconds?.delta || 0) * -1} />
              </div>
              <div className="text-xs text-muted-foreground">vs previous {data?.window_days} days</div>
            </button>
            {/* 2. Cost savings */}
            <button className="text-left p-3 rounded border hover:shadow-sm" onClick={()=> setDetail('savings')}>
              <div className="text-xs text-muted-foreground">Cost savings</div>
              <div className="text-lg font-semibold">${roi?.roi_usd ?? 0}</div>
              <div className="text-xs text-muted-foreground">Time value ${roi?.time_value_usd ?? 0} – API ${roi?.api_cost_usd ?? 0}</div>
            </button>
            {/* 3. Time saved */}
            <button className="text-left p-3 rounded border hover:shadow-sm" onClick={()=> setDetail('time')}>
              <div className="text-xs text-muted-foreground">Time saved</div>
              <div className="text-lg font-semibold">~{Math.round(((m?.time_saved_seconds || 0)/3600))} hours</div>
              <div className="text-xs text-muted-foreground">Automated {m?.automated_count || 0} responses</div>
            </button>
            {/* 4. Quality / Engagement */}
            <button className="text-left p-3 rounded border hover:shadow-sm" onClick={()=> setDetail('quality')}>
              <div className="text-xs text-muted-foreground">Engagement</div>
              <div className="text-lg font-semibold flex items-center gap-2">{m?.engagement_change_pct ?? 0}% <Arrow delta={t?.engagement_avg?.delta || 0} /></div>
              <div className="text-xs text-muted-foreground">Avg vs previous period</div>
            </button>
            {/* 5. Health score */}
            <button className="text-left p-3 rounded border hover:shadow-sm" onClick={()=> setDetail('health')}>
              <div className="text-xs text-muted-foreground">Automation Health Score</div>
              <div className="text-lg font-semibold">{m?.health_score ?? 0}/100</div>
              <div className="text-xs text-muted-foreground">Composite of approval, engagement, and volume</div>
            </button>

            {/* milestone */}
            {(m?.milestones ?? []).map((msg: string, i: number) => (
              <div key={i} className="p-3 rounded border bg-emerald-50 text-emerald-800 text-sm">{msg}</div>
            ))}
          </div>
        )}

        {/* Detail modal */}
        {detail && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div className="w-[92vw] max-w-[720px] rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Details</div>
                <button className="text-sm" onClick={()=> setDetail(null)}>Close</button>
              </div>
              <div className="mt-3 text-sm space-y-2">
                {detail === 'response_time' && (
                  <div>
                    <div>Average approval time (proxy): {t?.approval_time_seconds?.current ?? 0}s <Arrow delta={(t?.approval_time_seconds?.delta || 0) * -1} /></div>
                    <div className="text-xs text-muted-foreground">Previous: {t?.approval_time_seconds?.previous ?? 0}s</div>
                  </div>
                )}
                {detail === 'savings' && (
                  <div>
                    <div>Time value: ${roi?.time_value_usd ?? 0}</div>
                    <div>API cost: ${roi?.api_cost_usd ?? 0}</div>
                    <div className="font-medium">ROI: ${roi?.roi_usd ?? 0}</div>
                  </div>
                )}
                {detail === 'time' && (
                  <div>
                    <div>Automated responses: {m?.automated_count || 0}</div>
                    <div>Time saved: ~{Math.round(((m?.time_saved_seconds || 0)/60))} minutes</div>
                  </div>
                )}
                {detail === 'quality' && (
                  <div>
                    <div>Engagement change: {m?.engagement_change_pct ?? 0}% <Arrow delta={t?.engagement_avg?.delta || 0} /></div>
                    <div className="text-xs text-muted-foreground">Current avg: {t?.engagement_avg?.current ?? 0}; Previous: {t?.engagement_avg?.previous ?? 0}</div>
                  </div>
                )}
                {detail === 'health' && (
                  <div>
                    <div>Health Score: {m?.health_score ?? 0}/100</div>
                    <div className="text-xs text-muted-foreground">Factors: approval rate, engagement trend, automation volume trend.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
