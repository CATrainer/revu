'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  User,
  Calendar,
  Plus,
  X,
  Send,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { agencyApi, opportunityApi, type AgencyCreator, type CreateOpportunityData } from '@/lib/agency-api';
import { toast } from 'sonner';

type CompensationType = 'flat_fee' | 'cpm' | 'hybrid' | 'product_only';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCreators, setIsFetchingCreators] = useState(true);
  const [creators, setCreators] = useState<AgencyCreator[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    creator_id: '',
    title: '',
    brand_name: '',
    brand_logo_url: '',
    description: '',
    deadline: '',
    content_deadline: '',
    // Compensation
    compensation_type: 'flat_fee' as CompensationType,
    compensation_amount: '',
    compensation_currency: 'USD',
    compensation_payment_terms: '',
    compensation_product_value: '',
    compensation_notes: '',
    // Requirements
    deliverables: [''],
    talking_points: [''],
    restrictions: [''],
    content_guidelines: '',
  });

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const data = await agencyApi.getCreators();
      setCreators(data);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setIsFetchingCreators(false);
    }
  };

  const handleArrayItemChange = (field: 'deliverables' | 'talking_points' | 'restrictions', index: number, value: string) => {
    setFormData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: 'deliverables' | 'talking_points' | 'restrictions') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  const removeArrayItem = (field: 'deliverables' | 'talking_points' | 'restrictions', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const buildOpportunityData = (): CreateOpportunityData => {
    const compensation: CreateOpportunityData['compensation'] = {
      type: formData.compensation_type,
      currency: formData.compensation_currency,
    };

    if (formData.compensation_amount) {
      compensation.amount = parseFloat(formData.compensation_amount);
    }
    if (formData.compensation_payment_terms) {
      compensation.payment_terms = formData.compensation_payment_terms;
    }
    if (formData.compensation_product_value) {
      compensation.product_value = parseFloat(formData.compensation_product_value);
    }
    if (formData.compensation_notes) {
      compensation.notes = formData.compensation_notes;
    }

    const requirements: CreateOpportunityData['requirements'] = {};
    const filteredDeliverables = formData.deliverables.filter((d) => d.trim());
    const filteredTalkingPoints = formData.talking_points.filter((t) => t.trim());
    const filteredRestrictions = formData.restrictions.filter((r) => r.trim());

    if (filteredDeliverables.length) requirements.deliverables = filteredDeliverables;
    if (filteredTalkingPoints.length) requirements.talking_points = filteredTalkingPoints;
    if (filteredRestrictions.length) requirements.restrictions = filteredRestrictions;
    if (formData.content_guidelines) requirements.content_guidelines = formData.content_guidelines;

    return {
      creator_id: formData.creator_id,
      title: formData.title,
      brand_name: formData.brand_name,
      brand_logo_url: formData.brand_logo_url || undefined,
      description: formData.description,
      deadline: formData.deadline || undefined,
      content_deadline: formData.content_deadline || undefined,
      compensation,
      requirements,
    };
  };

  const handleSaveAsDraft = async () => {
    if (!formData.creator_id || !formData.title || !formData.brand_name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const data = buildOpportunityData();
      await opportunityApi.create(data);
      toast.success('Opportunity saved as draft');
      router.push('/agency/opportunities');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to save opportunity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndSend = async () => {
    if (!formData.creator_id || !formData.title || !formData.brand_name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const data = buildOpportunityData();
      const opportunity = await opportunityApi.create(data);
      await opportunityApi.send(opportunity.id);
      toast.success('Opportunity created and sent to creator!');
      router.push('/agency/opportunities');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to create opportunity');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingCreators) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/agency/opportunities"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Opportunities
          </Link>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No creators in your agency
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                You need to invite creators to your agency before you can send them opportunities.
              </p>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/agency/creators">
                  <User className="mr-2 h-4 w-4" />
                  Invite Creators
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/agency/opportunities"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Opportunities
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Sponsorship Opportunity
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Create a new sponsorship opportunity for one of your creators
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the main details about this sponsorship opportunity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creator">Creator *</Label>
              <Select
                value={formData.creator_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, creator_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {creator.full_name || creator.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Opportunity Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Summer Product Launch Campaign"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name *</Label>
                <Input
                  id="brand_name"
                  placeholder="e.g., Acme Corp"
                  value={formData.brand_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_logo_url">Brand Logo URL</Label>
                <Input
                  id="brand_logo_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.brand_logo_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand_logo_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the sponsorship opportunity, what the brand is looking for, and any important context..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Response Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                />
                <p className="text-xs text-gray-500">When the creator needs to respond by</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content_deadline">Content Deadline</Label>
                <Input
                  id="content_deadline"
                  type="datetime-local"
                  value={formData.content_deadline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content_deadline: e.target.value }))}
                />
                <p className="text-xs text-gray-500">When the content needs to be delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Compensation
            </CardTitle>
            <CardDescription>
              Define the payment terms for this sponsorship
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compensation_type">Compensation Type</Label>
                <Select
                  value={formData.compensation_type}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, compensation_type: v as CompensationType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat_fee">Flat Fee</SelectItem>
                    <SelectItem value="cpm">CPM (Per 1000 views)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Fee + CPM)</SelectItem>
                    <SelectItem value="product_only">Product Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensation_currency">Currency</Label>
                <Select
                  value={formData.compensation_currency}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, compensation_currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compensation_amount">Payment Amount</Label>
                <Input
                  id="compensation_amount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.compensation_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, compensation_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensation_product_value">Product Value</Label>
                <Input
                  id="compensation_product_value"
                  type="number"
                  placeholder="e.g., 500"
                  value={formData.compensation_product_value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, compensation_product_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensation_payment_terms">Payment Terms</Label>
              <Input
                id="compensation_payment_terms"
                placeholder="e.g., 50% upfront, 50% on completion"
                value={formData.compensation_payment_terms}
                onChange={(e) => setFormData((prev) => ({ ...prev, compensation_payment_terms: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensation_notes">Additional Notes</Label>
              <Textarea
                id="compensation_notes"
                placeholder="Any additional compensation details..."
                rows={2}
                value={formData.compensation_notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, compensation_notes: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Requirements
            </CardTitle>
            <CardDescription>
              Specify what the creator needs to deliver
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deliverables */}
            <div className="space-y-2">
              <Label>Deliverables</Label>
              <p className="text-xs text-gray-500 mb-2">What content does the creator need to produce?</p>
              {formData.deliverables.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., 1 YouTube video (10+ mins)"
                    value={item}
                    onChange={(e) => handleArrayItemChange('deliverables', index, e.target.value)}
                  />
                  {formData.deliverables.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('deliverables', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('deliverables')}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Deliverable
              </Button>
            </div>

            {/* Talking Points */}
            <div className="space-y-2">
              <Label>Key Talking Points</Label>
              <p className="text-xs text-gray-500 mb-2">What should the creator mention?</p>
              {formData.talking_points.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., Highlight the product's ease of use"
                    value={item}
                    onChange={(e) => handleArrayItemChange('talking_points', index, e.target.value)}
                  />
                  {formData.talking_points.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('talking_points', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('talking_points')}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Talking Point
              </Button>
            </div>

            {/* Restrictions */}
            <div className="space-y-2">
              <Label>Restrictions</Label>
              <p className="text-xs text-gray-500 mb-2">What should the creator avoid?</p>
              {formData.restrictions.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., No competitor mentions"
                    value={item}
                    onChange={(e) => handleArrayItemChange('restrictions', index, e.target.value)}
                  />
                  {formData.restrictions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('restrictions', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('restrictions')}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Restriction
              </Button>
            </div>

            {/* Content Guidelines */}
            <div className="space-y-2">
              <Label htmlFor="content_guidelines">Content Guidelines</Label>
              <Textarea
                id="content_guidelines"
                placeholder="Any additional guidelines for the content..."
                rows={3}
                value={formData.content_guidelines}
                onChange={(e) => setFormData((prev) => ({ ...prev, content_guidelines: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleCreateAndSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Create & Send to Creator
          </Button>
        </div>
      </div>
    </div>
  );
}
