'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const reportSections = [
  { id: 'overview', label: 'Campaign Overview', description: 'Summary of campaign goals and scope' },
  { id: 'creators', label: 'Creator Performance', description: 'Individual creator metrics and analytics' },
  { id: 'content', label: 'Content Metrics', description: 'Views, engagement, and reach data' },
  { id: 'audience', label: 'Audience Insights', description: 'Demographics and audience analysis' },
  { id: 'roi', label: 'ROI Analysis', description: 'Return on investment calculations' },
  { id: 'recommendations', label: 'Recommendations', description: 'Insights and future recommendations' },
];

export default function NewReportPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    campaignId: '',
    template: 'standard',
    dateRange: '30d',
  });

  const [selectedSections, setSelectedSections] = useState<string[]>(
    reportSections.map(s => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.campaignId) {
      toast.error('Please select a campaign');
      return;
    }

    if (selectedSections.length === 0) {
      toast.error('Please select at least one section');
      return;
    }

    setIsGenerating(true);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('Report generated successfully');
    router.push('/agency/reports');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generate Report</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new performance report</p>
        </div>
      </div>

      <form onSubmit={handleGenerate}>
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., Summer Campaign Performance Report"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign *</Label>
                  <Select value={form.campaignId} onValueChange={(value) => setForm({ ...form, campaignId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Summer Launch 2024 - TechBrand</SelectItem>
                      <SelectItem value="2">Holiday Gift Guide - GiftCo</SelectItem>
                      <SelectItem value="3">Q1 Brand Awareness - StyleBrand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select value={form.template} onValueChange={(value) => setForm({ ...form, template: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Report</SelectItem>
                      <SelectItem value="executive">Executive Summary</SelectItem>
                      <SelectItem value="detailed">Detailed Analysis</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={form.dateRange} onValueChange={(value) => setForm({ ...form, dateRange: value })}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportSections.map(section => (
                  <div
                    key={section.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={section.id} className="cursor-pointer font-medium">
                        {section.label}
                      </Label>
                      <p className="text-sm text-gray-500">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
