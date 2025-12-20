"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface View {
  id?: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: string;
  filters: any;
  display: any;
  is_pinned?: boolean;
  is_shared?: boolean;
  is_system?: boolean;
}

interface ViewBuilderProps {
  view?: View | null;
  onClose: () => void;
  onSave: (view: View) => void;
}

const EMOJI_ICONS = ['📥', '⭐', '💰', '🤝', '❓', '😠', '💬', '🎯', '📧', '🔥', '💡', '📊'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function ViewBuilder({ view, onClose, onSave }: ViewBuilderProps) {
  const [formData, setFormData] = useState<View>({
    name: view?.name || '',
    description: view?.description || '',
    icon: view?.icon || '📥',
    color: view?.color || '#3b82f6',
    type: view?.type || 'custom',
    filters: view?.filters || {},
    display: view?.display || { sortBy: 'newest', showReplies: true, density: 'comfortable' },
    is_pinned: view?.is_pinned || false,
    is_shared: view?.is_shared || false,
  });

  const [keywords, setKeywords] = useState<string>(
    view?.filters?.keywords?.join(', ') || ''
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(view?.filters?.platforms || [])
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(view?.filters?.types || [])
  );
  const [isSaving, setIsSaving] = useState(false);

  const handlePlatformToggle = (platform: string) => {
    const newSet = new Set(selectedPlatforms);
    if (newSet.has(platform)) {
      newSet.delete(platform);
    } else {
      newSet.add(platform);
    }
    setSelectedPlatforms(newSet);
  };

  const handleTypeToggle = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a view name');
      return;
    }

    setIsSaving(true);

    try {
      // Build filters object
      const filters: any = {};
      
      if (selectedPlatforms.size > 0) {
        filters.platforms = Array.from(selectedPlatforms);
      }
      
      if (selectedTypes.size > 0) {
        filters.types = Array.from(selectedTypes);
      }
      
      if (keywords.trim()) {
        filters.keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
      }
      
      // Copy additional filters from formData if they exist
      if (formData.filters.sentiment) filters.sentiment = formData.filters.sentiment;
      if (formData.filters.status) filters.status = formData.filters.status;
      if (formData.filters.priority_min) filters.priority_min = formData.filters.priority_min;

      const payload = {
        ...formData,
        filters,
      };

      let savedView;
      
      if (view?.id) {
        // Update existing view
        const response = await api.patch(`/views/${view.id}`, payload);
        savedView = response.data;
      } else {
        // Create new view
        const response = await api.post('/views', payload);
        savedView = response.data;
      }

      onSave(savedView);
    } catch (error) {
      console.error('Failed to save view:', error);
      alert('Failed to save view');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {view?.id ? 'Edit View' : 'Create New View'}
          </DialogTitle>
          <DialogDescription>
            Customize filters to organize your interactions exactly how you want.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">View Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Merch Inquiries"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this view"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOJI_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`text-2xl p-2 rounded border-2 transition-all ${
                        formData.icon === emoji 
                          ? 'border-primary bg-primary/10' 
                          : 'border-transparent hover:border-muted'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-primary scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Filters</h3>

            {/* Platforms */}
            <div>
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['instagram', 'youtube', 'tiktok', 'twitter'].map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform)}
                    className={`px-3 py-1.5 rounded-md text-sm capitalize transition-all ${
                      selectedPlatforms.has(platform)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Interaction Types */}
            <div>
              <Label>Interaction Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['comment', 'dm', 'mention'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeToggle(type)}
                    className={`px-3 py-1.5 rounded-md text-sm capitalize transition-all ${
                      selectedTypes.has(type)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="merch, shop, store, buy"
              />
            </div>

            {/* Sentiment */}
            <div>
              <Label htmlFor="sentiment">Sentiment</Label>
              <Select
                value={formData.filters.sentiment || 'any'}
                onValueChange={(value) => 
                  setFormData({
                    ...formData,
                    filters: { 
                      ...formData.filters, 
                      sentiment: value === 'any' ? undefined : value 
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.filters.status?.[0] || 'any'}
                onValueChange={(value) => 
                  setFormData({
                    ...formData,
                    filters: { 
                      ...formData.filters, 
                      status: value === 'any' ? undefined : [value]
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Display Options</h3>

            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                value={formData.display.sortBy}
                onValueChange={(value) => 
                  setFormData({
                    ...formData,
                    display: { ...formData.display, sortBy: value }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="engagement">Most Engaged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_pinned: checked as boolean })
                  }
                />
                <Label htmlFor="pinned" className="cursor-pointer">
                  Pin to sidebar
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shared"
                  checked={formData.is_shared}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_shared: checked as boolean })
                  }
                />
                <Label htmlFor="shared" className="cursor-pointer">
                  Share with team
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {view?.id ? 'Save Changes' : 'Create View'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
