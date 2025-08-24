// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import type { Review } from '@/lib/types';
import { useAuth } from '@/lib/auth';

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
          {tab === 'Account' && <AccountSection />}
          {tab === 'Workspace' && <WorkspaceSection />}
          {tab === 'Team' && <TeamSection />}
          {tab === 'Integrations' && <IntegrationsSection />}
          {tab === 'AI Training' && <AITrainingSection />}
          {tab === 'Automations' && <AutomationsSection />}
          {tab === 'Billing' && <BillingSection />}
          {tab === 'API' && <APISection />}
          {tab === 'Notifications' && <NotificationsSection />}
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
  // Existing simple automations list (demo placeholders)
  const [rules, setRules] = useState<Array<{ name: string; when: string; action: string }>>([
    { name: 'Auto-reply: 5-star Google', when: 'Review rating >= 5 on Google', action: 'Send thank-you template' },
  ]);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('Sentiment is Negative');
  const [action, setAction] = useState('Assign to Me');

  // Demo Alerts wiring
  const { interactions, addNotification, alertRules, alertHistory, addAlertRule, updateAlertRule, removeAlertRule, addAlertEvent, clearAlertHistory, alertsSettings, setAlertsSettings } = useStore();
  const [arName, setArName] = useState('Negative surge');
  const [arType, setArType] = useState<'negative_surge' | 'vip_mention' | 'low_rating' | 'keyword_match'>('negative_surge');
  const [threshold, setThreshold] = useState<number>(10);
  const [keyword, setKeyword] = useState<string>('refund');
  const [chInApp, setChInApp] = useState(true);
  const [chEmail, setChEmail] = useState(true);
  const [chSlack, setChSlack] = useState(false);

  function scanRules() {
    const now = Date.now();
    const last24 = interactions.filter(i => now - +new Date(i.createdAt) <= 24*3600*1000);
    const last7d = interactions.filter(i => now - +new Date(i.createdAt) <= 7*24*3600*1000);
    alertRules.filter(r => r.enabled).forEach(r => {
      let hit = false;
      let message = '';
      if (r.type === 'negative_surge') {
        const neg = last24.filter(i => i.sentiment === 'Negative').length;
        const th = r.threshold ?? 10;
        if (neg >= th) { hit = true; message = `Detected ${neg} negative interactions in the last 24h (>= ${th}).`; }
      } else if (r.type === 'vip_mention') {
        const vip = last7d.find(i => i.author?.verified);
        if (vip) { hit = true; message = `VIP mention by ${vip.author.name} on ${vip.platform}.`; }
      } else if (r.type === 'low_rating') {
        const th = r.threshold ?? 2;
        const low = last7d.some((i) => i.kind === 'review' && 'rating' in i && (i as Review).rating <= th);
        if (low) { hit = true; message = `Low rating detected (<= ${th}).`; }
      } else if (r.type === 'keyword_match') {
        const kw = (r.keyword || '').toLowerCase();
        if (kw && last7d.find(i => i.content.toLowerCase().includes(kw))) { hit = true; message = `Keyword matched: "${kw}".`; }
      }
      if (hit) {
        const evtId = `ae_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        addAlertEvent({ id: evtId, ruleId: r.id, title: r.name, message, createdAt: new Date().toISOString() });
        if (r.channels.inapp) {
          addNotification({ id: `al_${evtId}`, title: `Alert: ${r.name}`, message, createdAt: new Date().toISOString(), severity: 'warning' });
        }
  // Email/Slack are no-ops in demo; settings are captured in alertsSettings.
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Simple automations (demo) */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-primary-dark">Automations</div>
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

      {/* Alerts (demo) */}
      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark">Alerts</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-secondary-dark mb-1">Rule name</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={arName} onChange={(e) => setArName(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Type</div>
            <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm w-full" value={arType} onChange={(e) => setArType(e.target.value as typeof arType)}>
              <option value="negative_surge">Negative surge</option>
              <option value="vip_mention">VIP mention</option>
              <option value="low_rating">Low rating</option>
              <option value="keyword_match">Keyword match</option>
            </select>
          </div>
          {(arType === 'negative_surge' || arType === 'low_rating') && (
            <div>
              <div className="text-sm text-secondary-dark mb-1">Threshold</div>
              <input type="number" className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value||'0',10))} />
            </div>
          )}
          {arType === 'keyword_match' && (
            <div>
              <div className="text-sm text-secondary-dark mb-1">Keyword</div>
              <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="text-sm"><input type="checkbox" className="mr-2" checked={chInApp} onChange={(e) => setChInApp(e.target.checked)} />In‑app</label>
            <label className="text-sm"><input type="checkbox" className="mr-2" checked={chEmail} onChange={(e) => setChEmail(e.target.checked)} />Email</label>
            <label className="text-sm"><input type="checkbox" className="mr-2" checked={chSlack} onChange={(e) => setChSlack(e.target.checked)} />Slack</label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="button-primary" onClick={() => {
            const id = `arl_${Date.now()}`;
            addAlertRule({ id, name: arName || 'Alert', type: arType, threshold: threshold || undefined, keyword: keyword || undefined, channels: { inapp: chInApp, email: chEmail, slack: chSlack }, enabled: true, createdAt: new Date().toISOString() });
          }}>Add Alert Rule</Button>
          <Button variant="outline" className="border-[var(--border)]" onClick={() => scanRules()}>Run scan</Button>
          <Button variant="outline" className="border-[var(--border)]" onClick={() => clearAlertHistory()}>Clear history</Button>
        </div>
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="text-sm font-medium text-primary-dark mb-2">Rules</div>
          <div className="space-y-2">
            {alertRules.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
                <div>
                  <div className="text-primary-dark font-medium">{r.name} {r.enabled ? '' : '(disabled)'}</div>
                  <div className="text-xs text-secondary-dark">{r.type} {r.threshold ? `• threshold: ${r.threshold}` : ''} {r.keyword ? `• keyword: ${r.keyword}` : ''} • channels: {Object.entries(r.channels).filter(([,v])=>v).map(([k])=>k).join(', ') || 'none'}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="border-[var(--border)]" onClick={() => updateAlertRule(r.id, { enabled: !r.enabled })}>{r.enabled ? 'Disable' : 'Enable'}</Button>
                  <Button variant="outline" className="border-[var(--border)]" onClick={() => { addAlertEvent({ id: `ae_${Date.now()}`, ruleId: r.id, title: r.name, message: 'Test alert fired (demo)', createdAt: new Date().toISOString() }); addNotification({ id: `an_${Date.now()}`, title: `Alert: ${r.name}`, message: 'Test alert fired (demo)', createdAt: new Date().toISOString(), severity: 'warning' }); }}>Test fire</Button>
                  <Button variant="outline" className="border-[var(--border)]" onClick={() => removeAlertRule(r.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="text-sm font-medium text-primary-dark mb-2">History</div>
          <div className="space-y-2">
            {alertHistory.length === 0 && (<div className="text-secondary-dark text-sm">No alerts yet.</div>)}
            {alertHistory.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
                <div>
                  <div className="text-primary-dark font-medium">{e.title}</div>
                  <div className="text-xs text-secondary-dark">{e.message} — {new Date(e.createdAt).toLocaleString()}</div>
                </div>
                <Button variant="outline" className="border-[var(--border)]" onClick={() => navigator.clipboard.writeText(`${e.title}: ${e.message}`)}>Copy</Button>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="text-sm font-medium text-primary-dark mb-2">Channels (demo)</div>
          <div className="flex flex-wrap gap-2 items-center">
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-[380px]" placeholder="Slack webhook URL (not used in demo)" value={alertsSettings.slackWebhookUrl || ''} onChange={(e) => setAlertsSettings({ slackWebhookUrl: e.target.value })} />
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-[380px]" placeholder="Email recipients (comma-separated)" value={alertsSettings.emailRecipients || ''} onChange={(e) => setAlertsSettings({ emailRecipients: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSection() {
  const { user } = useAuth();
  const { setTheme, theme } = useStore();
  const [name, setName] = useState(user?.full_name || '');
  const [email] = useState(user?.email || '');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-secondary-dark mb-1">Full name</div>
          <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-secondary-dark mb-1">Email</div>
          <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={email} readOnly />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-secondary-dark">Theme:</div>
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}>
          {['light','dark','system'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button className="button-primary" onClick={() => alert('Saved (demo)')}>Save</Button>
      </div>
    </div>
  );
}

function WorkspaceSection() {
  const { branding, setBranding, workspaceSettings, setWorkspaceSettings } = useStore();
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [primary, setPrimary] = useState(branding.primaryColor || '#4f46e5');
  const [accent, setAccent] = useState(branding.accentColor || '#22c55e');
  const [headerText, setHeaderText] = useState(branding.headerText || 'Revu');
  const [footerText, setFooterText] = useState(branding.footerText || '');
  const [useBranding, setUseBranding] = useState(!!branding.useBrandingInExports);
  const [name, setName] = useState(workspaceSettings.name || '');
  const [slug, setSlug] = useState(workspaceSettings.slug || '');
  const [tz, setTz] = useState(workspaceSettings.timezone || 'UTC');
  const [domain, setDomain] = useState(workspaceSettings.domain || '');
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-medium text-primary-dark mb-2">Branding</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-secondary-dark mb-1">Logo URL</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-secondary-dark mb-1">Primary color</div>
              <input type="color" className="h-9 w-16 rounded-md border card-background border-[var(--border)]" value={primary} onChange={(e) => setPrimary(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-secondary-dark mb-1">Accent color</div>
              <input type="color" className="h-9 w-16 rounded-md border card-background border-[var(--border)]" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Header text</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Footer text</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={footerText} onChange={(e) => setFooterText(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useBranding} onChange={(e) => setUseBranding(e.target.checked)} />
            Use branding in exports (PDF/CSV)
          </label>
        </div>
        <div className="mt-3">
          <Button className="button-primary" onClick={() => setBranding({ logoUrl, primaryColor: primary, accentColor: accent, headerText, footerText, useBrandingInExports: useBranding })}>Save Branding</Button>
        </div>
      </div>
      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Workspace</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-secondary-dark mb-1">Name</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Slug</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Timezone</div>
            <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={tz} onChange={(e) => setTz(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-secondary-dark mb-1">Custom domain</div>
            <input placeholder="reviews.yourdomain.com" className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <Button className="button-primary" onClick={() => setWorkspaceSettings({ name, slug, timezone: tz, domain })}>Save Workspace</Button>
        </div>
      </div>
    </div>
  );
}

function TeamSection() {
  const { team, addTeamMember, updateTeamMember, removeTeamMember } = useStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Manager' | 'Analyst' | 'Responder'>('Responder');
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)]" placeholder="Invite by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'Owner' | 'Admin' | 'Manager' | 'Analyst' | 'Responder')}>
          {['Owner','Admin','Manager','Analyst','Responder'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button className="button-primary" onClick={() => { if (!inviteEmail.trim()) return; addTeamMember({ id: `m_${Date.now()}`, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, status: 'invited' }); setInviteEmail(''); }}>Send invite</Button>
      </div>
      <div className="space-y-2">
        {team.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
            <div>
              <div className="text-primary-dark font-medium">{m.name} <span className="text-xs text-secondary-dark">({m.email})</span></div>
              <div className="text-xs text-secondary-dark">{m.role} • {m.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <select className="card-background border-[var(--border)] rounded-md px-2 py-1 text-sm" value={m.role} onChange={(e) => updateTeamMember(m.id, { role: e.target.value as 'Owner' | 'Admin' | 'Manager' | 'Analyst' | 'Responder' })}>
                {['Owner','Admin','Manager','Analyst','Responder'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button variant="outline" className="border-[var(--border)]" onClick={() => updateTeamMember(m.id, { status: m.status === 'active' ? 'suspended' : 'active' })}>{m.status === 'active' ? 'Suspend' : 'Activate'}</Button>
              <Button variant="outline" className="border-[var(--border)]" onClick={() => removeTeamMember(m.id)}>Remove</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const { integrations, setIntegrationStatus } = useStore();
  return (
    <div className="space-y-3">
      {integrations.map(i => (
        <div key={i.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
          <div>
            <div className="text-primary-dark font-medium">{i.name}</div>
            <div className="text-xs text-secondary-dark">Status: {i.status || '—'}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-[var(--border)]" onClick={() => setIntegrationStatus(i.id, { connected: true, status: 'ok' })}>Connect</Button>
            <Button variant="outline" className="border-[var(--border)]" onClick={() => setIntegrationStatus(i.id, { connected: false, status: 'pending' })}>Disconnect</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AITrainingSection() {
  const { aiTraining, setAITraining, templates, addTemplate, removeTemplate } = useStore();
  const [voice, setVoice] = useState(aiTraining.brandVoice || '');
  const [blocked, setBlocked] = useState(aiTraining.blockedWords.join(', '));
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Casual' | 'Empathetic'>('Professional');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-secondary-dark mb-1">Brand voice</div>
          <textarea className="min-h-24 px-3 py-2 rounded-md border card-background border-[var(--border)] w-full" value={voice} onChange={(e) => setVoice(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-secondary-dark mb-1">Blocked words (comma-separated)</div>
          <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={blocked} onChange={(e) => setBlocked(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm">Allow tone:</div>
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value as 'Professional' | 'Friendly' | 'Casual' | 'Empathetic')}>
          {['Professional','Friendly','Casual','Empathetic'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button variant="outline" className="border-[var(--border)]" onClick={() => setAITraining({ allowedTones: Array.from(new Set([...(aiTraining.allowedTones||[]), tone])) })}>Add tone</Button>
      </div>
      <Button className="button-primary" onClick={() => setAITraining({ brandVoice: voice, blockedWords: blocked.split(',').map(s => s.trim()).filter(Boolean) })}>Save AI training</Button>
      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Reply templates</div>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
              <div>
                <div className="text-primary-dark font-medium">{t.name}</div>
                <div className="text-xs text-secondary-dark">{t.content}</div>
              </div>
              <Button variant="outline" className="border-[var(--border)]" onClick={() => removeTemplate(t.id)}>Remove</Button>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Button variant="outline" className="border-[var(--border)]" onClick={() => { const name = prompt('Template name:'); if (!name) return; const content = prompt('Template content:'); if (!content) return; addTemplate({ id: `tpl_${Date.now()}`, name, content }); }}>Add template</Button>
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
  const { billing, setBilling, paymentMethods, addPaymentMethod, removePaymentMethod } = useStore();
  const [plan, setPlan] = useState(billing.plan);
  const [seats, setSeats] = useState(billing.seats);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm">Plan:</div>
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={plan} onChange={(e) => setPlan(e.target.value as 'Free' | 'Starter' | 'Pro' | 'Enterprise')}>
          {['Free','Starter','Pro','Enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="text-sm">Seats:</div>
        <input type="number" className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-24" value={seats} onChange={(e) => setSeats(parseInt(e.target.value||'0',10))} />
        <Button className="button-primary" onClick={() => setBilling({ plan, seats })}>Update</Button>
      </div>
      <div className="pt-2 border-t border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Payment methods</div>
        <div className="space-y-2">
          {paymentMethods.map(pm => (
            <div key={pm.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
              <div className="text-secondary-dark text-sm">{pm.brand.toUpperCase()} •••• {pm.last4} — {pm.expMonth}/{pm.expYear} {pm.default ? '(default)' : ''}</div>
              <div className="flex gap-2">
                {!pm.default && <Button variant="outline" className="border-[var(--border)]" onClick={() => alert('Set default (demo)')}>Set default</Button>}
                <Button variant="outline" className="border-[var(--border)]" onClick={() => removePaymentMethod(pm.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Button variant="outline" className="border-[var(--border)]" onClick={() => addPaymentMethod({ id: `pm_${Date.now()}`, brand: 'visa', last4: '1881', expMonth: 12, expYear: 2028 })}>Add card</Button>
        </div>
      </div>
    </div>
  );
}

function APISection() {
  const { apiTokens, addApiToken, revokeApiToken, webhooks, addWebhook, removeWebhook } = useStore();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-medium text-primary-dark mb-2">API Tokens</div>
        <div className="space-y-2">
          {apiTokens.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
              <div className="text-secondary-dark text-sm">{t.name} — {t.tokenPreview} — {new Date(t.createdAt).toLocaleDateString()}</div>
              <Button variant="outline" className="border-[var(--border)]" onClick={() => revokeApiToken(t.id)}>Revoke</Button>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Button variant="outline" className="border-[var(--border)]" onClick={() => addApiToken({ id: `tok_${Date.now()}`, name: 'New token', tokenPreview: 'sk_live_...new', createdAt: new Date().toISOString() })}>Create token</Button>
        </div>
      </div>
      <div className="pt-4 border-t border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Webhooks</div>
        <div className="space-y-2">
          {webhooks.map(w => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
              <div className="text-secondary-dark text-sm">{w.url} — {w.events.join(', ')} — {w.secretPreview}</div>
              <Button variant="outline" className="border-[var(--border)]" onClick={() => removeWebhook(w.id)}>Remove</Button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input className="h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-[380px]" placeholder="https://example.com/webhook" id="wh-url" />
          <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" id="wh-events">
            {['review.created','review.updated','comment.created','alert.triggered'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <Button variant="outline" className="border-[var(--border)]" onClick={() => {
            const url = (document.getElementById('wh-url') as HTMLInputElement)?.value;
            const ev = (document.getElementById('wh-events') as HTMLSelectElement)?.value as 'review.created' | 'review.updated' | 'comment.created' | 'alert.triggered';
            if (!url) return;
            addWebhook({ id: `wh_${Date.now()}`, url, events: [ev], secretPreview: 'whsec_...demo', createdAt: new Date().toISOString() });
          }}>Add webhook</Button>
        </div>
      </div>
    </div>
  );
}