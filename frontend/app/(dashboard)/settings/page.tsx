// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

const tabs = ['Account','Integrations','Billing'] as const;

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
          <Button key={t} variant={tab === t ? 'default' : 'outline'} className={tab === t ? 'button-primary' : 'border-[var(--border)]'} onClick={() => setTab(t)}>
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
          {tab === 'Integrations' && <IntegrationsSection />}
          {tab === 'Billing' && <BillingSection />}
        </CardContent>
      </Card>
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
          <div className="text-sm text-secondary-dark mb-1">Full Name</div>
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

function IntegrationsSection() {
  const { integrations, setIntegrationStatus } = useStore();
  
  const socialPlatforms = [
    { id: 'youtube', name: 'YouTube', canConnect: true },
    { id: 'instagram', name: 'Instagram', canConnect: false },
    { id: 'tiktok', name: 'TikTok', canConnect: false }
  ];

  return (
    <div className="space-y-3">
      {socialPlatforms.map(platform => {
        const integration = integrations.find(i => i.id === platform.id);
        return (
          <div key={platform.id} className="flex items-center justify-between p-3 rounded-md border border-[var(--border)]">
            <div>
              <div className="text-primary-dark font-medium">{platform.name}</div>
              <div className="text-xs text-secondary-dark">
                Status: {integration?.connected ? 'Connected' : 'Not connected'}
              </div>
            </div>
            <div className="flex gap-2">
              {platform.canConnect ? (
                <>
                  <Button 
                    variant="outline" 
                    className="border-[var(--border)]" 
                    onClick={() => setIntegrationStatus(platform.id as any, { connected: true, status: 'ok' })}
                    disabled={integration?.connected}
                  >
                    {integration?.connected ? 'Connected' : 'Connect'}
                  </Button>
                  {integration?.connected && (
                    <Button 
                      variant="outline" 
                      className="border-[var(--border)]" 
                      onClick={() => setIntegrationStatus(platform.id as any, { connected: false, status: 'pending' })}
                    >
                      Disconnect
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-sm text-secondary-dark px-3 py-2">Coming Soon</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BillingSection() {
  const { billing } = useStore();
  const currentTier = billing?.plan || 'Free';
  
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md border border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Current Plan</div>
        <div className="text-lg font-semibold text-primary-dark">{currentTier}</div>
        <div className="text-sm text-secondary-dark mt-1">
          {currentTier === 'Free' ? 'Basic social media management features' : 'Advanced features and analytics'}
        </div>
      </div>
      
      <div className="flex gap-2">
        {currentTier === 'Free' ? (
          <Button className="button-primary">
            Upgrade to Pro
          </Button>
        ) : (
          <Button variant="outline" className="border-[var(--border)]">
            Downgrade to Free
          </Button>
        )}
      </div>
    </div>
  );
}

