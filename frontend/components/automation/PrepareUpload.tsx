"use client";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';

type SuggestionResponse = {
  suggested_rules: Array<{ name: string; conditions: unknown; action: unknown; why?: string }>;
  comment_volume: { show: boolean; range_text: string; confidence: number; explanation: string };
  similar_videos: Array<{ id: string; video_id: string; title?: string; published_at?: string; comment_count: number }>;
  type_mix: Array<{ type: string; share: number }>;
};

export default function PrepareUpload() {
  const qc = useQueryClient();
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const fetchSuggestions = useMutation({
    mutationFn: async () => {
      const payload = { topic: topic || undefined, type: type || undefined, scheduled_at: scheduledAt || undefined };
      const { data } = await api.post<SuggestionResponse>('/automation/prepare-upload/suggestions', payload);
      return data;
    },
  });

  const activate = useMutation({
    mutationFn: async (rules: SuggestionResponse['suggested_rules']) => {
      const payload = { rules, duration_hours: 48 };
      const { data } = await api.post('/automation/prepare-upload/activate', payload);
      return data as { status: string };
    },
    onSuccess: async () => {
      pushToast('Temporary rules activated for 48 hours', 'success');
      await qc.invalidateQueries();
    },
    onError: (e) => pushToast(`Activation failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const data = fetchSuggestions.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Topic</Label>
          <Input placeholder="e.g., New product launch" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Input placeholder="e.g., tutorial, announcement, short" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Scheduled at (optional)</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => fetchSuggestions.mutate()} disabled={fetchSuggestions.isPending}>Get suggestions</Button>
        <Button variant="secondary" onClick={() => activate.mutate([])} disabled={activate.isPending}>Skip and use defaults</Button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Projection */}
          <div className="p-3 rounded border bg-white">
            <div className="text-sm font-medium">Projection</div>
            <div className="text-sm text-muted-foreground">{data.comment_volume?.show ? data.comment_volume.range_text : 'Confidence too low to show a projection.'}</div>
          </div>

          {/* Similar videos */}
          {data.similar_videos?.length ? (
            <div className="p-3 rounded border bg-white">
              <div className="text-sm font-medium mb-2">Similar past videos</div>
              <ul className="text-sm space-y-1">
                {data.similar_videos.map((v) => (
                  <li key={v.id} className="flex items-center justify-between">
                    <span className="truncate mr-2">{v.title || v.video_id}</span>
                    <span className="text-xs text-muted-foreground">{v.comment_count} comments</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Suggested rules */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Suggested rules</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.suggested_rules.map((r, idx) => (
                <div key={idx} className="p-3 rounded border bg-white">
                  <div className="font-medium text-sm">{r.name}</div>
                  {r.why ? <div className="text-xs text-muted-foreground">{r.why}</div> : null}
                  <div className="mt-2 text-xs">
                    <div className="text-muted-foreground">Conditions:</div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(r.conditions, null, 2)}</pre>
                    <div className="text-muted-foreground mt-1">Action:</div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(r.action, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => activate.mutate(data.suggested_rules)} disabled={activate.isPending}>Activate Rules (48h)</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
