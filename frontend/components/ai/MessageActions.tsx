'use client';

import React, { useState } from 'react';
import { Copy, Edit2, RotateCw, Check, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  canRegenerate?: boolean;
  onCopy: (content: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onRegenerate: () => void;
}

export function MessageActions({
  messageId,
  content,
  role,
  canRegenerate,
  onCopy,
  onEdit,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <TooltipProvider>
        {/* Copy Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? 'Copied!' : 'Copy message'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Edit Button (User messages only) */}
        {role === 'user' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(messageId, content)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit message</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Regenerate Button (Assistant messages only) */}
        {role === 'assistant' && canRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate response</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy message
            </DropdownMenuItem>
            {role === 'user' && (
              <DropdownMenuItem onClick={() => onEdit(messageId, content)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit message
              </DropdownMenuItem>
            )}
            {role === 'assistant' && canRegenerate && (
              <DropdownMenuItem onClick={onRegenerate}>
                <RotateCw className="h-4 w-4 mr-2" />
                Regenerate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
