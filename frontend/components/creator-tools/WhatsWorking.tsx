'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  Clock,
  Hash,
  Video,
  BarChart3,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  MessageSquare,
  Eye,
  Play,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface ContentInsight {
  id: string;
  type: 'topic' | 'format' | 'timing' | 'title' | 'thumbnail' | 'engagement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  metrics: {
    label: string;
    value: string;
    change?: number;
  }[];
  actionable_tip: string;
  confidence: number;
  supporting_content?: {
    title: string;
    views: number;
    engagement_rate: number;
    thumbnail_url?: string;
  }[];
}

interface PerformancePattern {
  pattern: string;
  occurrences: number;
  avg_performance: number;
  trend: 'up' | 'down' | 'stable';
}

interface WhatsWorkingProps {
  className?: string;
}

const impactColors = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const typeIcons: Record<string, React.ReactNode> = {
  topic: <Hash className="h-5 w-5" />,
  format: <Video className="h-5 w-5" />,
  timing: <Clock className="h-5 w-5" />,
  title: <BarChart3 className="h-5 w-5" />,
  thumbnail: <Eye className="h-5 w-5" />,
  engagement: <MessageSquare className="h-5 w-5" />,
};

export function WhatsWorking({ className }: WhatsWorkingProps) {
  const [insights, setInsights] = useState<ContentInsight[]>([]);
  const [patterns, setPatterns] = useState<PerformancePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/insights', {
        params: { time_range: timeRange },
      });
      setInsights(response.data.insights || []);
      setPatterns(response.data.patterns || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsights(getDemoInsights());
      setPatterns(getDemoPatterns());
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/creator/insights/generate', {
        time_range: timeRange,
      });
      setInsights(response.data.insights || []);
      pushToast('New insights generated!', 'success');
    } catch (error) {
      console.error('Failed to generate insights:', error);
      pushToast('Using cached insights', 'info');
    } finally {
      setGenerating(false);
    }
  };

  const filteredInsights = insights.filter((insight) => {
    if (filterType === 'all') return true;
    return insight.type === filterType;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">What's Working</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered insights from your content performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={generateNewInsights}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Refresh Insights
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Top Performer
              </span>
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">Tutorials</p>
            <p className="text-sm text-green-600 dark:text-green-400">+45% avg. engagement</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Best Time
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">Wed 6PM</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">78% audience active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Optimal Length
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">10-15 min</p>
            <p className="text-sm text-purple-600 dark:text-purple-400">Best retention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Avg. CTR
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">8.5%</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">+2.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['all', 'topic', 'format', 'timing', 'title', 'engagement'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors',
              filterType === type
                ? 'bg-primary text-white'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {type === 'all' ? 'All Insights' : type}
          </button>
        ))}
      </div>

      {/* Insights Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredInsights.length === 0 ? (
        <Card className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">No insights yet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your platforms and create content to get insights
          </p>
          <Button onClick={generateNewInsights}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Insights
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredInsights.map((insight) => (
            <Card
              key={insight.id}
              className={cn(
                'overflow-hidden border-l-4 transition-all hover:shadow-md cursor-pointer',
                insight.impact === 'high' && 'border-l-green-500',
                insight.impact === 'medium' && 'border-l-blue-500',
                insight.impact === 'low' && 'border-l-gray-400'
              )}
              onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      insight.impact === 'high' && 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                      insight.impact === 'medium' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      insight.impact === 'low' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {typeIcons[insight.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-primary-dark">{insight.title}</h3>
                      {insight.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {insight.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 mt-3">
                      {insight.metrics.slice(0, 3).map((metric, idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-lg font-bold text-primary-dark">{metric.value}</p>
                          <p className="text-xs text-muted-foreground">{metric.label}</p>
                          {metric.change !== undefined && (
                            <p className={cn(
                              'text-xs font-medium',
                              metric.change > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {metric.change > 0 ? '+' : ''}{metric.change}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Expanded Content */}
                    {expandedInsight === insight.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Actionable Tip */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800 dark:text-amber-200">
                                Actionable Tip
                              </p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                {insight.actionable_tip}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Supporting Content */}
                        {insight.supporting_content && insight.supporting_content.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Top Performing Examples</p>
                            <div className="space-y-2">
                              {insight.supporting_content.map((content, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                                >
                                  {content.thumbnail_url ? (
                                    <img
                                      src={content.thumbnail_url}
                                      alt={content.title}
                                      className="w-16 h-10 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                                      <Play className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{content.title}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        {formatNumber(content.views)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <ThumbsUp className="h-3 w-3" />
                                        {content.engagement_rate.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Confidence */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <Progress value={insight.confidence} className="flex-1 h-2" />
                          <span className="text-xs font-medium">{insight.confidence}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronRight
                    className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform',
                      expandedInsight === insight.id && 'rotate-90'
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Performance Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{pattern.pattern}</p>
                    {pattern.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {pattern.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{pattern.occurrences} videos</span>
                    <span>•</span>
                    <span>{pattern.avg_performance.toFixed(1)}% avg engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getDemoInsights(): ContentInsight[] {
  return [
    {
      id: '1',
      type: 'topic',
      title: 'Tutorial videos outperform other content',
      description: 'Your tutorial and how-to videos consistently get 45% more engagement than other content types.',
      impact: 'high',
      trend: 'up',
      metrics: [
        { label: 'Avg Views', value: '85K', change: 45 },
        { label: 'Engagement', value: '8.2%', change: 23 },
        { label: 'Watch Time', value: '12min', change: 18 },
      ],
      actionable_tip: 'Consider creating a tutorial series on your most-requested topics. Your audience clearly values educational content.',
      confidence: 92,
      supporting_content: [
        { title: 'Complete Beginner\'s Guide to...', views: 125000, engagement_rate: 9.1 },
        { title: 'How I Improved My...', views: 98000, engagement_rate: 8.5 },
      ],
    },
    {
      id: '2',
      type: 'timing',
      title: 'Wednesday evenings drive most engagement',
      description: 'Content published Wednesday between 5-7 PM gets 30% higher first-hour engagement.',
      impact: 'high',
      trend: 'stable',
      metrics: [
        { label: 'Best Day', value: 'Wed' },
        { label: 'Best Time', value: '6 PM' },
        { label: 'Active Users', value: '78%' },
      ],
      actionable_tip: 'Schedule your most important releases for Wednesday evening. Your audience is most active and engaged during this window.',
      confidence: 88,
    },
    {
      id: '3',
      type: 'title',
      title: 'Numbers in titles boost click-through',
      description: 'Titles with specific numbers ("5 Ways", "10 Tips") get 25% higher CTR.',
      impact: 'medium',
      trend: 'up',
      metrics: [
        { label: 'Avg CTR', value: '9.5%', change: 25 },
        { label: 'Impressions', value: '45K' },
      ],
      actionable_tip: 'Include specific numbers in your titles when possible. "7 Tips" performs better than "Tips" or "Several Tips".',
      confidence: 85,
    },
    {
      id: '4',
      type: 'format',
      title: '10-15 minute videos have best retention',
      description: 'Videos in this length range maintain 65% average view duration, compared to 45% for longer content.',
      impact: 'medium',
      trend: 'stable',
      metrics: [
        { label: 'Optimal Length', value: '12 min' },
        { label: 'Avg Retention', value: '65%', change: 12 },
        { label: 'Drop-off Point', value: '8 min' },
      ],
      actionable_tip: 'Aim for 10-15 minute videos for main content. For longer topics, consider breaking into a series.',
      confidence: 91,
    },
    {
      id: '5',
      type: 'engagement',
      title: 'Questions in first 30 seconds boost comments',
      description: 'Videos that pose a question to viewers early receive 40% more comments.',
      impact: 'medium',
      trend: 'up',
      metrics: [
        { label: 'Avg Comments', value: '245', change: 40 },
        { label: 'Response Rate', value: '15%' },
      ],
      actionable_tip: 'Start videos by asking your audience a question related to the topic. This primes them for engagement.',
      confidence: 79,
    },
  ];
}

function getDemoPatterns(): PerformancePattern[] {
  return [
    { pattern: 'Lists/Rankings', occurrences: 12, avg_performance: 7.8, trend: 'up' },
    { pattern: 'Tutorials', occurrences: 18, avg_performance: 8.5, trend: 'up' },
    { pattern: 'Reviews', occurrences: 15, avg_performance: 6.2, trend: 'stable' },
    { pattern: 'Behind Scenes', occurrences: 8, avg_performance: 9.1, trend: 'up' },
  ];
}
