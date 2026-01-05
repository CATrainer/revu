'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  FileText,
  BarChart3,
  Download,
  MoreVertical,
  Eye,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  FileDown,
  Archive,
  Mail,
  X,
} from 'lucide-react';
import { reportApi, campaignApi } from '@/lib/agency-dashboard-api';
import type { Report, ReportStatus, Campaign } from '@/lib/agency-dashboard-api';

// Status configuration
const statusConfig: Record<ReportStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { 
    label: 'Draft', 
    color: 'text-slate-600 dark:text-slate-400', 
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Clock 
  },
  sent: { 
    label: 'Sent', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    icon: Send 
  },
  viewed: { 
    label: 'Viewed', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: Eye 
  },
  downloaded: { 
    label: 'Downloaded', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    icon: Download 
  },
  archived: { 
    label: 'Archived', 
    color: 'text-gray-500 dark:text-gray-500', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: Archive 
  },
};

// Available report sections
const reportSections = [
  { id: 'overview', label: 'Campaign Overview', description: 'Summary of campaign goals and scope' },
  { id: 'creators', label: 'Creator Performance', description: 'Individual creator metrics' },
  { id: 'content', label: 'Content Metrics', description: 'Views, engagement, and reach' },
  { id: 'audience', label: 'Audience Insights', description: 'Demographics and audience analysis' },
  { id: 'roi', label: 'ROI Analysis', description: 'Return on investment breakdown' },
  { id: 'recommendations', label: 'Recommendations', description: 'Insights and next steps' },
];

