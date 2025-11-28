'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Receipt,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Send,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Mail,
  Printer,
} from 'lucide-react';
import type { Invoice, InvoiceStatus, CreatorPayout, PaymentStatus, FinancialStats } from '@/lib/agency-dashboard-api';

// Status configuration
const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Send },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
  partially_paid: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
};

const payoutStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

// Mock data
const mockStats: FinancialStats = {
  outstanding_receivables: 25000,
  overdue_receivables: 5000,
  overdue_count: 2,
  oldest_overdue_days: 12,
  creator_payouts_due: 18000,
  creator_payouts_count: 7,
  revenue_this_month: 50000,
  revenue_last_month: 40000,
  revenue_trend_percent: 25,
};

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoice_number: '2024-045',
    agency_id: '1',
    deal_id: '1',
    brand_name: 'Brand X',
    brand_contact_email: 'billing@brandx.com',
    amount: 7500,
    currency: 'GBP',
    tax_rate: 20,
    tax_amount: 1500,
    total_amount: 9000,
    status: 'sent',
    due_date: '2025-01-25',
    sent_at: '2025-01-15T10:00:00Z',
    line_items: [{ id: '1', description: 'Campaign Fee', quantity: 1, rate: 7500, amount: 7500 }],
    created_at: '2025-01-15T09:00:00Z',
  },
  {
    id: '2',
    invoice_number: '2024-044',
    agency_id: '1',
    deal_id: '2',
    brand_name: 'Brand Y',
    brand_contact_email: 'accounts@brandy.com',
    amount: 5000,
    currency: 'GBP',
    tax_rate: 20,
    tax_amount: 1000,
    total_amount: 6000,
    status: 'overdue',
    due_date: '2025-01-10',
    sent_at: '2025-01-03T10:00:00Z',
    line_items: [{ id: '1', description: 'Sponsored Post Fee', quantity: 1, rate: 5000, amount: 5000 }],
    created_at: '2025-01-03T09:00:00Z',
  },
  {
    id: '3',
    invoice_number: '2024-043',
    agency_id: '1',
    deal_id: '3',
    brand_name: 'Brand Z',
    brand_contact_email: 'finance@brandz.com',
    amount: 12500,
    currency: 'GBP',
    tax_rate: 20,
    tax_amount: 2500,
    total_amount: 15000,
    status: 'paid',
    due_date: '2025-01-08',
    paid_date: '2025-01-07',
    paid_amount: 15000,
    line_items: [{ id: '1', description: 'Product Review Campaign', quantity: 1, rate: 12500, amount: 12500 }],
    created_at: '2024-12-25T09:00:00Z',
  },
  {
    id: '4',
    invoice_number: '2024-046',
    agency_id: '1',
    brand_name: 'Brand A',
    amount: 8000,
    currency: 'GBP',
    total_amount: 8000,
    status: 'draft',
    due_date: '2025-02-01',
    line_items: [{ id: '1', description: 'Content Package', quantity: 1, rate: 8000, amount: 8000 }],
    created_at: '2025-01-20T09:00:00Z',
  },
];

