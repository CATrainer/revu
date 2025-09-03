"use client";
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pushToast } from '@/components/ui/toast';
import IntelligenceSettingsPanel from './IntelligenceSettingsPanel';
import SmartTooltip from '@/components/help/SmartTooltip';
import LearnMoreInline from '@/components/help/LearnMoreInline';
import AutomationImpactWidget from '@/components/intelligence/AutomationImpactWidget';
import ResponseDiversityPanel from '@/components/intelligence/ResponseDiversityPanel';

type Suggestion = { id: number; title: string; description: string; suggestion_type?: string; rule_id?: string | null; reasoning?: string; examples?: string[] };
type Prediction = { label: string; value: string | number; priority?: number };
type LearningItem = { label: string; value: string | number; detail?: string };
type SafetyAlert = { message: string; detected_at?: string; priority?: number };
type CommonEdit = { pattern?: string; count?: number; example?: string };
type InsightMeta = Record<string, unknown>;

type SectionKey = 'suggestions' | 'predictions' | 'learning' | 'safety';

function usePersistedCollapse(key: string, def = false) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return !def;
    const v = window.localStorage.getItem(`hub.section.${key}`);
    return v ? v === 'open' : !def;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`hub.section.${key}`, open ? 'open' : 'closed');
    }
  }, [key, open]);
  return { open, setOpen };
}

function SectionCard({ title, children, open, onToggle, loading }: { title: string; children: React.ReactNode; open: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <div className="rounded border bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between p-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          <Button size="sm" variant="ghost" onClick={onToggle}>{open ? 'Hide' : 'Show'}</Button>
        </div>
      </div>
      {open && <div className="border-t p-3">{children}</div>}
    </div>
  );
}

