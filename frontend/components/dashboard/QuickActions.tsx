// frontend/components/dashboard/QuickActions.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function QuickActions() {
  return (
    <Card className="bg-white dark:bg-[hsl(222,84%,8%)] border-gray-200 dark:border-[hsl(222,47%,16%)]">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-[hsl(215,20%,85%)]">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full bg-[hsl(263,70%,68%)] hover:bg-[hsl(263,70%,65%)] text-white" variant="default">
          View New Reviews (5)
        </Button>
        <Button className="w-full border-gray-300 dark:border-[hsl(222,47%,16%)] text-gray-700 dark:text-[hsl(215,20%,65%)] hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]" variant="outline">
          Generate Weekly Report
        </Button>
        <Button className="w-full border-gray-300 dark:border-[hsl(222,47%,16%)] text-gray-700 dark:text-[hsl(215,20%,65%)] hover:bg-gray-50 dark:hover:bg-[hsl(222,84%,12%)]" variant="outline">
          Check Competitors
        </Button>
      </CardContent>
    </Card>
  );
}