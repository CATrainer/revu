'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Send, Sparkles, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  sendAIPartnerMessage,
  executeAIPartnerTool,
  AIPartnerMessage,
  ToolCallInfo,
} from '@/lib/monetization-v2-api';

interface AIPartnerChatProps {
  projectId: string;
  projectTitle: string;
  onActionExecuted?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallInfo[];
}

interface PendingAction {
  toolCall: ToolCallInfo;
  description: string;
}

export function AIPartnerChat({ projectId, projectTitle, onActionExecuted }: AIPartnerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getActionDescription = (toolCall: ToolCallInfo): string => {
    if (toolCall.name === 'update_monetization_task') {
      const { task_id, new_status, reason } = toolCall.arguments;
      const statusLabel = new_status === 'done' ? 'complete' : new_status === 'in_progress' ? 'in progress' : 'to do';
      return `Mark task ${task_id} as ${statusLabel}. Reason: ${reason}`;
    } else if (toolCall.name === 'update_monetization_decisions') {
      const { decisions, reason } = toolCall.arguments;
      const decisionKeys = Object.keys(decisions || {});
      return `Update ${decisionKeys.length} decision(s): ${decisionKeys.join(', ')}. Reason: ${reason}`;
    }
    return 'Unknown action';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLastActionResult(null);

    try {
      // Build message history for API
      const apiMessages: AIPartnerMessage[] = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendAIPartnerMessage(projectId, apiMessages);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        toolCalls: response.tool_calls,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If there are tool calls, show confirmation
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        setPendingAction({
          toolCall,
          description: getActionDescription(toolCall),
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsExecuting(true);
    try {
      const result = await executeAIPartnerTool(
        projectId,
        pendingAction.toolCall.name,
        pendingAction.toolCall.arguments
      );

      setLastActionResult({
        success: result.success,
        message: result.message || (result.success ? 'Action completed successfully' : result.error || 'Action failed'),
      });

      if (result.success) {
        // Add confirmation message to chat
        const confirmMessage: ChatMessage = {
          id: `confirm-${Date.now()}`,
          role: 'assistant',
          content: `✓ ${result.message}`,
        };
        setMessages(prev => [...prev, confirmMessage]);
        onActionExecuted?.();
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      setLastActionResult({
        success: false,
        message: 'Failed to execute action. Please try again.',
      });
    } finally {
      setIsExecuting(false);
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    // Add cancellation note to chat
    const cancelMessage: ChatMessage = {
      id: `cancel-${Date.now()}`,
      role: 'assistant',
      content: 'Action cancelled. Let me know if you need anything else.',
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 mb-3">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-primary-dark mb-1">
                AI Partner
              </h3>
              <p className="text-sm text-secondary-dark max-w-sm mx-auto">
                I'm here to help you execute your {projectTitle} project. Ask me anything about your tasks or let me know when you've completed something.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 animate-in fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-sm text-secondary-dark">Thinking...</span>
              </div>
            </div>
          )}

          {/* Last action result */}
          {lastActionResult && (
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm animate-in fade-in',
              lastActionResult.success
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
            )}>
              {lastActionResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {lastActionResult.message}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-[var(--border)] p-4 bg-white dark:bg-gray-950">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your project or tell me what you've completed..."
              className="min-h-[50px] max-h-[150px] resize-none text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-[50px] w-[50px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              The AI partner wants to make the following change to your project:
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-primary-dark font-medium">
                {pendingAction?.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelAction}
              disabled={isExecuting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end animate-in fade-in slide-in-from-bottom-2">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-secondary-dark whitespace-pre-wrap text-sm">{message.content}</div>
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Action pending confirmation
          </div>
        )}
      </div>
    </div>
  );
}

export default AIPartnerChat;
