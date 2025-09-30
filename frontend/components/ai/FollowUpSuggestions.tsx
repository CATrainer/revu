'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface FollowUpSuggestionsProps {
  messageId: string;
  onSelect: (suggestion: string) => void;
}

export function FollowUpSuggestions({ messageId, onSelect }: FollowUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await api.post(`/chat/messages/${messageId}/followups`);
        setSuggestions(response.data.suggestions || []);
      } catch (err) {
        console.error('Failed to generate follow-ups:', err);
        setError('Could not generate suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [messageId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating suggestions...</span>
      </div>
    );
  }

  if (error || suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <Sparkles className="h-3 w-3" />
        <span>Suggested follow-ups:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            className="text-sm h-auto py-2 px-3 rounded-full border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