const mockPayouts: CreatorPayout[] = [
  {
    id: '1',
    agency_id: '1',
    creator_id: '1',
    creator_name: 'John Smith',
    campaign_id: '1',
    campaign_name: 'Brand X Review',
    brand_name: 'Brand X',
    amount: 6000,
    currency: 'GBP',
    status: 'pending',
    due_date: '2025-01-28',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    agency_id: '1',
    creator_id: '2',
    creator_name: 'Jane Doe',
    campaign_id: '2',
    campaign_name: 'Brand Y Sponsored Post',
    brand_name: 'Brand Y',
    amount: 4000,
    currency: 'GBP',
    status: 'pending',
    due_date: '2025-01-22',
    created_at: '2025-01-10T10:00:00Z',
  },
  {
    id: '3',
    agency_id: '1',
    creator_id: '1',
    creator_name: 'John Smith',
    campaign_id: '3',
    campaign_name: 'Brand Z Product Review',
    brand_name: 'Brand Z',
    amount: 10000,
    currency: 'GBP',
    status: 'paid',
    due_date: '2025-01-14',
    paid_date: '2025-01-14',
    payment_method: 'Bank Transfer',
    transaction_reference: 'TXN-2025-001',
    created_at: '2024-12-28T10:00:00Z',
  },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter invoices
  const filteredInvoices = mockInvoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter payouts
  const filteredPayouts = mockPayouts.filter(payout => {
    const matchesSearch =
      payout.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const trendUp = mockStats.revenue_trend_percent >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Finance
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage invoices, track payments, and view financial analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsNewInvoiceOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
              <Receipt className="h-4 w-4" />
              Outstanding
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(mockStats.outstanding_receivables)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {mockInvoices.filter(i => i.status === 'sent').length} invoices pending
            </p>
          </CardContent>
        </Card>

        <Card className={mockStats.overdue_receivables > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(mockStats.overdue_receivables)}
            </p>
            <p className="text-xs text-red-500 mt-1">
              {mockStats.overdue_count} invoices overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm mb-2">
              <Users className="h-4 w-4" />
              Payouts Due
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(mockStats.creator_payouts_due)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {mockStats.creator_payouts_count} creators pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              Revenue This Month
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(mockStats.revenue_this_month)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={cn('text-xs font-medium', trendUp ? 'text-green-600' : 'text-red-600')}>
                {trendUp ? '+' : ''}{mockStats.revenue_trend_percent}%
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({mockInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Payouts ({mockPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Invoices</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/agency/finance?tab=invoices">View All</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockInvoices.slice(0, 4).map(invoice => {
                  const config = invoiceStatusConfig[invoice.status];
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            #{invoice.invoice_number}
                          </p>
                          <p className="text-sm text-gray-500">{invoice.brand_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                        <Badge className={cn('text-xs', config.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Pending Payouts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Pending Payouts</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/agency/finance?tab=payouts">View All</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockPayouts.filter(p => p.status === 'pending').slice(0, 4).map(payout => {
                  const config = payoutStatusConfig[payout.status];

                  return (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                          {payout.creator_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {payout.creator_name}
                          </p>
                          <p className="text-sm text-gray-500">{payout.brand_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payout.amount)}</p>
                        <p className="text-xs text-gray-500">
                          Due {new Date(payout.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map(invoice => {
                    const config = invoiceStatusConfig[invoice.status];
                    const StatusIcon = config.icon;

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4">
                          <p className="font-medium">#{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{invoice.brand_name}</p>
                          {invoice.brand_contact_email && (
                            <p className="text-xs text-gray-500">{invoice.brand_contact_email}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                          {invoice.tax_amount && (
                            <p className="text-xs text-gray-500">
                              incl. {formatCurrency(invoice.tax_amount)} VAT
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={cn('text-xs', config.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View PDF
                              </DropdownMenuItem>
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              {invoice.status === 'sent' && (
                                <DropdownMenuItem>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {invoice.status === 'overdue' && (
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search payouts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Payouts Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayouts.map(payout => {
                    const config = payoutStatusConfig[payout.status];

                    return (
                      <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                              {payout.creator_name.charAt(0)}
                            </div>
                            <p className="font-medium">{payout.creator_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{payout.campaign_name}</p>
                          <p className="text-xs text-gray-500">{payout.brand_name}</p>
                        </td>
                        <td className="px-4 py-4 font-medium">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={cn('text-xs', config.color)}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {new Date(payout.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {payout.status === 'pending' && (
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          {payout.status === 'paid' && (
                            <span className="text-xs text-gray-500">
                              Paid {payout.paid_date && new Date(payout.paid_date).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-2">
                  {[35, 42, 38, 45, 40, 50, 48, 55, 52, 60, 58, 65].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          'w-full rounded-t transition-all',
                          i === 11 ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                        )}
                        style={{ height: `${height * 3}px` }}
                      />
                      <span className="text-[10px] text-gray-400">
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Avg. Days to Payment</span>
                  <span className="font-bold text-2xl">18 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">On-Time Payment Rate</span>
                  <span className="font-bold text-2xl text-green-600">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Collected (YTD)</span>
                  <span className="font-bold text-2xl">{formatCurrency(450000)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Generate a new invoice for a brand. You can add line items and customize before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input placeholder="Select or enter brand name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (GBP)</Label>
                <Input type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Campaign fee, sponsorship, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
