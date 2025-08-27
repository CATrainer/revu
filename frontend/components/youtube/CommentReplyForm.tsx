"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useCommentReply } from '@/hooks/useYouTube';

interface CommentReplyFormProps {
  connectionId: string;
  videoId: string;
  parentCommentId: string;
  maxLength?: number;
  className?: string;
  onSuccess?: (text: string) => void;
  onError?: (message: string) => void;
}

export default function CommentReplyForm({
  connectionId,
  videoId,
  parentCommentId,
  maxLength = 1000,
  className,
  onSuccess,
  onError,
}: CommentReplyFormProps) {
  const [text, setText] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useCommentReply(connectionId, videoId);
  const remaining = maxLength - text.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const payload = text.trim();
    if (!payload) {
      setErrorMsg('Please enter a reply.');
      return;
    }

    try {
      await mutation.mutateAsync({ commentId: parentCommentId, text: payload });
      setText('');
      setSuccessMsg('Reply posted successfully.');
      onSuccess?.(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to post reply.';
      setErrorMsg(message);
      onError?.(message);
    }
  };

  return (
    <form className={className} onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply…"
          rows={4}
          maxLength={maxLength}
          aria-label="Reply text"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{remaining} characters left</span>
          {mutation.isPending && (
            <span className="flex items-center gap-2"><LoadingSpinner size="small" />Sending…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={mutation.isPending || text.trim().length === 0}>
            {mutation.isPending ? 'Sending…' : 'Reply'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setText('')} disabled={mutation.isPending}>
            Clear
          </Button>
        </div>
        {successMsg && <div className="text-sm text-green-600">{successMsg}</div>}
        {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
      </div>
    </form>
  );
}