// Report templates
const reportTemplates = [
  { id: 'standard', label: 'Standard Report', sections: ['overview', 'creators', 'content', 'roi'] },
  { id: 'detailed', label: 'Detailed Analysis', sections: ['overview', 'creators', 'content', 'audience', 'roi', 'recommendations'] },
  { id: 'executive', label: 'Executive Summary', sections: ['overview', 'roi'] },
  { id: 'creator-focused', label: 'Creator Focused', sections: ['creators', 'content', 'audience'] },
];

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Create report form state
  const [reportForm, setReportForm] = useState({
    campaign_id: '',
    title: '',
    template: 'standard',
    sections: ['overview', 'creators', 'content', 'roi'] as string[],
    include_metrics: true,
  });

  // Send dialog state
  const [sendForm, setSendForm] = useState({
    recipients: '',
    subject: '',
    message: '',
  });

  // Fetch reports
  const { data: reports = [], isLoading, error } = useQuery({
    queryKey: ['agency-reports', statusFilter],
    queryFn: () => reportApi.getReports(statusFilter !== 'all' ? { status: statusFilter as ReportStatus } : undefined),
  });

  // Fetch campaigns for dropdown
  const { data: campaigns = [] } = useQuery({
    queryKey: ['agency-campaigns-for-reports'],
    queryFn: () => campaignApi.getCampaigns({ status: 'active' }),
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: reportApi.createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success('Report created successfully');
    },
    onError: () => toast.error('Failed to create report'),
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: reportApi.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports'] });
      toast.success('Report deleted');
    },
    onError: () => toast.error('Failed to delete report'),
  });

  // Send report mutation
  const sendReportMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { recipients: string[]; subject?: string; message?: string } }) =>
      reportApi.sendReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports'] });
      setShowSendDialog(false);
      setSelectedReport(null);
      setSendForm({ recipients: '', subject: '', message: '' });
      toast.success('Report sent successfully');
    },
    onError: () => toast.error('Failed to send report'),
  });

  // Reset form
  const resetForm = () => {
    setReportForm({
      campaign_id: '',
      title: '',
      template: 'standard',
      sections: ['overview', 'creators', 'content', 'roi'],
      include_metrics: true,
    });
  };

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (template) {
      setReportForm(prev => ({
        ...prev,
        template: templateId,
        sections: template.sections,
      }));
    }
  };

  // Toggle section
  const toggleSection = (sectionId: string) => {
    setReportForm(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(s => s !== sectionId)
        : [...prev.sections, sectionId],
    }));
  };

  // Handle create report
  const handleCreateReport = () => {
    if (!reportForm.campaign_id) {
      toast.error('Please select a campaign');
      return;
    }
    if (!reportForm.title.trim()) {
      toast.error('Please enter a report title');
      return;
    }
    if (reportForm.sections.length === 0) {
      toast.error('Please select at least one section');
      return;
    }
    
    createReportMutation.mutate({
      campaign_id: reportForm.campaign_id,
      title: reportForm.title,
      template: reportForm.template,
      sections: reportForm.sections,
      include_metrics: reportForm.include_metrics,
    });
  };

  // Handle send report
  const handleSendReport = () => {
    if (!selectedReport) return;
    if (!sendForm.recipients.trim()) {
      toast.error('Please enter recipient email(s)');
      return;
    }
    
    const recipients = sendForm.recipients.split(',').map(e => e.trim()).filter(Boolean);
    sendReportMutation.mutate({
      id: selectedReport.id,
      data: {
        recipients,
        subject: sendForm.subject || undefined,
        message: sendForm.message || undefined,
      },
    });
  };

  // Handle export
  const handleExport = async (report: Report, format: 'pdf' | 'csv') => {
    try {
      toast.info(`Preparing ${format.toUpperCase()} export...`);
      const blob = await reportApi.exportReport(report.id, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch {
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  // Handle delete
  const handleDelete = (report: Report) => {
    if (confirm(`Delete report "${report.title}"? This cannot be undone.`)) {
      deleteReportMutation.mutate(report.id);
    }
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = searchQuery === '' ||
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.brand_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [reports, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const sent = reports.filter(r => r.status === 'sent' || r.status === 'viewed' || r.status === 'downloaded').length;
    const viewed = reports.filter(r => r.status === 'viewed' || r.status === 'downloaded').length;
    const drafts = reports.filter(r => r.status === 'draft').length;
    return { total, sent, viewed, drafts };
  }, [reports]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unable to load reports</h3>
        <p className="text-gray-500 dark:text-gray-400">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and manage campaign reports</p>
        </div>
        <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4" />
          Create Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
              <FileText className="h-4 w-4" />
              Total Reports
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm mb-2">
              <Send className="h-4 w-4" />
              Sent
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.sent}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm mb-2">
              <Eye className="h-4 w-4" />
              Viewed
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.viewed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-2">
              <Clock className="h-4 w-4" />
              Drafts
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.drafts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            All
          </Button>
          {(['draft', 'sent', 'viewed', 'downloaded'] as ReportStatus[]).map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {statusConfig[status].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No matching reports' : 'No reports yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first report to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => {
                    const StatusIcon = statusConfig[report.status]?.icon || FileText;
                    
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              statusConfig[report.status]?.bgColor || 'bg-gray-100'
                            )}>
                              <FileText className={cn("h-5 w-5", statusConfig[report.status]?.color || 'text-gray-600')} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{report.title}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {report.creator_names?.slice(0, 2).join(', ')}
                                {report.creator_names?.length > 2 && ` +${report.creator_names.length - 2}`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-900 dark:text-gray-100">{report.brand_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", statusConfig[report.status]?.bgColor, statusConfig[report.status]?.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[report.status]?.label || report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDate(report.generated_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {report.pdf_url && (
                                <DropdownMenuItem onClick={() => window.open(report.pdf_url, '_blank')}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Report
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleExport(report, 'pdf')}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(report, 'csv')}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Download CSV
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setSelectedReport(report);
                                setSendForm({
                                  recipients: report.sent_to?.join(', ') || '',
                                  subject: `Campaign Report: ${report.title}`,
                                  message: '',
                                });
                                setShowSendDialog(true);
                              }}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Report
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(report)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create New Report
            </DialogTitle>
            <DialogDescription>
              Generate a campaign performance report with configurable sections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Campaign Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Campaign *</Label>
              <Select
                value={reportForm.campaign_id}
                onValueChange={(value) => setReportForm(prev => ({ ...prev, campaign_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} - {campaign.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Title */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Report Title *</Label>
              <Input
                placeholder="e.g., Q1 2024 Campaign Performance Report"
                value={reportForm.title}
                onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Report Template</Label>
              <Select
                value={reportForm.template}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Report Sections</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportSections.map(section => (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      reportForm.sections.includes(section.id)
                        ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                    onClick={() => toggleSection(section.id)}
                  >
                    <Checkbox
                      checked={reportForm.sections.includes(section.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{section.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Include Metrics Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <Checkbox
                checked={reportForm.include_metrics}
                onCheckedChange={(checked) => setReportForm(prev => ({ ...prev, include_metrics: !!checked }))}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Include Performance Metrics</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add impressions, engagement, and ROI data</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateReport}
              disabled={createReportMutation.isPending}
            >
              {createReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Report Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Report
            </DialogTitle>
            <DialogDescription>
              Send "{selectedReport?.title}" to recipients via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipients *</Label>
              <Input
                placeholder="email@example.com, another@example.com"
                value={sendForm.recipients}
                onChange={(e) => setSendForm(prev => ({ ...prev, recipients: e.target.value }))}
              />
              <p className="text-xs text-gray-500">Separate multiple emails with commas</p>
            </div>

            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                placeholder="Campaign Report"
                value={sendForm.subject}
                onChange={(e) => setSendForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Input
                placeholder="Add a personal message..."
                value={sendForm.message}
                onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSendReport}
              disabled={sendReportMutation.isPending}
            >
              {sendReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
