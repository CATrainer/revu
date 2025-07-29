// frontend/components/dashboard/MetricsCard.tsx
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  trend?: string;
}

export function MetricsCard({ title, value, change, icon: Icon, trend }: MetricsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-[hsl(222,84%,8%)] border-gray-200 dark:border-[hsl(222,47%,16%)]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-[hsl(215,20%,65%)]">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-[hsl(215,20%,85%)] mt-2">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    change.type === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
                </span>
                {trend && (
                  <span className="text-sm text-gray-500 dark:text-[hsl(215,20%,55%)] ml-2">{trend}</span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 bg-[hsl(263,70%,68%)]/10 dark:bg-[hsl(263,70%,68%)]/20 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-[hsl(263,70%,68%)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}