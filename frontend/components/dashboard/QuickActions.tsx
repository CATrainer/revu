// frontend/components/dashboard/QuickActions.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { pushToast } from '@/components/ui/toast';
import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function QuickActions() {
  const router = useRouter();
  const { addReportEntry, addNotification } = useStore();
  
  // Fetch unread interaction count
  const { data: interactionCount } = useQuery({
    queryKey: ['unread-interactions-count'],
    queryFn: async () => {
      try {
        const response = await api.get('/interactions/unread-count');
        return response.data?.count || 0;
      } catch (error) {
        return 0;
      }
    },
    staleTime: 30000, // 30 seconds
  });

  const labelNew = 'View Interactions';
  return (
  <Card className="card-background border-[var(--border)]">
    <CardHeader>
  <CardTitle className="text-primary-dark" data-tour="quick-actions">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
  <Button className="w-full button-primary" variant="default" onClick={() => router.push('/comments')}>
          {labelNew}{interactionCount > 0 && ` (${interactionCount})`}
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover-background" variant="outline" onClick={() => { addReportEntry({ id: `rep_${Date.now()}`, title: `Weekly Analytics Summary — ${new Date().toLocaleDateString()}`, route: '/analytics', createdAt: new Date().toISOString() }); addNotification({ id: `n_${Date.now()}`, title: 'Report ready', message: 'Weekly report generated. Open Analytics to export.', createdAt: new Date().toISOString(), severity: 'success' }); pushToast('Weekly report generated. Check Analytics > Export.', 'success'); }}>
          Generate Weekly Report
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover-background" variant="outline" onClick={() => router.push('/automation')}>
          Open Automation
        </Button>
      </CardContent>
    </Card>
  );
}