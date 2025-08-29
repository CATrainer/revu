"use client";

import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useComments, useCommentReply } from '@/hooks/useYouTube';
import type { YouTubeComment } from '@/types/youtube';

interface CommentListProps {
  connectionId: string;
  videoId: string;
  pageSize?: number; // applies to top-level fetch; replies are grouped from fetched set
  className?: string;
  sortBy?: 'newest' | 'oldest' | 'most_liked' | 'most_replies';
  parentsOnly?: boolean; // hide replies list
  unansweredOnly?: boolean; // only parents with 0 replies
  query?: string; // filter by content/author
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function CommentItem({
  comment,
  replies,
  onReply,
  replying,
  setReplying,
  isSubmitting,
  displayReplies = true,
}: {
  comment: YouTubeComment;
  replies: YouTubeComment[];
  onReply: (parentId: string, text: string) => Promise<void>;
  replying: string | null;
  setReplying: (id: string | null) => void;
  isSubmitting: boolean;
  displayReplies?: boolean;
}) {
  const [text, setText] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  const isOpen = replying === comment.commentId;

  return (
    <div className="border-b py-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground select-none">{(comment.authorName || 'U').slice(0,1).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{comment.authorName || 'Unknown'}</span>
            {comment.isChannelOwnerComment && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Creator</span>
            )}
            <span className="text-muted-foreground">• {formatDate(comment.publishedAt)}</span>
          </div>
          <div className="mt-1 whitespace-pre-wrap leading-relaxed text-[0.95rem]">{comment.content || ''}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <button
              className="hover:underline"
              onClick={() => setReplying(isOpen ? null : comment.commentId)}
            >
              Reply
            </button>
            {displayReplies && typeof comment.replyCount === 'number' && comment.replyCount > 0 && (
              <button className="hover:underline" onClick={() => setShowReplies((v) => !v)}>
                {showReplies ? 'Hide' : 'Show'} {comment.replyCount} repl{comment.replyCount === 1 ? 'y' : 'ies'}
              </button>
            )}
          </div>
          {isOpen && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!text.trim()) return;
                    await onReply(comment.commentId, text.trim());
                    setText('');
                    setReplying(null);
                  }}
                  disabled={isSubmitting || !text.trim()}
                >
                  {isSubmitting ? <span className="flex items-center gap-2"><LoadingSpinner size="small" />Sending…</span> : 'Reply'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(null)} disabled={isSubmitting}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>

  {displayReplies && replies.length > 0 && showReplies && (
        <div className="mt-3 ml-11 border-l pl-4 space-y-3 max-h-64 overflow-y-auto pr-2">
          {replies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.authorName || 'Unknown'}</span>
                <span className="text-muted-foreground">• {formatDate(r.publishedAt)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap leading-relaxed">{r.content || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentList({ connectionId, videoId, pageSize = 50, className, sortBy = 'newest', parentsOnly = false, unansweredOnly = false, query = '' }: CommentListProps) {
  const [page, setPage] = useState(0);
  const offset = page * pageSize;
  const newestFirst = sortBy === 'oldest' ? false : true;

  const { data, isLoading, isFetching, isError, error } = useComments({ connectionId, videoId, limit: pageSize, offset, newestFirst });
  const reply = useCommentReply(connectionId, videoId);

  const { parents, childrenByParent } = useMemo(() => {
    const list = data ?? [];
    const parentsList: YouTubeComment[] = [];
    const childrenMap = new Map<string, YouTubeComment[]>();
    for (const c of list) {
      if (!c.parentCommentId) {
        parentsList.push(c);
      } else {
        const arr = childrenMap.get(c.parentCommentId) || [];
        arr.push(c);
        childrenMap.set(c.parentCommentId, arr);
      }
    }
    return { parents: parentsList, childrenByParent: childrenMap };
  }, [data]);

  const onReply = useCallback(async (parentId: string, text: string) => {
    await reply.mutateAsync({ commentId: parentId, text });
  }, [reply]);

  const processedParents = useMemo(() => {
    // Apply filters
    let arr = [...parents];
    const q = (query || '').trim().toLowerCase();
    if (q) {
      arr = arr.filter((c) => (c.content || '').toLowerCase().includes(q) || (c.authorName || '').toLowerCase().includes(q));
    }
    if (unansweredOnly) {
      arr = arr.filter((c) => {
        const children = childrenByParent.get(c.commentId) || [];
        const count = typeof c.replyCount === 'number' ? c.replyCount : children.length;
        return (count || 0) === 0;
      });
    }
    // Sorting
    const toNum = (v?: number | null) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
    const toDate = (d?: string | null) => (d ? new Date(d).getTime() : 0);
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return toDate(a.publishedAt) - toDate(b.publishedAt);
        case 'most_liked':
          return toNum(b.likeCount) - toNum(a.likeCount);
        case 'most_replies': {
          const ar = toNum(a.replyCount ?? (childrenByParent.get(a.commentId) || []).length);
          const br = toNum(b.replyCount ?? (childrenByParent.get(b.commentId) || []).length);
          return br - ar;
        }
        case 'newest':
        default:
          return toDate(b.publishedAt) - toDate(a.publishedAt);
      }
    });
    return arr;
  }, [parents, childrenByParent, sortBy, unansweredOnly, query]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return <div className="text-destructive">{(error as Error)?.message ?? 'Failed to load comments'}</div>;
    }

    if (!processedParents.length) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border p-8 text-center text-muted-foreground">
          <div className="mb-2">No comments yet.</div>
          <div className="text-sm">New comments will appear here as they arrive.</div>
        </div>
      );
    }

    return null;
  }, [isLoading, isError, error, processedParents.length, pageSize]);

  // Keep track of which comment is open for reply per row
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);

  return (
    <div className={className}>
    {/* Render with controlled reply state */}
  {content === null ? (
        <div className="divide-y">
      {processedParents.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={childrenByParent.get(c.commentId) || []}
              replying={openReplyFor}
              setReplying={setOpenReplyFor}
              onReply={onReply}
              isSubmitting={reply.isPending}
        displayReplies={!parentsOnly}
            />
          ))}
        </div>
      ) : (
        content
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isFetching}>
          Prev
        </Button>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          Page {page + 1}
          {isFetching && <LoadingSpinner size="small" />}
        </div>
        <Button
          variant="outline"
          onClick={() => setPage((p) => p + 1)}
          disabled={isFetching || (data && data.length < pageSize)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
