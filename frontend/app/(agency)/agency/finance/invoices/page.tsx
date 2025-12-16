'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Send,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { financeApi, type Invoice, type InvoiceStatus } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import Link from 'next/link';

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <Send className="h-3 w-3" /> },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: <Eye className="h-3 w-3" /> },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <Clock className="h-3 w-3" /> },
};

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['agency-invoices', statusFilter],
    queryFn: () => financeApi.getInvoices(statusFilter !== 'all' ? { status: statusFilter as InvoiceStatus } : undefined),
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: financeApi.sendInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-invoices'] });
      toast.success('Invoice sent');
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  const markPaidMutation = useMutation({
    mutationFn: financeApi.markInvoicePaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-invoices'] });
      toast.success('Invoice marked as paid');
    },
    onError: () => toast.error('Failed to mark invoice as paid'),
  });

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (amount: number) => {
    return formatAmount(amount, userCurrency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage and track client invoices
          </p>
        </div>
        <Link href="/agency/finance/invoices/new">
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search invoices..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Invoice</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Client</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Due Date</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4">
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.issue_date)}</p>
                  </td>
                  <td className="p-4">{invoice.brand_name}</td>
                  <td className="p-4 font-medium">{formatCurrency(invoice.total_amount)}</td>
                  <td className="p-4">{formatDate(invoice.due_date)}</td>
                  <td className="p-4">
                    <Badge className={cn('gap-1', statusConfig[invoice.status].color)}>
                      {statusConfig[invoice.status].icon}
                      {statusConfig[invoice.status].label}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info('View invoice')}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info('Download invoice')}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        {invoice.status === 'draft' && (
                          <DropdownMenuItem onClick={() => sendInvoiceMutation.mutate(invoice.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Send Invoice
                          </DropdownMenuItem>
                        )}
                        {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
                          <DropdownMenuItem onClick={() => markPaidMutation.mutate(invoice.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
