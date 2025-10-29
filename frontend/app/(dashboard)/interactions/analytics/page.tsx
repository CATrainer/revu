'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Zap, Clock, BarChart3, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30');
  const [overview, setOverview] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, workflowsRes, timelineRes, queueRes] = await Promise.all([
        api.get(`/analytics/overview?days=${timeRange}`),
        api.get(`/analytics/workflows?days=${timeRange}`),
        api.get(`/analytics/timeline?days=${timeRange}`),
        api.get('/analytics/response-queue'),
      ]);

      setOverview(overviewRes.data);
      setWorkflows(workflowsRes.data);
      setTimeline(timelineRes.data);
      setQueue(queueRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
      title: 'Pending Responses',
      value: queue?.overall?.pending || 0,
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Active Workflows',
      value: workflows?.workflows?.filter((w: any) => w.status === 'active').length || 0,
      icon: Zap,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">Analytics</h1>
          <p className="text-secondary-dark mt-1">Performance insights and metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="space-y-4">
            {Object.entries(overview?.by_platform || {}).map(([platform, count]: [string, any]) => {
              const percentage = overview.total_interactions > 0 
                ? (count / overview.total_interactions) * 100 
                : 0;
              return (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-primary-dark">{platform}</span>
                    <span className="text-secondary-dark font-semibold">{count} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-brand-primary h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(percentage, 2)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Performance</CardTitle>
          <CardDescription>Actions taken by workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows?.workflows?.map((workflow: any) => (
              <div key={workflow.workflow_id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-primary-dark">{workflow.workflow_name}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    workflow.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
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
    </div>
  );
}
