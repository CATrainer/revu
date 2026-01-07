'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Sparkles, DollarSign, Clock, Users, ChevronRight, Loader2, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTemplates, getAIRecommendations } from '@/lib/monetization-api';
import type { TemplateListItem, TemplateListResponse, AIRecommendation, AIRecommendationsResponse } from '@/types/monetization';
import { CATEGORY_INFO } from '@/types/monetization';

interface TemplateBrowserProps {
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateBrowser({ onSelectTemplate }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [creatorSummary, setCreatorSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    loadTemplates();
    loadRecommendations();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTemplates();
      setTemplates(data.templates);
      setCategories(data.categories);
    } catch (err) {
      setError('Failed to load templates. Please try again.');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      const data = await getAIRecommendations({ limit: 5 });
      setRecommendations(data.recommendations);
      setCreatorSummary(data.creator_summary);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      // Non-fatal - recommendations are optional
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.subcategory.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  const formatRevenue = (range: { low: number; high: number; unit: string }) => {
    const formatNum = (n: number) => {
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
      return `$${n}`;
    };
    return `${formatNum(range.low)} - ${formatNum(range.high)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadTemplates}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendations Section */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-bold text-primary-dark">Recommended For You</h2>
            </div>
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-sm text-secondary-dark hover:text-primary-dark"
            >
              Hide
            </button>
          </div>
          {creatorSummary && (
            <p className="text-sm text-secondary-dark mb-4">
              Based on your profile: {creatorSummary}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec) => (
              <RecommendationCard
                key={rec.template.id}
                recommendation={rec}
                onSelect={() => onSelectTemplate(rec.template.id)}
              />
            ))}
          </div>
          {recommendations.length > 3 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Show all recommendations by scrolling or expanding
                }}
              >
                View {recommendations.length - 3} more recommendations
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading state for recommendations */}
      {isLoadingRecs && recommendations.length === 0 && (
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-sm text-secondary-dark">Loading personalized recommendations...</span>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
            selectedCategory === 'all'
              ? 'bg-[var(--brand-primary)] text-white border-transparent shadow'
              : 'text-secondary-dark border-[var(--border)] hover:text-primary-dark hover:border-[var(--brand-primary)]'
          )}
        >
          All ({templates.length})
        </button>
        {Object.entries(CATEGORY_INFO).map(([key, info]) => {
          const count = categories[key] || 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors border flex items-center gap-2',
                selectedCategory === key
                  ? 'bg-[var(--brand-primary)] text-white border-transparent shadow'
                  : 'text-secondary-dark border-[var(--border)] hover:text-primary-dark hover:border-[var(--brand-primary)]'
              )}
            >
              <span>{info.icon}</span>
              <span>{info.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <p className="text-sm text-secondary-dark">
        Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
      </p>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary-dark">No templates found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => onSelectTemplate(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: TemplateListItem;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const categoryInfo = CATEGORY_INFO[template.category] || { icon: '📋', label: template.category, color: 'gray' };

  const formatRevenue = (range: { low: number; high: number; unit: string }) => {
    const formatNum = (n: number) => {
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
      return `$${n}`;
    };
    const unitLabel = range.unit.replace('per_', '/').replace('_', ' ');
    return `${formatNum(range.low)} - ${formatNum(range.high)} ${unitLabel}`;
  };

  return (
    <div
      className="dashboard-card h-full p-6 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer group"
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{categoryInfo.icon}</span>
            <Badge variant="secondary" className="text-xs">
              {template.subcategory.replace('_', ' ')}
            </Badge>
          </div>
          <h3 className="font-bold text-lg text-primary-dark group-hover:text-[var(--brand-primary)] transition-colors">
            {template.title}
          </h3>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
      </div>

      {/* Description */}
      <p className="text-secondary-dark text-sm mb-4 line-clamp-2 flex-1">
        {template.description}
      </p>

      {/* Metrics */}
      <div className="space-y-2 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-primary-dark font-medium">
            {formatRevenue(template.expected_revenue_range)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-secondary-dark">{template.expected_timeline}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-purple-600" />
          <span className="text-secondary-dark">
            {template.suitable_for.min_followers.toLocaleString()}+ followers
          </span>
        </div>
      </div>

      {/* Revenue Model Badge */}
      <div className="mt-4">
        <Badge
          className={cn(
            'text-xs',
            template.revenue_model === 'recurring'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : template.revenue_model === 'hybrid'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          )}
        >
          {template.revenue_model === 'recurring' ? '🔄 Recurring' : template.revenue_model === 'hybrid' ? '🔀 Hybrid' : '💰 One-time'}
        </Badge>
      </div>
    </div>
  );
}

// ==================== Recommendation Card ====================

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onSelect: () => void;
}

function RecommendationCard({ recommendation, onSelect }: RecommendationCardProps) {
  const { template, fit_score, fit_reasons, personalized_description, personalized_revenue } = recommendation;
  const categoryInfo = CATEGORY_INFO[template.category] || { icon: '📋', label: template.category, color: 'gray' };

  const formatRevenue = (range: { low: number; high: number; unit: string }) => {
    const formatNum = (n: number) => {
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
      return `$${n}`;
    };
    const unitLabel = range.unit.replace('per_', '/').replace('_', ' ');
    return `${formatNum(range.low)} - ${formatNum(range.high)} ${unitLabel}`;
  };

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/40';
    if (score >= 60) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/40';
    return 'text-orange-600 bg-orange-100 dark:bg-orange-900/40';
  };

  return (
    <div
      className="relative dashboard-card p-5 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-purple-100 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10"
      onClick={onSelect}
    >
      {/* Match Score Badge */}
      <div className="absolute -top-2 -right-2">
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1',
          getScoreColor(fit_score)
        )}>
          <TrendingUp className="h-3 w-3" />
          {Math.round(fit_score)}% match
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{categoryInfo.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-primary-dark group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1">
            {template.title}
          </h3>
          <Badge variant="secondary" className="text-xs mt-1">
            {template.subcategory.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Personalized Description */}
      {personalized_description && (
        <p className="text-sm text-secondary-dark mb-3 line-clamp-2">
          {personalized_description}
        </p>
      )}

      {/* Match Reasons */}
      {fit_reasons.length > 0 && (
        <div className="space-y-1 mb-3">
          {fit_reasons.slice(0, 2).map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400">
              <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Personalized Revenue */}
      <div className="pt-3 border-t border-[var(--border)]">
        {personalized_revenue ? (
          <div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-primary-dark font-bold">
                {formatRevenue(personalized_revenue)}
              </span>
            </div>
            <p className="text-xs text-secondary-dark mt-1">
              {personalized_revenue.note}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-primary-dark font-medium">
              {formatRevenue(template.expected_revenue_range)}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-3 flex items-center justify-end">
        <span className="text-xs text-[var(--brand-primary)] font-medium group-hover:underline flex items-center gap-1">
          Start this project <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

export default TemplateBrowser;
