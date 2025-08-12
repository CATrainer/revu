// frontend/components/dashboard/QuickActions.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QuickActions() {
  return (
  <Card className="card-background border-[var(--border)]">
      <CardHeader>
  <CardTitle className="text-primary-dark">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full button-primary" variant="default">
          View New Reviews (5)
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover:section-background-alt" variant="outline">
          Generate Weekly Report
        </Button>
  <Button className="w-full border-[var(--border)] text-secondary-dark hover:section-background-alt" variant="outline">
          Check Competitors
        </Button>
      </CardContent>
    </Card>
  );
}