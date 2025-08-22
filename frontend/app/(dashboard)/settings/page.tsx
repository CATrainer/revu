// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tabs = ['Account','Workspace','Team','Integrations','AI Training','Billing','API','Notifications'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof tabs[number]>('Account');
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
          <div className="text-secondary-dark">{tab} settings will go here.</div>
        </CardContent>
      </Card>
    </div>
  );
}