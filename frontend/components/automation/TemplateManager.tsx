"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

type Template = {
  id: string;
  name: string;
  category?: string | null;
  tags?: string[];
  template_text: string;
  variables?: Record<string, unknown> | null;
  usage_count: number;
  performance_score?: number | null;
  created_at?: string;
};

type TemplateMetrics = {
  id: string;
  usage_count: number;
  avg_engagement?: number;
  ctr?: number;
  conversions?: number;
  impressions?: number;
};

type ABVariant = { variant_id: string; weight: number; template_id?: string | null };

function highlightVariables(text: string) {
  // highlight {var} tokens
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <div className="whitespace-pre-wrap text-sm">
      {parts.map((p, i) => p.match(/^\{[^}]+\}$/) ? (
        <span key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded border border-yellow-200">{p}</span>
      ) : <span key={i}>{p}</span>)}
    </div>
  );
}

export default function TemplateManager() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get<Template[]>('/automation/templates')).data,
    refetchInterval: 60_000,
  });
  const { data: metrics } = useQuery({
    queryKey: ['template-metrics'],
    queryFn: async () => (await api.get<TemplateMetrics[]>('/automation/templates/metrics')).data,
    refetchInterval: 60_000,
  });

  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Template | null>(null);
  const [editor, setEditor] = useState<Template | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const merged = useMemo(() => {
    const m = new Map<string, TemplateMetrics>();
    (metrics || []).forEach(x => m.set(x.id, x));
    return (templates || []).map(t => ({
      ...t,
      usage_count: m.get(t.id)?.usage_count ?? t.usage_count,
      performance_score: t.performance_score ?? m.get(t.id)?.avg_engagement ?? null,
    }));
  }, [templates, metrics]);

  const filtered = useMemo(() => merged.filter(t => {
    if (category !== 'all' && (t.category || 'uncategorized') !== category) return false;
    if (filter && !(`${t.name} ${t.category || ''} ${(t.tags || []).join(' ')} ${t.template_text}`.toLowerCase().includes(filter.toLowerCase()))) return false;
    return true;
  }), [merged, category, filter]);

  const categories = useMemo(() => ['all', ...Array.from(new Set((templates || []).map(t => t.category || 'uncategorized')))], [templates]);

  const saveMut = useMutation({
    mutationFn: async (tpl: Partial<Template> & { id?: string }) => {
      if (tpl.id) return (await api.put(`/automation/templates/${tpl.id}`, tpl)).data;
      return (await api.post('/automation/templates', tpl)).data;
    },
    onSuccess: async () => {
      pushToast('Template saved', 'success');
      setEditor(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['templates'] }),
        qc.invalidateQueries({ queryKey: ['template-metrics'] }),
      ]);
    },
    onError: (e) => pushToast(`Save failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/automation/templates/${id}`)).data,
    onSuccess: async () => {
      pushToast('Template deleted', 'success');
      await qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e) => pushToast(`Delete failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const [previewData, setPreviewData] = useState<Record<string, string>>({
    username: 'Sam',
    channel_name: 'My Channel',
    video_title: 'Launch Update',
    video_type: 'Announcement',
    comment_text: 'Love this!',
    date: '2025-09-02',
  });
  const [preview, setPreview] = useState('');
  const previewMut = useMutation({
    mutationFn: async ({ template_text, data }: { template_text: string; data: Record<string, string> }) => (await api.post('/automation/templates/preview', { template_text, data })).data as { text: string; variables_used: string[]; invalid?: string[] },
    onSuccess: (d) => setPreview(d.text || ''),
  });

  useEffect(() => {
    if (editor?.template_text) previewMut.mutate({ template_text: editor.template_text, data: previewData });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.template_text, previewData]);

  const importMut = useMutation({
    mutationFn: async (payload: { templates: Template[] }) => (await api.post('/automation/templates/import', payload)).data,
    onSuccess: async () => {
      pushToast('Templates imported', 'success');
      await qc.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (e) => pushToast(`Import failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const exportMut = useMutation({
    mutationFn: async () => (await api.get('/automation/templates/export')).data as { templates: Template[] },
    onSuccess: (d) => {
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'templates.json'; a.click(); URL.revokeObjectURL(url);
    },
  });

  const [abVariants, setAbVariants] = useState<ABVariant[]>([{ variant_id: 'A', weight: 0.5 }, { variant_id: 'B', weight: 0.5 }]);
  const saveAbMut = useMutation({
    mutationFn: async (vars: ABVariant[]) => (await api.post('/automation/templates/ab-tests', { variants: vars })).data,
    onSuccess: () => pushToast('A/B test config saved', 'success'),
    onError: (e) => pushToast(`A/B config failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        <select className="border rounded px-2 py-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button size="sm" onClick={() => { setEditor({ id: '', name: '', category: '', tags: [], template_text: '', usage_count: 0 }); setSelected(null); }}>New Template</Button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => {
            try { const json = JSON.parse(String(rd.result || '{}')); importMut.mutate(json); }
            catch { pushToast('Invalid JSON', 'error'); }
          }; rd.readAsText(f);
        }} />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Import JSON</Button>
        <Button size="sm" variant="outline" onClick={() => exportMut.mutate()}>Export JSON</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!filtered.length ? (
              <div className="text-sm text-muted-foreground">No templates</div>
            ) : (
              <div className="space-y-2">
                {filtered.map(t => (
                  <div key={t.id} className={`p-2 rounded border cursor-pointer ${selected?.id === t.id ? 'border-primary' : ''}`} onClick={() => { setSelected(t); setEditor(t); }}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.category || 'uncategorized'}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Usage: {t.usage_count} {typeof t.performance_score === 'number' ? `• Score: ${t.performance_score.toFixed(2)}` : ''}</div>
                    <div className="line-clamp-2 text-xs mt-1">{t.template_text}</div>
                    {t.tags?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">{t.tags.map(tag => <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 border">{tag}</span>)}</div>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditor(t); }}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(t.id); }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Template Editor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!editor ? (
              <div className="text-sm text-muted-foreground">Select a template or create a new one.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Input value={editor.category || ''} onChange={(e) => setEditor({ ...editor, category: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tags (comma separated)</Label>
                    <Input value={(editor.tags || []).join(', ')} onChange={(e) => setEditor({ ...editor, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Template</Label>
                  <Textarea rows={6} value={editor.template_text} onChange={(e) => setEditor({ ...editor, template_text: e.target.value })} />
                  <div className="mt-2 p-2 rounded border bg-gray-50">{highlightVariables(editor.template_text || '')}</div>
                </div>

                {/* Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Preview Data</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.keys(previewData).map(k => (
                        <div key={k} className="flex flex-col gap-1">
                          <Label className="text-xs">{k}</Label>
                          <Input value={String(previewData[k] ?? '')} onChange={(e) => setPreviewData({ ...previewData, [k]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => previewMut.mutate({ template_text: editor.template_text, data: previewData })}>Refresh Preview</Button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Preview</div>
                    <div className="p-2 rounded border bg-white min-h-[120px] text-sm whitespace-pre-wrap">{preview}</div>
                  </div>
                </div>

                {/* A/B config (simple) */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">A/B Test Variants</div>
                  <div className="space-y-2">
                    {abVariants.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                        <Input className="col-span-1" value={v.variant_id} onChange={(e) => setAbVariants(abVariants.map((x,i) => i===idx ? { ...x, variant_id: e.target.value } : x))} />
                        <Input className="col-span-1" type="number" step="0.01" value={v.weight} onChange={(e) => setAbVariants(abVariants.map((x,i) => i===idx ? { ...x, weight: Number(e.target.value) } : x))} />
                        <select className="col-span-3 border rounded px-2 py-1" value={v.template_id || ''} onChange={(e) => setAbVariants(abVariants.map((x,i) => i===idx ? { ...x, template_id: e.target.value || undefined } : x))}>
                          <option value="">— Select template —</option>
                          {(templates || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => setAbVariants(abVariants.filter((_,i) => i!==idx))}>Remove</Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAbVariants([...abVariants, { variant_id: String.fromCharCode(65 + abVariants.length), weight: 0.5 }])}>Add Variant</Button>
                    <Button size="sm" onClick={() => saveAbMut.mutate(abVariants)}>Save A/B Config</Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => editor && saveMut.mutate(editor)}>Save</Button>
                  <Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
