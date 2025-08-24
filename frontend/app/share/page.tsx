// frontend/app/share/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SharePayload {
  route: string;
  title?: string;
  // Optional future fields
  // pin?: string;
  // expiresAt?: number; // epoch ms
}

export default function SharePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const t = sp.get('t');
  const [error, setError] = useState<string | null>(null);
  const payload = useMemo<SharePayload | null>(() => {
    if (!t) return null;
    try {
      const decoded = JSON.parse(atob(t)) as SharePayload;
      if (!decoded.route) throw new Error('Invalid payload');
      return decoded;
    } catch {
      setError('Invalid or corrupted link.');
      return null;
    }
  }, [t]);

  useEffect(() => {
    // In a real app, we might validate token server-side. For demo, we stay here.
  }, []);

  if (!t) return <div className="text-secondary-dark">Missing token.</div>;
  if (error) return <div className="text-secondary-dark">{error}</div>;
  if (!payload) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Shared view</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payload.title && <div className="text-primary-dark font-medium">{payload.title}</div>}
            <div className="text-secondary-dark text-sm">This link opens a read-only view in the app.</div>
            <div className="flex gap-2">
              <Button className="button-primary" onClick={() => router.replace(payload.route)}>Open</Button>
              <Button variant="outline" className="border-[var(--border)]" onClick={async () => {
                const url = `${window.location.origin}${payload.route}`;
                try { await navigator.clipboard.writeText(url); } catch {}
              }}>Copy target URL</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
