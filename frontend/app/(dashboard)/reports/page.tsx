// frontend/app/(dashboard)/reports/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { pushToast } from '@/components/ui/toast';
import { openPrefilledEmail } from '@/lib/email';

type Freq = 'Weekly' | 'Monthly' | 'One-off';

function buildRange(freq: Freq): { from: string; to: string; label: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  if (freq === 'Weekly' || freq === 'One-off') fromDate.setDate(today.getDate() - 6);
  if (freq === 'Monthly') fromDate.setDate(today.getDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to, label: `${from} → ${to}` };
}

function makeAnalyticsRouteWithRange(freq: Freq) {
  const r = buildRange(freq);
  return `/analytics?range=${r.from},${r.to}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { reportSchedules, reportHistory, addReportSchedule, removeReportSchedule, addReportEntry, removeReportEntry, addNotification } = useStore();
  const [name, setName] = useState('Weekly Analytics Summary');
  const [freq, setFreq] = useState<Freq>('Weekly');

  const hasItems = useMemo(() => reportHistory.length > 0, [reportHistory.length]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Reports</h1>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Create schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] text-sm w-72" placeholder="Schedule name" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={freq} onChange={(e) => setFreq(e.target.value as Freq)}>
              {(['Weekly','Monthly'] as Freq[]).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <Button className="button-primary" onClick={() => {
              const route = makeAnalyticsRouteWithRange(freq);
              const id = `sched_${Date.now()}`;
              addReportSchedule({ id, name: name || 'Scheduled Report', frequency: freq, route, createdAt: new Date().toISOString() });
              pushToast('Schedule created (demo)', 'success');
            }}>Add Schedule</Button>
          </div>
          {reportSchedules.length > 0 && (
            <div className="mt-4 space-y-2">
              {reportSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
                  <div>
                    <div className="text-primary-dark font-medium">{s.name}</div>
                    <div className="text-xs text-secondary-dark">{s.frequency} → {s.route}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => { addReportEntry({ id: `rep_${Date.now()}`, title: `${s.name} — ${new Date().toLocaleDateString()}` , route: s.route, createdAt: new Date().toISOString() }); pushToast('Report generated (demo)','success'); }}>Run now</Button>
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => removeReportSchedule(s.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">History</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasItems && <div className="text-secondary-dark">No reports yet. Use Run now or the Quick Actions to generate one.</div>}
          {hasItems && (
            <div className="space-y-2">
              {reportHistory.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
                  <div>
                    <div className="text-primary-dark font-medium">{r.title}</div>
                    <div className="text-xs text-secondary-dark">Generated {new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => router.push(r.route)}>Open</Button>
                    <Button variant="outline" className="border-[var(--border)]" onClick={async () => {
                      const payload = { route: r.route, title: r.title };
                      const encoded = btoa(JSON.stringify(payload));
                      const url = `${window.location.origin}/share?t=${encoded}`;
                      try { await navigator.clipboard.writeText(url); pushToast('Share link copied','success'); } catch { /* noop */ }
                    }}>Copy share link</Button>
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => {
                      const payload = { route: r.route, title: r.title };
                      const encoded = btoa(JSON.stringify(payload));
                      const url = `${window.location.origin}/share?t=${encoded}`;
                      const to = (useStore.getState().currentUser?.email) || 'me@example.com';
                      openPrefilledEmail(to, 'Revu — Report', `Here is the report link:\n${url}`);
                    }}>Email</Button>
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => {
                      addNotification({ id: `notify_${Date.now()}`, title: 'Report exported', message: 'Use Analytics > Export to print the latest view.', createdAt: new Date().toISOString(), severity: 'success' });
                      router.push(r.route);
                    }}>Export PDF</Button>
                    <Button variant="outline" className="border-[var(--border)]" onClick={() => removeReportEntry(r.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}