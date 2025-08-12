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
  <Card className="hover:shadow-lg transition-shadow cursor-pointer card-background border-[var(--border)]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-dark">{title}</p>
            <p className="text-2xl font-bold text-primary-dark mt-2">{value}</p>
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
                  <span className="text-sm text-muted-dark ml-2">{trend}</span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 brand-background rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 brand-text" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}