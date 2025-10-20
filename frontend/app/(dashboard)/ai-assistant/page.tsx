'use client';
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Brain, Send, Loader2, AlertCircle, Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Memoized markdown component for better performance
const MarkdownContent = memo(({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
));
MarkdownContent.displayName = 'MarkdownContent';

// Animated typing indicator - Retro styled
const TypingIndicator = () => (
  <div className="flex items-center gap-2 py-2">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-holo-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-holo-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-holo-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-xs text-holo-purple font-semibold animate-pulse">AI is typing...</span>
  </div>
);

export default function AIAssistantPage() {
  // Core state - simplified
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeStreamRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chunkBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom with smooth behavior
  useEffect(() => {
    // Use a slight delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [messages.length]); // Only scroll when message count changes, not on every update

  // Load sessions on mount and restore last active session
  useEffect(() => {
    const initializePage = async () => {
      await loadSessions();
      
      // Try to restore last active session from localStorage
      const lastSessionId = localStorage.getItem('ai_chat_last_session_id');
      if (lastSessionId) {
        console.log('[AI Chat] Restoring last session:', lastSessionId);
        // Small delay to ensure sessions are loaded
        setTimeout(() => {
          loadSession(lastSessionId).catch(err => {
            console.error('[AI Chat] Failed to restore session:', err);
            localStorage.removeItem('ai_chat_last_session_id');
          });
        }, 100);
      }
    };
    
    initializePage();
  }, []);

  // Save current session ID to localStorage whenever it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('ai_chat_last_session_id', currentSessionId);
      console.log('[AI Chat] Saved session to localStorage:', currentSessionId);
    }
  }, [currentSessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
      stopPolling();
    };
  }, []);

  const cleanupStreams = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.close();
      activeStreamRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const loadSessions = async (silent = false) => {
    try {
      if (!silent) setIsLoadingSessions(true);
      const response = await api.get('/chat/sessions?page=1&page_size=50');
      const fetchedSessions = response.data.sessions || [];
      console.log('[AI Chat] Loaded sessions:', fetchedSessions.length, 'sessions');
      
      if (silent) {
        // Silent refresh: merge with existing, preserving any optimistically added sessions
        setSessions(prev => {
          const fetchedIds = new Set(fetchedSessions.map((s: ChatSession) => s.id));
          // Keep optimistically added sessions that aren't in the fetched list yet
          const optimisticSessions = prev.filter(s => !fetchedIds.has(s.id));
          // Combine: optimistic first, then fetched
          return [...optimisticSessions, ...fetchedSessions];
        });
      } else {
        // Full refresh: replace completely
        setSessions(fetchedSessions);
      }
    } catch (err) {
      console.error('[AI Chat] Failed to load sessions:', err);
      if (!silent) setError('Failed to load conversations');
    } finally {
      if (!silent) setIsLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (currentSessionId === sessionId) return; // Already loaded
    
    console.log('[AI Chat] Loading session:', sessionId);
    cleanupStreams();
    stopPolling();
    setIsLoadingMessages(true);
    setCurrentSessionId(sessionId);
    setMessages([]);
    setError(null);

    try {
      const response = await api.get(`/chat/messages/${sessionId}`);
      console.log('[AI Chat] Session loaded, message count:', response.data.messages?.length || 0);
      const loadedMessages: Message[] = (response.data.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        streaming: msg.status === 'generating' || msg.status === 'queued',
      }));
      setMessages(loadedMessages);
      setMessageCount(loadedMessages.filter(m => m.role === 'user').length);
      console.log('[AI Chat] Messages set, user message count:', loadedMessages.filter(m => m.role === 'user').length);
      
      // Check if there's an active generation for this session
      const hasGenerating = loadedMessages.some(m => m.streaming);
      if (hasGenerating) {
        const generatingMsg = loadedMessages.find(m => m.streaming);
        if (generatingMsg) {
          console.log('[AI Chat] Reconnecting to active stream for message:', generatingMsg.id);
          setIsStreaming(true);
          reconnectToStream(sessionId, generatingMsg.id);
        }
      }
    } catch (err) {
      console.error('[AI Chat] Failed to load messages:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewSession = async () => {
    console.log('[AI Chat] Creating new blank session');
    cleanupStreams();
    stopPolling();
    setCurrentSessionId(null);
    setMessages([]);
    setMessageCount(0);
    setError(null);
    // Clear localStorage so we don't try to restore this
    localStorage.removeItem('ai_chat_last_session_id');
  };

  const autoGenerateTitle = async (sessionId: string, userMessage: string) => {
    try {
      const response = await api.post(`/chat/sessions/${sessionId}/generate-title`);
      const newTitle = response.data.title;
      
      // Update sessions list
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
    } catch (err) {
      console.error('Failed to auto-generate title:', err);
      // Fallback: use first 40 chars of user message
      const fallbackTitle = userMessage.slice(0, 40).trim() + (userMessage.length > 40 ? '...' : '');
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: fallbackTitle } : s
      ));
    }
  };

  const reconnectToStream = (sessionId: string, messageId: string, retryCount = 0) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    console.log(`[AI Chat] Connecting to stream (attempt ${retryCount + 1})...`);
    
    const eventSource = new EventSource(
      `${api.defaults.baseURL}/chat/stream/${sessionId}?message_id=${messageId}&token=${encodeURIComponent(token)}`
    );

    activeStreamRef.current = eventSource;

    const flushChunks = (msgId: string) => {
      if (chunkBufferRef.current) {
        const bufferedContent = chunkBufferRef.current;
        chunkBufferRef.current = '';
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === msgId
              ? { ...msg, content: msg.content + bufferedContent }
              : msg
          )
        );
      }
      rafIdRef.current = null;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          console.log('[AI Chat] Generation started by worker');
          // Worker has picked up the task, reset any timeout concerns
        } else if (data.type === 'chunk' && data.content) {
          chunkBufferRef.current += data.content;
          
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => flushChunks(messageId));
          }
        } else if (data.type === 'complete') {
          if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          if (chunkBufferRef.current) {
            flushChunks(messageId);
          }
          
          console.log('[AI Chat] Stream completed successfully');
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, streaming: false, content: data.content || msg.content }
                : msg
            )
          );
          eventSource.close();
          activeStreamRef.current = null;
          setIsStreaming(false);
          chunkBufferRef.current = '';
          
          // Refresh sessions to get updated timestamp
          loadSessions(true);
        } else if (data.type === 'error') {
          console.error('[AI Chat] Stream error:', data.error);
          
          // If it's a timeout, try to reconnect once
          if (data.error.includes('Timeout') && retryCount === 0) {
            console.log('[AI Chat] Timeout detected, attempting one reconnect...');
            eventSource.close();
            activeStreamRef.current = null;
            setTimeout(() => reconnectToStream(sessionId, messageId, 1), 1000);
          } else {
            setError(data.error || 'Stream error occurred');
            eventSource.close();
            activeStreamRef.current = null;
            setIsStreaming(false);
          }
        }
      } catch (err) {
        console.error('[AI Chat] Stream parsing error:', err);
      }
    };

    eventSource.onerror = (event) => {
      console.error('[AI Chat] SSE connection error, retry count:', retryCount);
      eventSource.close();
      activeStreamRef.current = null;
      
      // Retry with exponential backoff (max 5 attempts)
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
        console.log(`[AI Chat] Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          // Check if message still needs streaming
          reconnectToStream(sessionId, messageId, retryCount + 1);
        }, delay);
      } else {
        console.error('[AI Chat] Max retry attempts reached');
        setError('Connection lost. Please refresh the page.');
        setIsStreaming(false);
      }
    };

    eventSource.onopen = () => {
      console.log('[AI Chat] SSE connection established');
    };
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      console.log('[AI Chat] Deleting session:', sessionId);
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        localStorage.removeItem('ai_chat_last_session_id');
        createNewSession();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete conversation');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setError(null);

    try {
      // Create session if needed
      let sessionId = currentSessionId;
      const isNewSession = !sessionId;
      
      if (!sessionId) {
        console.log('[AI Chat] Creating new session...');
        const createResponse = await api.post('/chat/sessions', {
          title: 'New Chat',
          mode: 'general',
        });
        sessionId = createResponse.data.session_id;
        console.log('[AI Chat] New session created:', sessionId);
        setCurrentSessionId(sessionId);
        
        // Add new session to the list immediately for better UX
        const newSession: ChatSession = {
          id: sessionId as string,
          title: 'New Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSessions(prev => {
          // Don't add if already exists
          if (prev.some(s => s.id === sessionId)) {
            return prev;
          }
          return [newSession, ...prev];
        });
        
        // Refresh in background after a short delay to ensure backend has saved
        setTimeout(() => {
          loadSessions(true).catch(err => console.error('[AI Chat] Background session refresh failed:', err));
        }, 1000);
      }

      // Increment message count
      const newMessageCount = messageCount + 1;
      setMessageCount(newMessageCount);

      // Send message
      console.log('[AI Chat] Sending message to session:', sessionId);
      const response = await api.post('/chat/messages', {
        session_id: sessionId,
        content: userMessage.content,
      });

      const { message_id: assistantMessageId } = response.data;
      console.log('[AI Chat] Message sent, assistant message ID:', assistantMessageId);

      // Auto-generate title after first message OR update for first 5 messages
      if ((newMessageCount === 1 || newMessageCount <= 5) && sessionId) {
        // Run in background, don't wait
        autoGenerateTitle(sessionId, userMessage.content).catch(err => 
          console.error('Title generation failed:', err)
        );
      }

      // Create placeholder for assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Connect to SSE stream with retry logic (sessionId is guaranteed to be string here)
      if (sessionId) {
        reconnectToStream(sessionId, assistantMessageId);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      setIsStreaming(false);
    }
  };

  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-8 -my-6 h-[calc(100vh-4rem)] flex relative noise-texture">
      {/* Sidebar - Glassmorphic */}
      <div className="w-80 glass-panel border-r border-card-border backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl gradient-purple shadow-glow-purple">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-holo-purple to-holo-teal bg-clip-text text-transparent">AI Assistant</h1>
            </div>
          </div>
          <Button
            onClick={createNewSession}
            disabled={isStreaming}
            className="w-full"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 retro-scroll">
          {isLoadingSessions ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 glass-panel rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-14 w-14 mx-auto mb-3 opacity-50 text-holo-purple" />
              <p className="text-sm font-medium">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl transition-all group retro-hover',
                    currentSessionId === session.id
                      ? 'glass-panel gradient-purple text-white shadow-glow-purple border-2 border-holo-purple'
                      : 'glass-panel border-2 border-border hover:border-holo-purple/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-medium text-sm truncate",
                        currentSessionId === session.id ? "text-white" : "text-foreground"
                      )}>
                        {session.title || 'New Chat'}
                      </h3>
                      <p className={cn(
                        "text-xs",
                        currentSessionId === session.id ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-950 rounded transition-all"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-holo-purple" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="mb-10">
                <div className="inline-flex p-8 glass-panel rounded-3xl mb-6 border border-holo-purple/30 shadow-glow-purple">
                  <Sparkles className="h-20 w-20 text-holo-purple" />
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-holo-purple via-holo-teal to-holo-pink bg-clip-text text-transparent mb-3">
                  What can I help you with?
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto font-medium">
                  Ask me about content strategy, viral ideas, audience growth, or anything else!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                {[
                  'How do I increase engagement on my posts?',
                  'Give me 5 viral content ideas for TikTok',
                  'What are the best posting times for Instagram?',
                  'How can I grow my YouTube channel?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus(), 0);
                    }}
                    className="p-5 text-left glass-panel rounded-2xl border-2 border-border hover:border-holo-purple transition-all retro-hover shadow-glass backdrop-blur-md"
                  >
                    <p className="text-sm font-medium">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl gradient-purple shadow-glow-purple flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-6 py-4 transition-all duration-200',
                      message.role === 'user'
                        ? 'gradient-purple text-white shadow-glow-purple'
                        : 'glass-panel backdrop-blur-md border border-card-border shadow-glass bg-card/80 text-card-foreground'
                    )}
                  >
                    {message.content ? (
                      message.role === 'assistant' ? (
                        <>
                          <MarkdownContent content={message.content} />
                          {message.streaming && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1 h-4 bg-holo-purple animate-pulse rounded" />
                              <span className="animate-pulse font-medium">streaming...</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-white">{message.content}</p>
                      )
                    ) : (
                      <TypingIndicator />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Input Area - Retro Styled */}
        <div className="p-6 border-t border-border glass-panel backdrop-blur-xl">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Ask me anything..."
                disabled={isStreaming}
                className="flex-1 min-h-[60px] max-h-40 px-5 py-4 text-sm font-medium glass-panel backdrop-blur-sm border-2 border-border rounded-xl focus:outline-none focus:border-holo-purple focus:shadow-glow-purple resize-none transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isStreaming}
                size="lg"
                className={cn(
                  "h-[60px] px-8",
                  isStreaming && "animate-pulse"
                )}
              >
                {isStreaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
