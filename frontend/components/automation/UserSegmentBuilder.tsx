"use client";
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

type Range = { min?: number; max?: number };
type SegmentDefinition = {
  preset?: 'new' | 'subscriber' | 'member' | 'vip' | '';
  conditions?: {
    engagement_score?: Range;
    total_interactions?: Range;
    distinct_videos?: Range;
    recent_days?: number;
    subscriber?: boolean | null;
    topics_any?: string[];
    topics_all?: string[];
  };
};

type Props = {
  value?: SegmentDefinition;
  channelId?: string | null;
  onChange?: (def: SegmentDefinition) => void;
  onSaved?: (segment: { id: string; name: string }) => void;
};

export default function UserSegmentBuilder({ value, channelId, onChange, onSaved }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [def, setDef] = useState<SegmentDefinition>(() => value || { preset: '', conditions: {} });

  useEffect(() => { onChange?.(def); }, [def, onChange]);

  type PreviewUser = { user_channel_id: string; total_interactions: number; distinct_videos: number; last_interaction_at: string; engagement_score: number; topics: string[] };
  const preview = useMutation({
    mutationFn: async (d: SegmentDefinition) => {
      const { data } = await api.post('/segments/preview', { definition: d, channel_id: channelId || undefined, limit: 12 });
      return data as { size_estimate: number; examples: PreviewUser[]; patterns: { top_topics: { topic: string; count: number }[] } };
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; name: string; definition: SegmentDefinition }) => {
      const body = { ...payload, channel_id: channelId || undefined };
      const { data } = await api.post('/segments', body);
      return data as { id: string; name: string };
    },
    onSuccess: (res) => { onSaved?.(res); pushToast('Segment saved', 'success'); qc.invalidateQueries({ queryKey: ['segments', channelId || 'all'] }); },
    onError: (e) => pushToast(`Save failed: ${String((e as Error)?.message || e)}`, 'error')
  });

  // Debounced preview
  useEffect(() => { const id = setTimeout(() => preview.mutate(def), 300); return () => clearTimeout(id); }, [def, preview]);

  const setRange = (key: keyof NonNullable<SegmentDefinition['conditions']>) => (field: 'min'|'max', v: number) =>
    setDef((d) => ({ ...d, conditions: { ...(d.conditions||{}), [key]: { ...(d.conditions?.[key] as Range || {}), [field]: isFinite(v) ? v : undefined } } }));

  const parseCSV = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">User Segment</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Preset selector */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Preset</Label>
            <select className="border rounded px-2 py-1 w-full" value={def.preset||''}
              onChange={(e)=> setDef(d => ({ ...d, preset: (e.target.value || '') as SegmentDefinition['preset'] }))}>
              <option value="">Custom</option>
              <option value="new">New</option>
              <option value="subscriber">Subscriber</option>
              <option value="member">Member</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <Label>Name to save</Label>
            <Input placeholder="e.g., VIP engaged" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
        </div>

        {/* Custom conditions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Engagement score min/max (0..1)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step={0.01} min={0} max={1} placeholder="min"
                value={def.conditions?.engagement_score?.min ?? ''}
                onChange={(e)=> setRange('engagement_score')('min', parseFloat(e.target.value))} />
              <Input type="number" step={0.01} min={0} max={1} placeholder="max"
                value={def.conditions?.engagement_score?.max ?? ''}
                onChange={(e)=> setRange('engagement_score')('max', parseFloat(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Total interactions min/max</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} placeholder="min" value={def.conditions?.total_interactions?.min ?? ''}
                onChange={(e)=> setRange('total_interactions')('min', parseInt(e.target.value||'0'))} />
              <Input type="number" min={0} placeholder="max" value={def.conditions?.total_interactions?.max ?? ''}
                onChange={(e)=> setRange('total_interactions')('max', parseInt(e.target.value||'0'))} />
            </div>
          </div>
          <div>
            <Label>Distinct videos min/max</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} placeholder="min" value={def.conditions?.distinct_videos?.min ?? ''}
                onChange={(e)=> setRange('distinct_videos')('min', parseInt(e.target.value||'0'))} />
              <Input type="number" min={0} placeholder="max" value={def.conditions?.distinct_videos?.max ?? ''}
                onChange={(e)=> setRange('distinct_videos')('max', parseInt(e.target.value||'0'))} />
            </div>
          </div>
          <div>
            <Label>Recent within N days</Label>
            <Input type="number" min={0} placeholder="e.g., 30" value={def.conditions?.recent_days ?? ''}
              onChange={(e)=> setDef(d => ({ ...d, conditions: { ...(d.conditions||{}), recent_days: e.target.value===''? undefined : Math.max(0, parseInt(e.target.value||'0')) } }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Subscriber heuristic</Label>
            <select className="border rounded px-2 py-1 w-full" value={String(def.conditions?.subscriber ?? '')}
              onChange={(e)=> setDef(d => ({ ...d, conditions: { ...(d.conditions||{}), subscriber: e.target.value === '' ? null : e.target.value === 'true' } }))}>
              <option value="">Ignore</option>
              <option value="true">Subscriber-like</option>
              <option value="false">Non-subscriber-like</option>
            </select>
          </div>
          <div></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Topics (any of)</Label>
            <Input placeholder="comma separated" value={(def.conditions?.topics_any||[]).join(', ')}
              onChange={(e)=> setDef(d => ({ ...d, conditions: { ...(d.conditions||{}), topics_any: parseCSV(e.target.value) } }))} />
          </div>
          <div>
            <Label>Topics (all of)</Label>
            <Input placeholder="comma separated" value={(def.conditions?.topics_all||[]).join(', ')}
              onChange={(e)=> setDef(d => ({ ...d, conditions: { ...(d.conditions||{}), topics_all: parseCSV(e.target.value) } }))} />
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 border rounded text-sm">
          <div className="font-medium mb-1">Preview</div>
          {preview.isPending ? (
            <div>Loading…</div>
          ) : preview.data ? (
            <div className="space-y-2">
              <div>Estimated size: <span className="font-medium">{preview.data.size_estimate}</span></div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Examples</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {preview.data.examples.map((u, idx) => (
                    <div key={idx} className="p-2 rounded border">
                      <div className="text-xs text-muted-foreground">{u.user_channel_id}</div>
                      <div className="text-xs">Interactions: {u.total_interactions} • Videos: {u.distinct_videos} • Eng: {u.engagement_score}</div>
                      <div className="text-xs">Last: {new Date(u.last_interaction_at).toLocaleString()}</div>
                      {!!(u.topics?.length) && <div className="text-xs">Topics: {u.topics.join(', ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cross-video patterns</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {preview.data.patterns.top_topics.map((t) => (
                    <span key={t.topic} className="px-2 py-1 rounded border bg-white">{t.topic} <span className="text-muted-foreground">({t.count})</span></span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={()=>preview.mutate(def)}>Preview</Button>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <Button onClick={()=> saveMut.mutate({ name, definition: def })} disabled={!name || saveMut.isPending}>Save segment</Button>
          <Button variant="outline" onClick={()=> preview.mutate(def)}>Refresh preview</Button>
        </div>
      </CardContent>
    </Card>
  );
}
