'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Crown, Eye, MessageSquare, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Collaborator extends User {
  permission: 'view' | 'comment' | 'edit';
  isOnline: boolean;
  isTyping: boolean;
  cursor?: {
    x: number;
    y: number;
  };
}

interface CollaborationPanelProps {
  sessionId: string;
  currentUserId: string;
  owner: User;
  collaborators: Collaborator[];
  onInvite: (email: string, permission: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onUpdatePermission: (userId: string, permission: string) => Promise<void>;
}

export function CollaborationPanel({
  sessionId,
  currentUserId,
  owner,
  collaborators,
  onInvite,
  onRemove,
  onUpdatePermission,
}: CollaborationPanelProps) {
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<string>('view');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      await onInvite(inviteEmail.trim(), invitePermission);
      setInviteEmail('');
      setInvitePermission('view');
    } catch (err) {
      console.error('Failed to invite:', err);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this collaborator?')) return;

    try {
      await onRemove(userId);
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view':
        return <Eye className="h-3 w-3" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3" />;
      case 'edit':
        return <Edit className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const activeUsers = collaborators.filter(c => c.isOnline);
  const typingUsers = collaborators.filter(c => c.isTyping);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Users className="h-4 w-4 mr-2" />
          <span>{collaborators.length + 1}</span>
          {activeUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Collaboration</SheetTitle>
          <SheetDescription>
            Manage who can access and edit this conversation
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Invite New Collaborator */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Collaborator
            </h4>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite();
                }}
              />
              <Select value={invitePermission} onValueChange={setInvitePermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="comment">Can Comment</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Owner */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Owner</h4>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Avatar className="h-8 w-8">
                <AvatarImage src={owner.avatar} />
                <AvatarFallback>
                  {owner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {owner.name}
                  {owner.id === currentUserId && ' (You)'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {owner.email}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3 text-amber-600" />
                Owner
              </Badge>
            </div>
          </div>

          {/* Collaborators */}
          {collaborators.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                Collaborators ({collaborators.length})
              </h4>
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      collab.isOnline
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.avatar} />
                        <AvatarFallback>
                          {collab.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {collab.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {collab.name}
                        {collab.id === currentUserId && ' (You)'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {collab.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {owner.id === currentUserId && collab.id !== currentUserId ? (
                        <>
                          <Select
                            value={collab.permission}
                            onValueChange={(value) => onUpdatePermission(collab.id, value)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="comment">Comment</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(collab.id)}
                            className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-950/20 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          {getPermissionIcon(collab.permission)}
                          {collab.permission}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Users Summary */}
          {activeUsers.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} currently active
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
