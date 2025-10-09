"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Sparkles,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react"
import Link from "next/link"

interface ActionItem {
  id: string
  title: string
  description: string
  order_index: number
  due_date: string | null
  estimated_hours: number | null
  is_completed: boolean
  completed_at: string | null
  projected_outcome: string | null
  actual_outcome: string | null
  notes: string | null
}

interface ActionPlan {
  id: string
  name: string
  description: string
  goal: string
  status: string
  progress_percentage: number
  total_items: number
  completed_items: number
  upcoming_items: number
  next_action_due: string | null
  created_at: string
}

interface ActionPlanDetail extends ActionPlan {
  source_type: string
  source_content_id: string | null
  start_date: string
  end_date: string | null
  estimated_duration_days: number | null
  projected_outcomes: any
  actual_outcomes: any
  completion_notes: string | null
  action_items: ActionItem[]
}

export default function ActionPlansPage() {
  const [plans, setPlans] = useState<ActionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<ActionPlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    fetchPlans()
  }, [activeTab])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== "all") {
        params.append("status", activeTab)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/action-plans?${params}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Failed to fetch action plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanDetails = async (planId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/action-plans/${planId}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setSelectedPlan(data)
        setDetailsOpen(true)
      }
    } catch (error) {
      console.error('Failed to fetch plan details:', error)
    }
  }

  const toggleActionItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const endpoint = isCompleted ? 'uncomplete' : 'complete'
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/action-items/${itemId}/${endpoint}`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      )

      if (response.ok) {
        // Refresh plan details
        if (selectedPlan) {
          await fetchPlanDetails(selectedPlan.id)
        }
        // Refresh plans list
        await fetchPlans()
      }
    } catch (error) {
      console.error('Failed to toggle action item:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">Active</Badge>
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getDueDateColor = (dueDate: string | null) => {
    const days = getDaysUntilDue(dueDate)
    if (days === null) return 'text-muted-foreground'
    if (days < 0) return 'text-red-500'
    if (days <= 3) return 'text-orange-500'
    if (days <= 7) return 'text-yellow-600'
    return 'text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Action Plans</h1>
          <p className="text-muted-foreground">
            Track your goals and execute on insights
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Action Plan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Plans</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {plans.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Action Plans Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create action plans from your insights or AI conversations to track your progress.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <Link href="/insights">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Explore Insights
                  </Link>
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Plan
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => fetchPlanDetails(plan.id)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(plan.status)}
                          {plan.next_action_due && (
                            <Badge variant="outline" className={getDueDateColor(plan.next_action_due)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {getDaysUntilDue(plan.next_action_due) !== null && (
                                getDaysUntilDue(plan.next_action_due)! < 0
                                  ? `${Math.abs(getDaysUntilDue(plan.next_action_due)!)} days overdue`
                                  : getDaysUntilDue(plan.next_action_due) === 0
                                  ? 'Due today'
                                  : `${getDaysUntilDue(plan.next_action_due)} days left`
                              )}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mb-1">{plan.name}</CardTitle>
                        <CardDescription>{plan.goal}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{plan.progress_percentage}%</div>
                        <div className="text-xs text-muted-foreground">Complete</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={plan.progress_percentage} className="h-2" />
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Completed</span>
                          </div>
                          <div className="font-semibold">{plan.completed_items} / {plan.total_items}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Circle className="h-3 w-3" />
                            <span>Upcoming</span>
                          </div>
                          <div className="font-semibold">{plan.upcoming_items}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created</span>
                          </div>
                          <div className="font-semibold">
                            {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation()
                          fetchPlanDetails(plan.id)
                        }}>
                          View Full Plan
                        </Button>
                        {plan.status === 'active' && plan.upcoming_items > 0 && (
                          <Button size="sm" variant="secondary">
                            <Target className="h-4 w-4 mr-1" />
                            Next Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(selectedPlan.status)}
                    </div>
                    <DialogTitle className="text-2xl">{selectedPlan.name}</DialogTitle>
                    <DialogDescription className="mt-2">{selectedPlan.goal}</DialogDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{selectedPlan.progress_percentage}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <Progress value={selectedPlan.progress_percentage} className="h-3" />

                {selectedPlan.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {new Date(selectedPlan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Source</div>
                    <div className="font-medium capitalize">{selectedPlan.source_type.replace('_', ' ')}</div>
                  </div>
                  {selectedPlan.estimated_duration_days && (
                    <div>
                      <div className="text-muted-foreground">Duration</div>
                      <div className="font-medium">{selectedPlan.estimated_duration_days} days</div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Action Items ({selectedPlan.completed_items}/{selectedPlan.total_items})
                  </h4>
                  <div className="space-y-3">
                    {selectedPlan.action_items.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 ${
                          item.is_completed ? 'bg-muted/50' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.is_completed}
                            onCheckedChange={() => toggleActionItem(item.id, item.is_completed)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h5 className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.title}
                            </h5>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.due_date && (
                                <Badge variant="outline" className={getDueDateColor(item.due_date)}>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(item.due_date).toLocaleDateString()}
                                </Badge>
                              )}
                              {item.estimated_hours && (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.estimated_hours}h
                                </Badge>
                              )}
                              {item.is_completed && item.completed_at && (
                                <Badge className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed {new Date(item.completed_at).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                            {item.projected_outcome && (
                              <div className="mt-2 text-sm">
                                <span className="text-muted-foreground">Expected: </span>
                                <span>{item.projected_outcome}</span>
                              </div>
                            )}
                            {item.actual_outcome && (
                              <div className="mt-1 text-sm">
                                <span className="text-muted-foreground">Actual: </span>
                                <span className="font-medium">{item.actual_outcome}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPlan.projected_outcomes && (
                  <div>
                    <h4 className="font-semibold mb-2">Projected Outcomes</h4>
                    <div className="text-sm text-muted-foreground">
                      {JSON.stringify(selectedPlan.projected_outcomes, null, 2)}
                    </div>
                  </div>
                )}

                {selectedPlan.status === 'completed' && selectedPlan.completion_notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Completion Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedPlan.completion_notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Plan
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Chat with AI
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
