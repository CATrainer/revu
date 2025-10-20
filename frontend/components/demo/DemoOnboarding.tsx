"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { pushToast } from '@/components/ui/toast';

type Persona = 'creator' | 'agency_creators' | 'agency_businesses';

export function DemoOnboarding() {
  const router = useRouter();
  const { setDemoState } = useDemoMode();
  const [persona, setPersona] = useState<Persona>('creator');
  const [loading, setLoading] = useState(false);

  async function startDemo() {
    setLoading(true);
    try {
      // Call the demo/enable endpoint to activate demo mode
      // User must already be authenticated
      const res = await api.post('/demo/enable', {
        profile_type: 'auto',
        niche: persona === 'creator' ? 'tech_reviews' : 
               persona === 'agency_creators' ? 'lifestyle' : 'business',
        personality: 'friendly_professional',
        comment_volume: 'medium',
        dm_frequency: 'medium',
      });
      
      setDemoState(true, persona);
      pushToast('Demo mode enabled! Generating sample data...', 'success');
      
      // Refresh the page to load demo data
      router.refresh();
      router.push('/dashboard');
    } catch (e: any) {
      console.error('Demo enable error:', e);
      const errorMsg = e?.response?.data?.detail || 'Could not enable demo mode. Please try again.';
      pushToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card-background border-[var(--border)]">
      <CardHeader>
        <CardTitle className="text-primary-dark">Try Repruv in Demo Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-secondary-dark">Pick a persona to tailor the experience:</div>
        <div className="flex gap-3 flex-wrap">
          {(
            [
              { id: 'creator', label: 'Solo Creator' },
              { id: 'agency_creators', label: 'Agency - Creators' },
              { id: 'agency_businesses', label: 'Agency - Businesses' },
            ] as const
          ).map((p) => (
            <Button
              key={p.id}
              variant={persona === p.id ? 'default' : 'outline'}
              className={persona === p.id ? 'button-primary' : 'border-[var(--border)]'}
              onClick={() => setPersona(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="text-xs text-secondary-dark">
          We’ll pre-populate realistic comments, responses, and analytics. No real accounts required.
        </div>
        <div>
          <Button className="button-primary" onClick={startDemo} disabled={loading}>
            {loading ? 'Starting...' : 'Start Demo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
