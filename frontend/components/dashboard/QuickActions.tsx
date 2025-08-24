// frontend/components/dashboard/QuickActions.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { pushToast } from '@/components/ui/toast';

export function QuickActions() {
  const router = useRouter();
  return (
  <Card className="card-background border-[var(--border)]">
    <CardHeader>
  <CardTitle className="text-primary-dark" data-tour="quick-actions">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
    <Button className="w-full button-primary" variant="default" onClick={() => router.push('/reviews?filter=new')}>
          View New Reviews (5)
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover:section-background-alt" variant="outline" onClick={() => pushToast('Weekly report generated (demo). Check Analytics > Export.', 'success')}>
          Generate Weekly Report
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover:section-background-alt" variant="outline" onClick={() => router.push('/competitors')}>
          Check Competitors
        </Button>
      </CardContent>
    </Card>
  );
}