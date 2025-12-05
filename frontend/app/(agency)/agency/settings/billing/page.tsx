'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Mock billing data
const currentPlan = {
  name: 'Professional',
  price: 49,
  interval: 'month',
  features: [
    'Unlimited creators',
    'Unlimited campaigns',
    'Advanced analytics',
    'Priority support',
    'API access',
  ],
};

const billingHistory = [
  { id: '1', date: '2024-12-01', amount: 49, status: 'paid', invoice: 'INV-2024-012' },
  { id: '2', date: '2024-11-01', amount: 49, status: 'paid', invoice: 'INV-2024-011' },
  { id: '3', date: '2024-10-01', amount: 49, status: 'paid', invoice: 'INV-2024-010' },
  { id: '4', date: '2024-09-01', amount: 49, status: 'paid', invoice: 'INV-2024-009' },
];

const paymentMethod = {
  type: 'card',
  last4: '4242',
  brand: 'Visa',
  expiryMonth: 12,
  expiryYear: 2025,
};

export default function BillingPage() {
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleUpdateCard = () => {
    toast.info('Card update functionality requires Stripe integration');
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.success(`Downloading invoice ${invoiceId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your subscription and payment methods</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">{formatCurrency(currentPlan.price)}</span>
                <span className="text-gray-500">/{currentPlan.interval}</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">{currentPlan.name} Plan</h3>
              <ul className="space-y-2 mb-6">
                {currentPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => toast.info('Plan management coming soon')}>
                  Change Plan
                </Button>
                <Button variant="outline" className="text-red-600" onClick={() => toast.info('Contact support to cancel')}>
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Invoice</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">{formatDate(item.date)}</td>
                      <td className="p-3 font-mono text-sm">{item.invoice}</td>
                      <td className="p-3">{formatCurrency(item.amount)}</td>
                      <td className="p-3">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Paid
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(item.invoice)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{paymentMethod.brand}</span>
                  </div>
                  <Badge variant="outline">Default</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  •••• •••• •••• {paymentMethod.last4}
                </p>
                <p className="text-sm text-gray-500">
                  Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={handleUpdateCard}>
                Update Card
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(currentPlan.price)}</p>
              <p className="text-gray-500">Due on January 1, 2025</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
