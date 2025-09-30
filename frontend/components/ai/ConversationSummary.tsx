'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Tag, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface ConversationSummaryProps {
  sessionId: string;
  messageCount?: number;
}

interface SummaryData {
  summary_text: string;
  key_topics: string[];
  action_items: Array<{
    task: string;
    priority: string;
  }>;
  message_count: number;
}

export function ConversationSummary({ sessionId, messageCount = 0 }: ConversationSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchSummary = async (force = false) => {
    try {
      setLoading(!force);
      if (force) setRegenerating(true);
      
      const url = force 
        ? `/chat/sessions/${sessionId}/summarize?force=true`
        : `/chat/sessions/${sessionId}/summary`;
      
      const response = await api.get(url);
      
      if (response.data) {
        setSummary(response.data);
      }
    } catch (err: any) {
      // 404 means no summary yet, that's okay
      if (err?.response?.status !== 404) {
        console.error('Failed to fetch summary:', err);
      }
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have enough messages
    if (messageCount >= 10) {
      fetchSummary();
    } else {
      setLoading(false);
    }
  }, [sessionId, messageCount]);

  const handleRegenerate = () => {
    fetchSummary(true);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Generating summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || messageCount < 10) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-900 dark:text-blue-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conversation Summary
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="h-8 w-8 p-0"
            title="Regenerate summary"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {summary.summary_text}
        </p>

        {summary.key_topics && summary.key_topics.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Key Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.key_topics.map((topic: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white dark:bg-slate-800 rounded-full text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {summary.action_items && summary.action_items.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Action Items
            </h4>
            <ul className="space-y-1.5">
              {summary.action_items.map((task: any, idx: number) => (
                <li
                  key={idx}
                  className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                >
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span className="flex-1">{task.task}</span>
                  {task.priority === 'high' && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                      High
                    </span>
                  )}
                  {task.priority === 'medium' && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                      Medium
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
          Based on {summary.message_count} messages
        </div>
      </CardContent>
    </Card>
  );
}
