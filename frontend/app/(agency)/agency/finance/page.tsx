'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TrendingUp,
  AlertTriangle,
  Send,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Mail,
  Trash2,
  Loader2,
  FileText,
  Calendar,
  X,
  FileDown,
} from 'lucide-react';
import { financeApi } from '@/lib/agency-dashboard-api';
import type { Invoice, InvoiceStatus, FinancialStats } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';

// Status configuration per requirements: Draft, Sent, Paid, Overdue
type DisplayStatus = 'draft' | 'sent' | 'paid' | 'overdue';

const statusConfig: Record<DisplayStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { 
    label: 'Draft', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: Clock 
  },
  sent: { 
    label: 'Sent', 
    color: 'text-sky-600 dark:text-sky-400', 
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    icon: Send 
  },
  paid: { 
    label: 'Paid', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: CheckCircle 
  },
  overdue: { 
    label: 'Overdue', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertTriangle 
  },
};

// Map API status to display status
const mapStatus = (apiStatus: InvoiceStatus): DisplayStatus => {
  if (apiStatus === 'viewed' || apiStatus === 'partially_paid') return 'sent';
  if (apiStatus === 'cancelled') return 'draft';
  return apiStatus as DisplayStatus;
};

// Default stats
const defaultStats: FinancialStats = {
  outstanding_receivables: 0,
  outstanding_count: 0,
  overdue_receivables: 0,
  overdue_count: 0,
  oldest_overdue_days: 0,
  creator_payouts_due: 0,
  creator_payouts_count: 0,
  revenue_this_month: 0,
  revenue_last_month: 0,
  revenue_trend_percent: 0,
};

