"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Target,
  AlertCircle,
  BarChart3,
  Youtube,
  Instagram,
  Play,
} from "lucide-react"
import Link from "next/link"

interface ContentPerformance {
  id: string
  views: number
  likes: number
  comments_count: number
  shares: number
  engagement_rate: number
  performance_score: number
  percentile_rank: number
  performance_category: string
}

interface ContentInsight {
  id: string
  insight_type: string
  category: string
  title: string
  description: string
  impact_level: string
  is_positive: boolean
}

interface ContentPiece {
  id: string
  platform: string
  content_type: string
  title: string
  url: string
  thumbnail_url: string
  published_at: string
  theme: string
  performance: ContentPerformance
  insights: ContentInsight[]
}

interface DashboardSummary {
  total_content: number
  overperforming_count: number
  normal_count: number
  underperforming_count: number
  avg_engagement_rate: number
  total_views: number
  total_reach: number
  engagement_trend: string
}

interface ThemePerformance {
  id: string
  name: string
  description: string
  content_count: number
  avg_engagement_rate: number
  avg_performance_score: number
  total_views: number
}

interface PlatformComparison {
  platform: string
  content_count: number
  avg_engagement_rate: number
  total_views: number
  avg_performance_score: number
}

interface InsightsDashboardData {
  summary: DashboardSummary
  top_performers: ContentPiece[]
  needs_attention: ContentPiece[]
  top_themes: ThemePerformance[]
  platform_comparison: PlatformComparison[]
}

