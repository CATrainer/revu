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
import { ArrowLeft, Loader2, GitBranch } from 'lucide-react';
import { pipelineApi, type DealStage } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewDealPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    brandName: '',
    value: '',
    stage: 'prospecting' as DealStage,
    campaignType: '',
    targetPostingDate: '',
    notes: '',
  });

  const createDealMutation = useMutation({
    mutationFn: (data: { brand_name: string; value: number; stage: DealStage }) =>
      pipelineApi.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-pipeline-deals'] });
      toast.success('Deal created successfully');
      router.push('/agency/pipeline');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create deal');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.brandName || !form.value) {
      toast.error('Please fill in required fields');
      return;
    }

    createDealMutation.mutate({
      brand_name: form.brandName,
      value: parseFloat(form.value),
      stage: form.stage,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/pipeline">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Deal</h1>
          <p className="text-gray-600 dark:text-gray-400">Add a new deal to your pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Deal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand/Client Name *</Label>
              <Input
                id="brandName"
                placeholder="e.g., TechBrand Inc."
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Deal Value (GBP) *</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="15000"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Initial Stage</Label>
                <Select value={form.stage} onValueChange={(value) => setForm({ ...form, stage: value as DealStage })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospecting">Prospecting</SelectItem>
                    <SelectItem value="pitch_sent">Pitch Sent</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaignType">Campaign Type</Label>
                <Select value={form.campaignType} onValueChange={(value) => setForm({ ...form, campaignType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsored">Sponsored Content</SelectItem>
                    <SelectItem value="review">Product Review</SelectItem>
                    <SelectItem value="ambassador">Brand Ambassador</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPostingDate">Target Posting Date</Label>
                <Input
                  id="targetPostingDate"
                  type="date"
                  value={form.targetPostingDate}
                  onChange={(e) => setForm({ ...form, targetPostingDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this deal..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={createDealMutation.isPending}
              >
                {createDealMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Deal'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
