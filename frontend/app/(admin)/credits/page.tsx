'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Search,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';

interface CreditOverview {
  period_days: number;
  total_events: number;
  total_credits: number;
  total_api_cost_dollars: number;
  active_users: number;
  by_action_type: Array<{
    action_type: string;
    event_count: number;
    total_credits: number;
  }>;
}

interface UserBalance {
  email: string;
  full_name: string;
  current_balance: number;
  monthly_allowance: number;
  current_month_consumed: number;
  total_consumed: number;
  next_reset_at: string;
}

interface TopConsumer {
  email: string;
  full_name: string;
  event_count: number;
  total_credits: number;
  total_api_cost: number;
}

export default function AdminCreditsPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<CreditOverview | null>(null);
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [topConsumers, setTopConsumers] = useState<TopConsumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('consumed');

  useEffect(() => {
    loadData();
  }, [timeRange, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, usersRes, consumersRes] = await Promise.all([
        api.get(`/admin/credits/overview?days=${timeRange}`),
        api.get(`/admin/credits/users?limit=100&sort_by=${sortBy}`),
        api.get(`/admin/credits/top-consumers?days=${timeRange}&limit=10`)
      ]);

      setOverview(overviewRes.data);
      setUsers(usersRes.data.users);
      setTopConsumers(consumersRes.data.top_consumers);
    } catch (error) {
      console.error('Failed to load credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = overview ? [
    {
      title: 'Total Events',
      value: overview.total_events.toLocaleString(),
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Credits Consumed',
      value: overview.total_credits.toFixed(2),
      subtitle: `$${overview.total_api_cost_dollars.toFixed(2)} API cost`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Active Users',
      value: overview.active_users.toLocaleString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Avg Credits/User',
      value: overview.active_users > 0 
        ? (overview.total_credits / overview.active_users).toFixed(2) 
        : '0.00',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    }
  ] : [];

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-dark">Credit Monitoring</h1>
          <p className="text-secondary-dark mt-1">
            Track credit usage and costs across all users
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Consumers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Credit Consumers</CardTitle>
            <CardDescription>Highest usage in last {timeRange} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topConsumers.map((consumer, index) => (
                <div key={consumer.email} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary-dark truncate">{consumer.full_name || consumer.email}</p>
                    <p className="text-xs text-secondary-dark truncate">{consumer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-dark">{consumer.total_credits.toFixed(2)}</p>
                    <p className="text-xs text-secondary-dark">{consumer.event_count} events</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage by Action Type */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Action Type</CardTitle>
            <CardDescription>Credit distribution by feature</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview?.by_action_type
                .sort((a, b) => b.total_credits - a.total_credits)
                .slice(0, 8)
                .map((action) => {
                  const percentage = overview.total_credits > 0
                    ? (action.total_credits / overview.total_credits) * 100
                    : 0;
                  
                  return (
                    <div key={action.action_type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-primary-dark font-medium capitalize">
                          {action.action_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-secondary-dark">
                          {action.total_credits.toFixed(2)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users Credit Balances</CardTitle>
              <CardDescription>Current balance and consumption for all users</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumed">Most Consumed</SelectItem>
                  <SelectItem value="balance">Lowest Balance</SelectItem>
                  <SelectItem value="email">Email (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary-dark">User</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-secondary-dark">Current Balance</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-secondary-dark">Month Used</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-secondary-dark">Total Used</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-secondary-dark">Allowance</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const usagePercent = (user.current_month_consumed / user.monthly_allowance) * 100;
                  const isLow = user.current_balance < 20;
                  
                  return (
                    <tr 
                      key={user.email} 
                      onClick={() => router.push(`/admin/credits/${encodeURIComponent(user.email)}`)}
                      className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-primary-dark">{user.full_name || 'N/A'}</p>
                            <p className="text-sm text-secondary-dark">{user.email}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-primary-dark'}`}>
                          {user.current_balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-primary-dark">{user.current_month_consumed.toFixed(2)}</span>
                          <span className="text-xs text-secondary-dark">({usagePercent.toFixed(0)}%)</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-secondary-dark">
                        {user.total_consumed.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary-dark">
                        {user.monthly_allowance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-secondary-dark">
              No users found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
