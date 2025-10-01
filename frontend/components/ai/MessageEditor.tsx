'use client';

import { useState } from 'react';
import { Edit2, Save, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MessageEditorProps {
  messageId: string;
  originalContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function MessageEditor({
  messageId,
  originalContent,
  onSave,
  onCancel,
  className,
}: MessageEditorProps) {
  const [content, setContent] = useState(originalContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (content === originalContent) {
      onCancel();
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      await onSave(content);
    } catch (err) {
      console.error('Failed to save message:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Edit your message..."
        className="min-h-[100px] resize-none"
        autoFocus
      />

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">Cmd/Ctrl + Enter</kbd> to save
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setContent(originalContent)}
            disabled={saving || content === originalContent}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !content.trim() || content === originalContent}
          >
            {saving ? (
              <>
                <Save className="h-4 w-4 mr-1 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save & Regenerate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
