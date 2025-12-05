'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Search,
  Download,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock performance data
const mockCreatorPerformance = [
  {
    id: '1',
    name: 'Alex Johnson',
    handle: '@alexj',
    platform: 'YouTube',
    campaigns: 12,
    totalEarnings: 45000,
    avgEngagement: 4.2,
    totalViews: 2500000,
    trend: 'up',
    trendValue: 12,
  },
  {
    id: '2',
    name: 'Sarah Miller',
    handle: '@sarahm',
    platform: 'Instagram',
    campaigns: 8,
    totalEarnings: 32000,
    avgEngagement: 5.8,
    totalViews: 1800000,
    trend: 'up',
    trendValue: 8,
  },
  {
    id: '3',
    name: 'Mike Chen',
    handle: '@mikec',
    platform: 'TikTok',
    campaigns: 15,
    totalEarnings: 28000,
    avgEngagement: 7.2,
    totalViews: 5200000,
    trend: 'up',
    trendValue: 25,
  },
  {
    id: '4',
    name: 'Emma Davis',
    handle: '@emmad',
    platform: 'YouTube',
    campaigns: 6,
    totalEarnings: 22000,
    avgEngagement: 3.5,
    totalViews: 950000,
    trend: 'down',
    trendValue: -5,
  },
  {
    id: '5',
    name: 'Chris Wilson',
    handle: '@chrisw',
    platform: 'Instagram',
    campaigns: 10,
    totalEarnings: 38000,
    avgEngagement: 4.8,
    totalViews: 2100000,
    trend: 'up',
    trendValue: 15,
  },
];

export default function CreatorPerformancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('earnings');

  const filteredCreators = mockCreatorPerformance.filter(creator =>
    creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creator Performance</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track and analyze creator performance metrics
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(165000)}</p>
                <p className="text-sm text-gray-500">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(12550000)}</p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Heart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">5.1%</p>
                <p className="text-sm text-gray-500">Avg Engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">51</p>
                <p className="text-sm text-gray-500">Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search creators..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="earnings">Earnings</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="campaigns">Campaigns</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Creator Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Creator</th>
                  <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Platform</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Campaigns</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Earnings</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Views</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Engagement</th>
                  <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map(creator => (
                  <tr key={creator.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium">
                          {creator.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{creator.name}</p>
                          <p className="text-sm text-gray-500">{creator.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{creator.platform}</Badge>
                    </td>
                    <td className="p-3 text-right font-medium">{creator.campaigns}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(creator.totalEarnings)}</td>
                    <td className="p-3 text-right font-medium">{formatNumber(creator.totalViews)}</td>
                    <td className="p-3 text-right font-medium">{creator.avgEngagement}%</td>
                    <td className="p-3 text-right">
                      <div className={cn(
                        'flex items-center justify-end gap-1',
                        creator.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {creator.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-medium">{Math.abs(creator.trendValue)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
