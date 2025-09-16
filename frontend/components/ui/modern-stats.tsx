'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ModernStatsProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export function ModernStats({ 
  title, 
  value, 
  change, 
  changeLabel,
  icon, 
  className,
  trend,
  loading = false
}: ModernStatsProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className={cn('p-6 rounded-xl card-background animate-fade-in', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 skeleton rounded"></div>
          <div className="h-8 w-8 skeleton rounded-lg"></div>
        </div>
        <div className="h-8 w-32 skeleton rounded mb-2"></div>
        <div className="h-3 w-20 skeleton rounded"></div>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-6 rounded-xl card-background hover-raise transition-all duration-200 animate-fade-in',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary-dark">{title}</h3>
        {icon && (
          <div className="p-2 rounded-lg icon-background">
            <div className="icon-color">{icon}</div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-primary-dark">{value}</p>
        
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center gap-1 text-xs">
            {change !== undefined && (
              <>
                <span className={getTrendColor()}>{getTrendIcon()}</span>
                <span className={getTrendColor()}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </>
            )}
            {changeLabel && (
              <span className="text-muted-dark">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function StatsGrid({ children, className, columns = 4 }: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn(
      'grid gap-4',
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}
