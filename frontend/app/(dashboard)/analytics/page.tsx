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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Range</span>
          <select className="border rounded px-2 py-1 text-sm" value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary ? `${Math.round(summary.totals.avg_latency)} ms` : '—'}</div>
            <div className="text-sm text-muted-foreground mt-1">Average over selected range</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
