'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Share2,
  Clock,
  CheckCircle2,
  Star,
  StarOff,
  Filter,
  LayoutTemplate,
  Wand2,
  FileBarChart,
  DollarSign,
  Users,
  Target,
  Building2,
  PlayCircle,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// Types
type ReportType = 'campaign' | 'financial' | 'creator' | 'pipeline' | 'custom';
type ReportStatus = 'draft' | 'generated' | 'scheduled';
type ReportFormat = 'pdf' | 'csv' | 'excel' | 'presentation';

interface Report {
  id: string;
  name: string;
  description: string | null;
  type: ReportType;
  status: ReportStatus;
  is_favorite: boolean;
  created_at: string;
  last_generated: string | null;
  schedule: string | null;
  created_by: string;
  sections: string[];
  date_range: {
    start: string;
    end: string;
  } | null;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  icon: React.ElementType;
  sections: string[];
  is_popular: boolean;
}

// Mock data
const mockReports: Report[] = [
  {
    id: '1',
    name: 'Q2 2024 Performance Summary',
    description: 'Quarterly performance report across all campaigns',
    type: 'campaign',
    status: 'generated',
    is_favorite: true,
    created_at: '2024-06-01',
    last_generated: '2024-06-15',
    schedule: null,
    created_by: 'John Smith',
    sections: ['Overview', 'Campaign Performance', 'Creator Performance', 'ROI Analysis'],
    date_range: { start: '2024-04-01', end: '2024-06-30' },
  },
  {
    id: '2',
    name: 'Monthly Financial Report - June',
    description: 'Revenue, expenses, and profitability analysis',
    type: 'financial',
    status: 'generated',
    is_favorite: true,
    created_at: '2024-06-01',
    last_generated: '2024-06-30',
    schedule: 'monthly',
    created_by: 'John Smith',
    sections: ['Revenue Summary', 'Invoice Status', 'Creator Payouts', 'Profit Margins'],
    date_range: { start: '2024-06-01', end: '2024-06-30' },
  },
  {
    id: '3',
    name: 'Creator Performance Analysis',
    description: 'Detailed creator metrics and engagement data',
    type: 'creator',
    status: 'generated',
    is_favorite: false,
    created_at: '2024-05-15',
    last_generated: '2024-06-10',
    schedule: null,
    created_by: 'Sarah Johnson',
    sections: ['Creator Overview', 'Engagement Metrics', 'Campaign Success Rate', 'Recommendations'],
    date_range: { start: '2024-01-01', end: '2024-06-30' },
  },
  {
    id: '4',
    name: 'Pipeline Health Report',
    description: 'Deal pipeline analysis and forecasting',
    type: 'pipeline',
    status: 'scheduled',
    is_favorite: false,
    created_at: '2024-06-10',
    last_generated: null,
    schedule: 'weekly',
    created_by: 'John Smith',
    sections: ['Pipeline Overview', 'Stage Distribution', 'Stagnant Deals', 'Win Rate Analysis'],
    date_range: null,
  },
  {
    id: '5',
    name: 'Brand X Campaign Report',
    description: 'Custom report for Brand X campaign results',
    type: 'custom',
    status: 'draft',
    is_favorite: false,
    created_at: '2024-06-18',
    last_generated: null,
    schedule: null,
    created_by: 'John Smith',
    sections: ['Campaign Overview', 'Deliverables', 'Performance Metrics'],
    date_range: { start: '2024-05-01', end: '2024-06-30' },
  },
];

