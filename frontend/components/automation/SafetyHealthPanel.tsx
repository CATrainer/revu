"use client";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { downloadEngagementSummaryPDF } from '@/lib/pdf-utils';

type SafetySummary = {
  range: string;
  window_start: string | null;
  health_score: number; // 0-100
  metrics: {
    safety_pass_rate_pct: number;
    spam_blocked: number;
    blacklist_blocks: number;
    duplicates_prevented: number;
    response_diversity_pct: number;
  };
  series: {
    by_day: Array<{
      date: string;
      spam_blocked: number;
      blacklist_blocks: number;
      responses: number;
      unique_responses: number;
      safety_checks: number;
      safety_passed: number;
    }>;
  };
};

type SafetyLogItem = {
  ts: string | null;
  type: 'safety_check' | 'moderation';
  status: string;
  reason: string | null;
  queue_id: string | null;
  response_id: string | null;
  comment_id: string | null;
};

type EarlyWarningAlert = {
  channel_id?: string;
  video_id?: string;
  message: string;
  detected_at?: string;
  observed_cpm?: number;
  baseline_cpm?: number;
  multiplier?: number;
  projection?: unknown;
  cost_impact?: unknown;
  actions?: unknown;
};

async function fetchSafetySummary(range: string): Promise<SafetySummary> {
  const { data } = await api.get<SafetySummary>('/automation/safety/summary', { params: { range } });
  return data;
}

async function fetchSafetyLogs(range: string): Promise<{ items: SafetyLogItem[] }> {
  const { data } = await api.get<{ items: SafetyLogItem[] }>('/automation/safety/logs', { params: { range, limit: 200 } });
  return data;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
    : score >= 50 ? 'bg-amber-50 text-amber-900 border-amber-200'
    : 'bg-rose-50 text-rose-900 border-rose-200';
  return <div className={`px-3 py-1 rounded-full text-sm border ${color}`}>{score}</div>;
}

export default function SafetyHealthPanel() {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const { data: summary } = useQuery({ queryKey: ['safety-summary', range], queryFn: () => fetchSafetySummary(range), refetchInterval: 60_000 });
  const { data: logsData } = useQuery({ queryKey: ['safety-logs', range], queryFn: () => fetchSafetyLogs(range), refetchInterval: 60_000 });
  // Alerts: use early-warning endpoint (limited to 720 min max)
  const minutes = range === '24h' ? 720 : 180; // show recent alerts for longer ranges
  const alerts = useQuery({
    queryKey: ['safety-alerts', minutes],
    queryFn: async () => (await api.get<EarlyWarningAlert[]>('/early-warning/alerts', { params: { minutes } })).data,
    refetchInterval: 60_000,
  });

  const chartData = useMemo(() => {
    return (summary?.series.by_day || []).map(d => ({
      date: d.date?.slice(5),
      spam: d.spam_blocked,
      blacklist: d.blacklist_blocks,
      passRate: d.safety_checks ? Math.round((d.safety_passed / d.safety_checks) * 100) : 100,
      diversity: d.responses ? Math.round((d.unique_responses / d.responses) * 100) : 100,
    }));
  }, [summary]);

  const exportPdf = () => {
    const s = summary;
    if (!s) return;
    downloadEngagementSummaryPDF({
      title: 'Safety & Health Report',
      stats: [
        ['Range', s.range],
        ['Health score', `${s.health_score}`],
        ['Safety pass rate', `${s.metrics.safety_pass_rate_pct}%`],
        ['Spam blocked', `${s.metrics.spam_blocked}`],
        ['Blacklist blocks', `${s.metrics.blacklist_blocks}`],
        ['Duplicates prevented', `${s.metrics.duplicates_prevented}`],
        ['Response diversity', `${s.metrics.response_diversity_pct}%`],
      ],
    });
  };

  const logs = logsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Time range</div>
  <select className="border rounded px-2 py-1 text-sm" value={range} onChange={(e) => setRange(e.target.value as '24h' | '7d' | '30d')}>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <div className="ml-auto" />
        <Button variant="outline" onClick={exportPdf}>Export safety report</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">Health score</div>
          <ScoreBadge score={summary?.health_score ?? 100} />
          <div className="text-xs text-muted-foreground">Green 80–100, Yellow 50–79, Red 0–49</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Metric label="Safety pass rate" value={`${summary?.metrics.safety_pass_rate_pct?.toFixed(2) ?? '100.00'}%`} />
          <Metric label="Spam blocked" value={summary?.metrics.spam_blocked ?? 0} />
          <Metric label="Blacklist blocks" value={summary?.metrics.blacklist_blocks ?? 0} />
          <Metric label="Duplicates prevented" value={summary?.metrics.duplicates_prevented ?? 0} />
          <Metric label="Response diversity" value={`${summary?.metrics.response_diversity_pct?.toFixed(2) ?? '100.00'}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="spam" stroke="#ef4444" name="Spam blocked" dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="blacklist" stroke="#a855f7" name="Blacklist blocks" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="passRate" stroke="#22c55e" name="Safety pass %" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="diversity" stroke="#0ea5e9" name="Diversity %" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {(alerts.data || []).length === 0 && (
            <div className="text-sm text-muted-foreground">No alerts.</div>
          )}
          {(alerts.data || []).length > 0 && (
            <div className="space-y-2">
              {(alerts.data || []).map((a, i) => (
                <div key={i} className="rounded border p-2 text-sm">
                  <div className="font-medium">{a.message}</div>
                  <div className="text-xs text-muted-foreground">{a.detected_at?.toString().replace('T',' ').slice(0,16)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent safety actions</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 && (
            <div className="text-sm text-muted-foreground">Everything looks good!</div>
          )}
          {logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b">Time</th>
                    <th className="text-left p-2 border-b">Type</th>
                    <th className="text-left p-2 border-b">Status</th>
                    <th className="text-left p-2 border-b">Reason</th>
                    <th className="text-left p-2 border-b">Comment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, idx) => (
                    <tr key={idx} className="hover:bg-muted/40">
                      <td className="p-2 border-b whitespace-nowrap">{l.ts?.replace('T', ' ').replace('Z', '') || '-'}</td>
                      <td className="p-2 border-b">{l.type}</td>
                      <td className="p-2 border-b">{l.status}</td>
                      <td className="p-2 border-b">{l.reason || '-'}</td>
                      <td className="p-2 border-b">{l.comment_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 rounded border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
