'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search,
  Megaphone,
  Users,
  Building2,
  Receipt,
  FileText,
  GitBranch,
  Clock,
  ArrowRight,
  X,
  Command,
  Loader2,
} from 'lucide-react';
import type { SearchResult, SearchResults } from '@/lib/agency-dashboard-api';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SearchCategory = 'all' | 'campaigns' | 'creators' | 'brands' | 'invoices' | 'reports' | 'deals';

const categories: { key: SearchCategory; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'creators', label: 'Creators', icon: Users },
  { key: 'brands', label: 'Brands', icon: Building2 },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'deals', label: 'Deals', icon: GitBranch },
];

// Mock data for demonstration - will be replaced with actual API calls
const mockRecentSearches = [
  'Brand X campaign',
  '@creator1',
  'Invoice 2024-045',
  'Tech sponsorship',
  'Q4 report',
];

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(mockRecentSearches);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setCategory('all');
      setResults(null);
      setSelectedIndex(0);
    }
  }, [open]);

  // Mock search function - replace with actual API call
  const performSearch = useCallback(async (searchQuery: string, searchCategory: SearchCategory) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsSearching(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock results
    const mockResults: SearchResults = {
      campaigns: searchQuery.toLowerCase().includes('campaign') || searchCategory === 'all' || searchCategory === 'campaigns' ? [
        { id: '1', type: 'campaign', title: 'Brand X Product Review', subtitle: '@creator1', status: 'In Progress', metadata: { value: 15000 } },
        { id: '2', type: 'campaign', title: 'Brand Y Sponsored Post', subtitle: '@creator2', status: 'Scheduled', metadata: { value: 8000 } },
      ] : [],
      creators: searchQuery.toLowerCase().includes('creator') || searchCategory === 'all' || searchCategory === 'creators' ? [
        { id: '1', type: 'creator', title: '@creator1', subtitle: 'John Smith', description: 'YouTube - 250K subscribers', avatar_url: '' },
        { id: '2', type: 'creator', title: '@creator2', subtitle: 'Jane Doe', description: 'Instagram - 85K followers', avatar_url: '' },
      ] : [],
      brands: searchQuery.toLowerCase().includes('brand') || searchCategory === 'all' || searchCategory === 'brands' ? [
        { id: '1', type: 'brand', title: 'Brand X', subtitle: '5 campaigns', metadata: { total_spent: 75000 } },
        { id: '2', type: 'brand', title: 'Brand Y', subtitle: '3 campaigns', metadata: { total_spent: 45000 } },
      ] : [],
      invoices: searchQuery.toLowerCase().includes('invoice') || searchCategory === 'all' || searchCategory === 'invoices' ? [
        { id: '1', type: 'invoice', title: 'Invoice #2024-045', subtitle: 'Brand X', status: 'Paid', metadata: { amount: 7500 } },
        { id: '2', type: 'invoice', title: 'Invoice #2024-046', subtitle: 'Brand Y', status: 'Pending', metadata: { amount: 5000 } },
      ] : [],
      reports: searchCategory === 'all' || searchCategory === 'reports' ? [
        { id: '1', type: 'report', title: 'Brand X Q4 Campaign Report', subtitle: 'Generated Jan 15, 2025' },
      ] : [],
      deals: searchQuery.toLowerCase().includes('deal') || searchCategory === 'all' || searchCategory === 'deals' ? [
        { id: '1', type: 'deal', title: 'Brand Z Partnership', subtitle: 'Negotiating', status: 'Negotiating', metadata: { value: 25000 } },
      ] : [],
      total_count: 0,
    };

    mockResults.total_count =
      mockResults.campaigns.length +
      mockResults.creators.length +
      mockResults.brands.length +
      mockResults.invoices.length +
      mockResults.reports.length +
      mockResults.deals.length;

    setResults(mockResults);
    setIsSearching(false);
    setSelectedIndex(0);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, category);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, performSearch]);

  // Get all results as a flat array for keyboard navigation
  const getAllResults = useCallback((): SearchResult[] => {
    if (!results) return [];
    const allResults: SearchResult[] = [];

    if (category === 'all' || category === 'campaigns') allResults.push(...results.campaigns);
    if (category === 'all' || category === 'creators') allResults.push(...results.creators);
    if (category === 'all' || category === 'brands') allResults.push(...results.brands);
    if (category === 'all' || category === 'invoices') allResults.push(...results.invoices);
    if (category === 'all' || category === 'reports') allResults.push(...results.reports);
    if (category === 'all' || category === 'deals') allResults.push(...results.deals);

    return allResults;
  }, [results, category]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allResults = getAllResults();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (allResults[selectedIndex]) {
          navigateToResult(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        onOpenChange(false);
        break;
    }
  };

  // Navigate to a result
  const navigateToResult = (result: SearchResult) => {
    // Save to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }

    // Navigate based on result type
    let path = '/agency';
    switch (result.type) {
      case 'campaign':
        path = `/agency/campaigns/${result.id}`;
        break;
      case 'creator':
        path = `/agency/creators/${result.id}`;
        break;
      case 'brand':
        path = `/agency/brands/${result.id}`;
        break;
      case 'invoice':
        path = `/agency/finance/invoices/${result.id}`;
        break;
      case 'report':
        path = `/agency/reports/${result.id}`;
        break;
      case 'deal':
        path = `/agency/pipeline/${result.id}`;
        break;
    }

    onOpenChange(false);
    router.push(path);
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'campaign': return Megaphone;
      case 'creator': return Users;
      case 'brand': return Building2;
      case 'invoice': return Receipt;
      case 'report': return FileText;
      case 'deal': return GitBranch;
      default: return Search;
    }
  };

  // Get count for a category
  const getCategoryCount = (cat: SearchCategory) => {
    if (!results) return 0;
    switch (cat) {
      case 'all': return results.total_count;
      case 'campaigns': return results.campaigns.length;
      case 'creators': return results.creators.length;
      case 'brands': return results.brands.length;
      case 'invoices': return results.invoices.length;
      case 'reports': return results.reports.length;
      case 'deals': return results.deals.length;
      default: return 0;
    }
  };

  const allResults = getAllResults();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search campaigns, creators, brands..."
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Category Tabs */}
        {query && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            {categories.map((cat) => {
              const count = getCategoryCount(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    category === cat.key
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Results Area */}
        <div className="max-h-[400px] overflow-y-auto">
          {!query ? (
            // Recent Searches
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Searches</span>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                    {search}
                  </button>
                ))}
              </div>
              {recentSearches.length > 0 && (
                <button
                  onClick={() => setRecentSearches([])}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Clear recent searches
                </button>
              )}
            </div>
          ) : allResults.length === 0 && !isSearching ? (
            // No Results
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No results found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No matches for &quot;{query}&quot;
              </p>
              <div className="text-sm text-gray-500">
                <p className="mb-2">Try searching for:</p>
                <ul className="space-y-1">
                  <li>Campaign names</li>
                  <li>Creator usernames</li>
                  <li>Brand names</li>
                  <li>Invoice numbers</li>
                </ul>
              </div>
            </div>
          ) : (
            // Search Results
            <div className="p-2">
              {/* Campaigns */}
              {(category === 'all' || category === 'campaigns') && results?.campaigns.length! > 0 && (
                <ResultSection
                  title="Campaigns"
                  results={results!.campaigns}
                  selectedIndex={selectedIndex}
                  startIndex={0}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}

              {/* Creators */}
              {(category === 'all' || category === 'creators') && results?.creators.length! > 0 && (
                <ResultSection
                  title="Creators"
                  results={results!.creators}
                  selectedIndex={selectedIndex}
                  startIndex={(category === 'all' ? results?.campaigns.length : 0) || 0}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}

              {/* Brands */}
              {(category === 'all' || category === 'brands') && results?.brands.length! > 0 && (
                <ResultSection
                  title="Brands"
                  results={results!.brands}
                  selectedIndex={selectedIndex}
                  startIndex={(category === 'all' ? (results?.campaigns.length || 0) + (results?.creators.length || 0) : 0)}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}

              {/* Invoices */}
              {(category === 'all' || category === 'invoices') && results?.invoices.length! > 0 && (
                <ResultSection
                  title="Invoices"
                  results={results!.invoices}
                  selectedIndex={selectedIndex}
                  startIndex={(category === 'all' ? (results?.campaigns.length || 0) + (results?.creators.length || 0) + (results?.brands.length || 0) : 0)}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}

              {/* Reports */}
              {(category === 'all' || category === 'reports') && results?.reports.length! > 0 && (
                <ResultSection
                  title="Reports"
                  results={results!.reports}
                  selectedIndex={selectedIndex}
                  startIndex={(category === 'all' ? (results?.campaigns.length || 0) + (results?.creators.length || 0) + (results?.brands.length || 0) + (results?.invoices.length || 0) : 0)}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}

              {/* Deals */}
              {(category === 'all' || category === 'deals') && results?.deals.length! > 0 && (
                <ResultSection
                  title="Deals"
                  results={results!.deals}
                  selectedIndex={selectedIndex}
                  startIndex={(category === 'all' ? (results?.campaigns.length || 0) + (results?.creators.length || 0) + (results?.brands.length || 0) + (results?.invoices.length || 0) + (results?.reports.length || 0) : 0)}
                  onSelect={navigateToResult}
                  getIcon={getResultIcon}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                <ArrowRight className="h-3 w-3 -rotate-90" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                <ArrowRight className="h-3 w-3 rotate-90" />
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                Enter
              </kbd>
              Open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to search
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Result Section Component
interface ResultSectionProps {
  title: string;
  results: SearchResult[];
  selectedIndex: number;
  startIndex: number;
  onSelect: (result: SearchResult) => void;
  getIcon: (type: string) => React.ElementType;
}

function ResultSection({ title, results, selectedIndex, startIndex, onSelect, getIcon }: ResultSectionProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <span className="text-xs text-gray-400">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-0.5">
        {results.map((result, index) => {
          const Icon = getIcon(result.type);
          const isSelected = selectedIndex === startIndex + index;

          return (
            <button
              key={result.id}
              onClick={() => onSelect(result)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors',
                isSelected
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                result.avatar_url ? '' : 'bg-gray-100 dark:bg-gray-800'
              )}>
                {result.avatar_url ? (
                  <img src={result.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <Icon className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {result.title}
                  </span>
                  {result.status && (
                    <Badge variant="secondary" className="text-xs">
                      {result.status}
                    </Badge>
                  )}
                </div>
                {(result.subtitle || result.description) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {result.subtitle}
                    {result.description && ` - ${result.description}`}
                  </p>
                )}
              </div>
              {result.metadata?.value && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(result.metadata.value as number)}
                </span>
              )}
              {isSelected && (
                <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
