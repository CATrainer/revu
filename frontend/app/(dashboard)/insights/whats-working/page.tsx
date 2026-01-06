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
import { api } from '@/lib/api';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Youtube,
  Instagram,
  Play,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Trophy,
  Target,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ContentAnalysis {
  why_summary: string;
  key_factors: string[];
  recommendations: string[];
  content_type_insight?: string;
  timing_insight?: string;
}

interface ContentItem {
  id: string;
  platform: string;
  content_type: string;
  title: string;
  url: string;
  thumbnail_url?: string;
  published_at: string;
  theme?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  performance_score: number;
  views_vs_average: number;
  engagement_vs_average: number;
  analysis?: ContentAnalysis;
  has_analysis: boolean;
}

interface TrendPattern {
  pattern: string;
  frequency: string;
  impact: string;
}

interface TrendsSummary {
  summary: string;
  patterns: TrendPattern[];
  top_recommendation: string;
  quick_wins: string[];
}

interface PerformersData {
  trends_summary: TrendsSummary;
  content: ContentItem[];
  total_count: number;
  user_avg_engagement: number;
  user_avg_views: number;
  period_start: string;
  period_end: string;
}

export default function WhatsWorkingPage() {
  const router = useRouter();
  const [data, setData] = useState<PerformersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('90d');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, generate_analysis: 'true' });
      const response = await api.get(`/insights/v2/whats-working?${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'tiktok':
        return <Play className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleMakeMoreLikeThis = (content: ContentItem) => {
    const prompt = encodeURIComponent(
      `I want to create more content like my successful "${content.title}" which got ${content.views.toLocaleString()} views and ${content.engagement_rate.toFixed(1)}% engagement (${content.engagement_vs_average}x my average). ` +
      `${content.analysis?.why_summary || ''} ` +
      `Give me 3-5 specific content ideas that would replicate this success.`
    );
    router.push(`/ai-assistant?prompt=${prompt}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md text-center p-8">
          <Trophy className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Top Performers Yet</h3>
          <p className="text-muted-foreground mb-4">
            Keep creating content! Once you have content performing above your average, it will appear here with AI analysis.
          </p>
          <Button asChild variant="outline">
            <Link href="/insights">Back to Overview</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">What's Working</h1>
              <p className="text-muted-foreground">
                {data.total_count} pieces performing above your average
              </p>
            </div>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trends Summary Card */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-emerald-900 dark:text-emerald-100">Success Patterns</CardTitle>
          </div>
          <CardDescription className="text-emerald-700 dark:text-emerald-300">
            AI-identified patterns across your top performing content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <p className="text-emerald-900 dark:text-emerald-100 leading-relaxed">
            {data.trends_summary.summary}
          </p>

          {/* Patterns */}
          {data.trends_summary.patterns.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {data.trends_summary.patterns.map((pattern, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-emerald-200 dark:border-emerald-800"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-emerald-900 dark:text-emerald-100">{pattern.pattern}</div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      {pattern.frequency} • {pattern.impact} impact
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Recommendation */}
          <div className="p-4 rounded-lg bg-emerald-600 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5" />
              <span className="font-semibold">Top Recommendation</span>
            </div>
            <p>{data.trends_summary.top_recommendation}</p>
          </div>

          {/* Quick Wins */}
          {data.trends_summary.quick_wins.length > 0 && (
            <div>
              <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Wins
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.trends_summary.quick_wins.map((win, i) => (
                  <Badge key={i} variant="secondary" className="bg-white/60 dark:bg-black/20 text-emerald-800 dark:text-emerald-200">
                    {win}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Baseline Context */}
      <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Your averages:</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{data.user_avg_engagement.toFixed(1)}%</span>
          <span className="text-muted-foreground"> engagement</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{formatNumber(data.user_avg_views)}</span>
          <span className="text-muted-foreground"> views</span>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {data.content.map((content, index) => (
          <Card 
            key={content.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Thumbnail */}
              <div className="lg:w-64 shrink-0">
                <div className="relative h-48 lg:h-full">
                  {content.thumbnail_url ? (
                    <img
                      src={content.thumbnail_url}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      {getPlatformIcon(content.platform)}
                    </div>
                  )}
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-sm font-bold">
                    <Trophy className="h-3.5 w-3.5" />
                    #{index + 1}
                  </div>
                  {/* Performance multiplier */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 text-white text-sm font-bold">
                    {content.engagement_vs_average}x avg
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPlatformIcon(content.platform)}
                      <Badge variant="outline" className="text-xs">
                        {content.content_type}
                      </Badge>
                      {content.theme && (
                        <Badge variant="secondary" className="text-xs">
                          {content.theme}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-1">{content.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(content.published_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">{content.performance_score.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Performance Score</div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-4 p-3 rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Eye className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-semibold">{formatNumber(content.views)}</div>
                    <div className="text-xs text-muted-foreground">views</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Heart className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-semibold">{formatNumber(content.likes)}</div>
                    <div className="text-xs text-muted-foreground">likes</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-semibold">{formatNumber(content.comments)}</div>
                    <div className="text-xs text-muted-foreground">comments</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-semibold text-emerald-600">{content.engagement_rate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">engagement</div>
                  </div>
                </div>

                {/* AI Analysis */}
                {content.analysis && (
                  <div className="space-y-4">
                    {/* Why it worked */}
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-emerald-900 dark:text-emerald-100">Why it worked</span>
                      </div>
                      <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                        {content.analysis.why_summary}
                      </p>
                    </div>

                    {/* Key Factors */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Success Factors</h4>
                      <div className="flex flex-wrap gap-2">
                        {content.analysis.key_factors.map((factor, i) => (
                          <div 
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {expandedId === content.id && content.analysis.recommendations.length > 0 && (
                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {content.analysis.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ArrowUpRight className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setExpandedId(expandedId === content.id ? null : content.id)}
                  >
                    {expandedId === content.id ? 'Show Less' : 'Show More'}
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleMakeMoreLikeThis(content)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Make More Like This
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={content.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Original
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
