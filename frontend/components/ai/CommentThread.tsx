'use client';

import { useState } from 'react';
import { MessageSquare, Send, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface CommentThreadProps {
  messageId: string;
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function CommentThread({
  messageId,
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CommentThreadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      await onEditComment(commentId, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } catch (err) {
      console.error('Failed to edit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await onDeleteComment(commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-2">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        {comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Add comment'}
      </Button>

      {/* Comments List */}
      {isOpen && (
        <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={comment.userAvatar} />
                  <AvatarFallback className="text-xs">
                    {comment.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {comment.userName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(comment.createdAt)}
                      {comment.updatedAt && ' (edited)'}
                    </span>
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] text-sm resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(comment.id)}
                          disabled={submitting || !editContent.trim()}
                          className="h-7 text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={submitting}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  )}
                </div>

                {comment.userId === currentUserId && editingId !== comment.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(comment)}>
                        <Edit2 className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(comment.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {/* Add New Comment */}
          <div className="flex gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">You</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[60px] text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                className="h-[60px] w-[60px] p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
