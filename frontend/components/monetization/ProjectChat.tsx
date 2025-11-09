'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/monetization-api';

interface ProjectChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isStreaming: boolean;
  streamingContent: string;
}

export function ProjectChat({ messages, onSendMessage, isStreaming, streamingContent }: ProjectChatProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || isStreaming) return;

    const message = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
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
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950 mb-4">
                <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-dark mb-2">
                Let's Launch Your Premium Community
              </h3>
              <p className="text-sm text-secondary-dark max-w-md mx-auto">
                I'm your AI execution partner. In the next 30 minutes, we'll make the 5 key decisions and create your launch plan. Ready to get started?
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={message.id || index} message={message} />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary-dark">AI Partner</span>
                  <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-secondary-dark whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-1 h-4 bg-purple-600 animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex gap-3 animate-in fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-950">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isSending || isStreaming}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!input.trim() || isSending || isStreaming}
              className="px-6"
            >
              {isSending || isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-secondary-dark mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end animate-in fade-in slide-in-from-bottom-2">
        <div className="flex-1 flex justify-end">
          <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">You</span>
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary-dark">AI Partner</span>
          {message.detected_actions && message.detected_actions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {message.detected_actions.length} action{message.detected_actions.length > 1 ? 's' : ''} detected
            </span>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="text-secondary-dark whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </div>
  );
}
