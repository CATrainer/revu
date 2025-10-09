"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  Target,
  AlertCircle,
  ThumbsUp,
  Calendar,
} from "lucide-react"
import Link from "next/link"

interface ContentPerformance {
  id: string
  views: number
  impressions: number
  likes: number
  comments_count: number
  shares: number
  saves: number
  watch_time_minutes: number
  average_view_duration_seconds: number
  retention_rate: number
  engagement_rate: number
  click_through_rate: number
  followers_gained: number
  profile_visits: number
  performance_score: number
  percentile_rank: number
  performance_category: string
  views_last_24h: number
  engagement_last_24h: number
}

interface ContentInsight {
  id: string
  insight_type: string
  category: string
  title: string
  description: string
  impact_level: string
  is_positive: boolean
  supporting_data: any
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
  summary: string
  performance: ContentPerformance
  insights: ContentInsight[]
}

export default function ContentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<ContentPiece | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchContentDetails()
    }
  }, [params.id])

  const fetchContentDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/insights/content/${params.id}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setContent(data)
      }
    } catch (error) {
      console.error('Failed to fetch content details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceBadge = (category: string) => {
    switch (category) {
      case 'overperforming':
        return <Badge className="bg-green-500">Overperforming</Badge>
      case 'underperforming':
        return <Badge variant="destructive">Underperforming</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  const getImpactIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <span className="text-red-500 text-xl">●</span>
      case 'medium':
        return <span className="text-yellow-500 text-xl">●</span>
      default:
        return <span className="text-blue-500 text-xl">●</span>
    }
  }

  const groupInsightsByCategory = () => {
    if (!content?.insights) return {}
    
    const successFactors = content.insights.filter(i => i.is_positive)
    const failureFactors = content.insights.filter(i => !i.is_positive)
    
    return {
      success: successFactors,
      failure: failureFactors,
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Content Not Found</h3>
          <Button asChild>
            <Link href="/insights">Back to Insights</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const { success, failure } = groupInsightsByCategory()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">{content.platform}</Badge>
            <Badge variant="outline">{content.content_type}</Badge>
            {getPerformanceBadge(content.performance.performance_category)}
          </div>
          <h1 className="text-2xl font-bold">{content.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Published {new Date(content.published_at).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={content.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Original
            </a>
          </Button>
          <Button onClick={() => setChatOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI About This
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail and Summary */}
          <Card>
            <CardContent className="p-6">
              <img
                src={content.thumbnail_url || '/placeholder.png'}
                alt={content.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              {content.summary && (
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">{content.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
              <CardDescription>Complete performance breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Views</span>
                  </div>
                  <div className="text-2xl font-bold">{content.performance.views.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {content.performance.impressions.toLocaleString()} impressions
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">Likes</span>
                  </div>
                  <div className="text-2xl font-bold">{content.performance.likes.toLocaleString()}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">Comments</span>
                  </div>
                  <div className="text-2xl font-bold">{content.performance.comments_count.toLocaleString()}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">Shares</span>
                  </div>
                  <div className="text-2xl font-bold">{content.performance.shares.toLocaleString()}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Engagement Rate</div>
                  <div className="text-xl font-bold">{content.performance.engagement_rate.toFixed(2)}%</div>
                  <Progress value={Math.min(content.performance.engagement_rate * 10, 100)} className="mt-2" />
                </div>

                {content.performance.retention_rate && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Retention Rate</div>
                    <div className="text-xl font-bold">{content.performance.retention_rate.toFixed(1)}%</div>
                    <Progress value={content.performance.retention_rate} className="mt-2" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Followers Gained</span>
                  </div>
                  <div className="text-xl font-bold">{content.performance.followers_gained.toLocaleString()}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Profile Visits</span>
                  </div>
                  <div className="text-xl font-bold">{content.performance.profile_visits.toLocaleString()}</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-2">Recent Velocity (Last 24h)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm">Views</div>
                    <div className="font-semibold">{content.performance.views_last_24h.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm">Engagement</div>
                    <div className="font-semibold">{content.performance.engagement_last_24h.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why It Worked / What Went Wrong */}
          {success.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                  Why It Worked
                </CardTitle>
                <CardDescription>Factors that contributed to success</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {success.map((insight) => (
                  <div key={insight.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getImpactIcon(insight.impact_level)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {insight.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.impact_level} impact
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {failure.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Areas for Improvement
                </CardTitle>
                <CardDescription>Factors that limited performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {failure.map((insight) => (
                  <div key={insight.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getImpactIcon(insight.impact_level)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {insight.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.impact_level} impact
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Score */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {content.performance.performance_score.toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground mb-4">out of 100</div>
                <Progress value={content.performance.performance_score} className="mb-4" />
                <div className="text-sm">
                  Top <span className="font-semibold">{100 - content.performance.percentile_rank}%</span> of your content
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={() => setChatOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Make More Like This
              </Button>
              <Button variant="outline" className="w-full">
                <Target className="h-4 w-4 mr-2" />
                Compare to Similar Content
              </Button>
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Create Action Plan
              </Button>
            </CardContent>
          </Card>

          {/* Context Info */}
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Theme</span>
                <Badge variant="secondary">{content.theme || 'General'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium capitalize">{content.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{content.content_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published</span>
                <span className="font-medium">
                  {new Date(content.published_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
