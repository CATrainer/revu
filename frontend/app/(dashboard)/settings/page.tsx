// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { PlatformConnectionButton } from '@/components/integrations/PlatformConnectionButton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Check, ChevronDown, Globe } from 'lucide-react';

const tabs = ['Integrations', 'Preferences'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof tabs[number]>('Integrations');
  const sp = useSearchParams();

  useEffect(() => {
    const t = sp.get('tab');
    const found = tabs.find(x => x === t);
    if (found) setTab(found);
  }, [sp]);

  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Settings</h1>

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
          {tab === 'Integrations' && <IntegrationsSection />}
          {tab === 'Preferences' && <PreferencesSection />}
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


function PreferencesSection() {
  const { currency, setCurrency, supportedCurrencies, currencyInfo } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    setSaving(true);
    try {
      await setCurrency(newCurrency);
    } finally {
      setSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency Preference */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-secondary-dark" />
          <h3 className="text-lg font-medium text-primary-dark">Display Currency</h3>
        </div>
        <p className="text-sm text-secondary-dark">
          Choose your preferred currency for displaying monetary values across the dashboard. 
          This affects how deal values, revenue, and other financial data are shown.
        </p>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={saving}
            className="flex items-center justify-between w-full max-w-xs px-4 py-3 rounded-lg border border-[var(--border)] card-background hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{currencyInfo?.symbol || '$'}</span>
              <div className="text-left">
                <div className="font-medium text-primary-dark">{currency}</div>
                <div className="text-xs text-secondary-dark">{currencyInfo?.name || 'US Dollar'}</div>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-secondary-dark transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-2 w-full max-w-xs rounded-lg border border-[var(--border)] card-background shadow-lg max-h-64 overflow-y-auto">
              {supportedCurrencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrencyChange(curr.code)}
                  className={`flex items-center justify-between w-full px-4 py-3 hover:bg-primary/5 transition-colors ${
                    currency === curr.code ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6">{curr.symbol}</span>
                    <div className="text-left">
                      <div className="font-medium text-primary-dark">{curr.code}</div>
                      <div className="text-xs text-secondary-dark">{curr.name}</div>
                    </div>
                  </div>
                  {currency === curr.code && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-secondary-dark mt-2">
          Note: Values are converted using current exchange rates. Original amounts are stored in their source currency.
        </p>
      </div>
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

