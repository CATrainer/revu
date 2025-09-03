"use client";
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

type QuickWin = {
  id: number;
  rule_id?: string | null;
  title: string;
  description: string;
  suggestion_type?: string;
  predicted_savings_minutes_per_week?: number | null;
  require_approval?: boolean;
};

type Summary = {
  badges: { rule_id: string; has_suggestions: boolean; predicted_savings_minutes_per_week?: number | null }[];
  quick_wins: QuickWin[];
  unread_count: number;
  prefs: { weekly_digest_opt_in: boolean };
};

export default function NotificationCenter() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get<Summary>('/automation/suggestions/summary');
      setSummary(data);
  } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function accept(id: number) {
    try {
      await api.post(`/automation/suggestions/${id}/accept`);
      pushToast('Queued for approval', 'success');
      load();
  } catch {
      pushToast('Failed to queue change', 'error');
    }
  }

  async function reject(id: number) {
    try {
      await api.post(`/automation/suggestions/${id}/reject`);
      pushToast('Suggestion dismissed', 'info');
      load();
  } catch {
      pushToast('Failed to dismiss', 'error');
    }
  }

  async function mute(suggestion_type?: string, rule_id?: string | null) {
    if (!suggestion_type) return;
    try {
      await api.post('/automation/suggestions/mute', { suggestion_type, rule_id });
      pushToast('Muted similar suggestions', 'info');
      load();
  } catch {
      pushToast('Failed to mute', 'error');
    }
  }

  async function toggleWeeklyDigest(v: boolean) {
    try {
      setSavingPref(true);
      const { data } = await api.post('/automation/notifications/prefs', { weekly_digest_opt_in: v });
      setSummary((s) => s ? { ...s, prefs: { weekly_digest_opt_in: !!data?.weekly_digest_opt_in } } : s);
      pushToast(v ? 'Weekly digest enabled' : 'Weekly digest disabled', 'success');
  } catch {
      pushToast('Failed to save preference', 'error');
    } finally {
      setSavingPref(false);
    }
  }

  return (
    <div className="max-h-96 overflow-auto">
      <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Weekly email digest</span>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!summary?.prefs?.weekly_digest_opt_in}
            onChange={(e) => toggleWeeklyDigest(e.target.checked)}
            disabled={savingPref}
          />
          <span>{summary?.prefs?.weekly_digest_opt_in ? 'On' : 'Off'}</span>
        </label>
      </div>
      <div className="border-t" />
      <div className="p-3">
        <div className="text-xs uppercase tracking-wide text-secondary-dark mb-2">Quick Wins</div>
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && (summary?.quick_wins?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground">No suggestions right now.</div>
        )}
        <div className="space-y-2">
          {summary?.quick_wins?.map((q) => (
            <div key={q.id} className="p-2 rounded border">
              <div className="text-sm font-medium text-primary-dark">{q.title}</div>
              <div className="text-xs text-secondary-dark mt-0.5">{q.description}</div>
              {typeof q.predicted_savings_minutes_per_week === 'number' && (
                <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 inline-block rounded px-2 py-0.5 border border-emerald-200">
                  Could save ~{q.predicted_savings_minutes_per_week} min/week
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" onClick={() => accept(q.id)}>Apply</Button>
                <Button size="sm" variant="outline" onClick={() => reject(q.id)}>Dismiss</Button>
                <button className="text-xs underline text-muted-dark" onClick={() => mute(q.suggestion_type, q.rule_id || undefined)}>Don&apos;t suggest this again</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
