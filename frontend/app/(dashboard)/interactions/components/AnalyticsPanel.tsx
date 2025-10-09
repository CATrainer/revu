'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Users, Zap, Clock, Activity, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnalyticsPanelProps {
  onClose: () => void;
}

export function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const [timeRange, setTimeRange] = useState('30');
  const [overview, setOverview] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, workflowsRes] = await Promise.all([
        api.get(`/analytics/overview?days=${timeRange}`),
        api.get(`/analytics/workflows?days=${timeRange}`),
      ]);

      setOverview(overviewRes.data);
      setWorkflows(workflowsRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Interactions',
      value: overview?.total_interactions || 0,
      icon: Activity,
      color: 'text-blue-600',
    },
    {
      title: 'Response Rate',
      value: `${Math.round((overview?.response_rate || 0) * 100)}%`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Active Workflows',
      value: workflows?.workflows?.filter((w: any) => w.status === 'active').length || 0,
      icon: Zap,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-background border-l border-border shadow-lg flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-brand-primary" />
          <div>
            <h2 className="text-lg font-semibold text-primary-dark">Analytics</h2>
            <p className="text-sm text-secondary-dark">Performance insights and metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-secondary-dark">{stat.title}</p>
                          <p className="text-2xl font-bold text-primary-dark mt-1">{stat.value}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
                <CardDescription>Interactions by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(overview?.by_platform || {}).map(([platform, count]: [string, any]) => (
                    <div key={platform} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium capitalize">{platform}</div>
                      <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-brand-primary h-full flex items-center justify-end px-3 text-xs text-white font-medium"
                          style={{
                            width: `${Math.min((count / (overview.total_interactions || 1)) * 100, 100)}%`,
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Performance */}
            {workflows?.workflows && workflows.workflows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Performance</CardTitle>
                  <CardDescription>Actions taken by workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workflows.workflows.map((workflow: any) => (
                      <div key={workflow.workflow_id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-primary-dark">{workflow.workflow_name}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            workflow.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {workflow.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-secondary-dark">Triggered</p>
                            <p className="font-semibold text-primary-dark">{workflow.triggered_count}</p>
                          </div>
                          <div>
                            <p className="text-secondary-dark">Auto-Responded</p>
                            <p className="font-semibold text-green-600">{workflow.auto_responded_count}</p>
                          </div>
                          <div>
                            <p className="text-secondary-dark">Flagged</p>
                            <p className="font-semibold text-purple-600">{workflow.flagged_count}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sentiment Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>Interaction sentiment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(overview?.by_sentiment || {}).map(([sentiment, count]: [string, any]) => (
                    <div key={sentiment} className="text-center p-4 border border-border rounded-lg">
                      <p className={`text-2xl font-bold ${
                        sentiment === 'positive' ? 'text-green-600' :
                        sentiment === 'negative' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {count}
                      </p>
                      <p className="text-sm text-secondary-dark mt-1 capitalize">{sentiment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
