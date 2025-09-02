"use client";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type UsageSummary = {
  series: { date: string; calls: number; cost: number; avg_latency: number }[];
  totals: { calls: number; cost: number; avg_latency: number };
  cache_rate: number;
};

type Reliability = {
  dlq_total: number;
  recent_errors: { service: string; operation: string; code: number | null; message: string; at: string | null }[];
};

type DebugLogs = { logs: { t: string; event: string; data: Record<string, unknown> }[] };

async function fetchUsageSummary(days = 7) {
  const { data } = await api.get(`/analytics/usage/summary`, { params: { days } });
  return data as UsageSummary;
}

async function fetchReliability(limit = 25) {
  const { data } = await api.get(`/analytics/reliability/overview`, { params: { limit } });
  return data as Reliability;
}

async function fetchDebugLogs(limit = 100) {
  try {
    const res = await fetch(`/api/debug/logs?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) return { logs: [] } as DebugLogs;
    return (await res.json()) as DebugLogs;
  } catch {
    return { logs: [] } as DebugLogs;
  }
}

export default function AdminMetricsPage() {
  const { data: usage } = useQuery({ queryKey: ['admin-usage'], queryFn: () => fetchUsageSummary(30), refetchInterval: 60_000 });
  const { data: reliab } = useQuery({ queryKey: ['admin-reliability'], queryFn: () => fetchReliability(25), refetchInterval: 120_000 });
  const { data: dbg } = useQuery({ queryKey: ['admin-debug'], queryFn: () => fetchDebugLogs(200), refetchInterval: 30_000 });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Metrics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Total API Calls</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{usage ? usage.totals.calls : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Cost (USD)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{usage ? `$${usage.totals.cost.toFixed(4)}` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Estimated</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cache Hit Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{usage ? `${usage.cache_rate.toFixed(1)}%` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Higher is better</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Errors</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(reliab?.recent_errors || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent errors</div>
            ) : (
              <ul className="text-sm divide-y">
                {reliab!.recent_errors.map((e, i) => (
                  <li key={i} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.service} · {e.operation}</span>
                      <span className="text-xs text-muted-foreground">{e.at ? new Date(e.at).toLocaleString() : '—'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{e.code ?? '—'}</div>
                    <div className="text-xs break-words">{e.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Debug Logs (testing)</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-auto">
            {(dbg?.logs || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No debug logs</div>
            ) : (
              <ul className="text-xs divide-y">
                {dbg!.logs.map((l, i) => (
                  <li key={i} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{l.event}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(l.t).toLocaleString()}</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-[11px] bg-muted/40 p-2 rounded mt-1">{JSON.stringify(l.data, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
