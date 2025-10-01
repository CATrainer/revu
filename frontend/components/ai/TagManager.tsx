'use client';

import { useState, useCallback } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TagData {
  id: string;
  name: string;
  color?: string;
}

interface TagManagerProps {
  sessionId: string;
  currentTags: TagData[];
  availableTags: TagData[];
  onTagsChange: (tags: TagData[]) => Promise<void>;
}

const TAG_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
];

export function TagManager({
  sessionId,
  currentTags,
  availableTags,
  onTagsChange,
}: TagManagerProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  const handleToggleTag = useCallback(async (tag: TagData) => {
    const isCurrentlySelected = currentTags.some(t => t.id === tag.id);
    const newTags = isCurrentlySelected
      ? currentTags.filter(t => t.id !== tag.id)
      : [...currentTags, tag];
    
    setSaving(true);
    try {
      await onTagsChange(newTags);
    } finally {
      setSaving(false);
    }
  }, [currentTags, onTagsChange]);

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;

    const newTag: TagData = {
      id: `temp-${Date.now()}`, // Backend will replace with real ID
      name: newTagName.trim(),
      color: selectedColor,
    };

    setSaving(true);
    try {
      await onTagsChange([...currentTags, newTag]);
      setNewTagName('');
      setSelectedColor(TAG_COLORS[0].value);
      setIsCreating(false);
    } finally {
      setSaving(false);
    }
  }, [newTagName, selectedColor, currentTags, onTagsChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            currentTags.length > 0 && "text-blue-600 dark:text-blue-400"
          )}
        >
          <Tag className="h-4 w-4" />
          {currentTags.length > 0 && (
            <span className="text-xs">{currentTags.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Manage Tags</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" />
              New Tag
            </Button>
          </div>

          {/* Create New Tag */}
          {isCreating && (
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Input
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                className="h-8 text-sm"
                autoFocus
              />
              
              <div className="flex gap-1.5 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      selectedColor === color.value
                        ? "border-slate-900 dark:border-slate-100 scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || saving}
                  className="flex-1 h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Available Tags */}
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {availableTags.length === 0 ? 'No tags yet. Create one above!' : 'Click to toggle'}
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableTags.map((tag) => {
                const isSelected = currentTags.some(t => t.id === tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
                    style={{
                      backgroundColor: isSelected ? tag.color : 'transparent',
                      borderColor: tag.color,
                      color: isSelected ? 'white' : tag.color,
                    }}
                    onClick={() => handleToggleTag(tag)}
                  >
                    {tag.name}
                    {isSelected && <Check className="h-3 w-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Current Tags */}
          {currentTags.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                Current tags on this conversation:
              </p>
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    className="gap-1 pr-1"
                    style={{
                      backgroundColor: tag.color,
                      color: 'white',
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleToggleTag(tag)}
                      className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
