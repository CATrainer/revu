"use client";
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

type DiversitySummary = {
  range: string;
  diversity_score: number;
  total: number;
  unique: number;
  alert: boolean;
  clusters: Cluster[];
  overused_phrases: Array<{ phrase: string; count: number; example: string }>;
  engagement_impact: { diverse_avg_likes: number; diverse_avg_replies: number; similar_avg_likes: number; similar_avg_replies: number };
  trend: Array<{ date: string; responses: number; unique_responses: number; diversity_pct: number }>;
  suggestions: string[];
};

type Cluster = { key: string; size: number; representative: string; avg_likes: number; avg_replies: number; sample: string[] };

export default function ResponseDiversityPanel() {
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { data, refetch } = useQuery({ queryKey: ['diversity-summary', range], queryFn: async () => (await api.get<DiversitySummary>('/automation/diversity/summary', { params: { range } })).data, refetchInterval: 60_000 });

  const refreshMut = useMutation({
    mutationFn: async () => (await api.post('/automation/diversity/refresh-templates', {})).data as { count: number },
    onSuccess: () => refetch(),
  });

  const regenMut = useMutation({
    mutationFn: async (base: string) => (await api.post<{ base: string; variants: string[] }>('/automation/diversity/regenerate', { base_phrase: base, count: 3 })).data,
  });

  const clusters: Cluster[] = useMemo(() => data?.clusters || [], [data]);
  const selected = clusters.find((c) => c.key === selectedKey) || null;
  type ScatterPoint = { x: number; y: number; label: string; key: string; idx: number };
  const scatterData: ScatterPoint[] = useMemo(() => clusters.map((c, idx: number) => ({ x: c.size, y: c.avg_likes + c.avg_replies, label: c.representative.slice(0, 40), key: c.key, idx })), [clusters]);
  const trendData = useMemo(() => (data?.trend || []).map(t => ({ date: t.date?.slice(5), diversity: Math.round(t.diversity_pct) })), [data]);

  const lowDiversity = (data?.diversity_score ?? 100) < 60;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Time range</div>
        <select className="border rounded px-2 py-1 text-sm" value={range} onChange={(e) => setRange(e.target.value as '24h' | '7d' | '30d')}>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>Refresh Templates</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Response Diversity</CardTitle>
          <div className={`px-3 py-1 rounded-full text-sm border ${lowDiversity ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
            Score {data?.diversity_score ?? 100}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">Unique vs total: {data?.unique ?? 0} / {data?.total ?? 0}</div>
          {data?.alert && <div className="text-sm text-rose-700">Alert: Diversity dropped below 60%. Consider refreshing templates.</div>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Clustering (bubble)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <XAxis type="number" dataKey="x" name="Cluster Size" tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="y" name="Avg Engagement" tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: unknown, n: string, p: { payload?: ScatterPoint }) => (p?.payload?.label || '')} labelFormatter={() => ''} />
                <Legend />
                <Scatter name="Clusters" data={scatterData} fill="#60a5fa" onClick={(e: ScatterPoint) => setSelectedKey(e?.key)} />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="text-xs text-muted-foreground mt-2">Bubble chart plots size vs engagement to spot overused clusters.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diversity trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="diversity" stroke="#10b981" name="Diversity %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Over-used phrases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm list-disc pl-4">
              {(data?.overused_phrases || []).map((p, i) => (
                <li key={i} className="mb-1">
                  <span className="font-medium">“{p.phrase}”</span> — {p.count}
                  <div className="text-xs text-muted-foreground">e.g., {p.example.slice(0, 120)}</div>
                </li>
              ))}
              {(data?.overused_phrases || []).length === 0 && <div className="text-sm text-muted-foreground">No phrases flagged.</div>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Impact on engagement</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>• Diverse clusters (size=1): likes {data?.engagement_impact.diverse_avg_likes ?? 0}, replies {data?.engagement_impact.diverse_avg_replies ?? 0}</div>
            <div>• Similar clusters (size≥3): likes {data?.engagement_impact.similar_avg_likes ?? 0}, replies {data?.engagement_impact.similar_avg_replies ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm list-disc pl-4">
              {(data?.suggestions || []).map((s, i) => <li key={i}>{s}</li>)}
              {(data?.suggestions || []).length === 0 && <div className="text-sm text-muted-foreground">No suggestions right now.</div>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Similar responses (side-by-side)</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected && <div className="text-sm text-muted-foreground">Select a bubble above to inspect a cluster.</div>}
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-sm">Cluster size</div>
                <div className="px-2 py-1 rounded border text-xs">{selected.size}</div>
                <div className="ml-auto"></div>
                <Button size="sm" variant="outline" onClick={() => regenMut.mutate(selected.representative)}>Regenerate 3 variants</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selected.sample.map((s, i) => (
                  <div key={i} className="p-2 rounded border text-sm whitespace-pre-wrap">{s}</div>
                ))}
                {(regenMut.data?.variants || []).map((s, i) => (
                  <div key={`v_${i}`} className="p-2 rounded border bg-emerald-50 border-emerald-200 text-sm whitespace-pre-wrap">{s}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
