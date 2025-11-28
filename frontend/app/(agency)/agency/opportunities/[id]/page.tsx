'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  ArrowLeft,
  Save,
  Send,
  X,
  CheckCircle,
  Trash2,
  Plus,
  Clock,
  Eye,
  User,
  Building2,
  DollarSign,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  opportunityApi,
  type AgencyOpportunity,
  type OpportunityStatus,
} from '@/lib/agency-api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<OpportunityStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: <Eye className="h-3 w-3" /> },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: <X className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: <X className="h-3 w-3" /> },
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [opportunity, setOpportunity] = useState<AgencyOpportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    title: '',
    brand_name: '',
    brand_logo_url: '',
    description: '',
    deadline: '',
    content_deadline: '',
    compensation: {
      type: 'flat_fee' as const,
      amount: 0,
      currency: 'USD',
      payment_terms: '',
      product_value: 0,
      notes: '',
    },
    requirements: {
      deliverables: [''],
      content_guidelines: '',
      talking_points: [''],
      restrictions: [''],
    },
  });

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const data = await opportunityApi.get(opportunityId);
        setOpportunity(data);
        setFormData({
          title: data.title,
          brand_name: data.brand_name,
          brand_logo_url: data.brand_logo_url || '',
          description: data.description,
          deadline: data.deadline ? data.deadline.split('T')[0] : '',
          content_deadline: data.content_deadline ? data.content_deadline.split('T')[0] : '',
          compensation: {
            type: data.compensation.type || 'flat_fee',
            amount: data.compensation.amount || 0,
            currency: data.compensation.currency || 'USD',
            payment_terms: data.compensation.payment_terms || '',
            product_value: data.compensation.product_value || 0,
            notes: data.compensation.notes || '',
          },
          requirements: {
            deliverables: data.requirements.deliverables?.length ? data.requirements.deliverables : [''],
            content_guidelines: data.requirements.content_guidelines || '',
            talking_points: data.requirements.talking_points?.length ? data.requirements.talking_points : [''],
            restrictions: data.requirements.restrictions?.length ? data.requirements.restrictions : [''],
          },
        });
      } catch (error) {
        console.error('Failed to fetch opportunity:', error);
        toast.error('Failed to load opportunity');
        router.push('/agency/opportunities');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpportunity();
  }, [opportunityId, router]);

  const handleSave = async () => {
    if (!opportunity) return;

    setIsSaving(true);
    try {
      const updateData = {
        title: formData.title,
        brand_name: formData.brand_name,
        brand_logo_url: formData.brand_logo_url || undefined,
        description: formData.description,
        deadline: formData.deadline || undefined,
        content_deadline: formData.content_deadline || undefined,
        compensation: {
          ...formData.compensation,
          amount: formData.compensation.amount || undefined,
          product_value: formData.compensation.product_value || undefined,
        },
        requirements: {
          deliverables: formData.requirements.deliverables.filter(d => d.trim()),
          content_guidelines: formData.requirements.content_guidelines || undefined,
          talking_points: formData.requirements.talking_points.filter(t => t.trim()),
          restrictions: formData.requirements.restrictions.filter(r => r.trim()),
        },
      };

      const updated = await opportunityApi.update(opportunityId, updateData);
      setOpportunity(updated);
      setIsEditing(false);
      toast.success('Opportunity updated successfully');
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      toast.error('Failed to update opportunity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!opportunity) return;

    setIsSaving(true);
    try {
      const updated = await opportunityApi.send(opportunityId);
      setOpportunity(updated);
      toast.success('Opportunity sent to creator!');
    } catch (error) {
      console.error('Failed to send opportunity:', error);
      toast.error('Failed to send opportunity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!opportunity) return;

    setIsSaving(true);
    try {
      const updated = await opportunityApi.cancel(opportunityId);
      setOpportunity(updated);
      toast.success('Opportunity cancelled');
    } catch (error) {
      console.error('Failed to cancel opportunity:', error);
      toast.error('Failed to cancel opportunity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!opportunity) return;

    setIsSaving(true);
    try {
      const updated = await opportunityApi.complete(opportunityId);
      setOpportunity(updated);
      toast.success('Opportunity marked as completed!');
    } catch (error) {
      console.error('Failed to complete opportunity:', error);
      toast.error('Failed to mark as completed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;

    setIsSaving(true);
    try {
      await opportunityApi.delete(opportunityId);
      toast.success('Opportunity deleted');
      router.push('/agency/opportunities');
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      toast.error('Failed to delete opportunity');
    } finally {
      setIsSaving(false);
    }
  };

  const addArrayItem = (field: 'deliverables' | 'talking_points' | 'restrictions') => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [field]: [...prev.requirements[field], ''],
      },
    }));
  };

  const removeArrayItem = (field: 'deliverables' | 'talking_points' | 'restrictions', index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [field]: prev.requirements[field].filter((_, i) => i !== index),
      },
    }));
  };

  const updateArrayItem = (field: 'deliverables' | 'talking_points' | 'restrictions', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [field]: prev.requirements[field].map((item, i) => i === index ? value : item),
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Opportunity not found</p>
        <Button asChild className="mt-4">
          <Link href="/agency/opportunities">Back to Opportunities</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[opportunity.status];
  const canEdit = opportunity.status === 'draft';
  const canSend = opportunity.status === 'draft';
  const canCancel = ['sent', 'viewed'].includes(opportunity.status);
  const canComplete = opportunity.status === 'accepted';
  const canDelete = opportunity.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agency/opportunities">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {opportunity.title}
              </h1>
              <Badge className={status.color}>
                <span className="mr-1">{status.icon}</span>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              For {opportunity.creator_full_name || opportunity.creator_email || 'Creator'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
          {canSend && !isEditing && (
            <Button onClick={handleSend} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Send to Creator
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleComplete} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Completed
            </Button>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this opportunity?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will notify the creator that the opportunity has been cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Open</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-orange-600 hover:bg-orange-700">
                    Cancel Opportunity
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The opportunity will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Creator Response Note */}
      {opportunity.creator_notes && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Creator&apos;s Response Note</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opportunity.creator_notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Opportunity Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="brand_name">Brand Name</Label>
                      <Input
                        id="brand_name"
                        value={formData.brand_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand_logo_url">Brand Logo URL</Label>
                      <Input
                        id="brand_logo_url"
                        value={formData.brand_logo_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand_logo_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {opportunity.brand_logo_url ? (
                        <img src={opportunity.brand_logo_url} alt={opportunity.brand_name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{opportunity.brand_name}</p>
                      <p className="text-sm text-gray-500">Brand Partner</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{opportunity.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Deliverables */}
              <div className="space-y-3">
                <Label>Deliverables</Label>
                {isEditing ? (
                  <>
                    {formData.requirements.deliverables.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateArrayItem('deliverables', index, e.target.value)}
                          placeholder="e.g., 1 YouTube video (10+ minutes)"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('deliverables', index)}
                          disabled={formData.requirements.deliverables.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('deliverables')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deliverable
                    </Button>
                  </>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {opportunity.requirements.deliverables?.map((item, i) => (
                      <li key={i}>{item}</li>
                    )) || <li className="text-gray-400">No deliverables specified</li>}
                  </ul>
                )}
              </div>

              {/* Talking Points */}
              <div className="space-y-3">
                <Label>Talking Points</Label>
                {isEditing ? (
                  <>
                    {formData.requirements.talking_points.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateArrayItem('talking_points', index, e.target.value)}
                          placeholder="Key point to mention"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('talking_points', index)}
                          disabled={formData.requirements.talking_points.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('talking_points')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Talking Point
                    </Button>
                  </>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {opportunity.requirements.talking_points?.map((item, i) => (
                      <li key={i}>{item}</li>
                    )) || <li className="text-gray-400">No talking points specified</li>}
                  </ul>
                )}
              </div>

              {/* Restrictions */}
              <div className="space-y-3">
                <Label>Restrictions</Label>
                {isEditing ? (
                  <>
                    {formData.requirements.restrictions.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updateArrayItem('restrictions', index, e.target.value)}
                          placeholder="e.g., No competitor mentions"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeArrayItem('restrictions', index)}
                          disabled={formData.requirements.restrictions.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('restrictions')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Restriction
                    </Button>
                  </>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {opportunity.requirements.restrictions?.map((item, i) => (
                      <li key={i} className="text-orange-600 dark:text-orange-400">{item}</li>
                    )) || <li className="text-gray-400">No restrictions specified</li>}
                  </ul>
                )}
              </div>

              {/* Content Guidelines */}
              <div className="space-y-2">
                <Label>Content Guidelines</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.requirements.content_guidelines}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      requirements: { ...prev.requirements, content_guidelines: e.target.value }
                    }))}
                    placeholder="Additional guidelines for content creation..."
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {opportunity.requirements.content_guidelines || <span className="text-gray-400">No additional guidelines</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compensation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select
                      value={formData.compensation.type}
                      onValueChange={(value: 'flat_fee' | 'cpm' | 'hybrid' | 'product_only') =>
                        setFormData(prev => ({ ...prev, compensation: { ...prev.compensation, type: value } }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat_fee">Flat Fee</SelectItem>
                        <SelectItem value="cpm">CPM</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="product_only">Product Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.compensation.type !== 'product_only' && (
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          value={formData.compensation.amount || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            compensation: { ...prev.compensation, amount: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={formData.compensation.currency}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            compensation: { ...prev.compensation, currency: value }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input
                      value={formData.compensation.payment_terms}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        compensation: { ...prev.compensation, payment_terms: e.target.value }
                      }))}
                      placeholder="e.g., Net 30 after content goes live"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {opportunity.compensation.type === 'product_only' ? (
                        'Product Only'
                      ) : (
                        `${opportunity.compensation.currency || 'USD'} ${opportunity.compensation.amount?.toLocaleString() || 0}`
                      )}
                    </p>
                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {opportunity.compensation.type?.replace('_', ' ')}
                    </p>
                  </div>
                  {opportunity.compensation.payment_terms && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500">Payment Terms</p>
                      <p className="text-gray-700 dark:text-gray-300">{opportunity.compensation.payment_terms}</p>
                    </div>
                  )}
                  {opportunity.compensation.notes && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-700 dark:text-gray-300">{opportunity.compensation.notes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Response Deadline</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content Deadline</Label>
                    <Input
                      type="date"
                      value={formData.content_deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, content_deadline: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Response By</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'No deadline set'}
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">Content Due</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {opportunity.content_deadline ? new Date(opportunity.content_deadline).toLocaleDateString() : 'No deadline set'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(opportunity.created_at).toLocaleDateString()}
                </span>
              </div>
              {opportunity.sent_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(opportunity.sent_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.viewed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Viewed</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(opportunity.viewed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {opportunity.creator_response_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {opportunity.status === 'accepted' ? 'Accepted' : opportunity.status === 'declined' ? 'Declined' : 'Responded'}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(opportunity.creator_response_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
