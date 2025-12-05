'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  ChevronDown,
  ExternalLink,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  Target,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { pushToast } from '@/components/ui/toast';

interface BrandDeal {
  id: string;
  brand_name: string;
  brand_logo_url?: string;
  source: 'self' | 'agency';
  agency_name?: string;
  status: 'negotiating' | 'contracted' | 'in_progress' | 'completed' | 'cancelled';
  deal_type: 'sponsored_post' | 'affiliate' | 'ambassador' | 'product_review' | 'other';
  payment_amount?: number;
  payment_currency: string;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  deliverables: Deliverable[];
  start_date?: string;
  end_date?: string;
  notes?: string;
  contract_url?: string;
  created_at: string;
}

interface Deliverable {
  id: string;
  description: string;
  platform: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_needed';
  content_url?: string;
}

interface DealStats {
  total_deals: number;
  total_earnings: number;
  pending_payments: number;
  active_deals: number;
  completed_this_month: number;
  avg_deal_value: number;
}

interface DealTrackerProps {
  className?: string;
}

const statusColors: Record<string, string> = {
  negotiating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  contracted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'text-yellow-600',
  partial: 'text-blue-600',
  paid: 'text-green-600',
  overdue: 'text-red-600',
};

const dealTypeLabels: Record<string, string> = {
  sponsored_post: 'Sponsored Post',
  affiliate: 'Affiliate',
  ambassador: 'Ambassador',
  product_review: 'Product Review',
  other: 'Other',
};

