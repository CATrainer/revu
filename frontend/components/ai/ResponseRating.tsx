'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { api } from '@/lib/api';

interface ResponseRatingProps {
  messageId: string;
  onRate?: (rating: string) => void;
}

export function ResponseRating({ messageId, onRate }: ResponseRatingProps) {
  const [rating, setRating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async (newRating: 'helpful' | 'not_helpful' | 'amazing') => {
    setRating(newRating);
    setSubmitting(true);

    try {
      await api.post(`/chat/messages/${messageId}/rate`, {
        rating: newRating,
        feedback: feedback || undefined,
      });
      
      if (onRate) {
        onRate(newRating);
      }

      // Close feedback popup after successful submission
      if (showFeedback) {
        setTimeout(() => {
          setShowFeedback(false);
          setFeedback('');
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to rate message:', error);
      setRating(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (rating) {
      await handleRate(rating as 'helpful' | 'not_helpful' | 'amazing');
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Helpful Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleRate('helpful')}
        disabled={submitting || rating !== null}
        className={`h-8 w-8 p-0 ${rating === 'helpful' ? 'text-green-600 dark:text-green-400' : ''}`}
        title="Helpful"
      >
        {rating === 'helpful' ? (
          <Check className="h-4 w-4" />
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
      </Button>

      {/* Not Helpful Button with Feedback */}
      <Popover open={showFeedback} onOpenChange={setShowFeedback}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!rating) {
                setShowFeedback(true);
                setRating('not_helpful');
              }
            }}
            disabled={submitting || rating !== null}
            className={`h-8 w-8 p-0 ${rating === 'not_helpful' ? 'text-red-600 dark:text-red-400' : ''}`}
            title="Not helpful"
          >
            {rating === 'not_helpful' ? (
              <Check className="h-4 w-4" />
            ) : (
              <ThumbsDown className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">What could be better?</h4>
            <Textarea
              placeholder="Optional: Tell us how we can improve..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFeedback(false);
                  setRating(null);
                  setFeedback('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFeedbackSubmit}
                disabled={submitting}
              >
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Amazing Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleRate('amazing')}
        disabled={submitting || rating !== null}
        className={`h-8 w-8 p-0 ${rating === 'amazing' ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
        title="Amazing!"
      >
        {rating === 'amazing' ? (
          <Check className="h-4 w-4" />
        ) : (
          <Star className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
