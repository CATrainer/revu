'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import React from 'react';
import { MessageCircle, ChevronRight, Clock, GitBranch, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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

interface ThreadSwitcherProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
}

export function ThreadSwitcher({ sessions, activeSessionId, onSelectSession }: ThreadSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const relatedThreads = sessions.filter(s => 
    s.parent_session_id === activeSessionId || 
    s.id === activeSession?.parent_session_id ||
    s.parent_session_id === activeSession?.parent_session_id
  );
  
  const getThreadColor = (session: ChatSession) => {
    if (!session.depth_level) return 'blue';
    const colors = ['purple', 'pink', 'indigo', 'violet', 'fuchsia'];
    return colors[session.depth_level % colors.length];
  };
  
  if (!activeSession) return null;
  
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Active Thread Display */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {activeSession.depth_level && activeSession.depth_level > 0 ? (
              <div className={cn(
                "p-2 rounded-lg",
                `bg-${getThreadColor(activeSession)}-100 dark:bg-${getThreadColor(activeSession)}-950`
              )}>
                <GitBranch className={cn(
                  "h-4 w-4",
                  `text-${getThreadColor(activeSession)}-600 dark:text-${getThreadColor(activeSession)}-400`
                )} />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {activeSession.branch_name || activeSession.title}
                </h2>
                {activeSession.depth_level && activeSession.depth_level > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                    Thread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeSession.message_count || 0} messages
              </p>
            </div>
          </div>
          
          {/* Related Threads Indicator */}
          {relatedThreads.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {relatedThreads.length} related
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </Button>
          )}
        </div>
        
        {/* Related Threads Dropdown */}
        {isExpanded && relatedThreads.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Related Threads
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {relatedThreads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => {
                    onSelectSession(thread.id);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all",
                    thread.id === activeSessionId
                      ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  {thread.depth_level && thread.depth_level > 0 ? (
                    <GitBranch className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {thread.branch_name || thread.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {thread.message_count || 0} msgs
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
