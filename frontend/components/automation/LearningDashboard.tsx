"use client";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

type Rule = { id: string; name: string; enabled?: boolean };
type Suggestions = { rule_id?: string; suggestions?: string[] };
type CommonEdits = { total?: number; categories?: Record<string, number>; examples?: Array<{ before: string; after: string; types?: string[] }> };
type QualityBuckets = { buckets: Record<string, number>; total: number };
type TrendPoint = { day: string; ctr: number; avg_engagement: number };
type Trends = { rule_id: string; series: TrendPoint[] };
type TemplatePerf = { variants: Record<string, Array<{ day: string; ctr: number; avg_engagement: number }>> };
type CostPerSuccess = { rule_id: string; window_days: number; responses: number; conversions: number; api_cost_usd: number; cost_per_success_usd: number | null };

export default function LearningDashboard() {
  const qc = useQueryClient();
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);

  const { data: rules } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => (await api.get<Rule[]>('/automation/rules', { params: { limit: 200 } })).data,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!ruleId && (rules || []).length) setRuleId(rules![0].id);
  }, [rules, ruleId]);

  const { data: suggestions } = useQuery({
    queryKey: ['learning-suggestions', ruleId],
    queryFn: async () => (await api.get<Suggestions>('/automation/learning/suggestions', { params: { rule_id: ruleId } })).data,
    enabled: !!ruleId,
    refetchInterval: 30_000,
  });

  const { data: edits } = useQuery({
    queryKey: ['learning-common-edits', ruleId],
    queryFn: async () => (await api.get<CommonEdits | { items: Record<string, CommonEdits> }>('/automation/learning/common-edits', { params: ruleId ? { rule_id: ruleId } : {} })).data,
    enabled: true,
  });

  const { data: buckets } = useQuery({
    queryKey: ['learning-quality', ruleId, days],
    queryFn: async () => (await api.get<QualityBuckets>('/automation/learning/quality-distribution', { params: { rule_id: ruleId, window_days: days } })).data,
    enabled: !!ruleId,
  });

  const { data: trends } = useQuery({
    queryKey: ['learning-trends', ruleId, days],
    queryFn: async () => (await api.get<Trends>('/automation/learning/rule-trends', { params: { rule_id: ruleId, days } })).data,
    enabled: !!ruleId,
  });

  const { data: perf } = useQuery({
    queryKey: ['learning-template-perf', days],
    queryFn: async () => (await api.get<TemplatePerf>('/automation/learning/template-performance', { params: { days } })).data,
  });

  const { data: cps } = useQuery({
    queryKey: ['learning-cps', ruleId, days],
    queryFn: async () => (await api.get<CostPerSuccess>('/automation/learning/cost-per-success', { params: { rule_id: ruleId, window_days: days } })).data,
    enabled: !!ruleId,
  });

  const autoOpt = useMutation({
    mutationFn: async () => (await api.post(`/automation/ab-tests/${ruleId}/auto-optimize`)).data,
    onSuccess: async () => {
      pushToast('Auto-optimization run complete', 'success');
      await qc.invalidateQueries({ queryKey: ['learning-template-perf'] });
    },
    onError: (e) => pushToast(`Run failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const variantsSorted = useMemo(() => Object.keys(perf?.variants || {}).sort(), [perf]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Rule</Label>
          <select className="border rounded px-2 py-1 min-w-[260px]" value={ruleId || ''} onChange={(e) => setRuleId(e.target.value)}>
            {(rules || []).map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
          </select>
        </div>
        <div>
          <Label>Window (days)</Label>
          <Input type="number" min={1} value={days} onChange={(e)=> setDays(Math.max(1, parseInt(e.target.value||'30')))} className="w-[120px]" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={()=> autoOpt.mutate()} disabled={!ruleId}>Auto-optimize</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Suggestions</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm">
            {(suggestions?.suggestions || []).length ? (
              suggestions!.suggestions!.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li className="text-muted-foreground">No suggestions yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Common Edits</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const isItems = (val: unknown): val is { items: Record<string, CommonEdits> } => !!val && typeof val === 'object' && 'items' in (val as Record<string, unknown>);
              const ce: CommonEdits | undefined = isItems(edits) ? (edits.items?.[ruleId || '']) : (edits as CommonEdits | undefined);
              const cats = Object.entries(ce?.categories || {});
              return cats.length ? (
                <div className="space-y-2">
                  {cats.map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <div className="w-32 capitalize">{k}</div>
                      <div className="flex-1 bg-gray-100 h-2 rounded">
                        <div className="bg-primary h-2 rounded" style={{ width: `${Math.min(100, (v/(ce?.total||1))*100)}%` }} />
                      </div>
                      <div className="w-10 text-right">{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No edit data yet.</div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quality Distribution</CardTitle></CardHeader>
          <CardContent>
            {!buckets ? (
              <div className="text-sm text-muted-foreground">No data.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(buckets.buckets).map(([range, count]) => (
                  <div key={range} className="flex items-center gap-2 text-sm">
                    <div className="w-20">{range}</div>
                    <div className="flex-1 bg-gray-100 h-2 rounded">
                      <div className="bg-emerald-500 h-2 rounded" style={{ width: `${Math.min(100, (count/Math.max(1, buckets.total))*100)}%` }} />
                    </div>
                    <div className="w-10 text-right">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rule Trends</CardTitle></CardHeader>
        <CardContent>
          {!trends?.series?.length ? (
            <div className="text-sm text-muted-foreground">No trend data.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-1 pr-4">Day</th>
                    <th className="py-1 pr-4">CTR</th>
                    <th className="py-1 pr-4">Avg Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.series.map((p) => (
                    <tr key={p.day} className="border-t">
                      <td className="py-1 pr-4">{p.day}</td>
                      <td className="py-1 pr-4">{(p.ctr*100).toFixed(2)}%</td>
                      <td className="py-1 pr-4">{p.avg_engagement.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Template Performance (by variant)</CardTitle></CardHeader>
          <CardContent>
            {!variantsSorted.length ? (
              <div className="text-sm text-muted-foreground">No variant data.</div>
            ) : (
              <div className="space-y-3">
                {variantsSorted.map(v => (
                  <div key={v} className="p-2 rounded border">
                    <div className="text-sm font-medium">Variant: {v}</div>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="py-1 pr-4">Day</th>
                            <th className="py-1 pr-4">CTR</th>
                            <th className="py-1 pr-4">Avg Engagement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(perf?.variants?.[v] || []).map(p => (
                            <tr key={`${v}-${p.day}`} className="border-t">
                              <td className="py-1 pr-4">{p.day}</td>
                              <td className="py-1 pr-4">{(p.ctr*100).toFixed(2)}%</td>
                              <td className="py-1 pr-4">{p.avg_engagement.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cost Per Success</CardTitle></CardHeader>
          <CardContent>
            {!cps ? (
              <div className="text-sm text-muted-foreground">No cost data.</div>
            ) : (
              <div className="text-sm space-y-1">
                <div>Responses: <span className="font-medium">{cps.responses}</span></div>
                <div>Conversions: <span className="font-medium">{cps.conversions}</span></div>
                <div>API Cost: <span className="font-medium">${cps.api_cost_usd.toFixed(4)}</span></div>
                <div>Cost / Success: <span className="font-medium">{cps.cost_per_success_usd !== null ? `$${cps.cost_per_success_usd.toFixed(4)}` : '—'}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
