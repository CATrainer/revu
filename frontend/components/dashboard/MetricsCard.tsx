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
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
                </span>
                {trend && (
                  <span className="text-sm text-gray-500 ml-2">{trend}</span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}