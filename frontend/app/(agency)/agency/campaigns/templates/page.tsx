'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText, MoreHorizontal, Edit, Trash2, Copy, Eye, Upload, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Template type
interface Template {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  usageCount: number;
  category: string;
}

// Mock templates
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Standard Sponsored Post',
    description: 'Template for typical sponsored content campaigns',
    deliverables: ['Script approval', 'Video draft', 'Final video', 'Social media post'],
    usageCount: 24,
    category: 'Sponsored',
  },
  {
    id: '2',
    name: 'Product Review',
    description: 'Complete product review workflow with multiple touchpoints',
    deliverables: ['Unboxing content', 'Review script', 'Video review', 'Written review'],
    usageCount: 18,
    category: 'Review',
  },
  {
    id: '3',
    name: 'Brand Ambassador',
    description: 'Long-term ambassador engagement template',
    deliverables: ['Monthly content plan', 'Weekly posts', 'Story mentions', 'Quarterly report'],
    usageCount: 8,
    category: 'Ambassador',
  },
  {
    id: '4',
    name: 'UGC Campaign',
    description: 'User-generated content creation workflow',
    deliverables: ['Raw footage', 'B-roll clips', 'Usage rights', 'Final edits'],
    usageCount: 12,
    category: 'UGC',
  },
];

export default function CampaignTemplatesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [showUseTemplateDialog, setShowUseTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    deliverables: '',
    category: 'Sponsored',
  });
  const [newCampaignForm, setNewCampaignForm] = useState({
    brand_name: '',
    budget: '',
  });

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    if (!newTemplateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateForm.name,
      description: newTemplateForm.description,
      deliverables: newTemplateForm.deliverables.split('\n').filter(d => d.trim()),
      usageCount: 0,
      category: newTemplateForm.category,
    };
    setTemplates(prev => [...prev, newTemplate]);
    toast.success('Template created successfully');
    setShowNewTemplateDialog(false);
    setNewTemplateForm({ name: '', description: '', deliverables: '', category: 'Sponsored' });
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate || !newTemplateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? {
      ...t,
      name: newTemplateForm.name,
      description: newTemplateForm.description,
      deliverables: newTemplateForm.deliverables.split('\n').filter(d => d.trim()),
      category: newTemplateForm.category,
    } : t));
    toast.success('Template updated successfully');
    setShowEditTemplateDialog(false);
    setSelectedTemplate(null);
    setNewTemplateForm({ name: '', description: '', deliverables: '', category: 'Sponsored' });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    }
  };

  const handleDuplicateTemplate = (template: Template) => {
    const duplicated: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      usageCount: 0,
    };
    setTemplates(prev => [...prev, duplicated]);
    toast.success(`Template "${template.name}" duplicated`);
  };

  const handleOpenEdit = (template: Template) => {
    setSelectedTemplate(template);
    setNewTemplateForm({
      name: template.name,
      description: template.description,
      deliverables: template.deliverables.join('\n'),
      category: template.category,
    });
    setShowEditTemplateDialog(true);
  };

  const handleOpenUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setNewCampaignForm({ brand_name: '', budget: '' });
    setShowUseTemplateDialog(true);
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !newCampaignForm.brand_name.trim()) {
      toast.error('Please enter a brand name');
      return;
    }
    setIsCreating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update usage count
    setTemplates(prev => prev.map(t => 
      t.id === selectedTemplate.id ? { ...t, usageCount: t.usageCount + 1 } : t
    ));
    
    toast.success(`Campaign "${newCampaignForm.brand_name}" created from template`);
    setShowUseTemplateDialog(false);
    setIsCreating(false);
    // Navigate to campaigns page
    router.push('/agency/campaigns');
  };

  const handleExportTemplate = (template: Template) => {
    const exportData = JSON.stringify(template, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template exported');
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.name && data.deliverables) {
          const imported: Template = {
            id: Date.now().toString(),
            name: data.name,
            description: data.description || '',
            deliverables: data.deliverables || [],
            usageCount: 0,
            category: data.category || 'Imported',
          };
          setTemplates(prev => [...prev, imported]);
          toast.success(`Template "${imported.name}" imported`);
        } else {
          toast.error('Invalid template file format');
        }
      } catch {
        toast.error('Failed to parse template file');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportTemplate}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaign Templates</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Reusable templates for creating campaigns quickly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Campaign Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for future campaigns
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Standard Sponsored Post"
                    value={newTemplateForm.name}
                    onChange={(e) => setNewTemplateForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={newTemplateForm.category}
                    onValueChange={(value) => setNewTemplateForm(f => ({ ...f, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sponsored">Sponsored</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                      <SelectItem value="Ambassador">Ambassador</SelectItem>
                      <SelectItem value="UGC">UGC</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe the template..."
                    value={newTemplateForm.description}
                    onChange={(e) => setNewTemplateForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-deliverables">Deliverables (one per line)</Label>
                  <Textarea
                    id="template-deliverables"
                    placeholder="Script approval&#10;Video draft&#10;Final video"
                    value={newTemplateForm.deliverables}
                    onChange={(e) => setNewTemplateForm(f => ({ ...f, deliverables: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search templates..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{template.category}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenUseTemplate(template)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Use Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportTemplate(template)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Deliverables:</p>
                <div className="flex flex-wrap gap-1">
                  {template.deliverables.slice(0, 3).map((deliverable, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {deliverable}
                    </Badge>
                  ))}
                  {template.deliverables.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.deliverables.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Used {template.usageCount} times
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No templates found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try a different search' : 'Create your first template'}
          </p>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowNewTemplateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name *</Label>
              <Input
                id="edit-template-name"
                placeholder="e.g., Standard Sponsored Post"
                value={newTemplateForm.name}
                onChange={(e) => setNewTemplateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-category">Category</Label>
              <Select
                value={newTemplateForm.category}
                onValueChange={(value) => setNewTemplateForm(f => ({ ...f, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sponsored">Sponsored</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Ambassador">Ambassador</SelectItem>
                  <SelectItem value="UGC">UGC</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-description">Description</Label>
              <Textarea
                id="edit-template-description"
                placeholder="Describe the template..."
                value={newTemplateForm.description}
                onChange={(e) => setNewTemplateForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template-deliverables">Deliverables (one per line)</Label>
              <Textarea
                id="edit-template-deliverables"
                placeholder="Script approval&#10;Video draft&#10;Final video"
                value={newTemplateForm.deliverables}
                onChange={(e) => setNewTemplateForm(f => ({ ...f, deliverables: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTemplateDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleEditTemplate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={showUseTemplateDialog} onOpenChange={setShowUseTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign from Template</DialogTitle>
            <DialogDescription>
              Using template: <span className="font-medium">{selectedTemplate?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Template Deliverables:</p>
              <div className="flex flex-wrap gap-1">
                {selectedTemplate?.deliverables.map((d, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="use-brand-name">Brand Name *</Label>
              <Input
                id="use-brand-name"
                placeholder="e.g., Nike"
                value={newCampaignForm.brand_name}
                onChange={(e) => setNewCampaignForm(f => ({ ...f, brand_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="use-budget">Budget</Label>
              <Input
                id="use-budget"
                type="number"
                placeholder="e.g., 5000"
                value={newCampaignForm.budget}
                onChange={(e) => setNewCampaignForm(f => ({ ...f, budget: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseTemplateDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleUseTemplate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
