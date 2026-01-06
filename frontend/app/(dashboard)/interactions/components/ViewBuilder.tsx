"use client";

import { useState } from 'react';
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
import { Loader2, Sparkles, SlidersHorizontal, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';

interface View {
  id?: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: string;
  filter_mode: 'ai' | 'manual';
  ai_prompt?: string;
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

// Example AI prompts to help users
const AI_PROMPT_EXAMPLES = [
  'Brand deal inquiries and sponsorship requests',
  'Questions about merchandise or products',
  'Collaboration requests from other creators',
  'Negative comments that need attention',
  'Messages from verified accounts',
  'Fan art and creative submissions',
];

export default function ViewBuilder({ view, onClose, onSave }: ViewBuilderProps) {
  // Determine initial filter mode
  const initialFilterMode = view?.filter_mode || (view?.ai_prompt ? 'ai' : 'ai');
  
  const [filterMode, setFilterMode] = useState<'ai' | 'manual'>(initialFilterMode);
  const [aiPrompt, setAiPrompt] = useState(view?.ai_prompt || '');
  
  const [formData, setFormData] = useState<Omit<View, 'filter_mode' | 'ai_prompt'>>({
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
  const [isTagging, setIsTagging] = useState(false);

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

    // Validate AI prompt if in AI mode
    if (filterMode === 'ai' && !aiPrompt.trim()) {
      alert('Please describe what interactions you want to see');
      return;
    }

    setIsSaving(true);
    if (filterMode === 'ai') {
      setIsTagging(true);
    }

    try {
      // Build filters object for manual mode
      const filters: any = {};
      
      if (filterMode === 'manual') {
        if (selectedPlatforms.size > 0) {
          filters.platforms = Array.from(selectedPlatforms);
        }
        
        if (selectedTypes.size > 0) {
          filters.types = Array.from(selectedTypes);
        }
        
        if (keywords.trim()) {
          filters.keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
        }
        
        if (formData.filters.sentiment) filters.sentiment = formData.filters.sentiment;
        if (formData.filters.status) filters.status = formData.filters.status;
        if (formData.filters.priority_min) filters.priority_min = formData.filters.priority_min;
      }

      const payload = {
        ...formData,
        filter_mode: filterMode,
        ai_prompt: filterMode === 'ai' ? aiPrompt : undefined,
        filters,
      };

      let savedView;
      
      if (view?.id) {
        const response = await api.patch(`/views/${view.id}`, payload);
        savedView = response.data;
      } else {
        const response = await api.post('/views', payload);
        savedView = response.data;
      }

      onSave(savedView);
    } catch (error) {
      console.error('Failed to save view:', error);
      alert('Failed to save view');
    } finally {
      setIsSaving(false);
      setIsTagging(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {view?.id ? 'Edit View' : 'Create Smart View'}
          </DialogTitle>
          <DialogDescription>
            Create a view to automatically organize your interactions using AI or manual filters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* View Name */}
          <div>
            <Label htmlFor="name">View Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Brand Deals, Fan Questions, Collabs"
              className="mt-1"
              required
            />
          </div>

          {/* Filter Mode Toggle */}
          <div className="space-y-3">
            <Label>How do you want to filter?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilterMode('ai')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  filterMode === 'ai'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={`h-5 w-5 ${filterMode === 'ai' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold">AI Filtering</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe what you want in plain English. AI will automatically classify interactions.
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setFilterMode('manual')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  filterMode === 'manual'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <SlidersHorizontal className={`h-5 w-5 ${filterMode === 'manual' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-semibold">Manual Filtering</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set specific filters like keywords, platforms, and sentiment manually.
                </p>
              </button>
            </div>
          </div>

          {/* AI Filtering Section */}
          {filterMode === 'ai' && (
            <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <div>
                <Label htmlFor="ai-prompt" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Describe what interactions you want to see
                </Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Show me all brand deal inquiries and sponsorship requests"
                  className="mt-2 min-h-[100px]"
                  required={filterMode === 'ai'}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Be specific! The AI will analyze each interaction to determine if it matches your description.
                </p>
              </div>
              
              {/* Example prompts */}
              <div>
                <Label className="text-xs text-muted-foreground">Try one of these examples:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AI_PROMPT_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setAiPrompt(example)}
                      className="text-xs px-3 py-1.5 rounded-full bg-background border hover:bg-muted transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Filtering Section */}
          {filterMode === 'manual' && (
            <div className="space-y-4 border rounded-lg p-4">
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
                  className="mt-1"
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
                  <SelectTrigger className="mt-1">
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
            </div>
          )}

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EMOJI_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`text-xl p-1.5 rounded border-2 transition-all ${
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
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
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

          {/* Display Options */}
          <div className="space-y-3">
            <Label>Display Options</Label>
            <div className="flex items-center gap-6">
              <Select
                value={formData.display.sortBy}
                onValueChange={(value) => 
                  setFormData({
                    ...formData,
                    display: { ...formData.display, sortBy: value }
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="engagement">Most Engaged</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_pinned: checked as boolean })
                  }
                />
                <Label htmlFor="pinned" className="cursor-pointer text-sm">
                  Pin to sidebar
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isTagging ? 'Analyzing interactions...' : 'Saving...'}
                </>
              ) : (
                <>
                  {filterMode === 'ai' && <Sparkles className="h-4 w-4 mr-2" />}
                  {view?.id ? 'Save Changes' : 'Create View'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
