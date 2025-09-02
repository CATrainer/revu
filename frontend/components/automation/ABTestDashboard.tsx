"use client";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

type VariantStats = { n: number; conversions: number; impressions: number; ctr: number; avg_engagement: number };
type TestSummary = {
  winner?: string | null;
  runner_up?: string | null;
  p_value?: number;
  confidence?: number;
  metric?: 'ctr' | 'avg_engagement';
  reason?: string;
  stats: Record<string, VariantStats>;
};

type HistoryItem = { variant_id: string; comment_id?: string; metrics: { impressions?: number; conversions?: number; engagement?: number }; created_at?: string };

type ActiveTest = { rule_id: string; name?: string; tests: Record<string, Array<{ variant_id: string; weight: number; template_id?: string }>>; auto_optimize?: boolean };

export default function ABTestDashboard() {
  const qc = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>('default');
  const [windowHours, setWindowHours] = useState<number>(24);

  const { data: active } = useQuery({
    queryKey: ['ab-active'],
    queryFn: async () => (await api.get<{ items: ActiveTest[] }>('/automation/ab-tests/active')).data.items,
    refetchInterval: 30_000,
  });

  const rule = useMemo(() => (active || []).find(r => r.rule_id === selectedRule) || null, [active, selectedRule]);
  useEffect(() => {
    if (!selectedRule && (active || []).length) setSelectedRule(active![0].rule_id);
  }, [active, selectedRule]);

  const { data: summary, refetch: refetchSummary, isFetching: loadingSummary } = useQuery({
    queryKey: ['ab-summary', selectedRule, selectedTest, windowHours],
    queryFn: async () => {
      if (!selectedRule) return {} as Record<string, TestSummary> | TestSummary;
      const params: Record<string, string | number> = {};
      if (selectedTest) params['test_id'] = selectedTest;
      if (windowHours && windowHours > 0) params['window_hours'] = windowHours;
      const { data } = await api.get<Record<string, TestSummary> | TestSummary>(`/automation/ab-tests/${selectedRule}/summary`, { params });
      return data;
    },
    enabled: !!selectedRule,
    refetchInterval: 30_000,
  });

  const { data: history } = useQuery({
    queryKey: ['ab-history', selectedRule, selectedTest],
    queryFn: async () => {
      if (!selectedRule) return { items: [] as HistoryItem[] };
      const params: Record<string, string | number> = {};
      if (selectedTest) params['test_id'] = selectedTest;
      params['limit'] = 200;
      const { data } = await api.get<{ items: HistoryItem[] }>(`/automation/ab-tests/${selectedRule}/history`, { params });
      return data;
    },
    enabled: !!selectedRule,
    refetchInterval: 60_000,
  });

  const toggleAutoMut = useMutation({
    mutationFn: async (enabled: boolean) => (await api.post(`/automation/ab-tests/${selectedRule}/auto-optimize/toggle`, { enabled })).data,
    onSuccess: async () => {
      pushToast('Auto-optimization updated', 'success');
      await qc.invalidateQueries({ queryKey: ['ab-active'] });
    },
    onError: (e) => pushToast(`Failed to update: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const runAutoMut = useMutation({
    mutationFn: async () => (await api.post(`/automation/ab-tests/${selectedRule}/auto-optimize`)).data,
    onSuccess: async () => {
      pushToast('Auto-optimization run complete', 'success');
      await refetchSummary();
      await qc.invalidateQueries({ queryKey: ['ab-active'] });
    },
    onError: (e) => pushToast(`Run failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const exportCsv = () => {
    if (!selectedRule) return;
    const params = new URLSearchParams();
    if (selectedTest) params.set('test_id', selectedTest);
    if (windowHours && windowHours > 0) params.set('since_hours', String(windowHours));
    const url = `/automation/ab-tests/${selectedRule}/export.csv?${params.toString()}`;
    // Use browser download
    const a = document.createElement('a');
    a.href = url; a.download = `ab_test_${selectedRule}.csv`; a.click();
  };

  const testsList = useMemo(() => Object.keys(rule?.tests || {}), [rule]);
  useEffect(() => {
    if (rule && testsList.length && !selectedTest) setSelectedTest(testsList[0]);
  }, [rule, testsList, selectedTest]);

  const summaries: Record<string, TestSummary> = useMemo(() => {
    if (!summary) return {} as Record<string, TestSummary>;
    return (selectedTest ? { [selectedTest]: summary as TestSummary } : (summary as Record<string, TestSummary>)) || {};
  }, [summary, selectedTest]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Active tests</Label>
          <select className="border rounded px-2 py-1 min-w-[260px]" value={selectedRule || ''} onChange={(e) => setSelectedRule(e.target.value)}>
            {(active || []).map(t => <option key={t.rule_id} value={t.rule_id}>{t.name || t.rule_id}</option>)}
          </select>
        </div>
        <div>
          <Label>Test ID</Label>
          <select className="border rounded px-2 py-1 min-w-[160px]" value={selectedTest || ''} onChange={(e)=> setSelectedTest(e.target.value || null)}>
            {testsList.map(tid => <option key={tid} value={tid}>{tid}</option>)}
          </select>
        </div>
        <div>
          <Label>Window (hours)</Label>
          <Input type="number" min={0} value={windowHours} onChange={(e)=> setWindowHours(Math.max(0, parseInt(e.target.value||'0')))} className="w-[120px]" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=>refetchSummary()} disabled={loadingSummary}>Refresh</Button>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      {/* Active variants and auto-opt toggle */}
      <Card>
        <CardHeader><CardTitle className="text-base">Active Variants</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!rule ? (
            <div className="text-sm text-muted-foreground">No active tests.</div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm">Rule: <span className="font-medium">{rule.name || rule.rule_id}</span></div>
              <div className="text-sm">Auto-optimization: <Button size="sm" variant="outline" onClick={()=> toggleAutoMut.mutate(!rule.auto_optimize)}>{rule.auto_optimize ? 'Disable' : 'Enable'}</Button></div>
              {testsList.map(tid => (
                <div key={tid} className="mt-2 p-2 rounded border">
                  <div className="text-sm font-medium">Test: {tid}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {(rule.tests[tid] || []).map(v => (
                      <div key={v.variant_id} className="p-2 rounded border">
                        <div className="text-sm"><span className="font-medium">Variant {v.variant_id}</span> • weight {v.weight}</div>
                        <div className="text-xs text-muted-foreground">Template: {v.template_id || 'default'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <Button size="sm" onClick={()=> runAutoMut.mutate()} disabled={!selectedRule}>Run Auto-Optimize Now</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics and significance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Performance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(summaries).map(([tid, s]) => (
            <div key={tid} className="p-2 rounded border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Test: {tid}</div>
                {s.winner ? (
                  <div className="text-sm">Winner: <span className="font-medium">{s.winner}</span>{typeof s.confidence === 'number' ? ` • confidence ${(s.confidence*100).toFixed(1)}%` : ''}{s.metric ? ` • metric ${s.metric}` : ''}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">{s.reason || 'No winner yet'}</div>
                )}
              </div>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1 pr-4">Variant</th>
                      <th className="py-1 pr-4">Samples</th>
                      <th className="py-1 pr-4">Impr</th>
                      <th className="py-1 pr-4">Conv</th>
                      <th className="py-1 pr-4">CTR</th>
                      <th className="py-1 pr-4">Avg Eng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(s.stats || {}).map(([v, st]) => (
                      <tr key={v} className="border-t">
                        <td className="py-1 pr-4 font-medium">{v}</td>
                        <td className="py-1 pr-4">{st.n}</td>
                        <td className="py-1 pr-4">{st.impressions}</td>
                        <td className="py-1 pr-4">{st.conversions}</td>
                        <td className="py-1 pr-4">{(st.ctr*100).toFixed(2)}%</td>
                        <td className="py-1 pr-4">{st.avg_engagement.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-1 pr-4">When</th>
                  <th className="py-1 pr-4">Variant</th>
                  <th className="py-1 pr-4">Comment</th>
                  <th className="py-1 pr-4">Impr</th>
                  <th className="py-1 pr-4">Conv</th>
                  <th className="py-1 pr-4">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {(history?.items || []).map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-1 pr-4">{it.created_at?.replace('T',' ').slice(0, 16)}</td>
                    <td className="py-1 pr-4">{it.variant_id}</td>
                    <td className="py-1 pr-4">{it.comment_id || ''}</td>
                    <td className="py-1 pr-4">{Number((it.metrics||{}).impressions||0)}</td>
                    <td className="py-1 pr-4">{Number((it.metrics||{}).conversions||0)}</td>
                    <td className="py-1 pr-4">{Number((it.metrics||{}).engagement||0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
