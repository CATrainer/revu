"use client";
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type Totals = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate: number;
  avg_approval_time_seconds: number;
};
type SeriesPoint = { ts: string; created: number; processed: number };
type TopRule = { rule_id: string | null; rule_name: string | null; approvals: number };
type Edited = { orig_hash: string; count: number; sample_orig: string; sample_edit: string };
type EditCat = { category: string; count: number };

export default function ApprovalsAnalyticsWidget({ hours = 24 }: { hours?: number }) {
  const { data } = useQuery({
    queryKey: ['approvals-analytics', hours],
    queryFn: async () => (await api.get('/automation/approvals/analytics', { params: { hours } })).data as {
      window_hours: number;
      totals: Totals;
      time_series: SeriesPoint[];
      top_rules: TopRule[];
      most_edited: Edited[];
      edits_by_category: EditCat[];
    },
    refetchInterval: 15_000,
  });

  const series = data?.time_series ?? [];
  const totals = data?.totals;
  const topRules = data?.top_rules ?? [];
  const mostEdited = data?.most_edited ?? [];
  const editCats = data?.edits_by_category ?? [];

  const avgMins = useMemo(() => Math.round(((totals?.avg_approval_time_seconds || 0) / 60) * 10) / 10, [totals]);
  const ratePct = useMemo(() => Math.round(((totals?.approval_rate || 0) * 100) * 10) / 10, [totals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Avg time to approval" value={`${avgMins} min`} />
          <Kpi label="Approval rate" value={`${ratePct}%`} />
          <Kpi label="Pending" value={String(totals?.pending ?? 0)} />
          <Kpi label="Approved" value={String(totals?.approved ?? 0)} />
          <Kpi label="Rejected" value={String(totals?.rejected ?? 0)} />
          <Kpi label="Total" value={String(totals?.total ?? 0)} />
        </div>

        {/* Queue depth over time (created vs processed) */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">Queue depth over time</div>
          <MiniBars data={series} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Rules generating most approvals */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Top rules by approvals</div>
            <ul className="text-sm space-y-1">
              {topRules.slice(0, 6).map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{r.rule_name || r.rule_id || 'Unknown rule'}</span>
                  <span className="text-muted-foreground">{r.approvals}</span>
                </li>
              ))}
              {!topRules.length && <li className="text-sm text-muted-foreground">No data</li>}
            </ul>
          </div>

          {/* Most edited responses */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Most edited responses</div>
            <ul className="text-sm space-y-1">
              {mostEdited.slice(0, 6).map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate" title={e.sample_orig}>…{e.orig_hash.slice(0, 6)}</span>
                  <span className="text-muted-foreground">{e.count}</span>
                </li>
              ))}
              {!mostEdited.length && <li className="text-sm text-muted-foreground">No edits logged</li>}
            </ul>
          </div>
        </div>

        {/* User edits by category */}
        <div>
          <div className="text-sm text-muted-foreground mb-1">User edits by category</div>
          <ul className="text-sm flex flex-wrap gap-2">
            {editCats.slice(0, 10).map((c, i) => (
              <li key={i} className="px-2 py-1 rounded border bg-muted/50">
                {c.category}: {c.count}
              </li>
            ))}
            {!editCats.length && <li className="text-sm text-muted-foreground">No data</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded border bg-white">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function MiniBars({ data }: { data: SeriesPoint[] }) {
  // simple CSS bars: for each point, show created and processed as stacked columns
  const max = Math.max(1, ...data.map(d => Math.max(d.created, d.processed)));
  return (
    <div className="flex gap-1 items-end h-24 border rounded p-2 overflow-x-auto">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="flex gap-0.5 items-end">
            <div className="w-2 bg-blue-400" style={{ height: `${(d.created / max) * 100}%` }} title={`Created: ${d.created}`}></div>
            <div className="w-2 bg-green-500" style={{ height: `${(d.processed / max) * 100}%` }} title={`Processed: ${d.processed}`}></div>
          </div>
          <div className="text-[10px] text-muted-foreground">{new Date(d.ts).getHours()}:00</div>
        </div>
      ))}
      {!data.length && <div className="text-sm text-muted-foreground">No activity</div>}
    </div>
  );
}
