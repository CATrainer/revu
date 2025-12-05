'use client';

import React, { useState } from 'react';
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
import { Plus, Search, FileText, MoreHorizontal, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Mock templates
const mockTemplates = [
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    deliverables: '',
  });

  const filteredTemplates = mockTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = () => {
    if (!newTemplateForm.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    toast.success('Template created successfully');
    setShowNewTemplateDialog(false);
    setNewTemplateForm({ name: '', description: '', deliverables: '' });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      toast.success('Template deleted');
    }
  };

  const handleDuplicateTemplate = (template: typeof mockTemplates[0]) => {
    toast.success(`Template "${template.name}" duplicated`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campaign Templates</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Reusable templates for creating campaigns quickly
          </p>
        </div>
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
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard Sponsored Post"
                  value={newTemplateForm.name}
                  onChange={(e) => setNewTemplateForm(f => ({ ...f, name: e.target.value }))}
                />
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
                    <DropdownMenuItem onClick={() => toast.info('Use template')}>
                      <Eye className="mr-2 h-4 w-4" />
                      Use Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info('Edit template')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
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
    </div>
  );
}
