// frontend/app/(dashboard)/analytics/page.tsx
"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

// API clients
async function fetchUsageSummary(days = 30) {
  const { data } = await api.get(`/analytics/usage/summary`, { params: { days } });
  return data as {
    series: { date: string; calls: number; cost: number; avg_latency: number }[];
    totals: { calls: number; cost: number; avg_latency: number };
    cache_rate: number;
  };
}

async function fetchUsageBuckets() {
  const { data } = await api.get(`/analytics/usage/buckets`);
  return data as {
    daily: { date: string; calls: number; cost: number }[];
    weekly: { date: string; calls: number; cost: number }[];
    monthly: { date: string; calls: number; cost: number }[];
  };
}

async function fetchClassifications(days = 30) {
  const { data } = await api.get(`/analytics/classifications`, { params: { days } });
  return data as { classification: string; count: number }[];
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const { data: summary } = useQuery({ queryKey: ['usage-summary', range], queryFn: () => fetchUsageSummary(range), refetchInterval: 60_000 });
  const { data: buckets } = useQuery({ queryKey: ['usage-buckets'], queryFn: fetchUsageBuckets, refetchInterval: 120_000 });
  const { data: classes } = useQuery({ queryKey: ['classifications', range], queryFn: () => fetchClassifications(range), refetchInterval: 120_000 });

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily API Calls</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.series || []} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#2563eb" strokeWidth={2} dot={false} name="Calls" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Cost (USD)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.series || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#16a34a" name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary ? `${summary.cache_rate.toFixed(1)}%` : '—'}</div>
            <div className="text-sm text-muted-foreground mt-1">Higher is better</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{summary ? `${Math.round(summary.totals.avg_latency)} ms` : '—'}</div>
            <div className="text-sm text-muted-foreground mt-1">Average over range</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily/Weekly/Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buckets?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#0ea5e9" name="Daily Calls" dot={false} />
                <Line type="monotone" dataKey="cost" stroke="#22c55e" name="Daily Cost" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Classifications</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classes || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="classification" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#a855f7" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
