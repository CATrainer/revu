// frontend/app/(dashboard)/analytics/page.tsx
"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

// API clients
async function fetchUsageSummary(days = 30) {
  const { data } = await api.get(`/analytics/usage/summary`, { params: { days } });
  return data as {
    series: { date: string; calls: number; cost: number; avg_latency: number }[];
    totals: { calls: number; cost: number; avg_latency: number };
    cache_rate: number;
  };
}

// Trimmed: only need average response time

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const { data: summary } = useQuery({ queryKey: ['usage-summary', range], queryFn: () => fetchUsageSummary(range), refetchInterval: 60_000 });

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">{/** Mobile-first padding */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">{/** Stack on mobile */}
        <h1 className="text-2xl md:text-3xl font-semibold text-primary-dark">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Range</span>
          <select className="border rounded px-2 py-1 text-sm" value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">{/** Tighter gap on mobile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary-dark">Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-semibold text-primary-dark">{summary ? `${Math.round(summary.totals.avg_latency)} ms` : '—'}</div>
            <div className="text-sm text-muted-foreground mt-1">Average over selected range</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
