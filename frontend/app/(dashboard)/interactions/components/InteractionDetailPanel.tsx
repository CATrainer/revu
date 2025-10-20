'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, MessageSquare, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Interaction {
  id: string;
  platform: string;
  type: string;
  content: string;
  author_name?: string;
  author_username?: string;
  author_avatar_url?: string;
  parent_content_title?: string;
  parent_content_url?: string;
  status: string;
  workflow_id?: string;
  workflow_action?: string;
  pending_response?: {
    text: string;
    generated_at: string;
    model: string;
    workflow_id?: string;
  };
  responded_at?: string;
  created_at: string;
  platform_created_at?: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
}

interface InteractionContext {
  interaction: Interaction;
  thread_messages: Interaction[];
  parent_content?: {
    id: string;
    title: string;
    url: string;
  };
  fan_profile?: {
    id: string;
    username: string;
    total_interactions: number;
    is_superfan: boolean;
    is_customer: boolean;
  };
  related_interactions: Interaction[];
}

interface InteractionDetailPanelProps {
  interactionId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const platformIcons: Record<string, string> = {
  youtube: '🎥',
  instagram: '📸',
  tiktok: '🎵',
  twitter: '🐦',
};

export function InteractionDetailPanel({
  interactionId,
  onClose,
  onUpdate,
}: InteractionDetailPanelProps) {
  const [context, setContext] = useState<InteractionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadContext();
  }, [interactionId]);

  const loadContext = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/interactions/${interactionId}/context`);
      const data = response.data;
      setContext(data);
      
      // Pre-fill with pending response if exists
      if (data.interaction.pending_response) {
        setResponseText(data.interaction.pending_response.text);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResponse = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/interactions/${interactionId}/generate-response`, {
        interaction_id: interactionId,
        tone: 'friendly',
      });
      const data = response.data;
      
      if (data.pending_response) {
        setResponseText(data.pending_response.text);
      }
      
      await loadContext(); // Reload to get updated status
      onUpdate?.();
    } catch (error) {
      console.error('Failed to generate response:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendResponse = async (addToQueue = false) => {
    if (!responseText.trim()) return;

    try {
      setSending(true);
      await api.post(`/interactions/${interactionId}/respond`, {
        text: responseText,
        send_immediately: !addToQueue,
        add_to_approval_queue: addToQueue,
      });

      await loadContext();
      onUpdate?.();
      
      if (!addToQueue) {
        setResponseText('');
      }
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading || !context) {
    return (
      <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-background border-l border-border shadow-lg flex items-center justify-center z-50 overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { interaction, thread_messages, parent_content, fan_profile } = context;
  const allMessages = [interaction, ...thread_messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-background border-l border-border shadow-lg flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-brand-primary" />
          <div>
            <h2 className="text-lg font-semibold text-primary-dark">Interaction Details</h2>
            <p className="text-sm text-secondary-dark capitalize">{interaction.platform} • {interaction.type}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Context Section */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-base font-semibold text-primary-dark mb-4">Context</h3>
          
          {parent_content && (
            <div className="flex items-start gap-2 mb-3">
              <span className="text-lg">📹</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-dark">{parent_content.title}</p>
                {parent_content.url && (
                  <a
                    href={parent_content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    View on {interaction.platform}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {fan_profile && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-card">
              <span className="text-lg">👤</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-dark">@{fan_profile.username}</p>
                <p className="text-xs text-secondary-dark">
                  {fan_profile.total_interactions} interactions
                  {fan_profile.is_superfan && ' • ⭐ Superfan'}
                  {fan_profile.is_customer && ' • 💰 Customer'}
                </p>
              </div>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Thread/Conversation */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-base font-semibold text-primary-dark mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversation {allMessages.length > 1 && `(${allMessages.length} messages)`}
            </h3>

          <div className="space-y-4">
            {allMessages.map((msg) => {
              const isMainInteraction = msg.id === interaction.id;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    isMainInteraction
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {msg.author_avatar_url ? (
                      <img
                        src={msg.author_avatar_url}
                        alt={msg.author_username || 'User'}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm">
                        {msg.author_name?.charAt(0) || '?'}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary-dark">
                          {msg.author_name || msg.author_username || 'Unknown'}
                        </span>
                        <span className="text-xs text-secondary-dark">
                          {new Date(msg.platform_created_at || msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-primary-dark whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </CardContent>
        </Card>

        {/* Workflow Attribution */}
        {interaction.workflow_id && (
          <Card className={cn(
            "border-l-4",
            interaction.workflow_action === 'auto_responded'
              ? "bg-green-50 dark:bg-green-950/20 border-green-500"
              : "bg-purple-50 dark:bg-purple-950/20 border-purple-500"
          )}>
            <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className={cn(
                "h-5 w-5 mt-0.5",
                interaction.workflow_action === 'auto_responded'
                  ? "text-green-600 dark:text-green-400"
                  : "text-purple-600 dark:text-purple-400"
              )} />
              <div className="flex-1">
                <h3 className={cn(
                  "text-sm font-medium mb-1",
                  interaction.workflow_action === 'auto_responded'
                    ? "text-green-900 dark:text-green-100"
                    : "text-purple-900 dark:text-purple-100"
                )}>
                  {interaction.workflow_action === 'auto_responded'
                    ? '✓ Response sent automatically by workflow'
                    : '⏳ Response generated by workflow (awaiting approval)'
                  }
                </h3>
                {interaction.pending_response?.workflow_id && (
                  <p className={cn(
                    "text-xs",
                    interaction.workflow_action === 'auto_responded'
                      ? "text-green-700 dark:text-green-300"
                      : "text-purple-700 dark:text-purple-300"
                  )}>
                    Workflow ID: {interaction.pending_response.workflow_id}
                  </p>
                )}
                {interaction.responded_at && interaction.workflow_action === 'auto_responded' && (
                  <p className={cn(
                    "text-xs mt-1",
                    "text-green-600 dark:text-green-400"
                  )}>
                    Sent {new Date(interaction.responded_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Response Preview */}
        {interaction.pending_response && interaction.status === 'awaiting_approval' && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-Generated Response (Awaiting Approval)
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 italic">
                {interaction.pending_response.text}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Response Section */}
      <div className="border-t px-6 py-4 bg-muted/10">
        <h3 className="text-base font-semibold text-primary-dark mb-3">Your Response</h3>
        
        <Textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="Type your response..."
          className="mb-3 min-h-[100px]"
        />

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleSendResponse(false)}
            disabled={!responseText.trim() || sending}
            className="flex-1"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSendResponse(true)}
            disabled={!responseText.trim() || sending}
          >
            Add to Queue
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerateResponse}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-secondary-dark mt-2">
          Tip: Click <Sparkles className="h-3 w-3 inline" /> to generate an AI response
        </p>
      </div>
    </div>
  );
}
