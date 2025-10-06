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
  <div className="prose prose-sm dark:prose-invert max-w-none">
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

// Animated typing indicator
const TypingIndicator = () => (
  <div className="flex items-center gap-2 py-2">
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">AI is typing...</span>
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
      console.log('[AI Chat] Loaded sessions:', response.data.sessions?.length || 0, 'sessions');
      setSessions(response.data.sessions || []);
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

  const reconnectToStream = (sessionId: string, messageId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

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

        if (data.type === 'chunk' && data.content) {
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
        }
      } catch (err) {
        console.error('Stream parsing error:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      activeStreamRef.current = null;
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
        setSessions(prev => [newSession, ...prev]);
        
        // Refresh in background to get accurate data
        loadSessions(true).catch(err => console.error('[AI Chat] Background session refresh failed:', err));
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

      // Connect to SSE stream
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const eventSource = new EventSource(
        `${api.defaults.baseURL}/chat/stream/${sessionId}?message_id=${assistantMessageId}&token=${encodeURIComponent(token)}`
      );

      activeStreamRef.current = eventSource;

      // Batch chunks using requestAnimationFrame for smoother rendering
      const flushChunks = (messageId: string) => {
        if (chunkBufferRef.current) {
          const bufferedContent = chunkBufferRef.current;
          chunkBufferRef.current = '';
          
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
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

          if (data.type === 'chunk' && data.content) {
            // Buffer chunks and update via RAF for 60fps smooth streaming
            chunkBufferRef.current += data.content;
            
            if (!rafIdRef.current) {
              rafIdRef.current = requestAnimationFrame(() => flushChunks(assistantMessageId));
            }
          } else if (data.type === 'complete') {
            // Cancel any pending RAF and flush remaining chunks
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
            if (chunkBufferRef.current) {
              flushChunks(assistantMessageId);
            }
            
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, streaming: false, content: data.content || msg.content }
                  : msg
              )
            );
            eventSource.close();
            activeStreamRef.current = null;
            setIsStreaming(false);
            chunkBufferRef.current = '';
            
            // Refresh sessions to update timestamp and title
            loadSessions(true);
          } else if (data.type === 'error') {
            throw new Error(data.error || 'Streaming error');
          }
        } catch (err) {
          console.error('Stream parsing error:', err);
          setError('Failed to parse response');
          eventSource.close();
          activeStreamRef.current = null;
          setIsStreaming(false);
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
        setError('Connection lost');
        eventSource.close();
        activeStreamRef.current = null;
        setIsStreaming(false);
      };
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      setIsStreaming(false);
    }
  };

  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-8 -my-6 h-[calc(100vh-4rem)] flex bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Assistant</h1>
            </div>
          </div>
          <Button
            onClick={createNewSession}
            disabled={isStreaming}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingSessions ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all group',
                    currentSessionId === session.id
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-transparent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {session.title || 'New Chat'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
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
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="mb-8">
                <div className="inline-flex p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl mb-4">
                  <Sparkles className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  What can I help you with?
                </h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Ask me about content strategy, viral ideas, audience growth, or anything else!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
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
                    className="p-4 text-left bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300">{prompt}</p>
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
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-5 py-3 shadow-sm transition-all duration-200',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    )}
                  >
                    {message.content ? (
                      message.role === 'assistant' ? (
                        <>
                          <MarkdownContent content={message.content} />
                          {message.streaming && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                              <div className="w-1 h-4 bg-blue-500 animate-pulse rounded" />
                              <span className="animate-pulse">streaming...</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
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

        {/* Input Area */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
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
                className="flex-1 min-h-[60px] max-h-40 px-5 py-4 text-[15px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className={cn(
                  "h-[60px] px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 transform active:scale-95",
                  isStreaming && "animate-pulse"
                )}
              >
                {isStreaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