export function DealTracker({ className }: DealTrackerProps) {
  const [deals, setDeals] = useState<BrandDeal[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<BrandDeal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  useEffect(() => {
    loadDeals();
    loadStats();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/deals');
      setDeals(response.data.deals || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
      setDeals(getDemoDeals());
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/creator/deals/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(getDemoStats());
    }
  };

  const handleCreateDeal = async (data: Partial<BrandDeal>) => {
    try {
      const response = await api.post('/creator/deals', data);
      setDeals([response.data, ...deals]);
      setShowAddDeal(false);
      pushToast('Deal created successfully!', 'success');
      loadStats();
    } catch (error) {
      console.error('Failed to create deal:', error);
      pushToast('Failed to create deal', 'error');
    }
  };

  const handleUpdateDeal = async (id: string, data: Partial<BrandDeal>) => {
    try {
      const response = await api.put(`/creator/deals/${id}`, data);
      setDeals(deals.map((d) => (d.id === id ? response.data : d)));
      setEditingDeal(null);
      pushToast('Deal updated successfully!', 'success');
      loadStats();
    } catch (error) {
      console.error('Failed to update deal:', error);
      pushToast('Failed to update deal', 'error');
    }
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      await api.delete(`/creator/deals/${id}`);
      setDeals(deals.filter((d) => d.id !== id));
      pushToast('Deal deleted', 'success');
      loadStats();
    } catch (error) {
      console.error('Failed to delete deal:', error);
      pushToast('Failed to delete deal', 'error');
    }
  };

  const filteredDeals = deals.filter((deal) => {
    if (filterStatus !== 'all' && deal.status !== filterStatus) return false;
    if (filterSource !== 'all' && deal.source !== filterSource) return false;
    return true;
  });

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Deal Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Manage your brand deals and sponsorships
          </p>
        </div>
        <Button onClick={() => setShowAddDeal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.total_earnings)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.pending_payments)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-xl font-bold">{stats.active_deals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Deal Value</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.avg_deal_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="negotiating">Negotiating</SelectItem>
            <SelectItem value="contracted">Contracted</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="self">Self-Managed</SelectItem>
            <SelectItem value="agency">Via Agency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDeals.length === 0 ? (
        <Card className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium">No deals yet</h3>
          <p className="text-muted-foreground mb-4">
            Start tracking your brand deals and sponsorships
          </p>
          <Button onClick={() => setShowAddDeal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Deal
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeals.map((deal) => (
            <Card key={deal.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Brand Info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {deal.brand_logo_url ? (
                          <img
                            src={deal.brand_logo_url}
                            alt={deal.brand_name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-primary-dark">{deal.brand_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[deal.status])}>
                              {deal.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dealTypeLabels[deal.deal_type]}
                            </span>
                            {deal.source === 'agency' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                via {deal.agency_name || 'Agency'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDeal(deal)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Deal
                          </DropdownMenuItem>
                          {deal.contract_url && (
                            <DropdownMenuItem asChild>
                              <a href={deal.contract_url} target="_blank" rel="noopener">
                                <FileText className="h-4 w-4 mr-2" />
                                View Contract
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteDeal(deal.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Deliverables */}
                    {deal.deliverables.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Deliverables</p>
                        <div className="space-y-2">
                          {deal.deliverables.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                {d.status === 'approved' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : d.status === 'revision_needed' ? (
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>{d.description}</span>
                                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                                  {d.platform}
                                </span>
                              </div>
                              {d.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(d.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {(deal.start_date || deal.end_date) && (
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {deal.start_date && <span>Start: {new Date(deal.start_date).toLocaleDateString()}</span>}
                        {deal.end_date && <span>End: {new Date(deal.end_date).toLocaleDateString()}</span>}
                      </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="w-48 p-4 bg-muted/30 border-l flex flex-col justify-center">
                    {deal.payment_amount ? (
                      <>
                        <p className="text-2xl font-bold text-primary-dark">
                          {formatCurrency(deal.payment_amount, deal.payment_currency)}
                        </p>
                        <p className={cn('text-sm font-medium', paymentStatusColors[deal.payment_status])}>
                          {deal.payment_status === 'paid' ? '✓ Paid' : deal.payment_status}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No payment info</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Deal Dialog */}
      <DealFormDialog
        open={showAddDeal || !!editingDeal}
        onClose={() => {
          setShowAddDeal(false);
          setEditingDeal(null);
        }}
        deal={editingDeal}
        onSave={(data) => {
          if (editingDeal) {
            handleUpdateDeal(editingDeal.id, data);
          } else {
            handleCreateDeal(data);
          }
        }}
      />
    </div>
  );
}

interface DealFormDialogProps {
  open: boolean;
  onClose: () => void;
  deal: BrandDeal | null;
  onSave: (data: Partial<BrandDeal>) => void;
}

function DealFormDialog({ open, onClose, deal, onSave }: DealFormDialogProps) {
  const [formData, setFormData] = useState<Partial<BrandDeal>>({
    brand_name: '',
    source: 'self',
    status: 'negotiating',
    deal_type: 'sponsored_post',
    payment_currency: 'USD',
    payment_status: 'pending',
    deliverables: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deal) {
      setFormData(deal);
    } else {
      setFormData({
        brand_name: '',
        source: 'self',
        status: 'negotiating',
        deal_type: 'sponsored_post',
        payment_currency: 'USD',
        payment_status: 'pending',
        deliverables: [],
      });
    }
  }, [deal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Brand Name *</label>
            <Input
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              placeholder="e.g., TechGadgets Co."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Source</label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData({ ...formData, source: v as 'self' | 'agency' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self-Managed</SelectItem>
                  <SelectItem value="agency">Via Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Deal Type</label>
              <Select
                value={formData.deal_type}
                onValueChange={(v) => setFormData({ ...formData, deal_type: v as BrandDeal['deal_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sponsored_post">Sponsored Post</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="product_review">Product Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                value={formData.payment_amount || ''}
                onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as BrandDeal['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="contracted">Contracted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={formData.start_date?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={formData.end_date?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details about this deal..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.brand_name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Demo data
function getDemoDeals(): BrandDeal[] {
  return [
    {
      id: '1',
      brand_name: 'TechGadgets Pro',
      source: 'self',
      status: 'in_progress',
      deal_type: 'sponsored_post',
      payment_amount: 2500,
      payment_currency: 'USD',
      payment_status: 'pending',
      deliverables: [
        { id: 'd1', description: 'YouTube integration video', platform: 'YouTube', due_date: '2024-02-15', status: 'in_progress' },
        { id: 'd2', description: 'Instagram story series', platform: 'Instagram', due_date: '2024-02-20', status: 'pending' },
      ],
      start_date: '2024-02-01',
      end_date: '2024-02-28',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      brand_name: 'FitLife Supplements',
      brand_logo_url: 'https://placeholder.co/100x100',
      source: 'agency',
      agency_name: 'Creator Management Co.',
      status: 'completed',
      deal_type: 'ambassador',
      payment_amount: 5000,
      payment_currency: 'USD',
      payment_status: 'paid',
      deliverables: [
        { id: 'd3', description: 'Monthly sponsored posts', platform: 'All', status: 'approved' },
      ],
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      brand_name: 'GameStream',
      source: 'self',
      status: 'negotiating',
      deal_type: 'affiliate',
      payment_currency: 'USD',
      payment_status: 'pending',
      deliverables: [],
      notes: 'Discussing affiliate commission rates',
      created_at: new Date().toISOString(),
    },
  ];
}

function getDemoStats(): DealStats {
  return {
    total_deals: 12,
    total_earnings: 45000,
    pending_payments: 7500,
    active_deals: 3,
    completed_this_month: 2,
    avg_deal_value: 3750,
  };
}
