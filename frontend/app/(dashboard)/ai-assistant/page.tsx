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
      } catch (err) {
        console.error('Failed to create session:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          console.error('Error details:', (err as { response?: { data?: unknown } }).response?.data);
        }
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
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Chat Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4 py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                Repruv AI Assistant
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-center max-w-lg mb-8">
                Your intelligent companion for content strategy, audience insights, and creative inspiration
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl px-4">
                <button
                  onClick={() => setInput('Why has my subscriber count gone down?')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                      <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Why has my subscriber count gone down?
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('Can you help me come up with a viral video idea?')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Can you help me come up with a viral video idea?
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('What are the best times to post on social media?')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
                      <Brain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        What are the best times to post on social media?
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setInput('How can I improve engagement with my audience?')}
                  className="group p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900 transition-colors">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        How can I improve engagement with my audience?
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4 items-start animate-in fade-in slide-in-from-bottom-4 duration-500',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                    )}
                  >
                    {message.role === 'user' ? (
                      <span className="text-xs font-bold">YOU</span>
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 max-w-3xl">
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                      )}
                    >
                      {message.content ? (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {/* Error Display */}
            {error && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="w-full min-h-[56px] max-h-32 px-4 py-4 pr-12 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent resize-none transition-all"
                  disabled={isLoading || !sessionId}
                  rows={1}
                />
              </div>
              
              <Button
                type="submit"
                size="icon"
                className="h-14 w-14 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !input.trim() || !sessionId}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium">Shift + Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}