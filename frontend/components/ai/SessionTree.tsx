'use client';

import { ChevronRight, ChevronDown, GitBranch, MessageSquare, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_activity: string | null;
  parent_session_id?: string | null;
  branch_point_message_id?: string | null;
  branch_name?: string | null;
  depth_level?: number;
  child_count?: number;
}

interface SessionTreeProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  collapsedSessions: Set<string>;
  onSelectSession: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

interface SessionTreeItemProps {
  session: ChatSession;
  childSessions?: ChatSession[];
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  level?: number;
  allSessions: ChatSession[];
  activeSessionId: string | null;
  collapsedSessions: Set<string>;
  onSelectSession: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onEditSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
}

function SessionTreeItem({
  session,
  childSessions,
  isActive,
  isCollapsed,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  level = 0,
  allSessions,
  activeSessionId,
  collapsedSessions,
  onSelectSession,
  onToggleCollapse,
  onEditSession,
  onDeleteSession,
}: SessionTreeItemProps) {
  const hasChildren = childSessions && childSessions.length > 0;

  const displayName = session.branch_name || session.title;

  return (
    <div className="select-none">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              )}
              onClick={onSelect}
            >
              {/* Collapse Toggle */}
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  className="flex-shrink-0 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}

              {/* Icon */}
              {level > 0 ? (
                <GitBranch className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              )}

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {session.message_count || 0} msg{session.message_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Render children */}
      {hasChildren && !isCollapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-2">
          {childSessions!.map((child) => {
            const childChildren = allSessions.filter(s => s.parent_session_id === child.id);
            const childIsActive = child.id === activeSessionId;
            const childIsCollapsed = collapsedSessions.has(child.id);
            
            return (
              <SessionTreeItem
                key={child.id}
                session={child}
                childSessions={childChildren}
                isActive={childIsActive}
                isCollapsed={childIsCollapsed}
                onSelect={() => onSelectSession(child.id)}
                onToggle={() => onToggleCollapse(child.id)}
                onEdit={() => onEditSession(child.id, child.title)}
                onDelete={() => onDeleteSession(child.id)}
                level={level + 1}
                allSessions={allSessions}
                activeSessionId={activeSessionId}
                collapsedSessions={collapsedSessions}
                onSelectSession={onSelectSession}
                onToggleCollapse={onToggleCollapse}
                onEditSession={onEditSession}
                onDeleteSession={onDeleteSession}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SessionTree({
  sessions,
  activeSessionId,
  collapsedSessions,
  onSelectSession,
  onToggleCollapse,
  onEdit,
  onDelete,
}: SessionTreeProps) {
  const getRootSessions = () => sessions.filter(s => !s.parent_session_id);
  const getChildren = (parentId: string) => sessions.filter(s => s.parent_session_id === parentId);

  const renderSession = (session: ChatSession, level = 0): JSX.Element => {
    const childSessions = getChildren(session.id);
    const isActive = session.id === activeSessionId;
    const isCollapsed = collapsedSessions.has(session.id);

    return (
      <SessionTreeItem
        key={session.id}
        session={session}
        childSessions={childSessions}
        isActive={isActive}
        isCollapsed={isCollapsed}
        onSelect={() => onSelectSession(session.id)}
        onToggle={() => onToggleCollapse(session.id)}
        onEdit={() => onEdit(session.id, session.title)}
        onDelete={() => onDelete(session.id)}
        level={level}
        allSessions={sessions}
        activeSessionId={activeSessionId}
        collapsedSessions={collapsedSessions}
        onSelectSession={onSelectSession}
        onToggleCollapse={onToggleCollapse}
        onEditSession={onEdit}
        onDeleteSession={onDelete}
      />
    );
  };

  const rootSessions = getRootSessions();

  return (
    <div className="space-y-1">
      {rootSessions.map(session => renderSession(session, 0))}
    </div>
  );
}
