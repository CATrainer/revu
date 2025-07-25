// frontend/components/dashboard/QuickActions.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full" variant="default">
          View New Reviews (5)
        </Button>
        <Button className="w-full" variant="outline">
          Generate Weekly Report
        </Button>
        <Button className="w-full" variant="outline">
          Check Competitors
        </Button>
      </CardContent>
    </Card>
  );
}