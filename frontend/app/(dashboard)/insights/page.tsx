'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  BarChart3,
  Target,
  Youtube,
  Instagram,
  Play,
  Sparkles,
  Info,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface MetricWithChange {
  value: number;
  previous_value: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceDistribution {
  top_performers: number;
  average: number;
  underperformers: number;
  top_performers_percent: number;
  average_percent: number;
  underperformers_percent: number;
}

interface PlatformMetrics {
  platform: string;
  platform_display: string;
  content_count: number;
  total_views: number;
  avg_engagement_rate: number;
  avg_views_per_content: number;
  top_performer_count: number;
}

interface ThemeMetrics {
  theme: string;
  content_count: number;
  avg_engagement_rate: number;
  total_views: number;
}

interface OverviewData {
  total_content: MetricWithChange;
  avg_engagement_rate: MetricWithChange;
  total_views: MetricWithChange;
  total_interactions: MetricWithChange;
  performance_distribution: PerformanceDistribution;
  platforms: PlatformMetrics[];
  top_themes: ThemeMetrics[];
  period_start: string;
  period_end: string;
  period_label: string;
}

export default function InsightsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    fetchData();
  }, [period, platform]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (platform !== 'all') params.append('platform', platform);
      
      const response = await api.get(`/insights/v2/overview?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string, change: number) => {
    if (trend === 'up') return 'text-emerald-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-5 w-5 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-500" />;
      case 'tiktok':
        return <Play className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md text-center p-8">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
          <p className="text-muted-foreground mb-4">
            Enable demo mode or connect your social accounts to see insights.
          </p>
          <Button asChild>
            <Link href="/settings">Get Started</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const dist = data.performance_distribution;
  const totalCategorized = dist.top_performers + dist.average + dist.underperformers;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Insights</h1>
            <p className="text-muted-foreground mt-1">
              {data.period_label} • {data.total_content.value} pieces of content analyzed
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Content */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of posts/videos published in the selected period</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.total_content.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(data.total_content.trend)}
                <span className={`text-sm ${getTrendColor(data.total_content.trend, data.total_content.change_percent)}`}>
                  {data.total_content.change_percent > 0 ? '+' : ''}{data.total_content.change_percent}%
                </span>
                <span className="text-xs text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          </Card>

          {/* Avg Engagement */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">(Likes + Comments) ÷ Views × 100, averaged across all content</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.avg_engagement_rate.value.toFixed(1)}%</div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(data.avg_engagement_rate.trend)}
                <span className={`text-sm ${getTrendColor(data.avg_engagement_rate.trend, data.avg_engagement_rate.change_percent)}`}>
                  {data.avg_engagement_rate.change_percent > 0 ? '+' : ''}{data.avg_engagement_rate.change_percent}%
                </span>
                <span className="text-xs text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
          </Card>

          {/* Total Views */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Sum of views across all content in the period</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(data.total_views.value)}</div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(data.total_views.trend)}
                <span className={`text-sm ${getTrendColor(data.total_views.trend, data.total_views.change_percent)}`}>
                  {data.total_views.change_percent > 0 ? '+' : ''}{data.total_views.change_percent}%
                </span>
                <span className="text-xs text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          </Card>

          {/* Total Interactions */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Total likes + comments + shares across all content</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatNumber(data.total_interactions.value)}</div>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(data.total_interactions.trend)}
                <span className={`text-sm ${getTrendColor(data.total_interactions.trend, data.total_interactions.change_percent)}`}>
                  {data.total_interactions.change_percent > 0 ? '+' : ''}{data.total_interactions.change_percent}%
                </span>
                <span className="text-xs text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          </Card>
        </div>

        {/* Performance Distribution & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Distribution</CardTitle>
                  <CardDescription>How your content is performing relative to your average</CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p><strong>Top Performers:</strong> 1.5x+ your average engagement</p>
                    <p><strong>Average:</strong> Between 0.5x and 1.5x</p>
                    <p><strong>Underperformers:</strong> Below 0.5x your average</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {totalCategorized > 0 ? (
                <div className="space-y-6">
                  {/* Visual bar */}
                  <div className="h-8 rounded-full overflow-hidden flex bg-muted">
                    {dist.top_performers > 0 && (
                      <div 
                        className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${dist.top_performers_percent}%` }}
                      >
                        {dist.top_performers_percent > 10 && `${dist.top_performers_percent.toFixed(0)}%`}
                      </div>
                    )}
                    {dist.average > 0 && (
                      <div 
                        className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${dist.average_percent}%` }}
                      >
                        {dist.average_percent > 10 && `${dist.average_percent.toFixed(0)}%`}
                      </div>
                    )}
                    {dist.underperformers > 0 && (
                      <div 
                        className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${dist.underperformers_percent}%` }}
                      >
                        {dist.underperformers_percent > 10 && `${dist.underperformers_percent.toFixed(0)}%`}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-3xl font-bold text-emerald-600">{dist.top_performers}</div>
                      <div className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Top Performers</div>
                      <div className="text-xs text-muted-foreground mt-1">1.5x+ engagement</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="text-3xl font-bold text-blue-600">{dist.average}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">Average</div>
                      <div className="text-xs text-muted-foreground mt-1">On track</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="text-3xl font-bold text-amber-600">{dist.underperformers}</div>
                      <div className="text-sm text-amber-700 dark:text-amber-400 font-medium">Needs Attention</div>
                      <div className="text-xs text-muted-foreground mt-1">Below 0.5x</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Not enough data to show distribution</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Dive deeper into your performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/insights/whats-working" className="block">
                <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="font-medium text-emerald-900 dark:text-emerald-100">What's Working</div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400">
                          {dist.top_performers} top performers
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              <Link href="/insights/whats-not-working" className="block">
                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-5 w-5 text-amber-600" />
                      <div>
                        <div className="font-medium text-amber-900 dark:text-amber-100">What's Not Working</div>
                        <div className="text-xs text-amber-700 dark:text-amber-400">
                          {dist.underperformers} need attention
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              <Link href="/ai-assistant" className="block">
                <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Ask AI Assistant</div>
                        <div className="text-xs text-muted-foreground">Get personalized advice</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Platform Comparison & Top Themes */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Platform Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Comparison</CardTitle>
              <CardDescription>Performance breakdown by platform</CardDescription>
            </CardHeader>
            <CardContent>
              {data.platforms.length > 0 ? (
                <div className="space-y-4">
                  {data.platforms.map((p) => (
                    <div key={p.platform} className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getPlatformIcon(p.platform)}
                          <div>
                            <div className="font-medium">{p.platform_display}</div>
                            <div className="text-xs text-muted-foreground">{p.content_count} pieces</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-emerald-600">
                          {p.top_performer_count} hits
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Engagement</div>
                          <div className="font-semibold">{p.avg_engagement_rate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Total Views</div>
                          <div className="font-semibold">{formatNumber(p.total_views)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Avg Views</div>
                          <div className="font-semibold">{formatNumber(p.avg_views_per_content)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No platform data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Themes */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Themes</CardTitle>
              <CardDescription>Content topics ranked by engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {data.top_themes.length > 0 ? (
                <div className="space-y-3">
                  {data.top_themes.map((theme, index) => (
                    <div 
                      key={theme.theme} 
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{theme.theme}</div>
                        <div className="text-xs text-muted-foreground">
                          {theme.content_count} pieces • {formatNumber(theme.total_views)} views
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-emerald-600">{theme.avg_engagement_rate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">engagement</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No theme data available yet</p>
                  <p className="text-xs mt-1">Themes are identified by AI analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
