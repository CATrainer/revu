"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy,
  Pin,
  PinOff,
  Inbox,
  Star,
  Archive,
  CheckCircle2,
  Loader2,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface View {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: string;
  filter_mode?: 'ai' | 'manual';
  ai_prompt?: string;
  filters: any;
  display: any;
  is_pinned: boolean;
  is_system?: boolean;
  is_shared?: boolean;
  interaction_count?: number;
  unread_count?: number;
  order_index?: number;
}

interface ViewSidebarProps {
  views: View[];
  activeViewId: string | null;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  onEditView: (view: View) => void;
  onDeleteView: (id: string) => void;
  isLoading: boolean;
  onShowAnalytics?: () => void;
  onShowWorkflows?: () => void;
}

export default function ViewSidebar({
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onEditView,
  onDeleteView,
  isLoading,
  onShowAnalytics,
  onShowWorkflows,
}: ViewSidebarProps) {
  const [pinningId, setPinningId] = useState<string | null>(null);

  // Separate system views (All, Awaiting Approval, Archive, Sent) from custom views
  const systemViews = views.filter(v => v.is_system).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const customViews = views.filter(v => !v.is_system);

  const handlePinToggle = async (view: View) => {
    setPinningId(view.id);
    try {
      await api.post(`/views/${view.id}/pin?pinned=${!view.is_pinned}`);
      // Refresh will be handled by parent
      window.location.reload();  // Simple refresh for now
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    } finally {
      setPinningId(null);
    }
  };

  const handleDuplicate = async (view: View) => {
    try {
      await api.post(`/views/${view.id}/duplicate`);
      window.location.reload();  // Simple refresh for now
    } catch (error) {
      console.error('Failed to duplicate view:', error);
    }
  };

  const renderView = (view: View) => {
    const isActive = view.id === activeViewId;
    
    return (
      <div
        key={view.id}
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-muted"
        )}
        onClick={() => onSelectView(view.id)}
      >
        <span className="text-lg flex-shrink-0">{view.icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{view.name}</span>
            {view.unread_count && view.unread_count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary text-primary-foreground"
              )}>
                {view.unread_count}
              </span>
            )}
          </div>
        </div>

        {!view.is_system && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 opacity-0 group-hover:opacity-100",
                  isActive && "opacity-100"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEditView(view);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(view);
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinToggle(view);
                }}
                disabled={pinningId === view.id}
              >
                {pinningId === view.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : view.is_pinned ? (
                  <PinOff className="h-4 w-4 mr-2" />
                ) : (
                  <Pin className="h-4 w-4 mr-2" />
                )}
                {view.is_pinned ? 'Unpin' : 'Pin to Sidebar'}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteView(view.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm text-primary-dark">INTERACTIONS</h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onCreateView}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Views List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* System Views - Always show at top */}
            {systemViews.length > 0 && (
              <div className="space-y-1">
                {systemViews.map(renderView)}
              </div>
            )}

            {/* Divider between system and custom views */}
            {systemViews.length > 0 && customViews.length > 0 && (
              <div className="border-t my-3" />
            )}

            {/* Custom Views */}
            {customViews.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                  CUSTOM VIEWS
                </div>
                {customViews.map(renderView)}
              </div>
            )}

            {/* Empty State - only show if no views at all */}
            {views.length === 0 && (
              <div className="text-center py-8 px-4">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-secondary-dark mb-3">
                  No views yet. Create your first view to organize interactions.
                </p>
                <Button onClick={onCreateView} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create View
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Links */}
      <div className="p-3 border-t space-y-1">
        {onShowWorkflows && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onShowWorkflows}
          >
            <Zap className="h-4 w-4 mr-2" />
            Workflows
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={onShowAnalytics}
        >
          <Archive className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>
    </div>
  );
}