const mockTemplates: ReportTemplate[] = [
  {
    id: 't1',
    name: 'Campaign Performance Report',
    description: 'Comprehensive campaign analysis with ROI metrics and creator performance',
    type: 'campaign',
    icon: Target,
    sections: ['Overview', 'Campaign Timeline', 'Deliverables Status', 'Performance Metrics', 'ROI Analysis'],
    is_popular: true,
  },
  {
    id: 't2',
    name: 'Financial Summary',
    description: 'Revenue, expenses, invoices, and profitability breakdown',
    type: 'financial',
    icon: DollarSign,
    sections: ['Revenue Overview', 'Invoice Status', 'Creator Payouts', 'Expense Breakdown', 'Profit Analysis'],
    is_popular: true,
  },
  {
    id: 't3',
    name: 'Creator Analytics',
    description: 'In-depth creator performance and engagement analysis',
    type: 'creator',
    icon: Users,
    sections: ['Creator Overview', 'Platform Metrics', 'Engagement Analysis', 'Campaign History', 'Rate Analysis'],
    is_popular: true,
  },
  {
    id: 't4',
    name: 'Pipeline Report',
    description: 'Deal pipeline health, conversion rates, and forecasting',
    type: 'pipeline',
    icon: BarChart3,
    sections: ['Pipeline Overview', 'Stage Distribution', 'Velocity Analysis', 'Win/Loss Analysis', 'Forecast'],
    is_popular: false,
  },
  {
    id: 't5',
    name: 'Brand Report',
    description: 'Client-ready report template with campaign highlights',
    type: 'custom',
    icon: Building2,
    sections: ['Executive Summary', 'Campaign Highlights', 'Content Performance', 'Key Metrics', 'Recommendations'],
    is_popular: true,
  },
  {
    id: 't6',
    name: 'Monthly Overview',
    description: 'Monthly snapshot of all agency activities',
    type: 'custom',
    icon: Calendar,
    sections: ['Summary', 'Campaigns', 'Financial', 'Team Activity', 'Next Month Goals'],
    is_popular: false,
  },
];

// Type configs
const reportTypeConfig: Record<ReportType, { label: string; color: string; icon: React.ElementType }> = {
  campaign: { label: 'Campaign', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Target },
  financial: { label: 'Financial', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: DollarSign },
  creator: { label: 'Creator', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Users },
  pipeline: { label: 'Pipeline', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: BarChart3 },
  custom: { label: 'Custom', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: FileText },
};

