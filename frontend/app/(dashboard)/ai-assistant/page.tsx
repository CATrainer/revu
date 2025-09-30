// frontend/app/(dashboard)/ai-assistant/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await api.post('/chat/sessions', {
          title: 'New Chat',
          mode: 'general',
        });
        console.log('Session created:', response.data);
        setSessionId(response.data.session_id);
      } catch (err: any) {
        console.error('Failed to create session:', err);
        console.error('Error details:', err.response?.data);
        setError('Failed to initialize chat session');
      }
    };
    createSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Use EventSource for streaming responses
      const response = await fetch(`${api.defaults.baseURL}/chat/messages?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          content: userMessage.content,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      // Create assistant message that will be updated with streaming content
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.delta) {
                  // Append delta to assistant message
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + data.delta }
                        : msg
                    )
                  );
                } else if (data.event === 'done') {
                  // Streaming complete
                  console.log('Streaming complete, latency:', data.latency_ms);
                }
              } catch (err) {
                console.error('Error parsing SSE data:', err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Remove the last user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent;
      handleSubmit(formEvent);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] max-w-5xl mx-auto px-4 md:px-0 flex flex-col">
      {/* Header */}
      <div className="text-center mb-6 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Ask Repruv AI Anything</h1>
        </div>
        <p className="text-sm md:text-base text-secondary-dark">
          Get answers on anything, including your content, audience or niche
        </p>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden mb-4">
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-dark space-y-4">
              <Brain className="h-16 w-16 opacity-20" />
              <div>
                <p className="font-medium text-lg mb-2">Start a conversation</p>
                <p className="text-sm">
                  Ask me anything about content creation, audience growth, or creative ideas!
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 max-w-2xl">
                <button
                  onClick={() => setInput('Why has my subscriber count gone down?')}
                  className="p-3 text-left text-sm border border-[var(--border)] rounded-lg hover:bg-accent transition-colors"
                >
                  Why has my subscriber count gone down?
                </button>
                <button
                  onClick={() => setInput('Can you help me come up with a viral video idea?')}
                  className="p-3 text-left text-sm border border-[var(--border)] rounded-lg hover:bg-accent transition-colors"
                >
                  Can you help me come up with a viral video idea?
                </button>
                <button
                  onClick={() => setInput('What are the best times to post on social media?')}
                  className="p-3 text-left text-sm border border-[var(--border)] rounded-lg hover:bg-accent transition-colors"
                >
                  What are the best times to post on social media?
                </button>
                <button
                  onClick={() => setInput('How can I improve engagement with my audience?')}
                  className="p-3 text-left text-sm border border-[var(--border)] rounded-lg hover:bg-accent transition-colors"
                >
                  How can I improve engagement with my audience?
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3 items-start',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    )}
                  >
                    {message.role === 'user' ? (
                      <span className="text-sm font-semibold">You</span>
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={cn(
                      'flex-1 rounded-lg p-3 max-w-[80%]',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content || (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-[var(--border)] p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-32 px-4 py-3 text-primary-dark placeholder:text-muted-dark border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent card-background resize-none"
              disabled={isLoading || !sessionId}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              disabled={isLoading || !input.trim() || !sessionId}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}