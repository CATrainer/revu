'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Download,
  MoreVertical,
  Receipt,
  Users,
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
  Loader2,
} from 'lucide-react';
import { financeApi } from '@/lib/agency-dashboard-api';
import type { Invoice, InvoiceStatus, CreatorPayout, PaymentStatus, FinancialStats } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';

// Status configuration
const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Eye },
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

// Default stats for when API is loading
const defaultStats: FinancialStats = {
  outstanding_receivables: 0,
  overdue_receivables: 0,
  overdue_count: 0,
  oldest_overdue_days: 0,
  creator_payouts_due: 0,
  creator_payouts_count: 0,
  revenue_this_month: 0,
  revenue_last_month: 0,
  revenue_trend_percent: 0,
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    brand_name: '',
    amount: '',
    due_date: '',
    description: '',
  });

  // Fetch financial stats
  const { data: stats = defaultStats, isLoading: statsLoading } = useQuery({
    queryKey: ['agency', 'finance', 'stats'],
    queryFn: financeApi.getStats,
    staleTime: 30000,
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['agency', 'finance', 'invoices'],
    queryFn: () => financeApi.getInvoices(),
    staleTime: 30000,
  });

  // Fetch payouts
  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['agency', 'finance', 'payouts'],
    queryFn: () => financeApi.getPayouts(),
    staleTime: 30000,
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createInvoice>[0]) =>
      financeApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      setIsNewInvoiceOpen(false);
      setNewInvoice({ brand_name: '', amount: '', due_date: '', description: '' });
      toast.success('Invoice created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    },
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      financeApi.sendInvoice(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      toast.success('Invoice sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to send invoice');
    },
  });

  // Mark invoice paid mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof financeApi.markInvoicePaid>[1] }) =>
      financeApi.markInvoicePaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update invoice');
    },
  });

  // Mark payout paid mutation
  const markPayoutPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof financeApi.markPayoutPaid>[1] }) =>
      financeApi.markPayoutPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      toast.success('Payout marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update payout');
    },
  });

  // Format currency
  const formatCurrency = (value: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv: Invoice) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter payouts
  const filteredPayouts = payouts.filter((payout: CreatorPayout) => {
    const matchesSearch =
      payout.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payout.brand_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const trendUp = stats.revenue_trend_percent >= 0;

  const handleCreateInvoice = () => {
    if (!newInvoice.brand_name || !newInvoice.amount || !newInvoice.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(newInvoice.amount);
    createInvoiceMutation.mutate({
      brand_name: newInvoice.brand_name,
      subtotal: amount,
      total_amount: amount,
      due_date: new Date(newInvoice.due_date).toISOString(),
      line_items: [
        {
          id: '1',
          description: newInvoice.description || 'Campaign Fee',
          quantity: 1,
          rate: amount,
          amount: amount,
        },
      ],
    });
  };

  const handleMarkInvoicePaid = (invoice: Invoice) => {
    markPaidMutation.mutate({
      id: invoice.id,
      data: {
        paid_date: new Date().toISOString(),
        paid_amount: invoice.total_amount,
      },
    });
  };

  const handleMarkPayoutPaid = (payout: CreatorPayout) => {
    markPayoutPaidMutation.mutate({
      id: payout.id,
      data: {
        paid_date: new Date().toISOString(),
        payment_method: 'Bank Transfer',
      },
    });
  };

  const isLoading = statsLoading || invoicesLoading || payoutsLoading;

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
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(Number(stats.outstanding_receivables))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {invoices.filter((i: Invoice) => i.status === 'sent').length} invoices pending
            </p>
          </CardContent>
        </Card>

        <Card className={Number(stats.overdue_receivables) > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(Number(stats.overdue_receivables))}
            </p>
            <p className="text-xs text-red-500 mt-1">
              {stats.overdue_count} invoices overdue
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
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(Number(stats.creator_payouts_due))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.creator_payouts_count} creators pending
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
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(Number(stats.revenue_this_month))}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={cn('text-xs font-medium', trendUp ? 'text-green-600' : 'text-red-600')}>
                {trendUp ? '+' : ''}{stats.revenue_trend_percent}%
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
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Payouts ({payouts.length})
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
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('invoices')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No invoices yet</p>
                ) : (
                  invoices.slice(0, 4).map((invoice: Invoice) => {
                    const config = invoiceStatusConfig[invoice.status as InvoiceStatus] || invoiceStatusConfig.draft;
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
                          <p className="font-medium">{formatCurrency(Number(invoice.total_amount), invoice.currency)}</p>
                          <Badge className={cn('text-xs', config.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Pending Payouts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Pending Payouts</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('payouts')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {payoutsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : payouts.filter((p: CreatorPayout) => p.status === 'pending').length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No pending payouts</p>
                ) : (
                  payouts.filter((p: CreatorPayout) => p.status === 'pending').slice(0, 4).map((payout: CreatorPayout) => {
                    const config = payoutStatusConfig[payout.status as PaymentStatus] || payoutStatusConfig.pending;

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
                          <p className="font-medium">{formatCurrency(Number(payout.amount), payout.currency)}</p>
                          <p className="text-xs text-gray-500">
                            Due {new Date(payout.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
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
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No invoices found</p>
                  <Button className="mt-4" onClick={() => setIsNewInvoiceOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Invoice
                  </Button>
                </div>
              ) : (
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
                    {filteredInvoices.map((invoice: Invoice) => {
                      const config = invoiceStatusConfig[invoice.status as InvoiceStatus] || invoiceStatusConfig.draft;
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
                            <p className="font-medium">{formatCurrency(Number(invoice.total_amount), invoice.currency)}</p>
                            {invoice.tax_amount && (
                              <p className="text-xs text-gray-500">
                                incl. {formatCurrency(Number(invoice.tax_amount), invoice.currency)} VAT
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
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const email = prompt('Enter email to send invoice:');
                                      if (email) {
                                        sendInvoiceMutation.mutate({ id: invoice.id, email });
                                      }
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Invoice
                                  </DropdownMenuItem>
                                )}
                                {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue') && (
                                  <DropdownMenuItem onClick={() => handleMarkInvoicePaid(invoice)}>
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
              )}
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
              {payoutsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No payouts found</p>
                </div>
              ) : (
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
                    {filteredPayouts.map((payout: CreatorPayout) => {
                      const config = payoutStatusConfig[payout.status as PaymentStatus] || payoutStatusConfig.pending;

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
                            {formatCurrency(Number(payout.amount), payout.currency)}
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkPayoutPaid(payout)}
                                disabled={markPayoutPaidMutation.isPending}
                              >
                                {markPayoutPaidMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </>
                                )}
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
              )}
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
              <Label>Brand Name *</Label>
              <Input
                placeholder="Enter brand name"
                value={newInvoice.brand_name}
                onChange={(e) => setNewInvoice({ ...newInvoice, brand_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (GBP) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newInvoice.due_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Campaign fee, sponsorship, etc."
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
