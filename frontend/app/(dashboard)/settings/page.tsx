// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { PlatformConnectionButton } from '@/components/integrations/PlatformConnectionButton';

const tabs = ['Integrations','Demo Mode'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof tabs[number]>('Integrations');
  const [hasDemoAccess, setHasDemoAccess] = useState<boolean | null>(null);
  const sp = useSearchParams();

  useEffect(() => {
    const t = sp.get('tab');
    const found = tabs.find(x => x === t);
    if (found) setTab(found);
  }, [sp]);

  // Check if user has demo access
  useEffect(() => {
    const checkDemoAccess = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/demo/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setHasDemoAccess(data.has_access ?? true); // Default to true if not provided (backwards compat)
        }
      } catch (error) {
        console.error('Failed to check demo access:', error);
        setHasDemoAccess(true); // Default to true on error
      }
    };
    checkDemoAccess();
  }, []);

  // Filter tabs based on demo access
  const availableTabs = hasDemoAccess === false ? tabs.filter(t => t !== 'Demo Mode') : tabs;

  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Settings</h1>

      <div className="flex flex-wrap gap-2">
        {availableTabs.map((t) => (
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
          {tab === 'Integrations' && <IntegrationsSection />}
          {tab === 'Demo Mode' && <DemoModeSection hasDemoAccess={hasDemoAccess} />}
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
          <input className="h-11 md:h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-sm text-secondary-dark mb-1">Email</div>
          <input className="h-11 md:h-9 px-3 py-1 rounded-md border card-background border-[var(--border)] w-full" value={email} readOnly />
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
  const { integrations } = useStore();
  
  const socialPlatforms = [
    { id: 'youtube' as const, name: 'YouTube' },
    { id: 'instagram' as const, name: 'Instagram' },
    { id: 'tiktok' as const, name: 'TikTok' }
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
            <PlatformConnectionButton platform={platform.id} />
          </div>
        );
      })}
    </div>
  );
}

function DemoModeSection({ hasDemoAccess }: { hasDemoAccess: boolean | null }) {
  const router = useRouter();

  // Show access denied if user doesn't have access
  if (hasDemoAccess === false) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md border border-yellow-500">
          <div className="text-sm font-medium text-primary-dark mb-2">Access Restricted</div>
          <div className="text-sm text-secondary-dark mt-2">
            Demo mode is not currently available for your account.
            Please contact support if you need access to demo functionality.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md border border-[var(--border)]">
        <div className="text-sm font-medium text-primary-dark mb-2">Demo Mode</div>
        <div className="text-sm text-secondary-dark mt-2">
          Test Repruv with AI-generated realistic interactions across YouTube, Instagram, and TikTok without connecting real accounts.
        </div>
        <ul className="mt-3 space-y-1 text-sm text-secondary-dark">
          <li>• Realistic AI-generated content and interactions</li>
          <li>• Test all workflows and automations</li>
          <li>• Configure follower counts and engagement levels</li>
          <li>• Switch between demo and real mode anytime</li>
        </ul>
      </div>

      <Button
        className="button-primary"
        onClick={() => router.push('/settings/demo-mode')}
      >
        Configure Demo Mode →
      </Button>
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