export default function IntelligenceHub() {
  // Search/filter
  const [q, setQ] = useState('');

  // Suggestions
  const sugg = useQuery({
    queryKey: ['hub-suggestions'],
    queryFn: async () => (await api.get('/automation/suggestions/summary')).data as { quick_wins: Suggestion[] },
    refetchInterval: 60_000,
  });
  // Predictions (small summary for scannability)
  const preds = useQuery({
    queryKey: ['hub-predictions'],
    queryFn: async () => {
      // Reuse prepare-upload insights as proxy: comment volume + type mix
      const { data } = await api.post('/automation/prepare-upload/suggestions', { topic: '', type: '', tags: [] });
      const out: Prediction[] = [
        { label: 'Projected comments (next upload)', value: (data?.comment_volume?.expected ?? 0), priority: 10 },
      ];
      return out;
    },
    refetchInterval: 120_000,
  });
  // Learning
  const learn = useQuery({
    queryKey: ['hub-learning'],
    queryFn: async () => {
      const [common, quality] = await Promise.all([
        api.get('/automation/learning/common-edits'),
        api.get('/automation/learning/quality-distribution'),
      ]);
      const out: LearningItem[] = [];
      const edits: CommonEdit[] = (common.data?.items || []).slice(0, 3);
      edits.forEach((e: CommonEdit) => out.push({ label: e.pattern || 'Edit pattern', value: Number(e.count || 0), detail: e.example || '' }));
      const qd = quality.data?.distribution || {};
      Object.entries(qd).forEach(([k, v]) => out.push({ label: `Quality: ${k}`, value: Number(v) }));
      return out;
    },
    refetchInterval: 180_000,
  });
  // Safety (early warning)
  const safety = useQuery({
    queryKey: ['hub-safety'],
    queryFn: async () => {
      const { data } = await api.get('/early-warning/alerts', { params: { minutes: 180 } });
      const out: SafetyAlert[] = (data || []).map((a: { message: string; detected_at?: string }) => ({ message: a.message, detected_at: a.detected_at, priority: 100 }));
      return out;
    },
    refetchInterval: 60_000,
  });

  // Prioritization: flatten all insights with a priority and filter by search
  const insights = useMemo(() => {
    const arr: Array<{ section: SectionKey; title: string; priority: number; meta?: InsightMeta }> = [];
    (sugg.data?.quick_wins || []).forEach(s => arr.push({ section: 'suggestions', title: s.title, priority: 90, meta: s }));
    (preds.data || []).forEach(p => arr.push({ section: 'predictions', title: `${p.label}: ${p.value}`, priority: p.priority ?? 50, meta: p }));
    (learn.data || []).forEach(l => arr.push({ section: 'learning', title: `${l.label}: ${l.value}`, priority: 40, meta: l }));
    (safety.data || []).forEach(s => arr.push({ section: 'safety', title: s.message, priority: s.priority ?? 80, meta: s }));
    const term = q.trim().toLowerCase();
    const filtered = term ? arr.filter(i => i.title.toLowerCase().includes(term)) : arr;
    return filtered.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }, [sugg.data, preds.data, learn.data, safety.data, q]);

  // Collapsible sections with persistence
  const s1 = usePersistedCollapse('suggestions');
  const s2 = usePersistedCollapse('predictions');
  const s3 = usePersistedCollapse('learning');
  const s4 = usePersistedCollapse('safety');

  function applyAllSuggestions() {
    const ids = (sugg.data?.quick_wins || []).map(s => s.id);
    if (!ids.length) return pushToast('No suggestions to apply', 'info');
    // Bulk: queue each acceptance (keeps approval flow; power-user path)
    Promise.all(ids.map(id => api.post(`/automation/suggestions/${id}/accept`)))
      .then(() => pushToast('Queued all suggestions', 'success'))
      .catch(() => pushToast('Some suggestions failed to queue', 'error'));
  }

  async function exportPdf() {
    // Open a printable window to allow user to Save as PDF
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    const lines = insights.map(i => `• ${i.title}`);
    const html = `<!doctype html><html><head><title>Intelligence Report</title>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;}
      h1{font-size:20px;margin:0 0 12px;} p{margin:6px 0;}</style></head>
      <body><h1>Intelligence Report</h1>
      ${lines.map(l => `<p>${l}</p>`).join('')}
      </body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    // leave window open so user can save or re-print
  }

  const [showSettings, setShowSettings] = useState(false);
  return (
    <div className="space-y-4">
      {/* Overview: scannable summary and controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search insights…" value={q} onChange={(e)=> setQ(e.target.value)} className="w-full sm:w-80" />
        <Button variant="outline" onClick={exportPdf}>Export as PDF</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={applyAllSuggestions} variant="default">Apply All Suggestions</Button>
          <Button variant="outline" onClick={()=> setShowSettings(true)}>Intelligence Settings</Button>
        </div>
      </div>

  {/* Daily impact summary */}
  <AutomationImpactWidget />

  {/* Response diversity tracking */}
  <ResponseDiversityPanel />

      {/* Priority ordered snapshot (top insights) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {insights.map((i, idx) => (
          <div key={idx} className="rounded border p-3 bg-white dark:bg-neutral-900">
            <div className="text-sm font-medium">{i.title}</div>
            <div className="text-xs text-muted-foreground mt-1">Section: {i.section}</div>
          </div>
        ))}
      </div>

      {/* Sections: progressive disclosure, independent loading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Suggestions" open={s1.open} onToggle={()=> s1.setOpen(!s1.open)} loading={sugg.isFetching}>
          <div className="space-y-2">
            {(sugg.data?.quick_wins || []).map(s => (
              <div key={s.id} className="rounded border p-2">
                <SmartTooltip
                  tipKey={`hub_${s.suggestion_type || 'suggestion'}_${s.rule_id || 'global'}_${s.id}`}
                  title="Why we recommend this"
                  reason={s.reasoning || 'This is predicted to improve your metric based on recent data.'}
                  examples={s.examples || []}
                >
                  <div className="text-sm font-medium cursor-help">{s.title}</div>
                </SmartTooltip>
                <div className="text-xs text-muted-foreground">{s.description}</div>
                <div className="mt-1">
                  <LearnMoreInline tipKey={`hub_learn_${s.suggestion_type || 'suggestion'}_${s.rule_id || 'global'}_${s.id}`} summary="What happens when you apply this?">
                    <ul className="list-disc pl-5 text-xs space-y-1">
                      <li>We add this change to your approval queue.</li>
                      <li>You can revert from Archives if it underperforms.</li>
                      <li>We’ll track impact and show it in your reports.</li>
                    </ul>
                  </LearnMoreInline>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" onClick={()=> api.post(`/automation/suggestions/${s.id}/accept`).then(()=> pushToast('Queued', 'success')).catch(()=> pushToast('Failed', 'error'))}>Apply</Button>
                  <Button size="sm" variant="outline" onClick={()=> api.post(`/automation/suggestions/${s.id}/reject`).then(()=> pushToast('Dismissed', 'info')).catch(()=> pushToast('Failed', 'error'))}>Dismiss</Button>
                </div>
              </div>
            ))}
            {(sugg.data?.quick_wins || []).length === 0 && <div className="text-sm text-muted-foreground">No suggestions right now.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Predictions" open={s2.open} onToggle={()=> s2.setOpen(!s2.open)} loading={preds.isFetching}>
          <div className="space-y-1">
            {(preds.data || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>{p.label}</div>
                <div className="font-medium">{String(p.value)}</div>
              </div>
            ))}
            {(preds.data || []).length === 0 && <div className="text-sm text-muted-foreground">No predictions available.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Learning" open={s3.open} onToggle={()=> s3.setOpen(!s3.open)} loading={learn.isFetching}>
          <div className="space-y-1">
            {(learn.data || []).map((l, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{l.label}:</span> <span>{String(l.value)}</span>
                {l.detail && <div className="text-xs text-muted-foreground">{l.detail}</div>}
              </div>
            ))}
            {(learn.data || []).length === 0 && <div className="text-sm text-muted-foreground">No learning signals yet.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Safety" open={s4.open} onToggle={()=> s4.setOpen(!s4.open)} loading={safety.isFetching}>
          <div className="space-y-2">
            {(safety.data || []).map((a, i) => (
              <div key={i} className="rounded border p-2 text-sm">
                <div className="font-medium">{a.message}</div>
                <div className="text-xs text-muted-foreground">{a.detected_at?.toString().replace('T',' ').slice(0,16)}</div>
              </div>
            ))}
            {(safety.data || []).length === 0 && <div className="text-sm text-muted-foreground">No alerts.</div>}
          </div>
        </SectionCard>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="w-[92vw] max-w-[760px] rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Intelligence Settings</div>
              <button className="text-sm" onClick={()=> setShowSettings(false)}>Close</button>
            </div>
            <div className="mt-3">
              <IntelligenceSettingsPanel compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
