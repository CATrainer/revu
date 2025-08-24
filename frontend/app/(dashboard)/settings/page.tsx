// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

const tabs = ['Account','Workspace','Team','Integrations','AI Training','Automations','Billing','API','Notifications'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof tabs[number]>('Account');
  const sp = useSearchParams();
  useEffect(() => {
    const t = sp.get('tab');
    const found = tabs.find(x => x === t);
    if (found) setTab(found);
  }, [sp]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Settings</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} className={tab === t ? 'button-primary' : 'border-[var(--border)]'} onClick={() => setTab(t)} data-tour={t === 'Notifications' ? 'settings-notifications' : undefined}>
            {t}
          </Button>
        ))}
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">{tab}</CardTitle>
        </CardHeader>
        <CardContent>
          {tab === 'Automations' && <AutomationsSection />}
          {tab === 'Notifications' && <NotificationsSection />}
          {tab !== 'Automations' && tab !== 'Notifications' && (
            <div className="text-secondary-dark">{tab} settings will go here.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const { integrations, addNotification, notificationPrefs, setNotificationPrefs, setTour } = useStore();
  const [keywords, setKeywords] = useState<string>(notificationPrefs.muteKeywords.join(', '));
  const [mutePlatforms, setMutePlatforms] = useState<Array<'google' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'tripadvisor'>>(notificationPrefs.mutedPlatforms);
  const [rate, setRate] = useState<'All' | 'Important only'>(notificationPrefs.mode);
  return (
    <div className="space-y-4">
      <div className="text-sm text-secondary-dark">Reduce noise by muting certain keywords or platforms. Demo-only.</div>
      <div className="flex flex-wrap gap-2 items-center">
        <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] text-sm w-80" placeholder="Mute keywords (comma-separated)" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={rate} onChange={(e) => setRate(e.target.value as typeof rate)}>
          {['All','Important only'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button className="button-primary" onClick={() => {
          const parsed = keywords.split(',').map(k => k.trim()).filter(Boolean);
          setNotificationPrefs({ muteKeywords: parsed, mutedPlatforms: mutePlatforms, mode: rate });
          addNotification({ id: `muted_${Date.now()}`, title: 'Notification rules updated', message: `Muted: ${parsed.join(', ') || 'none'} • Mode: ${rate}`, createdAt: new Date().toISOString(), severity: 'success' });
          try { useStore.getState().setTour({ completed: true }); } catch {}
        }}>Save</Button>
      </div>
      <div>
        <div className="text-sm font-medium text-primary-dark mb-2">Mute by platform</div>
        <div className="flex flex-wrap gap-2">
          {integrations.map(i => (
            <label key={i.id} className="text-xs px-2 py-1 rounded border border-[var(--border)] cursor-pointer">
              <input type="checkbox" className="mr-2" checked={mutePlatforms.includes(i.id)} onChange={(e) => setMutePlatforms(e.target.checked ? [...mutePlatforms, i.id] : mutePlatforms.filter(x => x !== i.id))} />
              {i.name}
            </label>
          ))}
        </div>
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="text-sm text-secondary-dark mb-2">Guided tour</div>
        <Button variant="outline" className="border-[var(--border)]" onClick={() => setTour({ completed: false, step: 0 })}>Restart tour</Button>
      </div>
    </div>
  );
}

function AutomationsSection() {
  const [rules, setRules] = useState<Array<{ name: string; when: string; action: string }>>([
    { name: 'Auto-reply: 5-star Google', when: 'Review rating >= 5 on Google', action: 'Send thank-you template' },
  ]);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('Sentiment is Negative');
  const [action, setAction] = useState('Assign to Me');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] text-sm" placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={when} onChange={(e) => setWhen(e.target.value)}>
          {['Sentiment is Negative','Platform is Google','Mentions increased by 50%','Rating <= 2'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
          {['Assign to Me','Tag: urgent','Auto-reply with template','Notify via email'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button className="button-primary" onClick={() => { if (!name.trim()) return; setRules([{ name, when, action }, ...rules]); setName(''); }}>Add Rule</Button>
      </div>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
            <div>
              <div className="text-primary-dark font-medium">{r.name}</div>
              <div className="text-xs text-secondary-dark">When: {r.when} → {r.action}</div>
            </div>
            <Button variant="outline" className="border-[var(--border)]" onClick={() => setRules(rules.filter((_, idx) => idx !== i))}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  );
}