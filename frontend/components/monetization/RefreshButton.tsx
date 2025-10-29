// frontend/components/monetization/RefreshButton.tsx
'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  return (
    <Button
      onClick={onRefresh}
      disabled={isRefreshing}
      variant="outline"
      size="default"
      className="dashboard-card hover:brand-background hover:brand-text transition-all duration-300"
    >
      <RefreshCw
        className={cn(
          'h-4 w-4 mr-2 transition-transform duration-500',
          isRefreshing && 'animate-spin'
        )}
      />
      {isRefreshing ? 'Analyzing...' : 'Refresh'}
    </Button>
  );
}
