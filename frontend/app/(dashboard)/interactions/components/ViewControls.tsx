'use client';

import { useState } from 'react';
import { ChevronDown, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type SortOption = 'newest' | 'oldest' | 'priority' | 'engagement';
type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter';

interface ViewControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedPlatforms: Platform[];
  onPlatformsChange: (platforms: Platform[]) => void;
  onReset?: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority' },
  { value: 'engagement', label: 'Most Engaged' },
];

const platforms: { value: Platform; label: string; color: string }[] = [
  { value: 'youtube', label: 'YouTube', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'tiktok', label: 'TikTok', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'twitter', label: 'X/Twitter', color: 'bg-sky-100 text-sky-700 border-sky-200' },
];

export function ViewControls({
  sortBy,
  onSortChange,
  selectedPlatforms,
  onPlatformsChange,
  onReset,
}: ViewControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.includes(platform)) {
      onPlatformsChange(selectedPlatforms.filter(p => p !== platform));
    } else {
      onPlatformsChange([...selectedPlatforms, platform]);
    }
  };

  const hasFilters = selectedPlatforms.length > 0;
  const currentSort = sortOptions.find(opt => opt.value === sortBy);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary-dark">Sort:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
            >
              {currentSort?.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  sortBy === option.value && 'bg-accent'
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Platform Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary-dark">Filter:</span>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
            >
              {selectedPlatforms.length > 0
                ? `${selectedPlatforms.length} Platform${selectedPlatforms.length > 1 ? 's' : ''}`
                : 'All Platforms'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.value);
              return (
                <DropdownMenuItem
                  key={platform.value}
                  onClick={() => togglePlatform(platform.value)}
                  className="flex items-center gap-2"
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border-2 flex items-center justify-center',
                      isSelected ? 'bg-brand-primary border-brand-primary' : 'border-border'
                    )}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </div>
                  {platform.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filter Chips */}
      {selectedPlatforms.length > 0 && (
        <div className="flex items-center gap-2 flex-1">
          {selectedPlatforms.map((platformValue) => {
            const platform = platforms.find(p => p.value === platformValue);
            if (!platform) return null;

            return (
              <div
                key={platformValue}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
                  platform.color
                )}
              >
                {platform.label}
                <button
                  onClick={() => togglePlatform(platformValue)}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Reset Button */}
      {hasFilters && onReset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 gap-2 ml-auto"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
