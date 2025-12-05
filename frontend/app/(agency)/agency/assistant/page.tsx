'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bot,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  PlusCircle,
  GitBranch,
  DollarSign,
  Users,
  Target,
  Calendar,
  FileText,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { dashboardApi, pipelineApi, campaignApi, financeApi } from '@/lib/agency-dashboard-api';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ActionSuggestion[];
  isStreaming?: boolean;
}

interface ActionSuggestion {
  type: 'create_deal' | 'send_invoice' | 'mark_complete' | 'schedule_task' | 'view_report';
  label: string;
  description: string;
  data?: Record<string, any>;
}

// Quick action cards for the empty state
const quickActions = [
  {
    icon: GitBranch,
    label: 'Pipeline Status',
    prompt: "What's the current status of my pipeline? Show me deals that need attention.",
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    icon: DollarSign,
    label: 'Financial Overview',
    prompt: 'Give me a summary of outstanding invoices and pending creator payouts.',
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    icon: Target,
    label: 'Campaign Progress',
    prompt: 'What campaigns are in progress and what deliverables are due this week?',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    icon: Users,
    label: 'Creator Status',
    prompt: 'Which creators have availability for new campaigns this month?',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
];

// System prompt with agency context
const AGENCY_SYSTEM_PROMPT = `You are an AI assistant for an influencer talent agency management dashboard. You help agency managers with:

- Pipeline management: tracking deals from prospecting to completion
- Campaign management: managing deliverables, timelines, and creator assignments
- Financial operations: invoices, creator payouts, and revenue tracking
- Creator management: availability, rates, and performance

You have access to real-time agency data and can help users understand their business metrics, identify issues, and suggest actions. Be concise, professional, and action-oriented.

When providing information:
1. Use specific numbers and dates from the data
2. Highlight urgent items or potential issues
3. Suggest concrete next steps when appropriate
4. Format responses with clear sections and bullet points

Current agency context will be provided with each message.`;

export default function AgencyAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch agency data for context
  const { data: dashboardStats } = useQuery({
    queryKey: ['agency-dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 60000,
  });

  const { data: pipelineDeals } = useQuery({
    queryKey: ['agency-pipeline-deals'],
    queryFn: () => pipelineApi.getDeals(),
    staleTime: 60000,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['agency-campaigns'],
    queryFn: () => campaignApi.getCampaigns(),
    staleTime: 60000,
  });

  const { data: financeStats } = useQuery({
    queryKey: ['agency-finance-stats'],
    queryFn: () => financeApi.getStats(),
    staleTime: 60000,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build context from agency data
  const buildAgencyContext = () => {
    const context: Record<string, any> = {};

    if (dashboardStats) {
      context.dashboard = {
        active_campaigns: dashboardStats.active_campaigns,
        active_creators: dashboardStats.active_creators,
        pipeline_value: dashboardStats.pipeline_value,
        monthly_revenue: dashboardStats.monthly_revenue,
        pending_tasks: dashboardStats.pending_tasks,
        overdue_deliverables: dashboardStats.overdue_deliverables,
      };
    }

    if (pipelineDeals && pipelineDeals.length > 0) {
      const byStage = pipelineDeals.reduce((acc, deal) => {
        acc[deal.stage] = (acc[deal.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalValue = pipelineDeals.reduce((sum, d) => sum + d.value, 0);
      const stagnantDeals = pipelineDeals.filter(d => d.days_in_stage > 14);
      const actionNeeded = pipelineDeals.filter(d => d.status === 'action_needed');

      context.pipeline = {
        total_deals: pipelineDeals.length,
        total_value: totalValue,
        by_stage: byStage,
        stagnant_count: stagnantDeals.length,
        action_needed_count: actionNeeded.length,
        top_deals: pipelineDeals.slice(0, 5).map(d => ({
          brand: d.brand_name,
          value: d.value,
          stage: d.stage,
          days_in_stage: d.days_in_stage,
        })),
      };
    }

    if (campaigns && campaigns.length > 0) {
      const activeCampaigns = campaigns.filter(c => c.status === 'in_progress');
      const upcomingDeadlines = campaigns
        .flatMap(c => c.deliverables || [])
        .filter(d => d.status !== 'completed')
        .slice(0, 5);

      context.campaigns = {
        total: campaigns.length,
        active: activeCampaigns.length,
        recent: campaigns.slice(0, 5).map(c => ({
          brand: c.brand_name,
          status: c.status,
          creators: c.creators.length,
          deliverables: c.deliverables_total,
          completed: c.deliverables_completed,
        })),
        upcoming_deadlines: upcomingDeadlines.length,
      };
    }

    if (financeStats) {
      context.finance = {
        outstanding_receivables: financeStats.outstanding_receivables,
        overdue_receivables: financeStats.overdue_receivables,
        overdue_count: financeStats.overdue_count,
        creator_payouts_due: financeStats.creator_payouts_due,
        creator_payouts_count: financeStats.creator_payouts_count,
        revenue_this_month: financeStats.revenue_this_month,
        revenue_trend: financeStats.revenue_trend_percent,
      };
    }

    return context;
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading || isStreaming) return;

    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);
    setIsStreaming(true);

    try {
      // Build context
      const agencyContext = buildAgencyContext();

      // Create session if needed and send message
      const sessionResponse = await api.post('/chat/sessions', {
        title: 'Agency Assistant',
        mode: 'agency',
      });
      const sessionId = sessionResponse.data.session_id;

      // Build message with context
      const contextMessage = `
[Agency Context - Current Data]
${JSON.stringify(agencyContext, null, 2)}

[User Query]
${text}

Please analyze the agency data and respond to the user's query. Be specific with numbers and provide actionable insights.`;

      // Send message
      const response = await api.post('/chat/messages', {
        session_id: sessionId,
        content: contextMessage,
        system_prompt: AGENCY_SYSTEM_PROMPT,
      });

      const messageId = response.data.message_id;

      // Connect to SSE stream
      const token = localStorage.getItem('access_token');
      const eventSource = new EventSource(
        `${api.defaults.baseURL}/chat/stream/${sessionId}?message_id=${messageId}&token=${encodeURIComponent(token || '')}`
      );

      let fullContent = '';

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chunk' && data.content) {
            fullContent += data.content;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
          } else if (data.type === 'complete') {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: data.content || fullContent, isStreaming: false }
                  : msg
              )
            );
            eventSource.close();
            setIsStreaming(false);
            setIsLoading(false);
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch (err) {
          console.error('Stream error:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
        setIsLoading(false);
        // If we have some content, keep it
        if (fullContent) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }
      };
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Generate a fallback response based on context
      const agencyContext = buildAgencyContext();
      const fallbackResponse = generateFallbackResponse(text, agencyContext);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: fallbackResponse, isStreaming: false }
            : msg
        )
      );
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Generate fallback response from local data
  const generateFallbackResponse = (query: string, context: Record<string, any>): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('pipeline') || lowerQuery.includes('deal')) {
      const pipeline = context.pipeline || {};
      return `## Pipeline Overview

**Total Active Deals:** ${pipeline.total_deals || 0}
**Total Pipeline Value:** £${(pipeline.total_value || 0).toLocaleString()}

### By Stage:
${Object.entries(pipeline.by_stage || {}).map(([stage, count]) => `- **${stage}:** ${count} deals`).join('\n')}

${pipeline.stagnant_count > 0 ? `\n**Attention:** ${pipeline.stagnant_count} deals have been stagnant for over 14 days.` : ''}
${pipeline.action_needed_count > 0 ? `\n**Action Required:** ${pipeline.action_needed_count} deals need immediate attention.` : ''}`;
    }

    if (lowerQuery.includes('finance') || lowerQuery.includes('invoice') || lowerQuery.includes('payout')) {
      const finance = context.finance || {};
      return `## Financial Summary

**Outstanding Receivables:** £${(finance.outstanding_receivables || 0).toLocaleString()}
**Overdue Amount:** £${(finance.overdue_receivables || 0).toLocaleString()} (${finance.overdue_count || 0} invoices)

### Creator Payouts
**Pending Payouts:** £${(finance.creator_payouts_due || 0).toLocaleString()}
**Creators Awaiting Payment:** ${finance.creator_payouts_count || 0}

### Revenue
**This Month:** £${(finance.revenue_this_month || 0).toLocaleString()}
**Trend:** ${finance.revenue_trend > 0 ? '+' : ''}${finance.revenue_trend || 0}% vs last month`;
    }

    if (lowerQuery.includes('campaign') || lowerQuery.includes('deliverable')) {
      const campaigns = context.campaigns || {};
      return `## Campaign Status

**Total Campaigns:** ${campaigns.total || 0}
**Currently Active:** ${campaigns.active || 0}

### Recent Campaigns:
${(campaigns.recent || []).map((c: any) => `- **${c.brand}** - ${c.status} (${c.completed}/${c.deliverables} deliverables)`).join('\n')}

${campaigns.upcoming_deadlines > 0 ? `\n**Upcoming Deadlines:** ${campaigns.upcoming_deadlines} deliverables due soon` : ''}`;
    }

    // Default summary
    const dashboard = context.dashboard || {};
    return `## Agency Overview

**Active Campaigns:** ${dashboard.active_campaigns || 0}
**Active Creators:** ${dashboard.active_creators || 0}
**Pipeline Value:** £${(dashboard.pipeline_value || 0).toLocaleString()}
**Monthly Revenue:** £${(dashboard.monthly_revenue || 0).toLocaleString()}

${dashboard.pending_tasks > 0 ? `\n**Pending Tasks:** ${dashboard.pending_tasks}` : ''}
${dashboard.overdue_deliverables > 0 ? `\n**Overdue Deliverables:** ${dashboard.overdue_deliverables}` : ''}

What would you like to know more about? Try asking about:
- Pipeline status and deals
- Campaign progress and deliverables
- Financial overview and invoices
- Creator availability`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Agency Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered insights for your agency
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-4">
                <Sparkles className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Ask me about your pipeline, campaigns, finances, or creators.
                I have access to your real-time agency data.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-start gap-3 p-4 text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all"
                  >
                    <div className={cn('p-2 rounded-lg', action.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {action.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {action.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {message.content || (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        )}
                        {message.isStreaming && message.content && (
                          <span className="inline-block w-1 h-4 bg-green-500 animate-pulse ml-0.5" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      You
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your pipeline, campaigns, finances..."
            disabled={isLoading || isStreaming}
            className="flex-1 min-h-[52px] max-h-[120px] px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:opacity-50"
            rows={1}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading || isStreaming}
            className="h-[52px] px-6 bg-green-600 hover:bg-green-700"
          >
            {isLoading || isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