const statusConfig: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  generated: { label: 'Generated', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [templates] = useState<ReportTemplate[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('reports');
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Report builder state
  const [builderStep, setBuilderStep] = useState(1);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    type: 'campaign' as ReportType,
    sections: [] as string[],
    dateRange: { start: '', end: '' },
    schedule: '',
    format: 'pdf' as ReportFormat,
  });

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Toggle favorite
  const toggleFavorite = (reportId: string) => {
    setReports(prev =>
      prev.map(r => r.id === reportId ? { ...r, is_favorite: !r.is_favorite } : r)
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Download report
  const handleDownload = (report: Report, format: 'pdf' | 'csv' | 'excel' = 'pdf') => {
    toast.success(`Downloading ${report.name} as ${format.toUpperCase()}...`);
    // Simulate download
    setTimeout(() => {
      toast.success(`${report.name}.${format} downloaded successfully`);
    }, 1500);
  };

  // Duplicate report
  const handleDuplicate = (report: Report) => {
    const duplicatedReport: Report = {
      ...report,
      id: `${Date.now()}`,
      name: `${report.name} (Copy)`,
      status: 'draft',
      created_at: new Date().toISOString().split('T')[0],
      last_generated: null,
      is_favorite: false,
    };
    setReports(prev => [duplicatedReport, ...prev]);
    toast.success(`Report duplicated: ${duplicatedReport.name}`);
  };

  // Share report
  const handleShare = (report: Report) => {
    // Copy shareable link to clipboard
    const shareUrl = `${window.location.origin}/agency/reports/${report.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  // Delete report
  const handleDelete = (report: Report) => {
    if (confirm(`Are you sure you want to delete "${report.name}"? This action cannot be undone.`)) {
      setReports(prev => prev.filter(r => r.id !== report.id));
      toast.success(`Report "${report.name}" deleted`);
      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
      }
    }
  };

  // Generate report now
  const handleGenerateNow = (report: Report) => {
    toast.info(`Generating ${report.name}...`);
    // Simulate generation
    setTimeout(() => {
      setReports(prev =>
        prev.map(r =>
          r.id === report.id
            ? { ...r, status: 'generated' as ReportStatus, last_generated: new Date().toISOString().split('T')[0] }
            : r
        )
      );
      toast.success(`${report.name} generated successfully!`);
    }, 2000);
  };

  // Edit report
  const handleEdit = (report: Report) => {
    setNewReport({
      name: report.name,
      description: report.description || '',
      type: report.type,
      sections: report.sections,
      dateRange: report.date_range || { start: '', end: '' },
      schedule: report.schedule || '',
      format: 'pdf',
    });
    setSelectedReport(null);
    setShowReportBuilder(true);
    setBuilderStep(1);
    toast.info(`Editing "${report.name}"`);
  };

  // Edit schedule
  const handleEditSchedule = (report: Report) => {
    const scheduleOptions = ['daily', 'weekly', 'monthly', 'quarterly'];
    const currentIndex = report.schedule ? scheduleOptions.indexOf(report.schedule) : -1;
    const nextIndex = (currentIndex + 1) % scheduleOptions.length;
    const newSchedule = scheduleOptions[nextIndex];

    setReports(prev =>
      prev.map(r =>
        r.id === report.id
          ? { ...r, schedule: newSchedule, status: 'scheduled' as ReportStatus }
          : r
      )
    );
    toast.success(`Schedule updated to: ${newSchedule}`);
  };

  // Start building report from template
  const startFromTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setNewReport({
      ...newReport,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      description: template.description,
      type: template.type,
      sections: template.sections,
    });
    setShowNewReportDialog(false);
    setShowReportBuilder(true);
    setBuilderStep(1);
  };

  // Available sections by type
  const availableSections: Record<ReportType, string[]> = {
    campaign: ['Overview', 'Campaign Timeline', 'Deliverables Status', 'Performance Metrics', 'ROI Analysis', 'Creator Performance', 'Recommendations'],
    financial: ['Revenue Overview', 'Invoice Status', 'Creator Payouts', 'Expense Breakdown', 'Profit Analysis', 'Cash Flow', 'Forecasting'],
    creator: ['Creator Overview', 'Platform Metrics', 'Engagement Analysis', 'Campaign History', 'Rate Analysis', 'Availability', 'Performance Trends'],
    pipeline: ['Pipeline Overview', 'Stage Distribution', 'Velocity Analysis', 'Win/Loss Analysis', 'Stagnant Deals', 'Forecast', 'Conversion Rates'],
    custom: ['Executive Summary', 'Campaign Highlights', 'Content Performance', 'Key Metrics', 'Recommendations', 'Appendix'],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Generate and manage reports for your agency
          </p>
        </div>
        <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
              <DialogDescription>
                Start with a template or build a custom report
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid gap-4">
                {/* Quick Start */}
                <div className="flex items-center gap-4 p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={() => {
                    setShowNewReportDialog(false);
                    setShowReportBuilder(true);
                    setBuilderStep(1);
                    setSelectedTemplate(null);
                    setNewReport({
                      name: '',
                      description: '',
                      type: 'custom',
                      sections: [],
                      dateRange: { start: '', end: '' },
                      schedule: '',
                      format: 'pdf',
                    });
                  }}
                >
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Wand2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Build Custom Report</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a report from scratch with full customization
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                {/* Templates */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Popular Templates
                  </h4>
                  <div className="grid gap-3">
                    {templates.filter(t => t.is_popular).map(template => {
                      const Icon = template.icon;
                      return (
                        <div
                          key={template.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => startFromTemplate(template)}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            reportTypeConfig[template.type].color
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {template.description}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            My Reports
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reports..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Favorites Section */}
          {filteredReports.some(r => r.is_favorite) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Favorites</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredReports.filter(r => r.is_favorite).map(report => {
                  const TypeIcon = reportTypeConfig[report.type].icon;
                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            reportTypeConfig[report.type].color
                          )}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleFavorite(report.id)}
                            >
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(report)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(report)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShare(report)}>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(report)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {report.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                          {report.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge className={statusConfig[report.status].color}>
                            {statusConfig[report.status].label}
                          </Badge>
                          {report.last_generated && (
                            <span className="text-xs text-gray-400">
                              Generated {formatDate(report.last_generated)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Reports */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              All Reports ({filteredReports.length})
            </h3>
            <div className="space-y-3">
              {filteredReports.map(report => {
                const TypeIcon = reportTypeConfig[report.type].icon;
                return (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          reportTypeConfig[report.type].color
                        )}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {report.name}
                            </h3>
                            <Badge className={reportTypeConfig[report.type].color}>
                              {reportTypeConfig[report.type].label}
                            </Badge>
                            <Badge className={statusConfig[report.status].color}>
                              {statusConfig[report.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {report.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {report.schedule && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {report.schedule}
                            </Badge>
                          )}
                          <div className="text-right text-sm text-gray-500">
                            {report.last_generated ? (
                              <span>Generated {formatDate(report.last_generated)}</span>
                            ) : (
                              <span>Created {formatDate(report.created_at)}</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleFavorite(report.id)}
                          >
                            {report.is_favorite ? (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            ) : (
                              <StarOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {report.status === 'generated' && (
                                <DropdownMenuItem onClick={() => handleDownload(report)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleGenerateNow(report)}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Generate Now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(report)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(report)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(report)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {filteredReports.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No reports found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first report to get started'}
                </p>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowNewReportDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn(
                        "h-12 w-12 rounded-lg flex items-center justify-center",
                        reportTypeConfig[template.type].color
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {template.name}
                          </h3>
                          {template.is_popular && (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <Badge className={cn("mt-1", reportTypeConfig[template.type].color)}>
                          {reportTypeConfig[template.type].label}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {template.description}
                    </p>
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Includes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.sections.slice(0, 3).map(section => (
                          <Badge key={section} variant="outline" className="text-xs">
                            {section}
                          </Badge>
                        ))}
                        {template.sections.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.sections.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => startFromTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automatically generated reports on a schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.filter(r => r.schedule).map(report => {
                  const TypeIcon = reportTypeConfig[report.type].icon;
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          reportTypeConfig[report.type].color
                        )}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {report.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {report.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {report.schedule}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleEditSchedule(report)}>
                          Edit Schedule
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!reports.some(r => r.schedule) && (
                  <div className="text-center py-8">
                    <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No scheduled reports yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Builder Dialog */}
      {showReportBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowReportBuilder(false)}
          />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedTemplate ? `Create from: ${selectedTemplate.name}` : 'Build Custom Report'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Step {builderStep} of 3
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowReportBuilder(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex-1">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        step <= builderStep
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                    <p className={cn(
                      "text-xs mt-1",
                      step === builderStep
                        ? "text-green-600 font-medium"
                        : "text-gray-400"
                    )}>
                      {step === 1 ? 'Details' : step === 2 ? 'Sections' : 'Settings'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Step 1: Basic Details */}
              {builderStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      placeholder="e.g., Q2 Performance Report"
                      value={newReport.name}
                      onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="report-description">Description (optional)</Label>
                    <Textarea
                      id="report-description"
                      placeholder="Describe what this report covers..."
                      value={newReport.description}
                      onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(Object.keys(reportTypeConfig) as ReportType[]).map(type => {
                        const config = reportTypeConfig[type];
                        const Icon = config.icon;
                        return (
                          <div
                            key={type}
                            className={cn(
                              "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                              newReport.type === type
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                            onClick={() => setNewReport({ ...newReport, type, sections: [] })}
                          >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", config.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={newReport.dateRange.start}
                        onChange={(e) => setNewReport({
                          ...newReport,
                          dateRange: { ...newReport.dateRange, start: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={newReport.dateRange.end}
                        onChange={(e) => setNewReport({
                          ...newReport,
                          dateRange: { ...newReport.dateRange, end: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Select Sections */}
              {builderStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select the sections to include in your report
                  </p>
                  <div className="space-y-2">
                    {availableSections[newReport.type].map(section => (
                      <div
                        key={section}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                          newReport.sections.includes(section)
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                        onClick={() => {
                          const sections = newReport.sections.includes(section)
                            ? newReport.sections.filter(s => s !== section)
                            : [...newReport.sections, section];
                          setNewReport({ ...newReport, sections });
                        }}
                      >
                        <Checkbox checked={newReport.sections.includes(section)} />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {section}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewReport({ ...newReport, sections: availableSections[newReport.type] })}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewReport({ ...newReport, sections: [] })}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Settings */}
              {builderStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['pdf', 'csv', 'excel', 'presentation'] as ReportFormat[]).map(format => (
                        <div
                          key={format}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors",
                            newReport.format === format
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                          onClick={() => setNewReport({ ...newReport, format })}
                        >
                          <FileBarChart className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase">
                            {format}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule (optional)</Label>
                    <Select
                      value={newReport.schedule}
                      onValueChange={(value) => setNewReport({ ...newReport, schedule: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No schedule (generate once)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No schedule</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Summary */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">Report Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{newReport.name || 'Untitled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <Badge className={reportTypeConfig[newReport.type].color}>
                          {reportTypeConfig[newReport.type].label}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sections:</span>
                        <span>{newReport.sections.length} selected</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Format:</span>
                        <span className="uppercase">{newReport.format}</span>
                      </div>
                      {newReport.schedule && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Schedule:</span>
                          <span className="capitalize">{newReport.schedule}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  if (builderStep > 1) {
                    setBuilderStep(builderStep - 1);
                  } else {
                    setShowReportBuilder(false);
                  }
                }}
              >
                {builderStep === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (builderStep < 3) {
                    setBuilderStep(builderStep + 1);
                  } else {
                    // Create report
                    setShowReportBuilder(false);
                    setBuilderStep(1);
                  }
                }}
                disabled={builderStep === 1 && !newReport.name}
              >
                {builderStep === 3 ? 'Generate Report' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Slide-over */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  reportTypeConfig[selectedReport.type].color
                )}>
                  {React.createElement(reportTypeConfig[selectedReport.type].icon, { className: "h-5 w-5" })}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedReport.name}
                  </h2>
                  <Badge className={statusConfig[selectedReport.status].color}>
                    {statusConfig[selectedReport.status].label}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Actions */}
              <div className="flex gap-3">
                {selectedReport.status === 'generated' && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleDownload(selectedReport)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => handleGenerateNow(selectedReport)}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {selectedReport.status === 'generated' ? 'Regenerate' : 'Generate Now'}
                </Button>
              </div>

              {/* Report Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Report Details
                </h3>
                <div className="space-y-3">
                  {selectedReport.description && (
                    <p className="text-gray-600 dark:text-gray-300">
                      {selectedReport.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {selectedReport.type}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created By</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedReport.created_by}
                      </p>
                    </div>
                    {selectedReport.date_range && (
                      <>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Date Range</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(selectedReport.date_range.start)} - {formatDate(selectedReport.date_range.end)}
                          </p>
                        </div>
                      </>
                    )}
                    {selectedReport.last_generated && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last Generated</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(selectedReport.last_generated)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Report Sections
                </h3>
                <div className="space-y-2">
                  {selectedReport.sections.map((section, idx) => (
                    <div
                      key={section}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-400">
                        {idx + 1}
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">{section}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              {selectedReport.schedule && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Schedule
                  </h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {selectedReport.schedule} generation
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Report is automatically generated {selectedReport.schedule}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
