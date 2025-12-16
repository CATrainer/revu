'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

// Mock analytics data
const stageMetrics = [
  { stage: 'Prospecting', deals: 12, value: 180000, avgDays: 5, conversionRate: 65 },
  { stage: 'Pitch Sent', deals: 8, value: 145000, avgDays: 7, conversionRate: 75 },
  { stage: 'Negotiating', deals: 5, value: 95000, avgDays: 10, conversionRate: 80 },
  { stage: 'Booked', deals: 3, value: 55000, avgDays: 3, conversionRate: 100 },
  { stage: 'In Progress', deals: 6, value: 120000, avgDays: 14, conversionRate: 95 },
];

const conversionFunnel = [
  { stage: 'Prospecting', percentage: 100, color: 'bg-gray-400' },
  { stage: 'Pitch Sent', percentage: 65, color: 'bg-blue-400' },
  { stage: 'Negotiating', percentage: 48, color: 'bg-purple-400' },
  { stage: 'Booked', percentage: 38, color: 'bg-orange-400' },
  { stage: 'Completed', percentage: 36, color: 'bg-green-500' },
];

export default function PipelineAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  const totalPipelineValue = stageMetrics.reduce((sum, s) => sum + s.value, 0);
  const totalDeals = stageMetrics.reduce((sum, s) => sum + s.deals, 0);
  const avgDealValue = totalPipelineValue / totalDeals;

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (amount: number) => {
    return formatAmount(amount, userCurrency, { decimals: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pipeline Analytics</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track conversion rates and pipeline performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Avg Deal Value</p>
                <p className="text-2xl font-bold">{formatCurrency(avgDealValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Win Rate</p>
                <p className="text-2xl font-bold">36%</p>
              </div>
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-medium">+5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionFunnel.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="text-gray-500">{stage.percentage}%</span>
                  </div>
                  <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500 rounded-lg`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Stage Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Stage</th>
                    <th className="text-right p-2 font-medium text-gray-600 dark:text-gray-400">Deals</th>
                    <th className="text-right p-2 font-medium text-gray-600 dark:text-gray-400">Value</th>
                    <th className="text-right p-2 font-medium text-gray-600 dark:text-gray-400">Avg Days</th>
                  </tr>
                </thead>
                <tbody>
                  {stageMetrics.map(stage => (
                    <tr key={stage.stage} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-2 font-medium">{stage.stage}</td>
                      <td className="p-2 text-right">{stage.deals}</td>
                      <td className="p-2 text-right">{formatCurrency(stage.value)}</td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {stage.avgDays}d
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
    </div>
  );
}
