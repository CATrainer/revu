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
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Download,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

// Mock analytics data
const monthlyRevenue = [
  { month: 'Jan', revenue: 45000, expenses: 12000 },
  { month: 'Feb', revenue: 52000, expenses: 14000 },
  { month: 'Mar', revenue: 48000, expenses: 11000 },
  { month: 'Apr', revenue: 61000, expenses: 16000 },
  { month: 'May', revenue: 55000, expenses: 13000 },
  { month: 'Jun', revenue: 67000, expenses: 18000 },
];

const revenueByClient = [
  { client: 'TechBrand', revenue: 85000, percentage: 28 },
  { client: 'FashionX', revenue: 72000, percentage: 24 },
  { client: 'GiftCo', revenue: 58000, percentage: 19 },
  { client: 'SportMax', revenue: 45000, percentage: 15 },
  { client: 'Others', revenue: 42000, percentage: 14 },
];

export default function FinanceAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('6m');

  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyRevenue.reduce((sum, m) => sum + m.expenses, 0);
  const profit = totalRevenue - totalExpenses;
  const profitMargin = ((profit / totalRevenue) * 100).toFixed(1);

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (amount: number) => {
    return formatAmount(amount, userCurrency);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Analytics</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track revenue, expenses, and profitability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
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
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-medium">12%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="flex items-center text-red-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-medium">8%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(profit)}</p>
              </div>
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-medium">15%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Profit Margin</p>
                <p className="text-2xl font-bold">{profitMargin}%</p>
              </div>
              <div className="flex items-center text-green-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyRevenue.map(month => (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-gray-500">{formatCurrency(month.revenue)}</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div
                      className="bg-green-500 rounded-l"
                      style={{ width: `${(month.revenue / 70000) * 70}%` }}
                    />
                    <div
                      className="bg-red-400 rounded-r"
                      style={{ width: `${(month.expenses / 70000) * 70}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Revenue by Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByClient.map((client, index) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-gray-400'];
                return (
                  <div key={client.client} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{client.client}</span>
                      <span className="text-gray-500">{formatCurrency(client.revenue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index]} rounded-full`}
                        style={{ width: `${client.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{client.percentage}% of total revenue</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