// Line item type for form
interface FormLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Create invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    brand_name: '',
    brand_contact_email: '',
    due_date: '',
    tax_rate: 20, // Default 20% VAT
    notes: '',
    line_items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }] as FormLineItem[],
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

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (data: Parameters<typeof financeApi.createInvoice>[0]) =>
      financeApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success('Invoice created');
    },
    onError: () => toast.error('Failed to create invoice'),
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      financeApi.sendInvoice(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      toast.success('Invoice sent');
    },
    onError: () => toast.error('Failed to send invoice'),
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof financeApi.markInvoicePaid>[1] }) =>
      financeApi.markInvoicePaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      setShowViewDialog(false);
      toast.success('Invoice marked as paid');
    },
    onError: () => toast.error('Failed to update invoice'),
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: financeApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency', 'finance'] });
      toast.success('Invoice deleted');
    },
    onError: () => toast.error('Failed to delete invoice'),
  });

  // Reset form
  const resetForm = () => {
    setInvoiceForm({
      brand_name: '',
      brand_contact_email: '',
      due_date: '',
      tax_rate: 20,
      notes: '',
      line_items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  // Calculate totals
  const calculateTotals = (items: FormLineItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof FormLineItem, value: string | number) => {
    setInvoiceForm(prev => {
      const items = prev.line_items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Recalculate amount
          if (field === 'quantity' || field === 'rate') {
            updated.amount = Number(updated.quantity) * Number(updated.rate);
          }
          return updated;
        }
        return item;
      });
      return { ...prev, line_items: items };
    });
  };

  // Add line item
  const addLineItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { id: String(Date.now()), description: '', quantity: 1, rate: 0, amount: 0 },
      ],
    }));
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (invoiceForm.line_items.length <= 1) return;
    setInvoiceForm(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id),
    }));
  };

  // Handle create invoice
  const handleCreateInvoice = () => {
    if (!invoiceForm.brand_name.trim()) {
      toast.error('Please enter a brand name');
      return;
    }
    if (!invoiceForm.due_date) {
      toast.error('Please select a due date');
      return;
    }
    if (invoiceForm.line_items.every(item => !item.description || item.amount === 0)) {
      toast.error('Please add at least one line item');
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals(invoiceForm.line_items, invoiceForm.tax_rate);

    createInvoiceMutation.mutate({
      brand_name: invoiceForm.brand_name,
      brand_contact_email: invoiceForm.brand_contact_email || undefined,
      due_date: new Date(invoiceForm.due_date).toISOString(),
      subtotal,
      tax_rate: invoiceForm.tax_rate,
      tax_amount: taxAmount,
      total_amount: total,
      notes: invoiceForm.notes || undefined,
      line_items: invoiceForm.line_items.filter(item => item.description && item.amount > 0),
    });
  };

  // Handle mark as paid
  const handleMarkPaid = (invoice: Invoice) => {
    markPaidMutation.mutate({
      id: invoice.id,
      data: {
        paid_date: new Date().toISOString(),
        paid_amount: invoice.total_amount,
      },
    });
  };

  // Handle send invoice
  const handleSendInvoice = (invoice: Invoice) => {
    const email = invoice.brand_contact_email || prompt('Enter email to send invoice:');
    if (email) {
      sendInvoiceMutation.mutate({ id: invoice.id, email });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Brand', 'Status', 'Subtotal', 'Tax', 'Total', 'Due Date', 'Paid Date'];
    const rows = invoices.map((inv: Invoice) => [
      inv.invoice_number,
      inv.brand_name,
      statusConfig[mapStatus(inv.status)].label,
      inv.amount || inv.total_amount - (inv.tax_amount || 0),
      inv.tax_amount || 0,
      inv.total_amount,
      new Date(inv.due_date).toLocaleDateString(),
      inv.paid_date ? new Date(inv.paid_date).toLocaleDateString() : '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // Export to PDF (generates a simple HTML-to-print for now)
  const exportToPDF = (invoice?: Invoice) => {
    const invoicesToExport = invoice ? [invoice] : invoices;
    
    const content = invoicesToExport.map((inv: Invoice) => `
      <div style="page-break-after: always; padding: 40px; font-family: Arial, sans-serif;">
        <h1 style="color: #16a34a;">INVOICE</h1>
        <div style="margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <p><strong>Invoice #:</strong> ${inv.invoice_number}</p>
          <p><strong>Brand:</strong> ${inv.brand_name}</p>
          <p><strong>Status:</strong> ${statusConfig[mapStatus(inv.status)].label}</p>
          <p><strong>Due Date:</strong> ${new Date(inv.due_date).toLocaleDateString()}</p>
          ${inv.paid_date ? `<p><strong>Paid Date:</strong> ${new Date(inv.paid_date).toLocaleDateString()}</p>` : ''}
        </div>
        <h3>Line Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Rate</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.line_items?.map(item => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">£${item.rate.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">£${item.amount.toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="padding: 10px;">No line items</td></tr>'}
          </tbody>
        </table>
        <div style="text-align: right; margin-top: 20px;">
          <p><strong>Subtotal:</strong> £${((inv.total_amount || 0) - (inv.tax_amount || 0)).toFixed(2)}</p>
          <p><strong>Tax (${inv.tax_rate || 20}%):</strong> £${(inv.tax_amount || 0).toFixed(2)}</p>
          <p style="font-size: 1.2em;"><strong>Total:</strong> £${(inv.total_amount || 0).toFixed(2)}</p>
        </div>
        ${inv.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 4px;"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Invoice</title></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success(invoice ? 'PDF opened for printing' : 'All invoices exported');
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: Invoice) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
      const displayStatus = mapStatus(inv.status);
      const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Stats by status
  const statsByStatus = useMemo(() => {
    const counts = { draft: 0, sent: 0, paid: 0, overdue: 0 };
    invoices.forEach((inv: Invoice) => {
      const status = mapStatus(inv.status);
      counts[status]++;
    });
    return counts;
  }, [invoices]);

  const trendUp = stats.revenue_trend_percent >= 0;
  const formTotals = calculateTotals(invoiceForm.line_items, invoiceForm.tax_rate);
  const isLoading = statsLoading || invoicesLoading;

  // Loading state
  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-500 dark:text-gray-400">Loading finance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finance</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage invoices and track payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToPDF()}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4" />
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
              {formatCurrency(Number(stats.outstanding_receivables))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {statsByStatus.sent} invoices pending
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
              {formatCurrency(Number(stats.overdue_receivables))}
            </p>
            <p className="text-xs text-red-500 mt-1">
              {statsByStatus.overdue} invoices overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm mb-2">
              <CheckCircle className="h-4 w-4" />
              Collected
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(Number(stats.revenue_this_month))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {statsByStatus.paid} paid this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend
            </div>
            <div className="flex items-center gap-2">
              {trendUp ? (
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              )}
              <span className={cn('text-2xl font-bold', trendUp ? 'text-green-600' : 'text-red-600')}>
                {trendUp ? '+' : ''}{stats.revenue_trend_percent}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          All ({invoices.length})
        </Button>
        {(['draft', 'sent', 'paid', 'overdue'] as DisplayStatus[]).map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={cn(
              statusFilter === status ? statusConfig[status].bgColor : '',
              statusFilter === status ? statusConfig[status].color : ''
            )}
          >
            {statusConfig[status].label} ({statsByStatus[status]})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by invoice number or brand..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoices ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invoices found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'Try a different search' : 'Create your first invoice to get started'}
              </p>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map((invoice: Invoice) => {
                    const displayStatus = mapStatus(invoice.status);
                    const config = statusConfig[displayStatus];
                    const StatusIcon = config.icon;
                    const subtotal = (invoice.total_amount || 0) - (invoice.tax_amount || 0);

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4">
                          <button
                            className="font-medium text-green-600 hover:underline"
                            onClick={() => { setSelectedInvoice(invoice); setShowViewDialog(true); }}
                          >
                            #{invoice.invoice_number}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{invoice.brand_name}</p>
                            {invoice.brand_contact_email && (
                              <p className="text-xs text-gray-500">{invoice.brand_contact_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={cn('text-xs', config.bgColor, config.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">
                          {formatCurrency(subtotal, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-500">
                          {formatCurrency(invoice.tax_amount || 0, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {invoice.paid_date ? (
                            <span className="text-emerald-600">{new Date(invoice.paid_date).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setShowViewDialog(true); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportToPDF(invoice)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                              {displayStatus === 'draft' && (
                                <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              {(displayStatus === 'sent' || displayStatus === 'overdue') && (
                                <>
                                  <DropdownMenuItem onClick={() => handleMarkPaid(invoice)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm('Delete this invoice?')) {
                                    deleteInvoiceMutation.mutate(invoice.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.filter((inv: Invoice) => inv.paid_date).length === 0 ? (
            <p className="text-center text-gray-500 py-8">No payment history yet</p>
          ) : (
            <div className="space-y-3">
              {invoices
                .filter((inv: Invoice) => inv.paid_date)
                .sort((a: Invoice, b: Invoice) => new Date(b.paid_date!).getTime() - new Date(a.paid_date!).getTime())
                .slice(0, 10)
                .map((invoice: Invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          #{invoice.invoice_number} - {invoice.brand_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Paid on {new Date(invoice.paid_date!).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">
                        {formatCurrency(invoice.total_amount, invoice.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {invoice.line_items?.length || 1} item{(invoice.line_items?.length || 1) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Add invoice details and line items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Brand Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name *</Label>
                <Input
                  id="brand_name"
                  placeholder="Enter brand name"
                  value={invoiceForm.brand_name}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, brand_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_email">Brand Email</Label>
                <Input
                  id="brand_email"
                  type="email"
                  placeholder="contact@brand.com"
                  value={invoiceForm.brand_contact_email}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, brand_contact_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  value={invoiceForm.tax_rate}
                  onChange={(e) => setInvoiceForm(f => ({ ...f, tax_rate: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Rate (£)</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Amount</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoiceForm.line_items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-2 py-2">
                          <Input
                            placeholder="Service description"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            className="h-9"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                            className="h-9 text-center"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateLineItem(item.id, 'rate', Number(e.target.value))}
                            className="h-9 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-2 py-2">
                          {invoiceForm.line_items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeLineItem(item.id)}
                            >
                              <X className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(formTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({invoiceForm.tax_rate}%)</span>
                    <span>{formatCurrency(formTotals.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(formTotals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Payment terms, thank you message, etc."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateInvoice}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Invoice #{selectedInvoice?.invoice_number}
              {selectedInvoice && (
                <Badge className={cn(
                  'ml-2',
                  statusConfig[mapStatus(selectedInvoice.status)].bgColor,
                  statusConfig[mapStatus(selectedInvoice.status)].color
                )}>
                  {statusConfig[mapStatus(selectedInvoice.status)].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Brand Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Brand</p>
                  <p className="font-medium">{selectedInvoice.brand_name}</p>
                  {selectedInvoice.brand_contact_email && (
                    <p className="text-sm text-gray-500">{selectedInvoice.brand_contact_email}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                  {selectedInvoice.paid_date && (
                    <>
                      <p className="text-sm text-gray-500 mt-2">Paid Date</p>
                      <p className="font-medium text-emerald-600">
                        {new Date(selectedInvoice.paid_date).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-3">Line Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedInvoice.line_items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.rate, selectedInvoice.currency)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount, selectedInvoice.currency)}</td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-gray-500 text-center">No line items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency((selectedInvoice.total_amount || 0) - (selectedInvoice.tax_amount || 0), selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax ({selectedInvoice.tax_rate || 20}%)</span>
                    <span>{formatCurrency(selectedInvoice.tax_amount || 0, selectedInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => selectedInvoice && exportToPDF(selectedInvoice)}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {selectedInvoice && mapStatus(selectedInvoice.status) === 'draft' && (
              <Button variant="outline" onClick={() => handleSendInvoice(selectedInvoice)}>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            )}
            {selectedInvoice && (mapStatus(selectedInvoice.status) === 'sent' || mapStatus(selectedInvoice.status) === 'overdue') && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleMarkPaid(selectedInvoice)}
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
