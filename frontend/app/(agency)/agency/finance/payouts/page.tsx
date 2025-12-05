'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  CreditCard,
  Users,
} from 'lucide-react';
import { financeApi, type Payout, type PayoutStatus } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusConfig: Record<PayoutStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['agency-payouts', statusFilter],
    queryFn: () => financeApi.getPayouts(statusFilter !== 'all' ? { status: statusFilter as PayoutStatus } : undefined),
  });

  const markPaidMutation = useMutation({
    mutationFn: financeApi.markPayoutPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-payouts'] });
      toast.success('Payout marked as completed');
      setSelectedPayouts([]);
    },
    onError: () => toast.error('Failed to process payout'),
  });

  const filteredPayouts = payouts.filter(payout =>
    payout.creator_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingPayouts = filteredPayouts.filter(p => p.status === 'pending');
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayouts(pendingPayouts.map(p => p.id));
    } else {
      setSelectedPayouts([]);
    }
  };

  const handleProcessSelected = () => {
    if (selectedPayouts.length === 0) {
      toast.error('Please select payouts to process');
      return;
    }
    selectedPayouts.forEach(id => markPaidMutation.mutate(id));
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Creator Payouts</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage payments to your creators
          </p>
        </div>
        <Button
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={handleProcessSelected}
          disabled={selectedPayouts.length === 0 || markPaidMutation.isPending}
        >
          {markPaidMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          Process Selected ({selectedPayouts.length})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                <p className="text-sm text-gray-500">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredPayouts.filter(p => p.status === 'completed').length}</p>
                <p className="text-sm text-gray-500">Completed This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingPayouts.length}</p>
                <p className="text-sm text-gray-500">Creators Awaiting Payment</p>
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
            placeholder="Search by creator..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4">
                  <Checkbox
                    checked={selectedPayouts.length === pendingPayouts.length && pendingPayouts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Creator</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Campaign</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map(payout => (
                <tr key={payout.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-4">
                    {payout.status === 'pending' && (
                      <Checkbox
                        checked={selectedPayouts.includes(payout.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPayouts([...selectedPayouts, payout.id]);
                          } else {
                            setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id));
                          }
                        }}
                      />
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-medium">
                        {payout.creator_name.charAt(0)}
                      </div>
                      <span className="font-medium">{payout.creator_name}</span>
                    </div>
                  </td>
                  <td className="p-4">{payout.campaign_name || 'Multiple'}</td>
                  <td className="p-4 font-medium">{formatCurrency(payout.amount)}</td>
                  <td className="p-4">{formatDate(payout.created_at)}</td>
                  <td className="p-4">
                    <Badge className={statusConfig[payout.status].color}>
                      {statusConfig[payout.status].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayouts.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payouts found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
