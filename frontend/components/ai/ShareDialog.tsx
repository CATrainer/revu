'use client';

import { useState } from 'react';
import { Share2, Link as LinkIcon, Copy, CheckCheck, Loader2, Eye, MessageSquare, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

interface ShareDialogProps {
  sessionId: string;
  sessionTitle: string;
  onShare: (settings: ShareSettings) => Promise<string>; // Returns share URL
  trigger?: React.ReactNode;
}

export interface ShareSettings {
  permission: 'view' | 'comment' | 'edit';
  expiresIn?: number; // days, undefined = never
  requireAuth: boolean;
}

export function ShareDialog({
  sessionId,
  sessionTitle,
  onShare,
  trigger,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [requireAuth, setRequireAuth] = useState(true);
  const [expiresIn, setExpiresIn] = useState<number | undefined>(7);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsSharing(true);
    try {
      const url = await onShare({
        permission,
        expiresIn,
        requireAuth,
      });
      setShareUrl(url);
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setShareUrl('');
      setPermission('view');
      setRequireAuth(true);
      setExpiresIn(7);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Conversation</DialogTitle>
          <DialogDescription>
            Create a shareable link for "{sessionTitle}"
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          /* Share Settings Form */
          <div className="space-y-4 py-4">
            {/* Permission Level */}
            <div className="space-y-3">
              <Label>Permission Level</Label>
              <RadioGroup value={permission} onValueChange={(value) => setPermission(value as any)}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="view" id="perm-view" />
                  <Label htmlFor="perm-view" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <div className="font-medium">View Only</div>
                        <div className="text-xs text-slate-500">Can read the conversation</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="comment" id="perm-comment" />
                  <Label htmlFor="perm-comment" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Comment</div>
                        <div className="text-xs text-slate-500">Can read and add comments</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <RadioGroupItem value="edit" id="perm-edit" />
                  <Label htmlFor="perm-edit" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Edit</div>
                        <div className="text-xs text-slate-500">Can read, comment, and send messages</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Expiration */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Label>Link Expiration</Label>
              <RadioGroup 
                value={expiresIn?.toString() || 'never'} 
                onValueChange={(value) => setExpiresIn(value === 'never' ? undefined : parseInt(value))}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <RadioGroupItem value="1" id="exp-1" />
                    <Label htmlFor="exp-1" className="cursor-pointer text-sm">1 day</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <RadioGroupItem value="7" id="exp-7" />
                    <Label htmlFor="exp-7" className="cursor-pointer text-sm">7 days</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <RadioGroupItem value="30" id="exp-30" />
                    <Label htmlFor="exp-30" className="cursor-pointer text-sm">30 days</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <RadioGroupItem value="never" id="exp-never" />
                    <Label htmlFor="exp-never" className="cursor-pointer text-sm">Never</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Authentication */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <Label htmlFor="require-auth">Require Authentication</Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Only logged-in users can access
                </p>
              </div>
              <Switch
                id="require-auth"
                checked={requireAuth}
                onCheckedChange={setRequireAuth}
              />
            </div>
          </div>
        ) : (
          /* Share Link Generated */
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-lg">
              <CheckCheck className="h-4 w-4" />
              Share link created successfully!
            </div>

            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <CheckCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <p><strong>Permission:</strong> {permission.charAt(0).toUpperCase() + permission.slice(1)}</p>
              <p><strong>Expires:</strong> {expiresIn ? `In ${expiresIn} day${expiresIn > 1 ? 's' : ''}` : 'Never'}</p>
              <p><strong>Authentication:</strong> {requireAuth ? 'Required' : 'Not required'}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!shareUrl ? (
            <Button
              onClick={handleGenerateLink}
              disabled={isSharing}
              className="w-full"
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Link...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