export default function InsightsDashboardPage() {
  const [data, setData] = useState<InsightsDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState("30d")
  const [platformFilter, setPlatformFilter] = useState("all")

  useEffect(() => {
    fetchDashboardData()
  }, [timePeriod, platformFilter])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        time_period: timePeriod,
        platform_filter: platformFilter,
      })

      const url = `${process.env.NEXT_PUBLIC_API_URL}/insights/dashboard?${params}`
      console.log('🔍 Fetching insights from:', url)

      const response = await fetch(url, {
        credentials: 'include',
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Insights data received:', result)
        setData(result)
      } else {
        const errorText = await response.text()
        console.error('❌ Insights API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />
      case 'instagram':
        return <Instagram className="h-4 w-4" />
      case 'tiktok':
        return <Play className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getPerformanceBadge = (category: string) => {
    switch (category) {
      case 'overperforming':
        return <Badge variant="success">Overperforming</Badge>
      case 'underperforming':
        return <Badge variant="destructive">Needs Attention</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      default:
        return 'text-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="glass-panel rounded-3xl p-12 border border-holo-teal/30 shadow-glow-teal backdrop-blur-md max-w-md text-center">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-holo-teal/20 to-holo-blue/20 inline-block mb-6">
            <AlertCircle className="h-16 w-16 text-holo-teal" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-holo-teal">No Data Available</h3>
          <p className="text-muted-foreground mb-6 text-base">
            Enable demo mode or connect your social accounts to see insights.
          </p>
          <Button asChild size="lg">
            <Link href="/settings">Get Started</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header - Gradient */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-holo-purple">What's Working</h1>
          <p className="text-muted-foreground text-lg font-medium mt-2">
            Understand your content performance and discover what resonates with your audience
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
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
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_content}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.overperforming_count} overperforming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            {getTrendIcon(data.summary.engagement_trend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avg_engagement_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.engagement_trend === 'up' ? 'Trending up' : data.summary.engagement_trend === 'down' ? 'Trending down' : 'Stable'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_views.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.total_reach.toLocaleString()} impressions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance Distribution</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-green-600">{data.summary.overperforming_count}</div>
                <div className="text-xs text-muted-foreground">Great</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold">{data.summary.normal_count}</div>
                <div className="text-xs text-muted-foreground">Normal</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold text-red-600">{data.summary.underperforming_count}</div>
                <div className="text-xs text-muted-foreground">Poor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top-performers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="needs-attention">Needs Attention</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="platforms">Platform Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="top-performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Best Performing Content</CardTitle>
              <CardDescription>
                Learn from what worked and replicate your success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.top_performers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No top performers yet. Keep creating!
                </p>
              ) : (
                data.top_performers.map((content) => (
                  <Card key={content.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-4 p-4">
                      <img
                        src={content.thumbnail_url || '/placeholder.png'}
                        alt={content.title}
                        className="w-full md:w-48 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getPlatformIcon(content.platform)}
                              <Badge variant="outline" className="text-xs">
                                {content.content_type}
                              </Badge>
                              {getPerformanceBadge(content.performance.performance_category)}
                            </div>
                            <h3 className="font-semibold line-clamp-2">{content.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(content.published_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{content.performance.performance_score.toFixed(0)}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs">Views</span>
                            </div>
                            <div className="font-semibold">{content.performance.views.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Heart className="h-3 w-3" />
                              <span className="text-xs">Likes</span>
                            </div>
                            <div className="font-semibold">{content.performance.likes.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MessageCircle className="h-3 w-3" />
                              <span className="text-xs">Comments</span>
                            </div>
                            <div className="font-semibold">{content.performance.comments_count.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-xs">Engagement</span>
                            </div>
                            <div className="font-semibold">{content.performance.engagement_rate.toFixed(1)}%</div>
                          </div>
                        </div>

                        {content.insights.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium flex items-center gap-1">
                              <Sparkles className="h-4 w-4" />
                              Why it worked:
                            </div>
                            <div className="space-y-1">
                              {content.insights.slice(0, 3).map((insight) => (
                                <div key={insight.id} className="flex items-start gap-2 text-sm">
                                  <span className={`font-bold ${getImpactColor(insight.impact_level)}`}>•</span>
                                  <span className="text-muted-foreground">{insight.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/insights/content/${content.id}`}>
                              View Full Details
                            </Link>
                          </Button>
                          <Button size="sm">
                            <Sparkles className="h-4 w-4 mr-1" />
                            Make More Like This
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="needs-attention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content That Needs Attention</CardTitle>
              <CardDescription>
                Understand what didn't work and improve your strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.needs_attention.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Great! No underperforming content.
                </p>
              ) : (
                data.needs_attention.map((content) => (
                  <Card key={content.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getPlatformIcon(content.platform)}
                          {getPerformanceBadge(content.performance.performance_category)}
                        </div>
                        <h3 className="font-semibold line-clamp-2">{content.title}</h3>
                      </div>
                    </div>

                    {content.insights.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          What went wrong:
                        </div>
                        <div className="space-y-1">
                          {content.insights.map((insight) => (
                            <div key={insight.id} className="flex items-start gap-2 text-sm">
                              <span className="text-red-500">•</span>
                              <span className="text-muted-foreground">{insight.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/insights/content/${content.id}`}>
                          View Details
                        </Link>
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Sparkles className="h-4 w-4 mr-1" />
                        Diagnose with AI
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.top_themes.map((theme) => (
              <Card key={theme.id}>
                <CardHeader>
                  <CardTitle>{theme.name}</CardTitle>
                  <CardDescription>{theme.description || `${theme.content_count} pieces of content`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Engagement</span>
                      <span className="font-semibold">{theme.avg_engagement_rate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Performance Score</span>
                      <span className="font-semibold">{theme.avg_performance_score?.toFixed(0) || 0}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Views</span>
                      <span className="font-semibold">{theme.total_views.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Explore {theme.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {data.platform_comparison.map((platform) => (
              <Card key={platform.platform}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(platform.platform)}
                    <CardTitle className="capitalize">{platform.platform}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-3xl font-bold">{platform.avg_engagement_rate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Avg Engagement</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Content</span>
                      <span className="font-semibold">{platform.content_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Views</span>
                      <span className="font-semibold">{platform.total_views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Score</span>
                      <span className="font-semibold">{platform.avg_performance_score.toFixed(0)}/100</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
