'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Filter, Calendar, Tag as TagIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SearchFilters {
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  starred?: boolean;
  archived?: boolean;
}

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onClear: () => void;
  placeholder?: string;
  availableTags?: string[];
  isSearching?: boolean;
}

export function SearchBar({
  onSearch,
  onClear,
  placeholder = "Search conversations...",
  availableTags = [],
  isSearching = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery || Object.keys(filters).length > 0) {
      onSearch(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setFilters({});
    onClear();
  }, [onClear]);

  const toggleTag = useCallback((tag: string) => {
    setFilters(prev => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      return {
        ...prev,
        tags: newTags.length > 0 ? newTags : undefined,
      };
    });
  }, []);

  const toggleStarred = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      starred: prev.starred ? undefined : true,
    }));
  }, []);

  const toggleArchived = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      archived: prev.archived ? undefined : true,
    }));
  }, []);

  const activeFilterCount = 
    (filters.tags?.length || 0) +
    (filters.starred ? 1 : 0) +
    (filters.archived ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {(query || activeFilterCount > 0) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>

        {/* Filters Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "relative",
                activeFilterCount > 0 && "border-blue-500 text-blue-600 dark:text-blue-400"
              )}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3">Filters</h4>
              </div>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.tags?.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Filters */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="starred"
                    checked={filters.starred || false}
                    onCheckedChange={toggleStarred}
                  />
                  <Label
                    htmlFor="starred"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Starred only
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="archived"
                    checked={filters.archived || false}
                    onCheckedChange={toggleArchived}
                  />
                  <Label
                    htmlFor="archived"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include archived
                  </Label>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <TagIcon className="h-3 w-3" />
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.starred && (
            <Badge variant="secondary" className="gap-1 pr-1">
              ⭐ Starred
              <button
                onClick={toggleStarred}
                className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.archived && (
            <Badge variant="secondary" className="gap-1 pr-1">
              📦 Archived
              <button
                onClick={toggleArchived}
                className="ml-1 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
