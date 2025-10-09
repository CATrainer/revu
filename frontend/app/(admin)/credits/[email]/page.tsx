'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { 
  ArrowLeft,
  DollarSign,
  Activity,
  Calendar,
  Loader2,
  TrendingUp
} from 'lucide-react';

interface UserDetail {
  user: {
    email: string;
    full_name: string;
    demo_mode: boolean;
  };
  balance: {
    current_balance: number;
    monthly_allowance: number;
    current_month_consumed: number;
    total_consumed: number;
    next_reset_at: string;
  };
  recent_events: Array<{
    timestamp: string;
    action_type: string;
    credits: number;
    description: string;
    input_tokens?: number;
    output_tokens?: number;
    model?: string;
  }>;
  by_action_type: Array<{
    action_type: string;
    count: number;
    total_credits: number;
  }>;
  period_days: number;
}

export default function UserCreditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.email as string);
  
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadUserData();
  }, [email, timeRange]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/credits/user/${encodeURIComponent(email)}?days=${timeRange}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load user credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-secondary-dark">User not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const usagePercent = (data.balance.current_month_consumed / data.balance.monthly_allowance) * 100;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={() => router.back()} variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Users
          </Button>
          <h1 className="text-3xl font-bold text-primary-dark">{data.user.full_name || data.user.email}</h1>
          <p className="text-secondary-dark mt-1">{data.user.email}</p>
          {data.user.demo_mode && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
              Demo Mode
            </span>
          )}
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-dark">Current Balance</p>
                <p className="text-2xl font-bold text-primary-dark mt-1">
                  {data.balance.current_balance.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-dark">Month Consumed</p>
                <p className="text-2xl font-bold text-primary-dark mt-1">
                  {data.balance.current_month_consumed.toFixed(2)}
                </p>
                <p className="text-xs text-secondary-dark mt-1">{usagePercent.toFixed(0)}% used</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-dark">Total Consumed</p>
                <p className="text-2xl font-bold text-primary-dark mt-1">
                  {data.balance.total_consumed.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-dark">Next Reset</p>
                <p className="text-sm font-semibold text-primary-dark mt-1">
                  {new Date(data.balance.next_reset_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-secondary-dark mt-1">
                  {data.balance.monthly_allowance} credits
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Action Type */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>Credits by action type (last {timeRange} days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.by_action_type
                .sort((a, b) => b.total_credits - a.total_credits)
                .map((action) => (
                  <div key={action.action_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-dark capitalize">
                        {action.action_type.replace(/_/g, ' ')}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-primary-dark">
                          {action.total_credits.toFixed(2)}
                        </span>
                        <span className="text-xs text-secondary-dark ml-2">
                          ({action.count} events)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-brand-primary h-full rounded-full"
                        style={{ 
                          width: `${Math.min((action.total_credits / data.balance.current_month_consumed) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              {data.by_action_type.length === 0 && (
                <p className="text-center text-secondary-dark py-4">No usage in this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 20 credit usage events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.recent_events.map((event, index) => (
                <div key={index} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-dark capitalize">
                        {event.action_type.replace(/_/g, ' ')}
                      </p>
                      {event.description && (
                        <p className="text-xs text-secondary-dark mt-1">{event.description}</p>
                      )}
                      {event.input_tokens && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tokens: {event.input_tokens.toLocaleString()} in, {event.output_tokens?.toLocaleString()} out
                          {event.model && ` • ${event.model}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-brand-primary ml-3">
                      {event.credits.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
              {data.recent_events.length === 0 && (
                <p className="text-center text-secondary-dark py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
