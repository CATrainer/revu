'use client';

import { cn } from '@/lib/utils';

interface BetaBadgeProps {
  className?: string;
  variant?: 'blue' | 'purple';
}

export function BetaBadge({ className, variant = 'blue' }: BetaBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        variant === 'blue' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        variant === 'purple' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        className
      )}
      title="This feature is in active development"
    >
      Beta
    </span>
  );
}
