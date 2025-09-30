'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BranchCardProps {
  suggestions: string[];
  onBranch: (topic: string) => void;
  messageId: string;
}

export function BranchCard({ suggestions, onBranch, messageId }: BranchCardProps) {
  return (
    <div className="my-4 mx-auto max-w-3xl">
      <div className="relative">
        {/* Connecting line from message */}
        <div className="absolute left-1/2 -top-6 w-0.5 h-6 bg-gradient-to-b from-purple-300/50 to-transparent dark:from-purple-700/50" />
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-purple-500 rounded-lg">
              <GitBranch className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              💡 Explore Further
            </h3>
          </div>
          
          <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
            Branch off to explore these topics without losing your main conversation
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onBranch(suggestion)}
                className="group flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                    {suggestion}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              const topic = prompt('What would you like to explore?');
              if (topic) onBranch(topic);
            }}
            className="mt-2 w-full text-center text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium py-2 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
          >
            + Custom branch topic
          </button>
        </div>
      </div>
    </div>
  );
}
