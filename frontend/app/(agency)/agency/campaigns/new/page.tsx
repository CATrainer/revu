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
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import { campaignApi } from '@/lib/agency-dashboard-api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    brandName: '',
    value: '',
    campaignType: '',
    postingDate: '',
    description: '',
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: { brand_name: string; value: number; campaign_type?: string; posting_date?: string }) =>
      campaignApi.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-campaigns'] });
      toast.success('Campaign created successfully');
      router.push('/agency/campaigns');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create campaign');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.brandName || !form.value) {
      toast.error('Please fill in required fields');
      return;
    }

    createCampaignMutation.mutate({
      brand_name: form.brandName,
      value: parseFloat(form.value),
      campaign_type: form.campaignType || undefined,
      posting_date: form.postingDate || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Campaign</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaign Details
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
                <Label htmlFor="value">Campaign Value (GBP) *</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="50000"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
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
                    <SelectItem value="ugc">UGC Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postingDate">Target Posting Date</Label>
              <Input
                id="postingDate"
                type="date"
                value={form.postingDate}
                onChange={(e) => setForm({ ...form, postingDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the campaign goals and requirements..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
