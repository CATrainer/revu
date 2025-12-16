'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { financeApi } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    brandName: '',
    brandEmail: '',
    campaignId: '',
    dueDate: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0 },
  ]);

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => financeApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-invoices'] });
      toast.success('Invoice created successfully');
      router.push('/agency/finance/invoices');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create invoice');
    },
  });

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, rate: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;

  const { formatAmount, currency: userCurrency } = useCurrency();
  const formatCurrency = (amount: number) => {
    return formatAmount(amount, userCurrency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.brandName || !form.dueDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (lineItems.some(item => !item.description || item.rate <= 0)) {
      toast.error('Please fill in all line items');
      return;
    }

    createInvoiceMutation.mutate({
      brand_name: form.brandName,
      brand_email: form.brandEmail,
      campaign_id: form.campaignId || undefined,
      due_date: form.dueDate,
      notes: form.notes || undefined,
      line_items: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
      })),
      subtotal,
      vat,
      total_amount: total,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/finance/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Invoice</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate a new invoice for a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details */}
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Client/Brand Name *</Label>
                    <Input
                      id="brandName"
                      placeholder="e.g., TechBrand Inc."
                      value={form.brandName}
                      onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brandEmail">Client Email</Label>
                    <Input
                      id="brandEmail"
                      type="email"
                      placeholder="billing@client.com"
                      value={form.brandEmail}
                      onChange={(e) => setForm({ ...form, brandEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignId">Campaign (Optional)</Label>
                    <Select value={form.campaignId} onValueChange={(value) => setForm({ ...form, campaignId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No campaign</SelectItem>
                        <SelectItem value="1">Summer Launch 2024</SelectItem>
                        <SelectItem value="2">Holiday Gift Guide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g., Campaign management fee"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Rate (GBP)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Amount</Label>
                      <div className="h-10 flex items-center font-medium">
                        {formatCurrency(item.quantity * item.rate)}
                      </div>
                    </div>
                    <div className="pt-8">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any notes or payment instructions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">VAT (20%)</span>
                  <span className="font-medium">{formatCurrency(vat)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(total)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
